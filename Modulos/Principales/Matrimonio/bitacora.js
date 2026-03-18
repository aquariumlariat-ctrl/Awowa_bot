// Modulos/Principales/Matrimonio/bitacora.js

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', z: '\x1b[34m', b: '\x1b[0m' };

const TAG = '[Matrimonio]';

module.exports = {

    // ── ENCENDIDO ────────────────────────────────────────────────────────────
    iniciandoCarga: () =>
        console.log(`${TAG} Iniciando carga del módulo.`),

    estructuraCargada: () =>
        console.log(`${c.v}·${c.b} Estructura cargada correctamente.`),

    comandosCargados: () =>
        console.log(`${c.v}·${c.b} Comando matrimonio y sus componentes cargados correctamente.`),

    moduloCargado: () =>
        console.log(`${c.v}·${c.b} Módulo cargado correctamente.\n`),

    // ── USO DE COMANDOS ──────────────────────────────────────────────────────
    propuestaEnviada: (usuario, target) =>
        console.log(`${c.a}·${c.b} ${TAG} ${usuario} envió una propuesta a ${target}.`),

    divorcioIniciado: (usuario) =>
        console.log(`${c.a}·${c.b} ${TAG} ${usuario} inició el proceso de divorcio.`),

    // ── VALIDACIONES (flujo normal) ──────────────────────────────────────────
    validacionFallida: (usuario, motivo) =>
        console.log(`${c.a}·${c.b} ${TAG} ${usuario} no aprobo su matriomonio, ${motivo}.`),

    // ── RESPUESTAS A BOTONES / CADUCIDAD ─────────────────────────────────────
    matrimonioCelebrado: (usuario, target) =>
        console.log(`${c.v}·${c.b} ${TAG} ${usuario} y ${target} se casaron.`),

    propuestaRechazada: (usuario, target) =>
        console.log(`${c.a}·${c.b} ${TAG} ${target} rechazó la propuesta de ${usuario}.`),

    propuestaExpirada: (usuario, target) =>
        console.log(`${c.a}·${c.b} ${TAG} Propuesta de ${usuario} a ${target} expiró sin respuesta.`),

    divorcioCompletado: (usuario, pareja) =>
        console.log(`${c.v}·${c.b} ${TAG} ${usuario} y ${pareja} se divorciaron.`),

    divorcioCancelado: (usuario) =>
        console.log(`${c.a}·${c.b} ${TAG} ${usuario} canceló el divorcio.`),

    divorcioExpirado: (usuario) =>
        console.log(`${c.a}·${c.b} ${TAG} Confirmación de divorcio de ${usuario} expiró sin respuesta.`),

    // ── ERRORES ──────────────────────────────────────────────────────────────
    error: (comando, err) =>
        console.error(`${c.r}·${c.b} ${TAG} Error en ${comando}:`, err),

    errorRespuesta: (contexto, err) =>
        console.error(`${c.r}·${c.b} ${TAG} Error al responder en ${contexto}:`, err),
};