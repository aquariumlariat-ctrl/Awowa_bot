// Modulos/Principales/Nivel/cmd_nivel.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { generarCanvasNivel } = require('./canvas_nivel');
const { obtenerPuesto } = require('./ranking');
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
        if (!userDB) return interaction.editReply(msgCache.ErrNoDB);

        const miembroEnServidor = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        try {
            const uNivel = userDB.Social?.Nivel || 1;
            const uXP    = userDB.Social?.XP    || 0;

            // Puesto desde el ranking en memoria
            const posicionReal = miembroEnServidor
                ? obtenerPuesto(interaction.guild.id, targetUser.id)
                : "-";

            let apodoReal = userDB.Discord_Nick || targetUser.username;
            if (miembroEnServidor?.displayName) {
                apodoReal = miembroEnServidor.displayName;
            }

            // 👇 SISTEMA DE DEPURACIÓN DE NOMBRES (IDÉNTICO AL CANVAS)
            let nickFiltrado = (apodoReal || "").replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, ' ').trim();
            if (nickFiltrado.length === 0) {
                nickFiltrado = (targetUser.username || "jugador").toLowerCase().replace(/\s+/g, '');
            }
            const nombreVisible = nickFiltrado.charAt(0).toUpperCase() + nickFiltrado.slice(1);

            // 👇 EXTRACCIÓN DEL EMOJI DE LA APP (IDÉNTICO A LA BITÁCORA)
            let emojiAsignado = "👤"; 
            try {
                const nombreEsperado = `mat_${targetUser.id}`.substring(0, 32);
                
                // Primero busca en caché rápido
                let emojiExistente = interaction.client.application.emojis.cache.find(e => e.name === nombreEsperado);
                
                // Si no está, lo pedimos a la API
                if (!emojiExistente) {
                    const fetchedEmojis = await interaction.client.application.emojis.fetch();
                    emojiExistente = fetchedEmojis.find(e => e.name === nombreEsperado);
                }

                if (emojiExistente) {
                    emojiAsignado = `<:${emojiExistente.name}:${emojiExistente.id}>`;
                }
            } catch (e) {
                // Silencioso. Si falla, usamos el 👤 de respaldo.
            }

            const socialData   = { Nivel: uNivel, XP: uXP, Posicion: posicionReal };
            
            // 👇 Pasamos la ID del servidor como el 5to parámetro
            const guildIdToCache = interaction.guild?.id || "DM";
            const bufferImagen = await generarCanvasNivel(socialData, apodoReal, targetUser.username, targetUser.id, guildIdToCache);
            
            const adjunto      = new AttachmentBuilder(bufferImagen, { name: `nivel_${userDB.Numero_Matricula}.webp` });

            // 👇 SE MANDA AL MENSAJERO CACHEADO EL EMOJI Y EL NOMBRE YA DEPURADO
            const textoAcompañante = typeof msgCache.CmdNivelMsg === 'function' ? msgCache.CmdNivelMsg(emojiAsignado, nombreVisible) : msgCache.CmdNivelMsg;

            await interaction.editReply({ content: textoAcompañante, files: [adjunto] });

        } catch (error) {
            console.error('\x1b[31m·\x1b[0m [Error Cmd Nivel]', error);
            await interaction.editReply(msgCache.ErrInterno);
        }
    }
};