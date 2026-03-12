// Modulos/Principales/Nivel/cmd_nivel.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { generarCanvasNivel } = require('./canvas_nivel');

// 1. CARGAMOS LAS DESCRIPCIONES PARA EL SLASH COMMAND
let txtSlash = {};
try { txtSlash = require('./slash_descripciones.js'); } 
catch (e) { 
    txtSlash = { 
        NivelDesc: 'Muestra la tarjeta de nivel social.',
        OptUserDesc: 'Menciona a un usuario para ver su nivel.'
    }; 
}

module.exports = {
    name: 'nivel', 
    data: new SlashCommandBuilder()
        .setName('nivel')
        .setDescription(txtSlash.NivelDesc ? txtSlash.NivelDesc.substring(0, 100) : 'Muestra la tarjeta de nivel social.')
        .addUserOption(option => 
            option.setName('usuario')
            .setDescription(txtSlash.OptUserDesc ? txtSlash.OptUserDesc.substring(0, 100) : 'Menciona a un usuario para ver su nivel.')
            .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        // 2. CARGAMOS LOS MENSAJES EN VIVO
        let msg = {};
        try { 
            delete require.cache[require.resolve('./mensajes.js')];
            msg = require('./mensajes.js'); 
        } 
        catch(e) { 
            msg = { 
                ErrBot: (u) => `❌ ${u}, los bots no tienen estadísticas sociales.`,
                ErrNoDB: "❌ No pude encontrar a ese usuario en la base de datos.",
                ErrInterno: "❌ Ocurrió un error interno al intentar procesar las estadísticas."
            }; 
        }

        const optUser = interaction.options.getUser('usuario');
        let targetUser = interaction.user;

        if (optUser) {
            targetUser = optUser;
        }

        if (targetUser.bot) {
            const mencion = `<@${interaction.user.id}>`;
            const textoError = typeof msg.ErrBot === 'function' ? msg.ErrBot(mencion) : msg.ErrBot;
            return interaction.editReply(textoError);
        }

        let userDB = await Usuario.findOne({ Discord_ID: targetUser.id });

        if (!userDB) return interaction.editReply(msg.ErrNoDB || "❌ No pude encontrar a ese usuario en la base de datos.");

        let memberIds = interaction.guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
        if (memberIds.length < 2) {
            try {
                await interaction.guild.members.fetch();
                memberIds = interaction.guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
            } catch (e) {}
        }

        // Buscamos si está en el servidor, pero YA NO BLOQUEAMOS si no está
        const miembroEnServidor = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        try {
            const uNivel = userDB.Social?.Nivel || 1;
            const uXP = userDB.Social?.XP || 0;
            
            // Por defecto, si no es del servidor, su rango es "-"
            let posicionReal = "-";

            // Solo calculamos en qué puesto va si pertenece a este servidor
            if (miembroEnServidor) {
                posicionReal = await Usuario.countDocuments({
                    Discord_ID: { $in: memberIds }, 
                    $or: [
                        { 'Social.Nivel': { $gt: uNivel } },
                        { 'Social.Nivel': uNivel, 'Social.XP': { $gt: uXP } }
                    ]
                }).then(count => count + 1);
            }

            // Tomamos su apodo del servidor, o su nick global si no está en el servidor
            let apodoReal = userDB.Discord_Nick || targetUser.username;
            if (miembroEnServidor && miembroEnServidor.displayName) {
                apodoReal = miembroEnServidor.displayName;
            }

            const socialData = { Nivel: uNivel, XP: uXP, Posicion: posicionReal };

            const bufferImagen = await generarCanvasNivel(socialData, apodoReal, targetUser.username);
            const adjunto = new AttachmentBuilder(bufferImagen, { name: `nivel_${userDB.Numero_Matricula}.png` });
            
            await interaction.editReply({ content: null, files: [adjunto] });

        } catch (error) {
            console.error('\x1b[31m·\x1b[0m [Error Cmd Nivel]', error);
            await interaction.editReply(msg.ErrInterno || "❌ Ocurrió un error interno al intentar procesar las estadísticas.");
        }
    }
};