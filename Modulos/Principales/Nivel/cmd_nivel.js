// Modulos/Principales/Nivel/cmd_nivel.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { generarCanvasNivel } = require('./canvas_nivel');
const { obtenerPuesto } = require('./motor_ranking');
const fs = require('fs');
const path = require('path');

// 🚀 WATCHER ASÍNCRONO PARA LOS MENSAJES (Fuera del Event Loop)
let txtSlash = {};
let msgCache = {};

try { txtSlash = require('./slash_descripciones.js'); } catch(e) {}
try { msgCache = require('./mensajes.js'); }           catch(e) {}

fs.watch(path.join(__dirname, 'mensajes.js'), (eventType) => {
    if (eventType === 'change') {
        try { delete require.cache[require.resolve('./mensajes.js')]; msgCache = require('./mensajes.js'); } catch(e) {}
    }
});
fs.watch(path.join(__dirname, 'slash_descripciones.js'), (eventType) => {
    if (eventType === 'change') {
        try { delete require.cache[require.resolve('./slash_descripciones.js')]; txtSlash = require('./slash_descripciones.js'); } catch(e) {}
    }
});

module.exports = {
    name: 'nivel',
    data: new SlashCommandBuilder()
        .setName('nivel')
        .setDescription(txtSlash.NivelDesc ? txtSlash.NivelDesc.substring(0, 100) : 'Muestra la tarjeta de nivel social.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription(txtSlash.OptUserDesc ? txtSlash.OptUserDesc.substring(0, 100) : 'Menciona a un usuario para ver su nivel.')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const optUser    = interaction.options.getUser('usuario');
        const targetUser = optUser ?? interaction.user;

        if (targetUser.bot) {
            const mencion    = `<@${interaction.user.id}>`;
            const textoError = typeof msgCache.ErrBot === 'function' ? msgCache.ErrBot(mencion) : msgCache.ErrBot;
            return interaction.editReply(textoError);
        }

        const userDB = await Usuario.findOne({ Discord_ID: targetUser.id });
        if (!userDB) return interaction.editReply(msgCache.ErrNoDB || "❌ No pude encontrar a ese usuario en la base de datos.");

        const miembroEnServidor = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        try {
            const uNivel = userDB.Social?.Nivel || 1;
            const uXP    = userDB.Social?.XP    || 0;

            // Puesto desde el ranking en memoria — instantáneo, sin query a MongoDB
            const posicionReal = miembroEnServidor
                ? obtenerPuesto(interaction.guild.id, targetUser.id)
                : "-";

            let apodoReal = userDB.Discord_Nick || targetUser.username;
            if (miembroEnServidor?.displayName) {
                apodoReal = miembroEnServidor.displayName;
            }

            const socialData   = { Nivel: uNivel, XP: uXP, Posicion: posicionReal };
            const bufferImagen = await generarCanvasNivel(socialData, apodoReal, targetUser.username, targetUser.id);
            const adjunto      = new AttachmentBuilder(bufferImagen, { name: `nivel_${userDB.Numero_Matricula}.webp` });

            await interaction.editReply({ content: null, files: [adjunto] });

        } catch (error) {
            console.error('\x1b[31m·\x1b[0m [Error Cmd Nivel]', error);
            await interaction.editReply(msgCache.ErrInterno || "❌ Ocurrió un error interno al intentar procesar las estadísticas.");
        }
    }
};