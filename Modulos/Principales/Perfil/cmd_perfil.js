// Modulos/Principales/Perfil/cmd_perfil.js
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs'); 
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { renderizarYGuardarPerfil } = require('./perfil'); // 👇 Importamos el motor de dibujo

module.exports = [
    {
        name: 'perfil',
        description: 'Muestra tu tarjeta de matrícula y estadísticas a la velocidad de la luz.',
        async execute(message, args) {
            
            let targetUser = null;

            // 1. 🔍 BUSCADOR UNIVERSAL
            if (args.length === 0) {
                targetUser = await Usuario.findOne({ Discord_ID: message.author.id });
            } else {
                const input = args.join(' ').trim();
                if (message.mentions.users.size > 0) {
                    targetUser = await Usuario.findOne({ Discord_ID: message.mentions.users.first().id });
                } else if (/^#?\d{1,5}$/.test(input)) {
                    const num = parseInt(input.replace('#', ''), 10);
                    targetUser = await Usuario.findOne({ Numero_Matricula: num });
                } else if (/^\d{17,20}$/.test(input)) {
                    targetUser = await Usuario.findOne({ Discord_ID: input });
                } else if (input.includes('#')) {
                    const regex = new RegExp(`^${input.replace(/#/g, '\\#')}$`, 'i');
                    targetUser = await Usuario.findOne({ Riot_ID: regex });
                } else {
                    return message.reply('❌ Formato incorrecto. Usa: Mención, Matrícula (`#3`) o Riot ID (`Nombre#Tag`).');
                }
            }

            if (!targetUser) {
                return message.reply('❌ No encontré a ese usuario en la base de datos de la Academia.');
            }

            // 2. 📁 BUSCAR FOTOS EN CACHÉ LOCAL
            const numMatricula = targetUser.Numero_Matricula;
            const nickSeguro = targetUser.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
            const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);
            
            const rutaTarjeta = path.join(carpetaPath, 'tarjeta.png');
            const rutaStats = path.join(carpetaPath, 'stats_soloq.png');

            let msgCarga = null;

            // 👇 AQUI ESTÁ LA MAGIA AUTOMÁTICA 👇
            // Si falta alguna imagen, la mandamos a dibujar en vivo
            if (!fs.existsSync(rutaTarjeta) || !fs.existsSync(rutaStats)) {
                msgCarga = await message.reply('⏳ `El perfil visual de este usuario aún no existe. Dibujando por primera vez...`');
                
                const exito = await renderizarYGuardarPerfil(targetUser);
                
                if (!exito) {
                    return msgCarga.edit('❌ Hubo un error dibujando el perfil por primera vez.').catch(()=>{});
                }
            }

            // 3. 🚀 ENVIAR RESULTADOS
            const adjuntoTarjeta = new AttachmentBuilder(rutaTarjeta, { name: 'tarjeta.png' });
            const adjuntoStats = new AttachmentBuilder(rutaStats, { name: 'stats_soloq.png' });

            // Si tuvimos que hacer tiempo dibujando, editamos el mensaje de carga
            if (msgCarga) {
                await Promise.all([
                    msgCarga.edit({ 
                        content: `✨ Perfil competitivo de **${targetUser.Riot_ID}**:`, 
                        files: [adjuntoTarjeta] 
                    }),
                    message.channel.send({ 
                        files: [adjuntoStats] 
                    })
                ]).catch(()=>{});
            } else {
                // Si las fotos ya existían, disparamos todo directo sin mensajes de carga
                await Promise.all([
                    message.channel.send({ 
                        content: `✨ Perfil competitivo de **${targetUser.Riot_ID}**:`, 
                        files: [adjuntoTarjeta] 
                    }),
                    message.channel.send({ 
                        files: [adjuntoStats] 
                    })
                ]);
            }
        }
    }
];