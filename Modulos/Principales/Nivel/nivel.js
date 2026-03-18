// Modulos/Principales/Nivel/nivel.js
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const fs   = require('fs');
const path = require('path');
const { actualizarUsuario, inicializarRankings } = require('./ranking.js');
const { iniciarCanvas } = require('./canvas_nivel');
const log = require('./bitacora'); // 👈 Bitácora importada

// ⏱️ Mapas de Memoria Cache
const cooldownsMensajes = new Map();
const sesionesVoz = new Map();

// 🔧 CONFIGURACIÓN DEL SISTEMA
const COOLDOWN_SEGUNDOS   = 60;
const XP_TEXTO_MIN        = 15;
const XP_TEXTO_MAX        = 25;
const XP_VOZ_POR_MINUTO   = 10;
const XP_PARTIDA_DERROTA  = 20; // XP base por jugar una partida
const XP_PARTIDA_VICTORIA = 35; // XP extra si ganaron

// 🧹 BARREDOR DE MEMORIA
setInterval(() => {
    const ahora = Date.now();
    for (const [userId, tiempo] of cooldownsMensajes.entries()) {
        if (ahora > tiempo + (COOLDOWN_SEGUNDOS * 1000)) {
            cooldownsMensajes.delete(userId);
        }
    }
}, 300000);

// 🚀 WATCHER ASÍNCRONO PARA LOS MENSAJES (Cero bloqueos del Event Loop)
let msgCache = {};
const rutaMensajes = path.join(__dirname, 'mensajes.js');
try { msgCache = require('./mensajes.js'); } catch(e) {}

fs.watch(rutaMensajes, (eventType) => {
    if (eventType === 'change') {
        try {
            delete require.cache[require.resolve('./mensajes.js')];
            msgCache = require('./mensajes.js');
        } catch(e) {}
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔒 SISTEMA DE CANDADOS POR USUARIO
// Garantiza que el level-up de un mismo usuario nunca corra en paralelo.
// No requiere ninguna librería externa, funciona con Promises nativas.
// ─────────────────────────────────────────────────────────────────────────────
const _candados = new Map();

async function conCandado(userId, fn) {
    // Tomamos la cola actual (o una promesa resuelta si no hay nada)
    const anterior = _candados.get(userId) || Promise.resolve();

    // Creamos nuestro propio "turno" en la cola
    let liberar;
    const miTurno = new Promise(r => liberar = r);

    // Registramos que ahora nosotros somos el último en la cola
    _candados.set(userId, miTurno);

    // Esperamos a que termine el turno anterior
    await anterior;

    try {
        return await fn();
    } finally {
        // Liberamos para que el siguiente en la cola pueda continuar
        liberar();
        // Limpieza: si nadie más está esperando, borramos la entrada
        if (_candados.get(userId) === miTurno) {
            _candados.delete(userId);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────

const RANGOS_DATA = [
    { lvl: 100, titulo: "Entidad Entre Mundos" },
    { lvl: 95,  titulo: "Voz del Gran Carnero" },
    { lvl: 90,  titulo: "Leyenda Vastaya" },
    { lvl: 85,  titulo: "Maestro de los Dos Reinos" },
    { lvl: 80,  titulo: "Caminante del Hogar" },
    { lvl: 75,  titulo: "Guía de lo Invisible" },
    { lvl: 70,  titulo: "Sabio de la Escarcha" },
    { lvl: 65,  titulo: "Purificador de Almas" },
    { lvl: 60,  titulo: "Heraldo de la Forja" },
    { lvl: 55,  titulo: "Protector del Rebaño" },
    { lvl: 50,  titulo: "Guardián de los Recuerdos" },
    { lvl: 45,  titulo: "Saltador de Reinos" },
    { lvl: 40,  titulo: "Tejedor de Vínculos" },
    { lvl: 35,  titulo: "Viajero de la Nieve" },
    { lvl: 30,  titulo: "Amigo de los Extraviados" },
    { lvl: 25,  titulo: "Investigador de Runas" },
    { lvl: 20,  titulo: "Vidente del Velo" },
    { lvl: 15,  titulo: "Estudiante Bryni" },
    { lvl: 10,  titulo: "Caminante de la Tundra" },
    { lvl: 5,   titulo: "Oyente de los Susurros" },
    { lvl: 0,   titulo: "Forastero de Aamu" }
];

function obtenerTituloRango(nivel) {
    for (let i = 0; i < RANGOS_DATA.length; i++) {
        if (nivel >= RANGOS_DATA[i].lvl) return RANGOS_DATA[i].titulo;
    }
    return RANGOS_DATA[RANGOS_DATA.length - 1].titulo;
}

function calcularXPMeta(nivel) {
    const nivelSeguro = nivel < 1 ? 1 : nivel;
    return Math.floor(100 * Math.pow(nivelSeguro, 1.5));
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎉 LÓGICA DE SUBIDA DE NIVEL (Con candado inteligente)
// ─────────────────────────────────────────────────────────────────────────────
async function procesarSubidaNivel(client, userId, username) {
    return conCandado(userId, async () => {

        const freshUser = await Usuario.findOne({ Discord_ID: userId });
        if (!freshUser?.Social) return;

        // 1. Guardamos exactamente lo que dice MongoDB (puede ser undefined si es nuevo)
        const nivelEnBD = freshUser.Social.Nivel;

        // 2. Si es undefined, asumimos 1 para las matemáticas
        let nivelActual = nivelEnBD ?? 1;
        let xpActual    = freshUser.Social.XP ?? 0;
        let xpMeta = calcularXPMeta(nivelActual);
        let subioNivel = false;

        // 3. Calculamos cuántos niveles sube
        while (xpActual >= xpMeta) {
            xpActual   -= xpMeta;
            nivelActual += 1;
            subioNivel  = true;
            xpMeta = calcularXPMeta(nivelActual);
        }

        if (!subioNivel) return;

        // 4. Optimistic lock basado en XP (no en Nivel, que puede ser null/undefined en legacy)
        // Si otro proceso modificó el XP entre el findOne y este update, el filtro no matchea
        // y abortamos correctamente sin pisar datos. El candado en memoria reduce esto a casi cero.
        const xpLeido = freshUser.Social.XP ?? 0;

        // 5. Intentamos guardar en MongoDB
        const resultado = await Usuario.findOneAndUpdate(
            { Discord_ID: userId, 'Social.XP': xpLeido },
            { $set: { 'Social.Nivel': nivelActual, 'Social.XP': xpActual } },
            { returnDocument: 'after' }
        );

        if (!resultado) return; // El XP cambio entre medio, otro proceso ya lo manejo

        // 6. Sincronizamos con la memoria (ranking)
        actualizarUsuario(resultado.Guild_ID, userId, nivelActual, xpActual);

        // 7. Avisamos de la subida
        const tituloAnterior = obtenerTituloRango(nivelEnBD ?? 1);
        const tituloNuevo    = obtenerTituloRango(nivelActual);

        if (tituloAnterior !== tituloNuevo) {
            try {
                let textoAlerta = `🎉 ¡Felicidades <@${userId}>! Has alcanzado el **Nivel ${nivelActual}** y te conviertes en **${tituloNuevo}**.`;

                if (typeof msgCache.AlertaNivel === 'function') {
                    textoAlerta = msgCache.AlertaNivel(`<@${userId}>`, nivelActual, tituloNuevo);
                }

                const userDiscord = await client.users.fetch(userId).catch(() => null);
                if (userDiscord) await userDiscord.send(textoAlerta).catch(() => null);
            } catch (error) {
                log.mdBloqueado(username);
            }
        }
    });
}

// 💬 XP POR TEXTO
async function otorgarXPMensaje(client, message) {
    const userId = message.author.id;
    const ahora  = Date.now();

    if (cooldownsMensajes.has(userId)) {
        if (ahora < cooldownsMensajes.get(userId) + (COOLDOWN_SEGUNDOS * 1000)) return;
    }

    cooldownsMensajes.set(userId, ahora);
    const xpGanada = Math.floor(Math.random() * (XP_TEXTO_MAX - XP_TEXTO_MIN + 1)) + XP_TEXTO_MIN;

    // $inc atómico: no hay window de race condition aquí
    const userDB = await Usuario.findOneAndUpdate(
        { Discord_ID: userId },
        { $inc: { 'Social.XP': xpGanada, 'Social.Mensajes': 1 } },
        { returnDocument: 'after' }
    );

    if (!userDB?.Social) return;

    const nivelActualMensaje = userDB.Social.Nivel ?? 1;
    actualizarUsuario(userDB.Guild_ID, userId, nivelActualMensaje, userDB.Social.XP);

    if (userDB.Social.XP >= calcularXPMeta(nivelActualMensaje)) {
        await procesarSubidaNivel(client, userId, message.author.username);
    }
}

// 🎙️ XP DE VOZ
async function rastrearVoz(client, oldState, newState) {
    const userId = newState.member.id;
    if (newState.member.user.bot) return;

    const canalAnterior = oldState.channelId;
    const canalNuevo    = newState.channelId;
    const estaInactivo  = newState.selfMute || newState.serverMute || newState.selfDeaf || newState.serverDeaf;

    // Entró a voz o se desmuteó
    if ((!canalAnterior && canalNuevo && !estaInactivo) ||
        (canalAnterior && canalNuevo && !estaInactivo && !sesionesVoz.has(userId))) {
        sesionesVoz.set(userId, Date.now());
        return;
    }

    // Salió del canal o se muteó
    if ((canalAnterior && !canalNuevo) || estaInactivo) {
        if (sesionesVoz.has(userId)) {
            const tiempoEntrada = sesionesVoz.get(userId);
            sesionesVoz.delete(userId);

            const minutosTranscurridos = Math.floor((Date.now() - tiempoEntrada) / 60000);

            if (minutosTranscurridos >= 1) {
                // $inc atómico
                const userDB = await Usuario.findOneAndUpdate(
                    { Discord_ID: userId },
                    { $inc: {
                        'Social.XP': minutosTranscurridos * XP_VOZ_POR_MINUTO,
                        'Social.Minutos_Voz': minutosTranscurridos
                    }},
                    { returnDocument: 'after' }
                );

                if (!userDB?.Social) return;

                const nivelActualVoz = userDB.Social.Nivel ?? 1;
                actualizarUsuario(userDB.Guild_ID, userId, nivelActualVoz, userDB.Social.XP);

                if (userDB.Social.XP >= calcularXPMeta(nivelActualVoz)) {
                    await procesarSubidaNivel(client, userId, newState.member.user.username);
                }
            }
        }
    }
}

// 🎮 XP POR PARTIDAS (llamado desde actualizador_bg.js)
// Recibe el userDB de MongoDB y el array de partidas nuevas ya procesadas.
// Da XP por cada partida: más si ganaron, menos si perdieron.
// También incrementa Partidas_Registradas para llevar el contador total.
async function otorgarXPPartidas(client, userDB, partidas) {
    if (!partidas || partidas.length === 0) return;

    let xpTotal        = 0;
    let partidasReales = 0; // No contamos remakes

    for (const match of partidas) {
        const info = match?.info;
        if (!info) continue;

        const yo = info.participants?.find(p => p.puuid === userDB.PUUID);
        if (!yo) continue;

        // Ignoramos remakes (menos de 5 minutos)
        const duracionS = info.gameDuration > 10000
            ? Math.floor(info.gameDuration / 1000)
            : info.gameDuration;
        if (duracionS <= 270) continue;

        xpTotal += yo.win ? XP_PARTIDA_VICTORIA : XP_PARTIDA_DERROTA;
        partidasReales++;
    }

    if (partidasReales === 0) return;

    // $inc atómico: sin race conditions
    const updatedUser = await Usuario.findOneAndUpdate(
        { Discord_ID: userDB.Discord_ID },
        { $inc: {
            'Social.XP':                   xpTotal,
            'Social.Partidas_Registradas': partidasReales
        }},
        { returnDocument: 'after' }
    );

    if (!updatedUser?.Social) return;

    const nivelActualPartida = updatedUser.Social.Nivel ?? 1;
    actualizarUsuario(updatedUser.Guild_ID, userDB.Discord_ID, nivelActualPartida, updatedUser.Social.XP);

    if (updatedUser.Social.XP >= calcularXPMeta(nivelActualPartida)) {
        await procesarSubidaNivel(client, userDB.Discord_ID, userDB.Discord_Nick);
    }
}

async function iniciarMotorXP(client) {
    log.moduloIniciando();
    log.estructuraCargando();

    let hayFallos       = false;
    let hayAdvertencias = false;
    let estructuraOk    = true;

    // 1. Control de flujo (candados + cooldowns)
    try {
        // Los Maps ya existen al importar; aquí verificamos que respondan
        _candados.size;
        cooldownsMensajes.size;
        log.controlFlujoListo();
    } catch (err) {
        log.controlFlujoFallido(err);
        estructuraOk = false;
        hayFallos = true;
    }

    // 2. Rastreo de canales de voz
    try {
        sesionesVoz.size;
        log.rastreoVozListo();
    } catch (err) {
        log.rastreoVozFallido(err);
        estructuraOk = false;
        hayFallos = true;
    }

    // 3. Escucha de mensajes (watcher de mensajes.js)
    try {
        if (!msgCache || typeof msgCache !== 'object') throw new Error('msgCache no disponible');
        log.escuchaMensajesLista();
    } catch (err) {
        log.escuchaMensajesFallida(err);
        estructuraOk = false;
        hayFallos = true;
    }

    // 4. Motor de experiencia
    try {
        if (typeof otorgarXPMensaje !== 'function') throw new Error('Motor no disponible');
        log.motorListo();
    } catch (err) {
        log.motorFallido(err);
        estructuraOk = false;
        hayFallos = true;
    }

    if (!estructuraOk) {
        log.estructuraCargadaConFallos();
        return;
    }

    log.estructuraCargada();

    // Canvas — fuentes e imágenes
    const canvasOk = await iniciarCanvas();
    if (!canvasOk) hayFallos = true;

    // Comandos slash del módulo
    log.comandosCargando();
    let comandosOk = true;
    const archivosComandos = fs.readdirSync(__dirname).filter(f => f.startsWith('cmd_') && f.endsWith('.js'));
    for (const archivo of archivosComandos) {
        try {
            const cmd = require(path.join(__dirname, archivo));
            const cmds = Array.isArray(cmd) ? cmd : [cmd];
            for (const c of cmds) {
                if (c.data) log.comandoListo(c.name);
            }
        } catch (err) {
            log.comandoFallido(archivo.replace('cmd_', '').replace('.js', ''), err);
            comandosOk = false;
        }
    }
    if (comandosOk) log.comandosCargados();
    else          { log.comandosCargadosConFallos(); hayFallos = true; }

    try {
        await inicializarRankings(client);
    } catch (err) {
        log.rankingsFallidos(err);
        hayFallos = true;
    }

    if (hayFallos)       log.moduloCargadoConFallos();
    else if (hayAdvertencias) log.moduloCargadoConAdvertencias();
    else                 log.moduloCargado();
}

// 👇 Ahora exportamos todas las funciones necesarias
module.exports = { otorgarXPMensaje, rastrearVoz, otorgarXPPartidas, iniciarMotorXP, procesarSubidaNivel, calcularXPMeta };