const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'estado',
    description: 'Verifica si Aurora está en línea y funcionando.',
    
    execute(message) {
        if (!message.guild || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        message.reply('<:Awowa_Sip:1470440711416582406> **Aurora** está en línea y operando correctamente.');
    }
};