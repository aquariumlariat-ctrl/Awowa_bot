// Modulos/Principales/Nivel/cmd_nivel.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { generarCanvasNivel } = require('./canvas_nivel');

module.exports = {
    name: 'nivel', 
    // 🏗️ CONSTRUCTOR DEL COMANDO SLASH
    data: new SlashCommandBuilder()
        .setName('nivel')
        .setDescription('Muestra la tarjeta de nivel social.')
        .addUserOption(option => 
            option.setName('usuario')
            .setDescription('Menciona a un usuario para ver su nivel.')
            .setRequired(false))
        .addIntegerOption(option => 
            option.setName('matricula')
            .setDescription('Busca usando un número de matrícula.')
            .setRequired(false))
        .addIntegerOption(option => 
            option.setName('rango')
            .setDescription('Busca quién ocupa un puesto específico en el Top.')
            .setRequired(false)),

    async execute(interaction) {
        // ⏳ Los comandos Slash tienen 3 segundos para responder.
        await interaction.deferReply();

        const optUser = interaction.options.getUser('usuario');
        const optMatricula = interaction.options.getInteger('matricula');
        const optRango = interaction.options.getInteger('rango');

        let targetUser = interaction.user;
        let userDB = null;

        // ==========================================
        // 🚀 OPTIMIZACIÓN DEL CACHÉ (ANTI RATE-LIMIT)
        // ==========================================
        // 1. Usamos la memoria Caché del bot en lugar de pedirle la lista a Discord
        let memberIds = interaction.guild.members.cache.filter(m => !m.user.bot).map(m => m.id);

        // 2. Si el caché está vacío (bot recién prendido), hacemos una sola petición cuidadosa
        if (memberIds.length < 2) {
            try {
                await interaction.guild.members.fetch();
                memberIds = interaction.guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
            } catch (e) {
                // Si Discord nos bloquea (Opcode 8), ignoramos el error para no crashear
            }
        }

        // ==========================================
        // 🔍 LÓGICA DE BÚSQUEDA
        // ==========================================
        if (optUser) {
            targetUser = optUser;
            userDB = await Usuario.findOne({ Discord_ID: targetUser.id });
        } 
        else if (optMatricula) {
            userDB = await Usuario.findOne({ Numero_Matricula: optMatricula });
            if (userDB) {
                try { targetUser = await interaction.client.users.fetch(userDB.Discord_ID); } catch(e){}
            }
        } 
        else if (optRango) {
            // Buscamos matemáticamente quién ocupa ese lugar en ESTE servidor
            const topUsers = await Usuario.find({ Discord_ID: { $in: memberIds } })
                .sort({ 'Social.Nivel': -1, 'Social.XP': -1 })
                .skip(optRango - 1)
                .limit(1);

            if (topUsers.length > 0) {
                userDB = topUsers[0];
                try { targetUser = await interaction.client.users.fetch(userDB.Discord_ID); } catch(e){}
            } else {
                return interaction.editReply('❌ Nadie ocupa esa posición del ranking en este servidor aún.');
            }
        } 
        else {
            // Si no puso ninguna opción, se busca a sí mismo
            userDB = await Usuario.findOne({ Discord_ID: interaction.user.id });
        }

        // ==========================================
        // 🛑 VALIDACIONES
        // ==========================================
        if (!userDB) return interaction.editReply('❌ No pude encontrar a ese usuario en la base de datos de la Academia.');
        if (targetUser.bot) return interaction.editReply('❌ Los bots no tienen estadísticas sociales.');
        if (!userDB.Social) return interaction.editReply('❌ Este usuario no tiene habilitado el sistema social.');

        const miembroEnServidor = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!miembroEnServidor) {
            return interaction.editReply('❌ Ese usuario no se encuentra en este servidor, por lo que no participa en la clasificación local.');
        }

        try {
            // ==========================================
            // 🚀 CÁLCULO DE RANKING (Si no buscó por rango)
            // ==========================================
            const uNivel = userDB.Social.Nivel || 1;
            const uXP = userDB.Social.XP || 0;
            let posicionReal = optRango; // Si buscó por rango, ya sabemos la posición

            if (!optRango) {
                posicionReal = await Usuario.countDocuments({
                    Discord_ID: { $in: memberIds }, 
                    $or: [
                        { 'Social.Nivel': { $gt: uNivel } },
                        { 'Social.Nivel': uNivel, 'Social.XP': { $gt: uXP } }
                    ]
                }).then(count => count + 1);
            }

            let apodoReal = userDB.Discord_Nick || targetUser.username;
            if (miembroEnServidor.displayName) {
                apodoReal = miembroEnServidor.displayName;
            }

            const socialData = { Nivel: uNivel, XP: uXP, Posicion: posicionReal };

            // Dibujamos la tarjeta
            const bufferImagen = await generarCanvasNivel(socialData, apodoReal, targetUser.username);
            const adjunto = new AttachmentBuilder(bufferImagen, { name: `nivel_${userDB.Numero_Matricula}.png` });
            
            // Reemplazamos el "Pensando..." por la tarjeta final
            await interaction.editReply({ content: null, files: [adjunto] });

        } catch (error) {
            console.error('\x1b[31m·\x1b[0m [Error Cmd Nivel]', error);
            await interaction.editReply('❌ Ocurrió un error interno al intentar procesar las estadísticas.');
        }
    }
};