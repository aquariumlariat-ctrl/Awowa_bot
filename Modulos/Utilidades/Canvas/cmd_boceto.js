// Modulos/Utilidades/Canvas/cmd_boceto.js
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'boceto',
    description: 'Comando de desarrollo: Inicia el modo de diseño en vivo para el Canvas de Nivel.',
    async execute(message, args) {
        console.log("🎨 [Boceto] Iniciando vigilancia en vivo...");
        
        try {
            // Ruta al archivo del nivel
            const designPath = path.resolve(__dirname, '../../Principales/Nivel/canvas_nivel.js');
            
            if (!fs.existsSync(designPath)) {
                return message.reply('❌ No encontré el archivo `canvas_nivel.js`.');
            }

            // 1. Limpiar caché inicial
            delete require.cache[require.resolve(designPath)];
            
            // 2. Importar función
            const { generarCanvasNivel } = require(designPath);
            
            // 3. Conseguir tu avatar
            const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 256 });
            let avatarBuffer = null;
            try {
                const response = await fetch(avatarURL);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    avatarBuffer = Buffer.from(arrayBuffer);
                }
            } catch (error) { 
                console.log("Error descargando avatar:", error.message);
            }

            // 👇 4. EXTRAER APODO (DISPLAY NAME) EN LUGAR DEL GLOBAL USERNAME
            const apodoUsuario = message.member ? message.member.displayName : message.author.username;

            // 5. Dibujar primera vez
            const bufferInicial = await generarCanvasNivel(null, apodoUsuario, avatarBuffer);
            const attachmentInicial = new AttachmentBuilder(bufferInicial, { name: 'boceto_nivel.png' });
            
            // 6. Enviar mensaje flotante
            const msgEnVivo = await message.channel.send({
                content: '🎨 **Modo Diseño Activo (Nivel)**\nModifica `canvas_nivel.js` y guarda (CTRL+S). Se actualizará solo.',
                files: [attachmentInicial]
            });

            // 7. El vigilante automático (Hot-Loader)
            let temporizador = null;
            
            fs.watch(designPath, (eventType) => {
                if (eventType === 'change') {
                    if (temporizador) clearTimeout(temporizador);
                    
                    temporizador = setTimeout(async () => {
                        try {
                            console.log("⏳ [Boceto] Cambio detectado. Recargando...");
                            
                            delete require.cache[require.resolve(designPath)];
                            const { generarCanvasNivel: nuevoGenerar } = require(designPath);
                            
                            // Pasamos de nuevo tu apodo real
                            const nuevoBuffer = await nuevoGenerar(null, apodoUsuario, avatarBuffer);
                            const nuevoAttachment = new AttachmentBuilder(nuevoBuffer, { name: 'boceto_nivel.png' });
                            
                            await msgEnVivo.edit({
                                files: [nuevoAttachment]
                            });
                            
                            console.log(`🟢 [Canvas] Vista previa actualizada.`);
                        } catch (error) {
                            console.error(`🔴 [Canvas] Error de sintaxis en el archivo:`, error.message);
                        }
                    }, 500); 
                }
            });

        } catch (error) {
            console.error("🔥 Error en el comando boceto:", error);
            message.channel.send(`❌ **Error:**\n\`\`\`js\n${error.message}\n\`\`\``);
        }
    }
};