// Modulos/Utilidades/Sincronizador/cmd_sincronizar.js
const fs = require('fs').promises;
const path = require('path');
const { PermissionsBitField } = require('discord.js');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

const CONFIG_PATH = path.join(__dirname, 'config.json');

module.exports = {
    name: 'sincronizar',
    description: 'Administra la sincronización automática de mensajes.',
    
    async execute(message, args) {
        if (!message.guild || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const subcomando = args[0]?.toLowerCase();

        if (subcomando === 'activar') {
            const config = { channelId: message.channel.id, enabled: true };
            await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
            
            console.log(`${c.v}·${c.b} [Editor de Mensajes] Sincronización de variables ${c.v}activada${c.b} en el canal ${message.channel.name}.`);
            await message.reply(`✅ Sincronización activada en este canal (<#${message.channel.id}>).\nAhora edita los mensajes con la estructura:\n\`\`\`\n## NombreVariable\nContenido del mensaje\n\`\`\``);

        } else if (subcomando === 'desactivar') {
            const config = { channelId: null, enabled: false };
            await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
            
            console.log(`${c.a}·${c.b} [Editor de Mensajes] Sincronización de variables ${c.a}desactivada${c.b} por ${message.author.username}.`);
            await message.reply('❌ Sincronización desactivada.');

        } else if (subcomando === 'estado') {
            try {
                const data = await fs.readFile(CONFIG_PATH, 'utf8');
                const config = JSON.parse(data);

                if (config.enabled && config.channelId) {
                    await message.reply(`✅ Sincronización activa en <#${config.channelId}>`);
                } else {
                    await message.reply('❌ Sincronización desactivada.');
                }
            } catch {
                await message.reply('❌ Sincronización desactivada o sin configurar.');
            }

        } else {
            await message.reply('Uso:\n`Aurora!sincronizar activar`\n`Aurora!sincronizar desactivar`\n`Aurora!sincronizar estado`');
        }
    }
};