// Modulos/Principales/Nivel/bitacora.js

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', z: '\x1b[34m', b: '\x1b[0m' };

const TAG = '[Nivel]';

// 🕐 Hora actual formateada en gris tenue
const hora = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `[2m[${h}:${m}:${s}][0m`;
};

module.exports = {

    // ── ARRANQUE ─────────────────────────────────────────────────────────────
    moduloIniciando: () =>
        console.log(`${hora()} ${TAG} Iniciando carga del módulo.`),

    estructuraCargando: () =>
        console.log(`${hora()} ${c.z}·${c.b} Iniciando carga de la estructura...`),

    controlFlujoListo: () =>
        console.log(`${hora()} ${c.v}  ·${c.b} Control de flujo listo.`),
    controlFlujoFallido: (err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} Control de flujo falló:`, err),

    rastreoVozListo: () =>
        console.log(`${hora()} ${c.v}  ·${c.b} Rastreo de canales de voz listo.`),
    rastreoVozFallido: (err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} Rastreo de canales de voz falló:`, err),

    escuchaMensajesLista: () =>
        console.log(`${hora()} ${c.v}  ·${c.b} Escucha de mensajes lista.`),
    escuchaMensajesFallida: (err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} Escucha de mensajes falló:`, err),

    motorListo: () =>
        console.log(`${hora()} ${c.v}  ·${c.b} Motor de experiencia listo.`),
    motorFallido: (err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} Motor de experiencia falló:`, err),

    estructuraCargada: () =>
        console.log(`${hora()} ${c.v}·${c.b} Estructura cargada correctamente.`),
    estructuraCargadaConFallos: () =>
        console.error(`${hora()} ${c.r}·${c.b} Estructura cargada con problemas graves.`),

    // ── CANVAS ───────────────────────────────────────────────────────────────
    canvasCargando: () =>
        console.log(`${hora()} ${c.z}·${c.b} Iniciando carga de elementos visuales...`),

    canvasFuentesListas: () =>
        console.log(`${hora()} ${c.v}  ·${c.b} Fuentes listas.`),
    canvasFuentesFallidas: (err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} Fuentes fallaron:`, err),

    canvasImagenesListas: () =>
        console.log(`${hora()} ${c.v}  ·${c.b} Imágenes listas.`),
    canvasImagenesFallidas: (err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} Imágenes fallaron:`, err),

    canvasCargado: () =>
        console.log(`${hora()} ${c.v}·${c.b} Elementos visuales cargados correctamente.`),
    canvasCargadoConFallos: () =>
        console.error(`${hora()} ${c.r}·${c.b} Elementos visuales cargados con problemas graves.`),

    // ── COMANDOS ─────────────────────────────────────────────────────────────
    comandosCargando: () =>
        console.log(`${hora()} ${c.z}·${c.b} Iniciando carga de comandos...`),

    comandoListo: (nombre) =>
        console.log(`${hora()} ${c.v}  ·${c.b} /${nombre} listo.`),
    comandoFallido: (nombre, err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} /${nombre} falló:`, err),

    comandosCargados: () =>
        console.log(`${hora()} ${c.v}·${c.b} Comandos cargados correctamente.`),
    comandosCargadosConFallos: () =>
        console.error(`${hora()} ${c.r}·${c.b} Comandos cargados con problemas graves.`),

    // ── RANKINGS ─────────────────────────────────────────────────────────────
    iniciandoCargaRankings: (cantidad) =>
        console.log(`${hora()} ${c.z}·${c.b} Iniciando carga de rankings y usuarios...`),

    rankingGuildCargado: (nombreGuild, cantidad) =>
        console.log(`${hora()} ${c.v}  ·${c.b} ${nombreGuild}:\n${hora()}     ${c.v}·${c.b} ${cantidad} usuarios listos.\n${hora()}     ${c.v}·${c.b} Ranking listo.`),

    rankingGuildFallido: (nombreGuild) =>
        console.log(`${hora()} ${c.a}  ·${c.b} ${nombreGuild}:\n${hora()}     ${c.a}·${c.b} Sin usuarios matriculados.`),

    rankingsCargados: () =>
        console.log(`${hora()} ${c.v}·${c.b} Rankings y usuarios cargados correctamente.`),
    rankingsCargadosConAdvertencias: () =>
        console.log(`${hora()} ${c.a}·${c.b} Rankings y usuarios cargados con complicaciones ligeras.`),
    rankingsCargadosConFallos: () =>
        console.error(`${hora()} ${c.r}·${c.b} Rankings y usuarios cargados con problemas graves.`),
    rankingsFallidos: (err) =>
        console.error(`${hora()} ${c.r}·${c.b} Rankings fallaron al cargar:`, err),

    moduloCargado: () =>
        console.log(`${hora()} ${TAG} Módulo cargado correctamente.\n${hora()}`),
    moduloCargadoConAdvertencias: () =>
        console.log(`${hora()} ${TAG} Módulo cargado con complicaciones ligeras.\n`),
    moduloCargadoConFallos: () =>
        console.error(`${hora()} ${TAG} Módulo cargado con problemas graves.\n`),

    // ── EJECUCIÓN DE COMANDOS ────────────────────────────────────────────────
    comandoEjecutado: (username, comando) =>
        console.log(`${hora()} ${TAG} ${username} usó /${comando}.\n${hora()} ${c.v}·${c.b} Comando ejecutado correctamente.`),
    comandoEjecutadoConError: (username, comando) =>
        console.log(`${hora()} ${TAG} ${username} usó /${comando}.\n${hora()} ${c.r}·${c.b} Comando no ejecutado por culpa de un error.`),
    comandoEjecutadoConAdvertencia: (username, comando) =>
        console.log(`${hora()} ${TAG} ${username} usó /${comando}.\n${hora()} ${c.a}·${c.b} Comando ejecutado con complicaciones ligeras.`),

    // ── SUBIDA DE NIVEL ──────────────────────────────────────────────────────
    usuarioSubioNivel: (username, nivelNuevo) =>
        console.log(`${hora()} ${c.v}·${c.b} ${TAG} ${username} subió al Nivel ${nivelNuevo}.`),

    usuarioSubioRango: (username, tituloNuevo) =>
        console.log(`${hora()} ${c.v}·${c.b} ${TAG} ${username} obtuvo el rango "${tituloNuevo}".`),

    // ── REPARACIÓN ───────────────────────────────────────────────────────────
    reparacionIniciada: () =>
        console.log(`${hora()} ${c.z}·${c.b} ${TAG} [Reparar] Escaneando usuarios atascados...`),

    reparacionCompletada: (revisados, inicializados, subidos) =>
        console.log(`${hora()} ${c.v}·${c.b} ${TAG} [Reparar] Completada. Revisados: ${revisados} | Inicializados: ${inicializados} | Niveles subidos: ${subidos}.`),

    reparacionFallida: (err) =>
        console.error(`${hora()} ${c.r}·${c.b} ${TAG} [Reparar] Falló durante la reparación:`, err),

    // ── ADVERTENCIAS Y EVENTOS (Flujo normal) ────────────────────────────────
    mdBloqueado: (usuario) =>
        console.log(`${hora()} ${c.a}·${c.b} ${TAG} MD bloqueado para ${usuario}. (Alerta de nivel no enviada)`),

    avatarImgurFallido: () =>
        console.warn(`${hora()} ${c.a}·${c.b} ${TAG} [Canvas] Avatar Imgur falló. Reintentando en 5 min.`),

    iconoImgurFallido: (rank) =>
        console.warn(`${hora()} ${c.a}·${c.b} ${TAG} [Canvas] Rank icon ${rank} Imgur falló. Reintentando en 5 min.`),

    // ── ERRORES ──────────────────────────────────────────────────────────────
    errorFuentes: (err) =>
        console.error(`${hora()} ${c.r}·${c.b} ${TAG} [Canvas] Error registrando fuentes:`, err),

    errorComandoNivel: (err) =>
        console.error(`${hora()} ${c.r}·${c.b} ${TAG} [Comando] Error al ejecutar /nivel:`, err),

    errorComandoReparar: (err) =>
        console.error(`${hora()} ${c.r}·${c.b} ${TAG} [Reparar] Error durante la reparacion:`, err),

    errorGuardandoJSON: (guildId, err) =>
        console.error(`${hora()} ${c.r}·${c.b} ${TAG} [Ranking] Error guardando JSON de ${guildId}:`, err),

    errorCargandoGuild: (nombreGuild, err) =>
        console.error(`${hora()} ${c.r}  ·${c.b} ${nombreGuild}:\n${hora()}    ${c.r}·${c.b} Error al cargar:`, err),
};