// Modulos/Principales/Matrimonio/matrimonio.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Matrimonio       = require('../../../Base_Datos/MongoDB/Matrimonio');
const CooldownDivorcio = require('../../../Base_Datos/MongoDB/CooldownDivorcio');
const Usuario          = require('../../../Base_Datos/MongoDB/Usuario');
const log              = require('./bitacora');
const fs               = require('fs');
const path             = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// ⏱️ CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const PROPUESTA_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
const COOLDOWN_DIVORCIO_MS = 60 * 60 * 1000; // 1 hora post-divorcio

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 HOT-RELOAD DE MENSAJES (fs.watch — sin borrar caché en cada llamada)
// ─────────────────────────────────────────────────────────────────────────────
let msg = {};
try { msg = require('./mensajes.js'); } catch(e) {}

fs.watch(path.join(__dirname, 'mensajes.js'), (eventType) => {
    if (eventType === 'change') {
        try {
            delete require.cache[require.resolve('./mensajes.js')];
            msg = require('./mensajes.js');
        } catch(e) {}
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔒 MAPA DE PROPUESTAS ACTIVAS EN MEMORIA
// { userId: { targetId, expira } }
// ─────────────────────────────────────────────────────────────────────────────
const propuestasActivas = new Map();

setInterval(() => {
    const ahora = Date.now();
    for (const [userId, propuesta] of propuestasActivas.entries()) {
        if (ahora > propuesta.expira) propuestasActivas.delete(userId);
    }
}, 5 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — globales, sin Guild_ID
// ─────────────────────────────────────────────────────────────────────────────
async function estaEnCooldown(userId) {
    const registro = await CooldownDivorcio.findOne({ Discord_ID: userId });
    if (!registro) return null;
    if (Date.now() < registro.DisponibleEn.getTime()) return registro.DisponibleEn;
    await CooldownDivorcio.deleteOne({ Discord_ID: userId });
    return null;
}

async function obtenerMatrimonio(userId) {
    return Matrimonio.findOne({
        $or: [{ Usuario1_ID: userId }, { Usuario2_ID: userId }]
    });
}

function obtenerPareja(matrimonio, userId) {
    return matrimonio.Usuario1_ID === userId
        ? matrimonio.Usuario2_ID
        : matrimonio.Usuario1_ID;
}

// ─────────────────────────────────────────────────────────────────────────────
// 💍 PROPONER
// ─────────────────────────────────────────────────────────────────────────────
async function ejecutarProponer(interaction) {
    const userId        = interaction.user.id;
    const mencion       = `<@${userId}>`;
    const targetDiscord = interaction.options.getUser('usuario');
    const targetMencion = `<@${targetDiscord.id}>`;

    // 1. Validaciones básicas
    if (targetDiscord.bot) {
        if (targetDiscord.id === interaction.client.user.id) {
            log.validacionFallida(interaction.user.username, 'intentó proponer a Aurora');
            return interaction.editReply({ content: msg.PropuestaAuroraError(mencion), allowedMentions: { users: [userId] } });
        }
        log.validacionFallida(interaction.user.username, 'intentó proponer a un bot');
        return interaction.editReply({ content: msg.PropuestaBotError(mencion), allowedMentions: { users: [userId] } });
    }
    if (targetDiscord.id === userId) {
        log.validacionFallida(interaction.user.username, 'intentó proponerse a sí mismo');
        return interaction.editReply({ content: msg.PropuestaSiMismo(mencion), allowedMentions: { users: [userId] } });
    }

    // 2. Verificación de matrícula
    const usuarioDB = await Usuario.findOne({ Discord_ID: userId });
    if (!usuarioDB) {
        log.validacionFallida(interaction.user.username, 'no está matriculado');
        return interaction.editReply({ content: msg.PropuestaNoMatriculado(mencion), allowedMentions: { users: [userId] } });
    }
    const targetDB = await Usuario.findOne({ Discord_ID: targetDiscord.id });
    if (!targetDB) {
        log.validacionFallida(interaction.user.username, `target ${targetDiscord.username} no está matriculado`);
        return interaction.editReply({ content: msg.PropuestaTargetNoMatriculado(mencion, targetMencion), allowedMentions: { users: [userId] } });
    }

    // 2. Propuesta activa
    if (propuestasActivas.has(userId)) {
        log.validacionFallida(interaction.user.username, 'ya tiene una propuesta activa');
        return interaction.editReply({ content: msg.PropuestaDuplicada(mencion), allowedMentions: { users: [userId] } });
    }

    // 3. Cooldown propio
    const cooldownPropio = await estaEnCooldown(userId);
    if (cooldownPropio) {
        const ts = Math.floor(cooldownPropio.getTime() / 1000);
        log.validacionFallida(interaction.user.username, 'en cooldown post-divorcio');
        return interaction.editReply({ content: msg.PropuestaCooldown(mencion, `<t:${ts}:R>`), allowedMentions: { users: [userId] } });
    }

    // 4. Ya está casado
    if (await obtenerMatrimonio(userId)) {
        log.validacionFallida(interaction.user.username, 'ya está casado');
        return interaction.editReply({ content: msg.PropuestaYaCasado(mencion), allowedMentions: { users: [userId] } });
    }

    // 5. Target ya casado
    if (await obtenerMatrimonio(targetDiscord.id)) {
        log.validacionFallida(interaction.user.username, `target ${targetDiscord.username} ya está casado`);
        return interaction.editReply({ content: msg.PropuestaTargetCasado(mencion, targetMencion), allowedMentions: { users: [userId] } });
    }

    // 6. Cooldown del target
    const cooldownTarget = await estaEnCooldown(targetDiscord.id);
    if (cooldownTarget) {
        log.validacionFallida(interaction.user.username, `target ${targetDiscord.username} en cooldown`);
        return interaction.editReply({ content: msg.PropuestaTargetCooldown(mencion, targetMencion), allowedMentions: { users: [userId] } });
    }

    // 7. Registramos la propuesta activa
    propuestasActivas.set(userId, { targetId: targetDiscord.id, expira: Date.now() + PROPUESTA_TIMEOUT_MS });

    // 8. Enviamos la propuesta con botones — grises, sin emotes
    const btnAceptar  = () => new ButtonBuilder().setCustomId('matrimonio_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Secondary);
    const btnRechazar = () => new ButtonBuilder().setCustomId('matrimonio_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Secondary);

    await interaction.editReply({
        content: msg.PropuestaEnviada(mencion, targetMencion),
        components: [new ActionRowBuilder().addComponents(btnAceptar(), btnRechazar())],
        allowedMentions: { users: [targetDiscord.id] }
    });

    const msgPropuesta = await interaction.fetchReply();
    log.propuestaEnviada(interaction.user.username, targetDiscord.username);

    // 9. Collector — cualquiera puede clickar, pero solo el target puede responder
    const collector = msgPropuesta.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: PROPUESTA_TIMEOUT_MS
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== targetDiscord.id) {
            await i.reply({ content: msg.PropuestaAjena(`<@${i.user.id}>`), ephemeral: true });
            return;
        }

        collector.stop('respondido');
        propuestasActivas.delete(userId);

        const pulsado  = i.customId;
        const rowFinal = new ActionRowBuilder().addComponents(
            btnAceptar().setStyle(pulsado  === 'matrimonio_aceptar'  ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(true),
            btnRechazar().setStyle(pulsado === 'matrimonio_rechazar' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(true)
        );

        await i.deferUpdate();
        await msgPropuesta.edit({ components: [rowFinal] }).catch(err => log.errorRespuesta('proponer edit botones', err));

        if (i.customId === 'matrimonio_aceptar') {
            if (await obtenerMatrimonio(userId) || await obtenerMatrimonio(targetDiscord.id)) {
                await msgPropuesta.reply({ content: msg.PropuestaYaNoCasable(targetMencion), allowedMentions: { users: [targetDiscord.id] } });
                return;
            }

            await Matrimonio.create({ Usuario1_ID: userId, Usuario2_ID: targetDiscord.id });
            await msgPropuesta.reply({ content: msg.MatrimonioCelebrado(mencion, targetMencion), allowedMentions: { users: [userId, targetDiscord.id] } });
            log.matrimonioCelebrado(interaction.user.username, targetDiscord.username);

        } else {
            await msgPropuesta.reply({ content: msg.PropuestaRechazada(mencion, targetMencion), allowedMentions: { users: [userId] } });
            log.propuestaRechazada(interaction.user.username, targetDiscord.username);
        }
    });

    collector.on('end', (collected, reason) => {
        propuestasActivas.delete(userId);
        if (reason !== 'respondido') {
            const rowExpirado = new ActionRowBuilder().addComponents(
                btnAceptar().setDisabled(true),
                btnRechazar().setDisabled(true)
            );
            msgPropuesta.edit({ components: [rowExpirado] }).catch(err => log.errorRespuesta('propuestaExpirada edit', err));
            msgPropuesta.reply({ content: msg.PropuestaExpirada(mencion, targetMencion), allowedMentions: { users: [userId] } }).catch(err => log.errorRespuesta('propuestaExpirada reply', err));
            log.propuestaExpirada(interaction.user.username, targetDiscord.username);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 💔 DIVORCIARSE
// ─────────────────────────────────────────────────────────────────────────────
async function ejecutarDivorciar(interaction) {
    const userId  = interaction.user.id;
    const mencion = `<@${userId}>`;

    // 1. ¿Está casado?
    const matrimonio = await obtenerMatrimonio(userId);
    if (!matrimonio) {
        log.validacionFallida(interaction.user.username, 'no está casado');
        return interaction.editReply({ content: msg.DivorcioNoCasado(mencion), allowedMentions: { users: [userId] } });
    }

    const parejaId      = obtenerPareja(matrimonio, userId);
    const parejaMencion = `<@${parejaId}>`;

    // Obtenemos el username de la pareja para los logs de consola
    let parejaUsername = parejaId;
    try {
        const parejaDiscord = await interaction.client.users.fetch(parejaId);
        parejaUsername = parejaDiscord.username;
    } catch(e) {}

    // 2. ¿El usuario mencionado es su pareja?
    const usuarioMencionado = interaction.options.getUser('usuario');
    if (usuarioMencionado.id !== parejaId) {
        log.validacionFallida(interaction.user.username, `mencionó a ${usuarioMencionado.username} pero está casado con ${parejaUsername}`);
        return interaction.editReply({ content: msg.DivorcioPersonaEquivocada(mencion, `<@${usuarioMencionado.id}>`, parejaMencion), allowedMentions: { users: [userId] } });
    }

    // 2. Confirmación con botones — grises, sin emotes
    const btnConfirmar = () => new ButtonBuilder().setCustomId('divorcio_confirmar').setLabel('Confirmar').setStyle(ButtonStyle.Secondary);
    const btnCancelar  = () => new ButtonBuilder().setCustomId('divorcio_cancelar').setLabel('Cancelar').setStyle(ButtonStyle.Secondary);

    await interaction.editReply({
        content: msg.DivorcioConfirmacion(mencion, parejaMencion),
        components: [new ActionRowBuilder().addComponents(btnConfirmar(), btnCancelar())],
        allowedMentions: { users: [userId] }
    });

    const msgConfirm = await interaction.fetchReply();
    log.divorcioIniciado(interaction.user.username);

    const collector = msgConfirm.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: PROPUESTA_TIMEOUT_MS,
        filter: i => i.user.id === userId,
        max: 1
    });

    collector.on('collect', async (i) => {
        const pulsado  = i.customId;
        const rowFinal = new ActionRowBuilder().addComponents(
            btnConfirmar().setStyle(pulsado === 'divorcio_confirmar' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(true),
            btnCancelar().setStyle(pulsado  === 'divorcio_cancelar'  ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(true)
        );

        await i.deferUpdate();
        await msgConfirm.edit({ components: [rowFinal] }).catch(err => log.errorRespuesta('divorciar edit botones', err));

        if (i.customId === 'divorcio_confirmar') {
            await Matrimonio.deleteOne({ _id: matrimonio._id });

            const disponibleEn = new Date(Date.now() + COOLDOWN_DIVORCIO_MS);
            await CooldownDivorcio.findOneAndUpdate({ Discord_ID: userId   }, { DisponibleEn: disponibleEn }, { upsert: true });
            await CooldownDivorcio.findOneAndUpdate({ Discord_ID: parejaId }, { DisponibleEn: disponibleEn }, { upsert: true });

            await msgConfirm.reply({ content: msg.DivorcioCompletado(mencion, parejaMencion), allowedMentions: { users: [userId, parejaId] } });
            log.divorcioCompletado(interaction.user.username, parejaUsername);
        } else {
            await msgConfirm.reply({ content: msg.DivorcioCancelado(mencion), allowedMentions: { users: [userId] } });
            log.divorcioCancelado(interaction.user.username);
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            const rowExpirado = new ActionRowBuilder().addComponents(
                btnConfirmar().setDisabled(true),
                btnCancelar().setDisabled(true)
            );
            msgConfirm.edit({ components: [rowExpirado] }).catch(err => log.errorRespuesta('divorcioExpirado edit', err));
            msgConfirm.reply({ content: msg.DivorcioExpirado(mencion), allowedMentions: { users: [userId] } }).catch(err => log.errorRespuesta('divorcioExpirado reply', err));
            log.divorcioExpirado(interaction.user.username);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 INICIAR MÓDULO
// ─────────────────────────────────────────────────────────────────────────────
async function iniciarModulo(client) {
    log.iniciandoCarga();
    log.estructuraCargada();

    if (client.commands.has('matrimonio')) {
        log.comandosCargados();
    } else {
        log.error('iniciarModulo', new Error('Comando matrimonio no encontrado en client.commands.'));
    }

    log.moduloCargado();
}

module.exports = {
    ejecutarProponer,
    ejecutarDivorciar,
    obtenerMatrimonio,
    obtenerPareja,
    iniciarModulo
};