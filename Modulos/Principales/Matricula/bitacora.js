// Modulos/Principales/Matricula/bitacora.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario.js');
const { generarTarjetaMatricula } = require('./tarjeta_matricula');
const { regionAPlatforma, obtenerSummoner, obtenerRangos } = require("../../../API's/Riot/lol_api");
const { obtenerRangoTFT } = require("../../../API's/Riot/tft_api");

const CANAL_LOGS_ID = '1475684884629426318';
const CANAL_GALERIA_ID = '1475684653967872013';
const SERVIDOR_EMOJIS_ID = '1469588794599800895'; // Tu servidor de emojis
const EMOJI_DOT = '<:a:1475892023134523472>'; // Tu Dot personalizado

function crearBotones(currentPage, totalUsuarios) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('galeria_first').setEmoji('⏪').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('galeria_prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('galeria_refresh').setEmoji('🔄').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('galeria_next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalUsuarios)
    );
}

// ✂️ FUNCIÓN PARA RECORTAR EL AVATAR EN CÍRCULO ✂️
async function obtenerAvatarCircular(url) {
    const canvas = createCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    const img = await loadImage(url);
    
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    ctx.drawImage(img, 0, 0, 128, 128);
    return canvas.toBuffer();
}

// 🆕 SISTEMA DE LOGS (NUEVOS REGISTROS) 🆕
async function logNuevaMatricula(client, user, riotID, numeroMatricula) {
    try {
        const canalLogs = await client.channels.fetch(CANAL_LOGS_ID);
        if (!canalLogs) return;

        let emojiAsignado = "👤"; 
        const servidorEmojis = await client.guilds.fetch(SERVIDOR_EMOJIS_ID).catch(() => null);
        
        if (servidorEmojis) {
            try {
                const avatarURL = user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
                const bufferCircular = await obtenerAvatarCircular(avatarURL); 
                const emojiName = `mat_${user.id}`.substring(0, 32); 
                const nuevoEmoji = await servidorEmojis.emojis.create({ attachment: bufferCircular, name: emojiName });
                emojiAsignado = `<:${nuevoEmoji.name}:${nuevoEmoji.id}>`;
            } catch (e) {
                console.error("⚠️ Fallo al crear el emoji personalizado, usando el default:", e.message);
            }
        }

        const date = new Date();
        const fechaHora = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        const nombreUsuario = user.username; // Usamos el global username

        // 👇 Nueva plantilla aplicada
        const bloqueTexto = `${emojiAsignado} **¡<@${user.id}> se ha matriculado!**\n${EMOJI_DOT} **Fecha:** ${fechaHora}\n${EMOJI_DOT} **Riot ID:** ${riotID}\n${EMOJI_DOT} **Usuario:** ${nombreUsuario}\n${EMOJI_DOT} **Número de Matrícula:** #${numeroMatricula}\n\n`;

        const messages = await canalLogs.messages.fetch({ limit: 5 });
        const ultimoMensaje = messages.find(m => m.author.id === client.user.id && m.content.startsWith('## Historial de Matriculados'));

        if (ultimoMensaje && (ultimoMensaje.content.length + bloqueTexto.length) < 1950) {
            await ultimoMensaje.edit(ultimoMensaje.content + bloqueTexto);
        } else {
            if (servidorEmojis) {
                try {
                    const emojisMatricula = servidorEmojis.emojis.cache.filter(e => e.name.startsWith('mat_'));
                    for (const [id, emoji] of emojisMatricula) {
                        if (emojiAsignado.includes(id)) continue; 
                        await emoji.delete().catch(()=>{});
                    }
                } catch (err) {
                    console.error("Error limpiando emojis viejos:", err);
                }
            }
            await canalLogs.send(`## Historial de Matriculados\n\n${bloqueTexto}`);
        }
    } catch (error) {
        console.error("Error general en logNuevaMatricula:", error);
    }
}

async function actualizarGaleria(client) {
    try {
        const canalGaleria = await client.channels.fetch(CANAL_GALERIA_ID);
        if (!canalGaleria) return;

        const totalUsuarios = await Usuario.countDocuments();
        if (totalUsuarios === 0) return;

        const ultimoUsuario = await Usuario.findOne().sort({ _id: -1 });
        const [gameName, tagLine] = ultimoUsuario.Riot_ID.split('#');

        const cardBuffer = await generarTarjetaMatricula({
            gameName, tagLine,
            nivel: ultimoUsuario.Nivel,
            iconoId: ultimoUsuario.Icono_ID,
            soloq: ultimoUsuario.Rangos.SoloQ,
            flex: ultimoUsuario.Rangos.Flex,
            numeroUsuario: totalUsuarios
        });

        const attachment = new AttachmentBuilder(cardBuffer, { name: 'tarjeta.png' });
        const embed = new EmbedBuilder()
            .setColor('#171b23')
            .setImage('attachment://tarjeta.png')
            .setFooter({ text: `Matrícula #${totalUsuarios} de ${totalUsuarios}` });

        const row = crearBotones(totalUsuarios, totalUsuarios);

        const messages = await canalGaleria.messages.fetch({ limit: 10 });
        const existingMsg = messages.find(m => m.author.id === client.user.id && m.components.length > 0);

        if (existingMsg) {
            await existingMsg.edit({ embeds: [embed], files: [attachment], components: [row] });
        } else {
            await canalGaleria.send({ embeds: [embed], files: [attachment], components: [row] });
        }
    } catch {
        // Ejecución silenciosa
    }
}

let listenerActivo = false;
function initGaleria(client) {
    if (listenerActivo) return;
    
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() || !interaction.customId.startsWith('galeria_')) return;

        try {
            await interaction.deferUpdate();

            const totalUsuarios = await Usuario.countDocuments();
            if (totalUsuarios === 0) return;

            const footerText = interaction.message.embeds[0].footer.text;
            let currentPage = parseInt(footerText.split('#')[1].split(' ')[0]);

            if (interaction.customId === 'galeria_first') currentPage = 1;
            else if (interaction.customId === 'galeria_prev') currentPage = Math.max(1, currentPage - 1);
            else if (interaction.customId === 'galeria_next') currentPage = Math.min(totalUsuarios, currentPage + 1);

            let usuario = await Usuario.findOne().sort({ _id: 1 }).skip(currentPage - 1);
            const [gameName, tagLine] = usuario.Riot_ID.split('#');

            if (interaction.customId === 'galeria_refresh') {
                const plataforma = regionAPlatforma[usuario.Region];
                
                const summoner = await obtenerSummoner(usuario.PUUID, plataforma);
                const rangos = await obtenerRangos(usuario.PUUID, plataforma); 
                const tft = await obtenerRangoTFT(gameName, tagLine, plataforma);

                if (summoner) {
                    usuario.Nivel = summoner.summonerLevel;
                    usuario.Icono_ID = summoner.profileIconId;
                }
                usuario.Rangos.SoloQ = rangos.soloq;
                usuario.Rangos.Flex = rangos.flex;
                usuario.Rangos.TFT = tft;

                await usuario.save();
            }

            const cardBuffer = await generarTarjetaMatricula({
                gameName, tagLine,
                nivel: usuario.Nivel,
                iconoId: usuario.Icono_ID,
                soloq: usuario.Rangos.SoloQ,
                flex: usuario.Rangos.Flex,
                numeroUsuario: currentPage
            });

            const attachment = new AttachmentBuilder(cardBuffer, { name: 'tarjeta.png' });
            const embed = new EmbedBuilder()
                .setColor('#171b23')
                .setImage('attachment://tarjeta.png')
                .setFooter({ text: `Matrícula #${currentPage} de ${totalUsuarios}` });

            const row = crearBotones(currentPage, totalUsuarios);

            await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
        } catch (error) {
            console.error("Error en bitácora:", error);
        }
    });

    listenerActivo = true;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// 🆕 NUEVO MÉTODO: EDITAR EN LUGAR DE BORRAR 🆕
async function reconstruirLogMatriculas(client) {
    try {
        const canalLogs = await client.channels.fetch(CANAL_LOGS_ID);
        if (!canalLogs) return;

        const servidorEmojis = await client.guilds.fetch(SERVIDOR_EMOJIS_ID).catch(() => null);

        const todosLosUsuarios = await Usuario.find().sort({ Numero_Matricula: 1 });
        if (todosLosUsuarios.length === 0) return;

        console.log("🔄 [BITÁCORA] Reconstruyendo/Actualizando el historial de matriculados...");

        // Traemos los mensajes existentes y los ordenamos del más viejo al más nuevo
        const messages = await canalLogs.messages.fetch({ limit: 50 });
        const botMessages = Array.from(messages.filter(m => m.author.id === client.user.id && m.content.includes('Historial de Matriculados')).values())
                                 .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let bloquesDeTexto = [];
        let bloqueTextoActual = "";

        for (const user of todosLosUsuarios) {
            let emojiAsignado = "👤";

            if (servidorEmojis) {
                const nombreEsperado = `mat_${user.Discord_ID}`.substring(0, 32);
                const emojiExistente = servidorEmojis.emojis.cache.find(e => e.name === nombreEsperado);
                
                if (emojiExistente) {
                    emojiAsignado = `<:${emojiExistente.name}:${emojiExistente.id}>`;
                } else {
                    try {
                        const discordUser = await client.users.fetch(user.Discord_ID).catch(() => null);
                        if (discordUser) {
                            console.log(`⏳ Creando emoji circular para ${user.Discord_Nick}...`);
                            const avatarURL = discordUser.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
                            const bufferCircular = await obtenerAvatarCircular(avatarURL); 
                            
                            const nuevoEmoji = await servidorEmojis.emojis.create({ attachment: bufferCircular, name: nombreEsperado });
                            emojiAsignado = `<:${nuevoEmoji.name}:${nuevoEmoji.id}>`;
                            
                            await delay(2500); 
                        }
                    } catch (e) {
                        console.error(`⚠️ Error creando emoji para ${user.Discord_Nick}:`, e.message);
                    }
                }
            }

            const nombreUsuario = user.Discord_Nick; // Guardado en BD

            // 👇 Nueva plantilla aplicada
            const lineaUsuario = `${emojiAsignado} **¡<@${user.Discord_ID}> se ha matriculado!**\n${EMOJI_DOT} **Fecha:** ${user.Fecha}\n${EMOJI_DOT} **Riot ID:** ${user.Riot_ID}\n${EMOJI_DOT} **Usuario:** ${nombreUsuario}\n${EMOJI_DOT} **Número de Matrícula:** #${user.Numero_Matricula}\n\n`;

            // Límite de ~1950 caracteres para guardar espacio para el título
            if (bloqueTextoActual.length + lineaUsuario.length > 1900) {
                bloquesDeTexto.push(bloqueTextoActual);
                bloqueTextoActual = lineaUsuario; 
            } else {
                bloqueTextoActual += lineaUsuario;
            }
        }

        if (bloqueTextoActual.length > 0) {
            bloquesDeTexto.push(bloqueTextoActual);
        }

        // 🔄 LÓGICA DE EDICIÓN
        for (let i = 0; i < bloquesDeTexto.length; i++) {
            const contenido = `## Historial de Matriculados\n\n${bloquesDeTexto[i]}`;
            if (i < botMessages.length) {
                // Si el mensaje ya existe en esa posición, lo editamos
                await botMessages[i].edit(contenido).catch(() => {});
            } else {
                // Si faltan mensajes (porque creció la lista), mandamos uno nuevo
                await canalLogs.send(contenido).catch(() => {});
            }
        }

        // 🧹 Borramos mensajes sobrantes (por si el historial se redujo)
        for (let i = bloquesDeTexto.length; i < botMessages.length; i++) {
            await botMessages[i].delete().catch(() => {});
        }

        console.log("✅ [BITÁCORA] Historial de matriculados actualizado con éxito.");
    } catch (error) {
        console.error("❌ Error actualizando el log de matrículas:", error);
    }
}

module.exports = { logNuevaMatricula, actualizarGaleria, initGaleria, reconstruirLogMatriculas };