// Modulos/Principales/Nivel/cmd_nivel.js
const { AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { generarCanvasNivel } = require('./canvas_nivel');

module.exports = {
    name: 'nivel',
    description: 'Muestra tu nivel social, rango y progreso en la Academia.',
    async execute(message, args) {
        
        let targetUser = message.author;
        let targetMember = message.member;

        // Búsqueda de usuario
        if (message.mentions.users.size > 0) {
            targetUser = message.mentions.users.first();
            targetMember = message.mentions.members.first() || await message.guild.members.fetch(targetUser.id).catch(() => null);
        }

        if (targetUser.bot) {
            return message.reply('❌ Los bots no tienen alma ni nivel espiritual.');
        }

        const userDB = await Usuario.findOne({ Discord_ID: targetUser.id });

        if (!userDB || !userDB.Social) {
            return message.reply('❌ Este usuario aún no está matriculado en la Academia.');
        }

        // 💡 MODO DE PRUEBAS: Si pasas un número, simulará ese nivel
        let socialData = userDB.Social;
        const numeroTest = parseInt(args[0]);

        // Si escribiste un número válido y NO mencionaste a nadie
        if (!isNaN(numeroTest) && message.mentions.users.size === 0) {
            // Calculamos la meta real de ese nivel para que los números tengan sentido
            const xpMetaTest = Math.floor(100 * Math.pow(numeroTest, 1.5));
            
            socialData = {
                Nivel: numeroTest,
                // Ponemos la barra al 80% para que el glow siempre se luzca bien
                XP: Math.floor(xpMetaTest * 0.8),
                // Si el nivel es mayor a 90, te damos top 1 para que veas la corona, si no top 15
                Posicion: numeroTest >= 90 ? 1 : 15 
            };
        }

        // ==========================================
        // 🎨 GENERAR CANVAS EN SEGUNDO PLANO
        // ==========================================
        
        const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        
        let avatarBuffer = null;
        try {
            const response = await fetch(avatarURL);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                avatarBuffer = Buffer.from(arrayBuffer);
            }
        } catch (error) { /* Fallo silencioso */ }

        const apodoReal = targetMember ? targetMember.displayName : targetUser.username;

        const bufferImagen = await generarCanvasNivel(socialData, apodoReal, avatarBuffer);

        const adjunto = new AttachmentBuilder(bufferImagen, { name: `nivel_${userDB.Numero_Matricula || 'test'}.png` });
        await message.channel.send({ files: [adjunto] });
    }
};