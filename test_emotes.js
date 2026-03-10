require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// 🎨 Paleta de colores para la consola
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m', c: '\x1b[36m' };

const client = new Client({
    intents: [GatewayIntentBits.Guilds] // Solo necesitamos esto para buscar canales y enviar mensajes
});

client.once('ready', async () => {
    console.log(`${c.v}·${c.b} [Test] Bot encendido como ${c.c}${client.user.tag}${c.b}`);

    try {
        console.log(`${c.a}·${c.b} Consultando Application Emojis en el Dev Portal...`);
        const appEmojis = await client.application.emojis.fetch();

        if (appEmojis.size === 0) {
            console.log(`   ${c.r}No se encontraron Application Emojis.${c.b}`);
        } else {
            console.log(`   ${c.v}¡Encontrados ${appEmojis.size} Application Emojis!${c.b}`);
            
            // Construimos el mensaje que se enviará a Discord
            let mensajeTexto = `**✨ Emojis Oficiales de la Aplicación (${appEmojis.size})**\n\n`;
            
            appEmojis.forEach(emoji => {
                const animado = emoji.animated ? "a" : "";
                const formatoDiscord = `<${animado}:${emoji.name}:${emoji.id}>`;
                
                // Esto mostrará el emoji visualmente y al lado te pondrá el código para copiarlo
                mensajeTexto += `${formatoDiscord} ➝ \`${formatoDiscord}\`\n`;
            });

            const canalId = '1470377746860474597';
            console.log(`${c.a}·${c.b} Buscando el canal ${canalId} para enviar el mensaje...`);
            
            const canal = await client.channels.fetch(canalId);

            if (canal) {
                // Discord tiene un límite de 2000 caracteres por mensaje.
                // Si tienes muchos emojis, lo dividimos para que no dé error.
                if (mensajeTexto.length > 2000) {
                    const chunks = mensajeTexto.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) {
                        await canal.send(chunk);
                    }
                } else {
                    await canal.send(mensajeTexto);
                }
                console.log(`   ${c.v}✅ ¡Mensaje con emojis enviado correctamente a Discord!${c.b}`);
            } else {
                console.log(`   ${c.r}No se pudo encontrar el canal en Discord.${c.b}`);
            }
        }
    } catch (error) {
        console.error(`\n${c.r}·${c.b} [Test] Hubo un error:`, error);
    }

    // Desconectamos el bot
    client.destroy();
    console.log(`\n${c.v}·${c.b} [Test] Proceso finalizado. Puedes revisar tu Discord. 👋`);
});

client.login(process.env.DISCORD_TOKEN);