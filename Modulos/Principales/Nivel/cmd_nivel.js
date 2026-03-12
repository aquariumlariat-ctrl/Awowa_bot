// Modulos/Principales/Nivel/cmd_nivel.js
const { AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { generarCanvasNivel } = require('./canvas_nivel');

module.exports = {
    name: 'nivel',
    description: 'Muestra la tarjeta de nivel social de un usuario (Mención, ID o #Matrícula).',
    async execute(message, args) {
        
        let targetUser = message.author;
        let userDB = null;

        // ==========================================
        // 🔍 BÚSQUEDA INTELIGENTE DE USUARIOS
        // ==========================================
        if (args.length > 0) {
            const query = args[0];

            if (message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
                userDB = await Usuario.findOne({ Discord_ID: targetUser.id });
            } 
            else if (query.length >= 17 && !isNaN(query)) {
                userDB = await Usuario.findOne({ Discord_ID: query });
                if (userDB) {
                    try { targetUser = await message.client.users.fetch(query); } catch (e) {}
                }
            } 
            else {
                const numMatricula = parseInt(query.replace('#', ''));
                if (!isNaN(numMatricula)) {
                    userDB = await Usuario.findOne({ Numero_Matricula: numMatricula });
                    if (userDB) {
                        try { targetUser = await message.client.users.fetch(userDB.Discord_ID); } catch (e) {}
                    }
                }
            }
        } else {
            userDB = await Usuario.findOne({ Discord_ID: message.author.id });
        }

        if (!userDB) return message.reply('❌ No pude encontrar a ese usuario en la base de datos de la Academia. ¿Seguro que está matriculado?');
        if (targetUser.bot) return message.reply('❌ Los bots no tienen alma, nivel, ni estadísticas sociales.');
        if (!userDB.Social) return message.reply('❌ Este usuario tiene un perfil antiguo y no tiene habilitado el sistema social.');

        const msjCarga = await message.reply('⏳ **Calculando estadísticas...**');

        // ==========================================
        // 🚀 NUEVO: RANKING LOCAL POR SERVIDOR
        // ==========================================
        // 1. Obtenemos TODOS los IDs de los miembros actuales del servidor (evitando bots)
        const guildMembers = await message.guild.members.fetch();
        const memberIds = guildMembers.filter(m => !m.user.bot).map(m => m.id);

        // 2. Ejecutamos la promesa con el filtro de 'memberIds' inyectado
        const [posicionReal, memberFetch] = await Promise.all([
            Usuario.countDocuments({
                // La magia está aquí: Solo comparamos con los que están en 'memberIds'
                Discord_ID: { $in: memberIds }, 
                $or: [
                    { 'Social.Nivel': { $gt: userDB.Social.Nivel } },
                    { 'Social.Nivel': userDB.Social.Nivel, 'Social.XP': { $gt: userDB.Social.XP } }
                ]
            }).then(count => count + 1), // Sigue sumando 1 para que el primero sea #1, no #0
            message.guild.members.fetch(targetUser.id).catch(() => null)
        ]);

        let apodoReal = userDB.Discord_Nick || targetUser.username;
        if (memberFetch && memberFetch.displayName) {
            apodoReal = memberFetch.displayName;
        }

        const socialData = {
            Nivel: userDB.Social.Nivel || 1,
            XP: userDB.Social.XP || 0,
            Posicion: posicionReal
        };

        try {
            const bufferImagen = await generarCanvasNivel(socialData, apodoReal, targetUser.username);
            const adjunto = new AttachmentBuilder(bufferImagen, { name: `nivel_${userDB.Numero_Matricula}.png` });
            
            await msjCarga.edit({ content: null, files: [adjunto] });
        } catch (error) {
            console.error('[Error Cmd Nivel]', error);
            await msjCarga.edit('❌ Ocurrió un error gráfico al intentar dibujar la tarjeta de nivel.');
        }
    }
};