require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { iniciarSincronizador } = require('./API\'s/Riot/sincronizador');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ],
});

client.commands = new Collection();

// Rutas base
const modulosPath = path.join(__dirname, 'Modulos');
const categorias = ['Utilidades', 'Principales']; // Solo tus dos carpetas nuevas

// ==========================================
// CARGADOR DE COMANDOS ESTRICTO (Solo cmd_)
// ==========================================
categorias.forEach(categoria => {
    const categoriaPath = path.join(modulosPath, categoria);
    
    if (fs.existsSync(categoriaPath)) {
        const items = fs.readdirSync(categoriaPath, { withFileTypes: true });

        items.forEach(item => {
            if (item.isDirectory()) {
                const comandoPath = path.join(categoriaPath, item.name);
                const archivosJS = fs.readdirSync(comandoPath).filter(file => file.startsWith('cmd_') && file.endsWith('.js'));

                archivosJS.forEach(archivo => {
                    const comandoModule = require(path.join(comandoPath, archivo));
                    const comandos = Array.isArray(comandoModule) ? comandoModule : [comandoModule];
                    
                    comandos.forEach(comando => {
                        if (comando.name && comando.execute) {
                            client.commands.set(comando.name, comando);
                        }
                    });
                });
            } else if (item.name.startsWith('cmd_') && item.name.endsWith('.js')) {
                const comandoModule = require(path.join(categoriaPath, item.name));
                const comandos = Array.isArray(comandoModule) ? comandoModule : [comandoModule];
                
                comandos.forEach(comando => {
                    if (comando.name && comando.execute) {
                        client.commands.set(comando.name, comando);
                    }
                });
            }
        });
    }
});

// ==========================================
// EVENTOS DE INICIO (Ready)
// ==========================================
client.once('clientReady', async () => {
    console.log(`✅ Aurora conectada como ${client.user.tag}`);

    // Iniciar Galería
    const { initGaleria } = require('./Modulos/Principales/Matricula/bitacora');
    initGaleria(client);

    // Iniciar Sincronizador Automático
    const { estaHabilitado, obtenerChannelId } = require('./Modulos/Utilidades/Sincronizador/handler');
    const { sincronizarMensajes } = require('./Modulos/Utilidades/Sincronizador/parser');

    const habilitado = await estaHabilitado();
    if (habilitado) {
        const channelId = await obtenerChannelId();
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel) await sincronizarMensajes(channel);
        } catch {
            // Silenciado
        }
    }
});

// ==========================================
// EVENTOS DE MENSAJE
// ==========================================
const { handleMessageUpdate } = require('./Modulos/Utilidades/Sincronizador/handler');

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.partial) {
        try {
            await newMessage.fetch();
        } catch {
            return;
        }
    }
    await handleMessageUpdate(oldMessage, newMessage);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefijo = 'aurora!';
    const empiezaConPrefijo = message.content.toLowerCase().startsWith(prefijo);
    
    let args = [];
    let commandName = '';
    
    if (empiezaConPrefijo) {
        args = message.content.slice(prefijo.length).trim().split(/ +/);
        commandName = args.shift().toLowerCase();
    }

    const enDM = message.channel.isDMBased();

    // Enrutador Inteligente (DM vs Servidor)
    if (enDM) {
        const { usuariosEnMatricula, procesarRespuestaDM } = require('./Modulos/Principales/Matricula/matricula');
        const estaMatriculandose = usuariosEnMatricula.has(message.author.id);

        if (estaMatriculandose) {
            // Permitir ejecutar el comando cancelar, de lo contrario lo toma como respuesta de matrícula
            if (!(empiezaConPrefijo && commandName === 'cancelar')) {
                await procesarRespuestaDM(message);
                return; 
            }
        } else {
            if (!empiezaConPrefijo || !commandName) return;
        }
    } else {
        if (!empiezaConPrefijo || !commandName) return;
    }

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args);
    } catch {
        // Ejecución silenciosa
    }
});

// ==========================================
// CONEXIÓN A BASE DE DATOS
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🍃 Conectado a la base de datos MongoDB con éxito'))
    .catch(() => {});

client.login(process.env.DISCORD_TOKEN);