// Modulos/Principales/Nivel/cmd_testrangos.js
const { AttachmentBuilder } = require('discord.js');
const { generarCanvasNivel } = require('./canvas_nivel');

module.exports = {
    name: 'testrangos',
    description: 'Genera y envía una tarjeta de muestra para cada rango de la Academia.',
    async execute(message, args) {
        
        // Medida de seguridad: Solo admins pueden usar este comando pesado
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Solo los administradores pueden generar la galería masiva de rangos.');
        }

        const msjCarga = await message.reply('⏳ Dibujando 21 tarjetas mágicas... Esto tomará unos segundos.');

        // Todos los hitos de niveles donde cambia el título o el color
        const niveles = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
        const adjuntos = [];

        for (const lvl of niveles) {
            // Simulamos la experiencia al 80% para que el glow se vea bien en todos
            const xpMetaTest = Math.floor(100 * Math.pow(lvl, 1.5));
            
            const socialData = {
                Nivel: lvl,
                XP: Math.floor(xpMetaTest * 0.8),
                // Para los niveles épicos (90+), fingimos ser el Top 1 para mostrar la corona
                Posicion: lvl >= 90 ? 1 : 15 
            };

            // Llamamos a tu motor gráfico
            const bufferImagen = await generarCanvasNivel(socialData, 'Explorador Astral', null);
            
            adjuntos.push(new AttachmentBuilder(bufferImagen, { name: `rango_nivel_${lvl}.png` }));
        }

        // Discord solo permite enviar 10 archivos a la vez por mensaje
        // Dividimos las 21 imágenes en grupos de 10
        for (let i = 0; i < adjuntos.length; i += 10) {
            const grupo = adjuntos.slice(i, i + 10);
            await message.channel.send({ files: grupo });
        }

        await msjCarga.edit('✅ ¡Galería de rangos generada con éxito!');
    }
};