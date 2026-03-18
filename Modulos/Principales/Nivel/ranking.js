// Modulos/Principales/Nivel/ranking.js
//
// 🏆 SISTEMA DE RANKING EN MEMORIA
//
// Mantiene un array ordenado por (nivel DESC, xp DESC) por servidor.
// Calcular el puesto de cualquier usuario = O(log n) con búsqueda binaria.
// Los datos persisten en JSON por servidor y se reconstruyen desde MongoDB
// si los JSON no existen.
//
// Flujo:
//   arranque   → inicializarRankings(client) → carga JSON o reconstruye de Mongo
//   XP ganada  → actualizarUsuario(guildId, userId, nivel, xp)
//   /nivel      → obtenerPuesto(guildId, userId)
//   cada 30s   → guardarRanking(guildId) si hubo cambios (debounce)

const fs   = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const log = require('./bitacora'); // 👈 Bitácora importada

// Versión del formato JSON. Incrementar si cambia la estructura del ranking.
// Esto invalida automáticamente JSONs de versiones anteriores al arrancar.
const RANKING_VERSION = 2;

// ─────────────────────────────────────────────────────────────────────────────
// GUILDS EXCLUIDOS — servidores de prueba/emotes donde solo está el bot y el dev.
// Se saltan silenciosamente en la carga de rankings y en los logs de arranque.
// ─────────────────────────────────────────────────────────────────────────────
const GUILDS_EXCLUIDOS = new Set([
    '1463643762101321770', // Dev / pruebas
    '1465503493333848077', // Emotes
    '1465464968605601998', // Emotes
    '1465294891008524465', // Emotes
    '1465281206110392343', // Emotes
    '1466642279979552872',
    '1465300596163739701',
    '1469588794599800895',
]);

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const rankings = new Map();       // guildId → [{userId, nivel, xp}, ...]
const _timers  = new Map();       // guildId → timeout pendiente de guardado

const DIR_RANKINGS = path.join(__dirname, '../../../Base_Datos/Rankings');

// Garantizamos que el directorio existe al cargar el módulo
if (!fs.existsSync(DIR_RANKINGS)) {
    fs.mkdirSync(DIR_RANKINGS, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARADOR — define el orden DESC: nivel mayor primero, luego xp mayor
// ─────────────────────────────────────────────────────────────────────────────
function cmpDesc(a, b) {
    if (b.nivel !== a.nivel) return b.nivel - a.nivel;
    return b.xp - a.xp;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERCIÓN ORDENADA con búsqueda binaria — O(log n) para encontrar posición
// ─────────────────────────────────────────────────────────────────────────────
function insertarOrdenado(lista, entry) {
    let lo = 0, hi = lista.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cmpDesc(lista[mid], entry) <= 0) hi = mid;
        else lo = mid + 1;
    }
    lista.splice(lo, 0, entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER PUESTO — O(n) findIndex + O(1) retorno
// Para 1000 usuarios por server esto es ~microsegundos en memoria
// ─────────────────────────────────────────────────────────────────────────────
function obtenerPuesto(guildId, userId) {
    const lista = rankings.get(guildId);
    if (!lista || lista.length === 0) return '-';
    const idx = lista.findIndex(e => e.userId === userId);
    return idx === -1 ? '-' : idx + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR USUARIO — quita su entrada vieja e inserta la nueva ordenada
// ─────────────────────────────────────────────────────────────────────────────
function actualizarUsuario(guildId, userId, nivel, xp) {
    if (!guildId) return;

    let lista = rankings.get(guildId);
    if (!lista) {
        lista = [];
        rankings.set(guildId, lista);
    }

    // Quitamos entrada vieja si existe
    const idx = lista.findIndex(e => e.userId === userId);
    if (idx !== -1) lista.splice(idx, 1);

    // Insertamos en posición correcta
    insertarOrdenado(lista, { userId, nivel, xp });

    // Programamos guardado con debounce de 30s
    scheduleGuardar(guildId);
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARDAR JSON — debounced 30s para no escribir en cada mensaje
// ─────────────────────────────────────────────────────────────────────────────
function scheduleGuardar(guildId) {
    if (_timers.has(guildId)) clearTimeout(_timers.get(guildId));
    _timers.set(guildId, setTimeout(() => {
        guardarRanking(guildId);
        _timers.delete(guildId);
    }, 30000));
}

function guardarRanking(guildId) {
    const lista = rankings.get(guildId);
    if (!lista) return;
    const rutaJSON = path.join(DIR_RANKINGS, `ranking_${guildId}.json`);
    try {
        fs.writeFileSync(
            rutaJSON,
            JSON.stringify({ version: RANKING_VERSION, lista }),
            'utf8'
        );
    } catch (e) {
        log.errorGuardandoJSON(guildId, e.message); // 👈 Log actualizado
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARGAR RANKING DE UN GUILD
// Prioridad: JSON en disco → cruzar miembros Discord con MongoDB
//
// Ya NO dependemos de Guild_ID para la carga inicial porque usuarios legacy
// pueden tenerlo como null. Usamos los miembros reales del servidor como
// fuente de verdad y consultamos MongoDB por Discord_ID.
// ─────────────────────────────────────────────────────────────────────────────
async function cargarRankingGuild(guild) {
    const guildId  = guild.id;
    const rutaJSON = path.join(DIR_RANKINGS, `ranking_${guildId}.json`);

    // Mongo es siempre la fuente de verdad para nivel y XP.
    // El JSON en disco solo sirve como cache de arranque rapido, pero sus valores
    // pueden estar desactualizados si el bot se cayo antes del debounce de 30s.
    // Por eso siempre consultamos Mongo y sobreescribimos nivel/xp del JSON.

    // 1. Traer miembros del servidor
    const members = await guild.members.fetch().catch(() => null);
    if (!members || members.size === 0) {
        rankings.set(guildId, []);
        return;
    }

    const memberIds = Array.from(members.keys());

    // 2. Consultar Mongo — fuente de verdad
    try {
        const usuarios = await Usuario.find(
            { Discord_ID: { $in: memberIds } },
            { Discord_ID: 1, 'Social.Nivel': 1, 'Social.XP': 1 }
        ).lean();

        if (usuarios.length > 0) {
            const lista = usuarios.map(u => ({
                userId: u.Discord_ID,
                nivel:  u.Social?.Nivel ?? 1,
                xp:     u.Social?.XP    ?? 0
            }));
            lista.sort(cmpDesc);
            rankings.set(guildId, lista);
            guardarRanking(guildId); // Actualizamos el JSON con datos frescos de Mongo
            log.rankingGuildCargado(guild.name, lista.length);
        } else {
            rankings.set(guildId, []);
            log.rankingGuildFallido(guild.name);
        }
    } catch (e) {
        // Mongo fallo — intentamos el JSON como fallback de emergencia
        log.errorCargandoGuild(guild.name, e.message);
        if (fs.existsSync(rutaJSON)) {
            try {
                const raw    = fs.readFileSync(rutaJSON, 'utf8');
                const parsed = JSON.parse(raw);
                const data   = parsed.version === RANKING_VERSION ? parsed.lista : null;
                if (Array.isArray(data) && data.length > 0) {
                    data.sort(cmpDesc);
                    rankings.set(guildId, data);
                    return;
                }
            } catch (_) {}
        }
        rankings.set(guildId, []);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAR — llamado desde iniciarMotorXP(client) al arrancar el bot
// Carga en paralelo los rankings de todos los servidores donde está el bot
// ─────────────────────────────────────────────────────────────────────────────
async function inicializarRankings(client) {
    const guilds = Array.from(client.guilds.cache.values())
        .filter(g => !GUILDS_EXCLUIDOS.has(g.id));
    log.iniciandoCargaRankings(guilds.length);

    await Promise.all(guilds.map(guild => cargarRankingGuild(guild)));

    const totalUsuarios = Array.from(rankings.values()).reduce((s, l) => s + l.length, 0);
    log.rankingsCargados(totalUsuarios);
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUSH FORZADO — guarda todos los rankings pendientes (útil al apagar el bot)
// ─────────────────────────────────────────────────────────────────────────────
function flushTodos() {
    for (const [guildId] of rankings) {
        if (_timers.has(guildId)) {
            clearTimeout(_timers.get(guildId));
            _timers.delete(guildId);
        }
        guardarRanking(guildId);
    }
}

// Guardamos todo si el proceso se cierra inesperadamente
process.on('exit',    flushTodos);
process.on('SIGINT',  () => { flushTodos(); process.exit(0); });
process.on('SIGTERM', () => { flushTodos(); process.exit(0); });

module.exports = { inicializarRankings, obtenerPuesto, actualizarUsuario, _rankings: rankings };