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
const categorias = ['Utilidades', 'Principales']; 

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

    // 👇 IMPORTAMOS LAS FUNCIONES DE BITÁCORA 👇
    const { initGaleria, reconstruirLogMatriculas } = require('./Modulos/Principales/Matricula/bitacora');
    initGaleria(client);

    // 👇 DISPARAMOS LA RECONSTRUCCIÓN DEL LOG 5 SEGUNDOS DESPUÉS 👇
    setTimeout(() => {
        reconstruirLogMatriculas(client);
    }, 5000);

const { iniciarCronSincronizacion } = require('./Modulos/Principales/Sincronizacion/actualizador_bg');
iniciarCronSincronizacion(client);

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

    if (enDM) {
        const { usuariosEnMatricula, procesarRespuestaDM } = require('./Modulos/Principales/Matricula/matricula');
        const estaMatriculandose = usuariosEnMatricula.has(message.author.id);

        if (estaMatriculandose) {
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
// CONEXIÓN A BASE DE DATOS Y MIGRACIÓN
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('🍃 Conectado a la base de datos MongoDB con éxito');

        // 👇 INICIALIZACIÓN DE CARPETAS Y ARCHIVOS DE USUARIOS 👇
        const Usuario = require('./Base_Datos/MongoDB/Usuario.js');
        const usuariosPath = path.join(__dirname, 'Base_Datos', 'Usuarios');
        
        if (!fs.existsSync(usuariosPath)) {
            fs.mkdirSync(usuariosPath, { recursive: true });
        }

        try {
            const todosLosUsuarios = await Usuario.find().sort({ _id: 1 }); 
            let counter = 1;
            
            for (const user of todosLosUsuarios) {
                let numeroMatricula = user.Numero_Matricula;
                
                if (!numeroMatricula) {
                    numeroMatricula = counter;
                    user.Numero_Matricula = numeroMatricula;
                    await user.save();
                }
                counter = Math.max(counter, numeroMatricula) + 1;

                const nickSeguro = user.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
                const carpetaUsuario = path.join(usuariosPath, `#${numeroMatricula}_${nickSeguro}`);
                
                if (!fs.existsSync(carpetaUsuario)) {
                    fs.mkdirSync(carpetaUsuario, { recursive: true });
                }

                // 📁 PLANTILLAS DE ARCHIVOS PARA EL USUARIO
                const plantillaJuegos = {
                    Resumen: { Victorias: 0, Derrotas: 0, WinRate: 0 },
                    Campeones: {},
                    Companeros: {},
                    Historial: []
                };

                const archivosCrear = {
                    'datos_basicos.json': {
                        Discord_ID: user.Discord_ID,
                        Discord_Nick: user.Discord_Nick,
                        Numero_Matricula: user.Numero_Matricula,
                        Riot_ID: user.Riot_ID,
                        PUUID: user.PUUID,
                        Region: user.Region,
                        Fecha_Matricula: user.Fecha
                    },
                    'datos_lol_soloq.json': plantillaJuegos,
                    'datos_lol_flex.json': plantillaJuegos,
                    'datos_lol_normals.json': plantillaJuegos,
                    'datos_lol_total.json': plantillaJuegos
                };

                // Crear los archivos si no existen
                for (const [nombreArchivo, contenidoVacio] of Object.entries(archivosCrear)) {
                    const rutaArchivo = path.join(carpetaUsuario, nombreArchivo);
                    if (!fs.existsSync(rutaArchivo)) {
                        fs.writeFileSync(rutaArchivo, JSON.stringify(contenidoVacio, null, 4), 'utf8');
                    }
                }
            }
        } catch (e) {
            console.error("Error al inicializar carpetas de usuarios:", e);
        }
    })
    .catch(() => {});

client.login(process.env.DISCORD_TOKEN);