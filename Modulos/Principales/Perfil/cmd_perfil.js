// Modulos/Principales/Perfil/cmd_perfil.js
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs'); 
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { renderizarYGuardarPerfil, generarSocialEnVivo } = require('./perfil'); 

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
                msgCarga = await message.reply('⏳ `El perfil visual de este usuario está incompleto. Renderizando tableros...`');
                
                const exito = await renderizarYGuardarPerfil(targetUser);
                
                if (!exito) {
                    return msgCarga.edit('❌ Hubo un error dibujando el perfil.').catch(()=>{});
                }
            }

            const adjuntoTarjeta = new AttachmentBuilder(rutaTarjeta, { name: 'tarjeta.png' });
            const adjuntoStatsInicial = new AttachmentBuilder(path.join(carpetaPath, 'stats_soloq.png'), { name: 'stats.png' });

            // ==========================================
            // 🎨 CONSTRUCTORES DE BOTONES (MINIMALISTAS)
            // ==========================================
            
            // Botones Principales
            const getRowMain = (activeMain) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_social')
                        // .setEmoji('123456789012345678') // Usa el ID numérico si decides usar un Custom Emoji
                        .setLabel('Comunidad')
                        .setStyle(activeMain === 'social' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('btn_invocador')
                        .setLabel('Competitivo LoL')
                        .setStyle(activeMain === 'invocador' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                );
            };

            // Botones Secundarios (LoL)
            const getRowSub = (activeSub) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('stats_soloq')
                        .setLabel('Solo/Dúo')
                        .setStyle(activeSub === 'stats_soloq' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('stats_flex')
                        .setLabel('Flexible')
                        .setStyle(activeSub === 'stats_flex' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('stats_normals')
                        .setLabel('Casuales')
                        .setStyle(activeSub === 'stats_normals' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('stats_total')
                        .setLabel('Total')
                        .setStyle(activeSub === 'stats_total' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                );
            };

            // ==========================================
            // 🚀 ENVIAR LOS DOS MENSAJES VINCULADOS
            // ==========================================
            let msgTarjeta;

            if (msgCarga) {
                msgTarjeta = await msgCarga.edit({ 
                    content: `✨ Perfil completo de **${targetUser.Riot_ID}**:`, 
                    files: [adjuntoTarjeta],
                    components: [getRowMain('invocador')]
                }).catch(()=>{});
            } else {
                msgTarjeta = await message.channel.send({ 
                    content: `✨ Perfil completo de **${targetUser.Riot_ID}**:`, 
                    files: [adjuntoTarjeta],
                    components: [getRowMain('invocador')]
                });
            }

            let msgPanel = await message.channel.send({ 
                files: [adjuntoStatsInicial],
                components: [getRowSub('stats_soloq')]
            });

            if (!msgTarjeta || !msgPanel) return;

            // ==========================================
            // 🎮 RECOLECTORES Y NAVEGACIÓN (1 HORA DE VIDA)
            // ==========================================
            
            const tiempoInactividad = 3600000; 

            // 1. Escuchamos los botones de la TARJETA
            const colMain = msgTarjeta.createMessageComponentCollector({ componentType: ComponentType.Button, time: tiempoInactividad });

            colMain.on('collect', async (i) => {
                const mode      = i.customId;
                const mainState = mode === 'btn_social' ? 'social' : 'invocador';

                // Confirmamos el click inmediatamente para evitar timeout de Discord
                await i.update({ components: [getRowMain(mainState)] });

                if (mode === 'btn_social') {
                    // ─────────────────────────────────────────────────────────
                    // 🔴 SOCIAL EN VIVO: generamos el canvas en este instante
                    // con el puesto real del servidor donde se ejecutó el cmd.
                    // ─────────────────────────────────────────────────────────
                    try {
                        const buffer     = await generarSocialEnVivo(targetUser, i.guildId, i.client);
                        const attachment = new AttachmentBuilder(buffer, { name: 'stats.png' });
                        await msgPanel.edit({ files: [attachment], components: [] }).catch(() => {});
                    } catch (err) {
                        await msgPanel.edit({ content: '⚠️ Error cargando la pestaña social.', components: [] }).catch(() => {});
                    }
                } else {
                    // Pestaña LoL: leemos desde disco (caché estática)
                    const statPath = path.join(carpetaPath, 'stats_soloq.png');
                    if (!fs.existsSync(statPath)) {
                        return;
                    }
                    const attachment = new AttachmentBuilder(statPath, { name: 'stats.png' });
                    await msgPanel.edit({ files: [attachment], components: [getRowSub('stats_soloq')] }).catch(() => {});
                }
            });

            // 2. Escuchamos los botones del PANEL
            const colSub = msgPanel.createMessageComponentCollector({ componentType: ComponentType.Button, time: tiempoInactividad });
            
            colSub.on('collect', async (i) => {
                const subMode = i.customId;
                const statPath = path.join(carpetaPath, `${subMode}.png`);
                
                if (!fs.existsSync(statPath)) {
                    return i.reply({ content: '⚠️ Ocurrió un error cargando esta pestaña.', ephemeral: true });
                }

                const newAttachment = new AttachmentBuilder(statPath, { name: 'stats.png' });
                await i.update({
                    files: [newAttachment],
                    components: [getRowSub(subMode)]
                }).catch(()=>{});
            });

            // ==========================================
            // 🛑 APAGADO SEGURO (CONGELACIÓN DE BOTONES)
            // ==========================================
            colMain.on('end', () => {
                if (msgTarjeta.editable) {
                    const disabledComponents = msgTarjeta.components.map(row => {
                        return ActionRowBuilder.from(row).setComponents(
                            row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                        );
                    });
                    msgTarjeta.edit({ components: disabledComponents }).catch(()=>{});
                }
            });

            colSub.on('end', () => {
                if (msgPanel.editable && msgPanel.components.length > 0) {
                    const disabledComponents = msgPanel.components.map(row => {
                        return ActionRowBuilder.from(row).setComponents(
                            row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                        );
                    });
                    msgPanel.edit({ components: disabledComponents }).catch(()=>{});
                }
            });
        }
    }
];