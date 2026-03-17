// Modulos/Principales/Matrimonio/cmd_matrimonio.js
const { SlashCommandBuilder } = require('discord.js');
const { ejecutarProponer, ejecutarDivorciar } = require('./matrimonio');
const fs   = require('fs');
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
    name: 'matrimonio',
    data: new SlashCommandBuilder()
        .setName('matrimonio')
        .setDescription(txtSlash.MatrimonioDesc ? txtSlash.MatrimonioDesc.substring(0, 100) : 'Gestiona tu estado civil.')
        .addUserOption(option => option
            .setName('usuario')
            .setDescription(txtSlash.ProponerUserDesc ? txtSlash.ProponerUserDesc.substring(0, 100) : 'El usuario al que va dirigida la acción.')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('accion')
            .setDescription(txtSlash.AccionDesc ? txtSlash.AccionDesc.substring(0, 100) : 'Acción a realizar.')
            .setRequired(true)
            .addChoices(
                { name: 'Proponer', value: 'proponer' },
                { name: 'Terminar', value: 'terminar' }
            )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const accion = interaction.options.getString('accion');

        try {
            if (accion === 'proponer') {
                await ejecutarProponer(interaction);
            } else if (accion === 'terminar') {
                await ejecutarDivorciar(interaction);
            }
        } catch (error) {
            const log = require('./bitacora');
            log.error(`/matrimonio ${accion}`, error);
            const mencion = `<@${interaction.user.id}>`;
            await interaction.editReply({ content: msgCache.ErrInterno?.(mencion) ?? '', allowedMentions: { users: [interaction.user.id] } });
        }
    }
};