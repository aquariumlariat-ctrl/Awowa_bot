// Modulos/Utilidades/Canvas/cmd_boceto.js
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

module.exports = [
    {
        name: 'boceto',
        description: 'Herramienta de Dev: Inicia el modo de diseño en vivo para el Canvas Social.',
        async execute(message) {
            // 👇 Ruta exacta al nuevo archivo social
            const designPath = path.join(__dirname, '../../Principales/Perfil/canvas_social.js');
            
            // 1. Asegurarnos de que el archivo existe antes de intentar cargarlo
            if (!fs.existsSync(designPath)) {
                return message.reply('❌ No encontré el archivo `canvas_social.js` en la carpeta `Perfil`. ¡Créalo primero!');
            }

            // 2. Cargamos el diseño inicial
            delete require.cache[require.resolve('../../Principales/Perfil/canvas_social.js')];
            let { generarBocetoSocial } = require('../../Principales/Perfil/canvas_social.js');
            
            let buffer = await generarBocetoSocial();
            let attachment = new AttachmentBuilder(buffer, { name: 'boceto_social.png' });
            
            // 3. Enviamos el mensaje que se va a quedar actualizándose
            const msgEnVivo = await message.channel.send({
                content: '🎨 **Modo Diseño Activo (Social)**\nAbre `canvas_social.js`, haz un cambio, presiona `CTRL + S` y mira la magia.',
                files: [attachment]
            });

            // 4. El vigilante (Hot-Loader)
            let temporizador = null;
            fs.watch(designPath, (eventType) => {
                if (eventType === 'change') {
                    if (temporizador) clearTimeout(temporizador);
                    
                    temporizador = setTimeout(async () => {
                        try {
                            delete require.cache[require.resolve('../../Principales/Perfil/canvas_social.js')];
                            const { generarBocetoSocial: nuevoGenerar } = require('../../Principales/Perfil/canvas_social.js');
                            
                            const nuevoBuffer = await nuevoGenerar();
                            const nuevoAttachment = new AttachmentBuilder(nuevoBuffer, { name: 'boceto_social.png' });
                            
                            await msgEnVivo.edit({
                                files: [nuevoAttachment]
                            });
                            
                            console.log(`${c.v}·${c.b} [Canvas] Vista previa de diseño social actualizada ${c.v}correctamente${c.b}.`);
                        } catch (error) {
                            console.error(`${c.r}·${c.b} [Canvas] Recarga del diseño en vivo: ${c.r}Fallo de sintaxis${c.b}.`, error.message);
                        }
                    }, 1000);
                }
            });
        }
    }
];