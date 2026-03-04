// Modulos/Principales/Matricula/bitacora.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario.js');
const { generarTarjetaMatricula } = require('./tarjeta_matricula');
const { regionAPlatforma, obtenerSummoner, obtenerRangos } = require("../../../API's/Riot/lol_api");
const { obtenerRangoTFT } = require("../../../API's/Riot/tft_api");

const CANAL_LOGS_ID = '1475684884629426318';
const CANAL_GALERIA_ID = '1475684653967872013';

function crearBotones(currentPage, totalUsuarios) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('galeria_first').setEmoji('⏪').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('galeria_prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('galeria_refresh').setEmoji('🔄').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('galeria_next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalUsuarios)
    );
}

async function logNuevaMatricula(client, user, riotID, numeroMatricula) {
    try {
        const canalLogs = await client.channels.fetch(CANAL_LOGS_ID);
        if (!canalLogs) return;

        const embedLog = new EmbedBuilder()
            .setColor(16739395)
            .setAuthor({
                name: '¡Nueva Matricula!',
                iconURL: 'https://cdn.discordapp.com/emojis/1470377870009565184.webp?size=40'
            })
            .setDescription(`** **\n<:a:1475892023134523472>**Usuario**: <@${user.id}>\n<:a:1475892023134523472>**Riot ID**: ${riotID}\n<:a:1475892023134523472>**Matrícula**: #${numeroMatricula}`)
            .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 512, forceStatic: false }))
            .setImage('https://i.imgur.com/4jFOtJD.png')
            .setTimestamp();

        await canalLogs.send({ embeds: [embedLog] });
    } catch {
        // Ejecución silenciosa
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

            // 🔄 LÓGICA DEL BOTÓN DE REFRESCO (AHORA DIRECTO POR PUUID) 🔄
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

module.exports = { logNuevaMatricula, actualizarGaleria, initGaleria };