// preview_logs_inicio.js
// Uso: node preview_logs_inicio.js

const log = require('./bitacora');

const GUILDS_OK = [
    { nombre: 'Awowa | Centro de Operaciones', usuarios: 12 },
    { nombre: 'Juzo Infiel',                   usuarios: 4  },
];
const GUILDS_SIN_USUARIOS = [{ nombre: 'Sala de Pruebas Beta' }];
const GUILDS_ERROR        = [{ nombre: 'Iconos II', err: new Error('MongoNetworkError: connection timeout') }];

function simularEstructura(fallarEn = null) {
    log.moduloIniciando();
    log.estructuraCargando();

    let ok = true;

    // Control de flujo
    if (fallarEn === 'flujo') { log.controlFlujoFallido(new Error('Map corrupto')); ok = false; }
    else                        log.controlFlujoListo();

    // Rastreo de voz
    if (fallarEn === 'voz')   { log.rastreoVozFallido(new Error('sesionesVoz no disponible')); ok = false; }
    else                        log.rastreoVozListo();

    // Escucha de mensajes
    if (fallarEn === 'msgs')  { log.escuchaMensajesFallida(new Error('msgCache no disponible')); ok = false; }
    else                        log.escuchaMensajesLista();

    if (!ok) { log.estructuraCargadaConFallos(); return false; }
    log.estructuraCargada();
    return true;
}

function simularRankings(guilds) {
    let fallos = 0, sinUsuarios = 0;

    log.iniciandoCargaRankings(guilds.length);
    for (const g of guilds) {
        if (g.err)                          { log.errorCargandoGuild(g.nombre, g.err.message); fallos++; }
        else if (!g.usuarios || g.usuarios === 0) { log.rankingGuildFallido(g.nombre); sinUsuarios++; }
        else                                  log.rankingGuildCargado(g.nombre, g.usuarios);
    }

    if (fallos > 0)       log.rankingsCargadosConFallos();
    else if (sinUsuarios) log.rankingsCargadosConAdvertencias();
    else                  log.rankingsCargados();
}

const SEP = '\n' + '─'.repeat(60) + '\n';

console.log(`${SEP}  VARIANTE VERDE — arranque limpio${SEP}`);
if (simularEstructura()) { simularRankings(GUILDS_OK); log.motorXPArrancado(); }

console.log(`${SEP}  VARIANTE AMARILLA — guild sin usuarios${SEP}`);
if (simularEstructura()) { simularRankings([...GUILDS_OK, ...GUILDS_SIN_USUARIOS]); log.motorXPArrancado(); }

console.log(`${SEP}  VARIANTE ROJA — fallo de Mongo en un guild${SEP}`);
if (simularEstructura()) { simularRankings([...GUILDS_OK, ...GUILDS_ERROR]); log.motorXPArrancado(); }

console.log(`${SEP}  VARIANTE ROJA — fallo en la estructura${SEP}`);
simularEstructura('msgs');