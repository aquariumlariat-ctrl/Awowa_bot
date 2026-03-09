// Modulos/Principales/Perfil/cmd_perfil.js
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs'); 
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { renderizarYGuardarPerfil } = require('./perfil'); 

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
            
            const statsFiles = ['stats_soloq.png', 'stats_flex.png', 'stats_normals.png', 'stats_total.png'];
            let needsRender = !fs.existsSync(rutaTarjeta);
            for (const s of statsFiles) {
                if (!fs.existsSync(path.join(carpetaPath, s))) needsRender = true;
            }

            let msgCarga = null;

            if (needsRender) {
                msgCarga = await message.reply('⏳ `El perfil visual de este usuario está incompleto. Dibujando el ecosistema... (Tardará unos segundos la primera vez)`');
                
                const exito = await renderizarYGuardarPerfil(targetUser);
                
                if (!exito) {
                    return msgCarga.edit('❌ Hubo un error dibujando el perfil.').catch(()=>{});
                }
            }

            // 3. 🚀 ENVIAR RESULTADOS INICIALES (SOLOQ POR DEFECTO)
            const adjuntoTarjeta = new AttachmentBuilder(rutaTarjeta, { name: 'tarjeta.png' });
            const adjuntoStatsInicial = new AttachmentBuilder(path.join(carpetaPath, 'stats_soloq.png'), { name: 'stats.png' });

            // Función creadora de Botones Interactivos
            const getRow = (activeMode) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('stats_soloq')
                        .setEmoji('⚔️')
                        .setLabel('Solo/Dúo')
                        .setStyle(activeMode === 'stats_soloq' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('stats_flex')
                        .setEmoji('🛡️')
                        .setLabel('Flexible')
                        .setStyle(activeMode === 'stats_flex' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('stats_normals')
                        .setEmoji('🎲')
                        .setLabel('Casuales')
                        .setStyle(activeMode === 'stats_normals' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('stats_total')
                        .setEmoji('📊')
                        .setLabel('Total')
                        .setStyle(activeMode === 'stats_total' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                );
            };

            let perfilMsg;

            if (msgCarga) {
                await msgCarga.edit({ 
                    content: `✨ Perfil competitivo de **${targetUser.Riot_ID}**:`, 
                    files: [adjuntoTarjeta] 
                }).catch(()=>{});
                
                perfilMsg = await message.channel.send({ 
                    files: [adjuntoStatsInicial],
                    components: [getRow('stats_soloq')]
                }).catch(()=>{});
            } else {
                await message.channel.send({ 
                    content: `✨ Perfil competitivo de **${targetUser.Riot_ID}**:`, 
                    files: [adjuntoTarjeta] 
                });
                
                perfilMsg = await message.channel.send({ 
                    files: [adjuntoStatsInicial],
                    components: [getRow('stats_soloq')]
                });
            }

            if (!perfilMsg) return;

            // 4. 🎮 RECOLECTOR DE BOTONES PARA CAMBIAR STATS
            const collector = perfilMsg.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 300000 // Los botones durarán vivos 5 minutos
            });

            collector.on('collect', async (i) => {
                const mode = i.customId; // ej: 'stats_flex'
                const statPath = path.join(carpetaPath, `${mode}.png`);
                
                if (!fs.existsSync(statPath)) {
                    return i.reply({ content: '⚠️ Ocurrió un error cargando estas estadísticas o están corruptas.', ephemeral: true });
                }

                const newAttachment = new AttachmentBuilder(statPath, { name: 'stats.png' });

                // Esto actualiza la imagen sin mandar un mensaje nuevo! Es bellísimo.
                await i.update({
                    files: [newAttachment],
                    components: [getRow(mode)]
                }).catch(()=>{});
            });

            collector.on('end', () => {
                // Al terminar los 5 minutos, quitamos los botones para no llenar el chat de cosas muertas
                perfilMsg.edit({ components: [] }).catch(()=>{});
            });
        }
    }
];