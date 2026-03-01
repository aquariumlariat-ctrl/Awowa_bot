// Modulos/Utilidades/Canvas/cmd_boceto.js
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

module.exports = [
    {
        name: 'boceto',
        description: 'Herramienta de Dev: Inicia el modo de diseño en vivo para el Canvas.',
        async execute(message) {
            const designPath = path.join(__dirname, 'diseno_perfil.js');
            
            // 1. Cargamos el diseño inicial
            delete require.cache[require.resolve('./diseno_perfil.js')];
            let { generarBoceto } = require('./diseno_perfil.js');
            
            let buffer = await generarBoceto();
            let attachment = new AttachmentBuilder(buffer, { name: 'boceto.png' });
            
            // 2. Enviamos el mensaje que se va a quedar actualizándose
            const msgEnVivo = await message.channel.send({
                content: '🎨 **Modo Diseño Activo**\nAbre `diseno_perfil.js`, haz un cambio, presiona `CTRL + S` y mira la magia.',
                files: [attachment]
            });

            // 3. El vigilante (Hot-Loader)
            let temporizador = null;
            fs.watch(designPath, (eventType) => {
                if (eventType === 'change') {
                    // Esperamos 1 segundo para no spamear a Discord si le das a guardar muy rápido
                    if (temporizador) clearTimeout(temporizador);
                    
                    temporizador = setTimeout(async () => {
                        try {
                            // Borramos la versión vieja de la memoria
                            delete require.cache[require.resolve('./diseno_perfil.js')];
                            // Traemos la versión recién guardada
                            const { generarBoceto: nuevoGenerar } = require('./diseno_perfil.js');
                            
                            const nuevoBuffer = await nuevoGenerar();
                            const nuevoAttachment = new AttachmentBuilder(nuevoBuffer, { name: 'boceto.png' });
                            
                            // Editamos el mensaje con la nueva foto
                            await msgEnVivo.edit({
                                files: [nuevoAttachment]
                            });
                            
                            console.log('🎨 [Canvas] Vista previa actualizada con éxito.');
                        } catch (error) {
                            console.error('❌ [Canvas] Error de sintaxis en el diseño:', error.message);
                        }
                    }, 1000);
                }
            });
        }
    }
];