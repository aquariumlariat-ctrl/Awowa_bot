// Modulos/Principales/Nivel/cmd_nivel.js
const { AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { generarCanvasNivel } = require('./canvas_nivel'); // 👇 Importamos el motor

module.exports = {
    name: 'nivel',
    description: 'Muestra tu nivel social, rango y progreso en la Academia.',
    async execute(message, args) {
        
        let targetUser = message.author;

        // Búsqueda de usuario (Igual que antes)
        if (message.mentions.users.size > 0) {
            targetUser = message.mentions.users.first();
        }

        if (targetUser.bot) {
            return message.reply('❌ Los bots no tienen alma ni nivel espiritual.');
        }

        const userDB = await Usuario.findOne({ Discord_ID: targetUser.id });

        if (!userDB || !userDB.Social) {
            return message.reply('❌ Este usuario aún no está matriculado en la Academia.');
        }

        // ==========================================
        // 🎨 GENERAR CANVAS EN SEGUNDO PLANO
        // ==========================================
        
        // 1. Descargar el avatar del usuario en paralelo
        const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        
        let avatarBuffer = null;
        try {
            const response = await fetch(avatarURL);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                avatarBuffer = Buffer.from(arrayBuffer);
            }
        } catch (error) { /* Fallo silencioso, se dibujará sin avatar */ }

        // 2. Llamar al motor de dibujo
        const bufferImagen = await generarCanvasNivel(userDB.Social, userDB.Discord_Nick, avatarBuffer);

        // 3. Crear el adjunto de Discord y enviarlo
        const adjunto = new AttachmentBuilder(bufferImagen, { name: `nivel_${userDB.Numero_Matricula}.png` });
        await message.channel.send({ files: [adjunto] });
    }
};