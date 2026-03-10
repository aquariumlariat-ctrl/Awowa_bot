// Modulos/Utilidades/Canvas/cmd_boceto.js
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

module.exports = [
    {
        name: 'boceto',
        description: 'Herramienta de Dev: Inicia el modo de diseño en vivo para el Canvas Social.',
        async execute(message) {
            console.log("🎨 [Boceto] Iniciando comando...");
            
            try {
                // 👇 Ruta exacta al nuevo archivo social
                const designPath = path.join(__dirname, '../../Principales/Perfil/canvas_social.js');
                
                // 1. Asegurarnos de que el archivo existe antes de intentar cargarlo
                if (!fs.existsSync(designPath)) {
                    console.log("❌ [Boceto] Archivo no encontrado en:", designPath);
                    return message.reply('❌ No encontré el archivo `canvas_social.js` en la carpeta `Perfil`. ¡Asegúrate de crearlo!');
                }

                console.log("✅ [Boceto] Archivo encontrado. Limpiando caché...");
                
                // 2. Limpiamos la caché de manera segura
                const resolvePath = require.resolve('../../Principales/Perfil/canvas_social.js');
                if (require.cache[resolvePath]) {
                    delete require.cache[resolvePath];
                }
                
                console.log("✅ [Boceto] Importando función...");
                let { generarBocetoSocial } = require('../../Principales/Perfil/canvas_social.js');
                
                console.log("⏳ [Boceto] Dibujando canvas inicial...");
                let buffer = await generarBocetoSocial();
                let attachment = new AttachmentBuilder(buffer, { name: 'boceto_social.png' });
                
                console.log("✅ [Boceto] Enviando mensaje a Discord...");
                const msgEnVivo = await message.channel.send({
                    content: '🎨 **Modo Diseño Activo (Social)**\nAbre `canvas_social.js`, haz un cambio, presiona `CTRL + S` y mira la magia.',
                    files: [attachment]
                });

                // 3. El vigilante (Hot-Loader)
                let temporizador = null;
                fs.watch(designPath, (eventType) => {
                    if (eventType === 'change') {
                        if (temporizador) clearTimeout(temporizador);
                        
                        temporizador = setTimeout(async () => {
                            try {
                                console.log("⏳ [Boceto] Se detectó un cambio. Recargando...");
                                
                                delete require.cache[require.resolve('../../Principales/Perfil/canvas_social.js')];
                                const { generarBocetoSocial: nuevoGenerar } = require('../../Principales/Perfil/canvas_social.js');
                                
                                const nuevoBuffer = await nuevoGenerar();
                                const nuevoAttachment = new AttachmentBuilder(nuevoBuffer, { name: 'boceto_social.png' });
                                
                                await msgEnVivo.edit({
                                    files: [nuevoAttachment]
                                });
                                
                                console.log(`🟢 [Canvas] Vista previa social actualizada correctamente.`);
                            } catch (error) {
                                console.error(`🔴 [Canvas] Error al recargar el diseño:`, error.message);
                            }
                        }, 1000);
                    }
                });

            } catch (error) {
                // Si algo falla, ahora sí nos enteraremos
                console.error("🔥 Error crítico en el comando boceto:", error);
                message.reply('❌ Hubo un error interno al iniciar el boceto. Revisa la consola para más detalles.').catch(()=>{});
            }
        }
    }
];