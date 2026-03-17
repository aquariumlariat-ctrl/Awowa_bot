// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers 
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
                        if (comando.name && (comando.execute || comando.data)) {
                            client.commands.set(comando.name, comando);
                        }
                    });
                });
            } else if (item.name.startsWith('cmd_') && item.name.endsWith('.js')) {
                const comandoModule = require(path.join(categoriaPath, item.name));
                const comandos = Array.isArray(comandoModule) ? comandoModule : [comandoModule];
                
                comandos.forEach(comando => {
                    if (comando.name && (comando.execute || comando.data)) {
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
    console.log(`${c.v}·${c.b} [Core] Aurora se ha encendido ${c.v}correctamente${c.b} como ${client.user.tag}.`);

    // 1. Verificar APIs de Riot
    const { verificarConexionLoL } = require('./API\'s/Riot/lol_api');
    const { verificarConexionTFT } = require('./API\'s/Riot/tft_api');
    
    const lolOk = await verificarConexionLoL();
    const tftOk = await verificarConexionTFT();

    if (lolOk && tftOk) {
        console.log(`${c.v}·${c.b} [Riot API] APIs conectadas ${c.v}correctamente${c.b}.`);
    } else if (lolOk || tftOk) {
        console.log(`${c.a}·${c.b} [Riot API] APIs conectadas ${c.a}parcialmente${c.b} (LoL: ${lolOk ? 'Ok' : 'Fallo'}, TFT: ${tftOk ? 'Ok' : 'Fallo'}).`);
    } else {
        console.log(`${c.r}·${c.b} [Riot API] Error al conectar con las APIs de Riot: ${c.r}Fallo${c.b}.`);
    }

    // 2. Precargar Perfiles y Bitácora
    const { precargarPerfiles } = require('./Modulos/Principales/Perfil/perfil');
    await precargarPerfiles();
    
    const { initGaleria, reconstruirLogMatriculas } = require('./Modulos/Principales/Matricula/bitacora');
    initGaleria(client);
    
    setTimeout(() => {
        reconstruirLogMatriculas(client);
    }, 5000);

    const { restaurarMatriculas } = require('./Modulos/Principales/Matricula/matricula');
    restaurarMatriculas(client);

    const { iniciarCronSincronizacion } = require('./Modulos/Principales/Sincronizacion/actualizador_bg');
    iniciarCronSincronizacion(client);
    
    const { iniciarMotorXP } = require('./Modulos/Principales/Nivel/nivel.js');
    await iniciarMotorXP(client);

    const { iniciarModulo } = require('./Modulos/Principales/Matrimonio/matrimonio.js');
    await iniciarModulo(client);

    // ==========================================
    // 🌍 EDITOR DE MENSAJES GLOBAL (MULTICANAL)
    // ==========================================
    const { estaHabilitado, getSistemas } = require('./Modulos/Utilidades/Editor_Mensajes/handler.js');
    const { sincronizarMensajes } = require('./Modulos/Utilidades/Editor_Mensajes/parser.js');

    const habilitado = await estaHabilitado();
    if (habilitado) {
        const sistemas = await getSistemas();
        
        // Sincroniza cada sistema de la lista (Matrícula, Nivel, etc.)
        for (const sistema of sistemas) {
            try {
                const channel = await client.channels.fetch(sistema.channelId);
                if (channel) {
                    const outPath = path.join(__dirname, 'Modulos', 'Utilidades', 'Editor_Mensajes', sistema.outputPath);
                    await sincronizarMensajes(channel, outPath, sistema.nombre, 'startup');
                }
            } catch (error) {
                // Falla silenciosa si no encuentra el canal en Discord
            }
        }
    }

    // ==========================================
    // 🌍 REGISTRO DE COMANDOS SLASH (/)
    // ==========================================
    const slashCommands = [];
    client.commands.forEach(comando => {
        if (comando.data) { 
            slashCommands.push(comando.data.toJSON());
        }
    });

    try {
        await client.application.commands.set(slashCommands);
        console.log(`${c.v}·${c.b} [Core] Comandos Slash (/) sincronizados en Discord.`);
    } catch (e) {
        console.error(`${c.r}·${c.b} [Core] Error sincronizando comandos Slash:`, e);
    }
});

// ==========================================
// EVENTOS DE MENSAJE Y EDICIÓN EN VIVO
// ==========================================
const { handleMessageUpdate } = require('./Modulos/Utilidades/Editor_Mensajes/handler.js');
const { otorgarXPMensaje, rastrearVoz } = require('./Modulos/Principales/Nivel/nivel.js');

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

client.on('voiceStateUpdate', async (oldState, newState) => {
    await rastrearVoz(client, oldState, newState);
});

// ==========================================
// 🖱️ EVENTO: MANEJADOR DE INTERACCIONES (COMANDOS SLASH)
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Error ejecutando el comando (/) [${interaction.commandName}]:`, error);
        
        const replyMethod = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
        await interaction[replyMethod]({ 
            content: '❌ Ocurrió un error mágico al intentar ejecutar este comando.', 
            ephemeral: true 
        });
    }
});

// ==========================================
// 💬 EVENTO: MENSAJES DE TEXTO TRADICIONALES
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. Otorgar XP pasiva por chatear
    try {
        await otorgarXPMensaje(client, message);
    } catch (e) {}

    const prefijo = 'aurora!';
    const empiezaConPrefijo = message.content.toLowerCase().startsWith(prefijo);
    
    let args = [];
    let commandName = '';
    
    if (empiezaConPrefijo) {
        args = message.content.slice(prefijo.length).trim().split(/ +/);
        commandName = args.shift().toLowerCase();
    }

    const enDM = message.channel.isDMBased();

    // 2. Interceptar mensajes en Mensajes Directos para el Sistema de Matrícula
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

    // Si es un comando de texto tradicional (no slash), lo ejecutamos por este método
    if (!command.data) {
        try {
            await command.execute(message, args);
        } catch {}
    }
});

// ==========================================
// CONEXIÓN A BASE DE DATOS Y MIGRACIÓN
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log(`${c.v}·${c.b} [Nube] Conexión a la base de datos establecida ${c.v}correctamente${c.b}.`);

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
                        Fecha_Matricula: user.Fecha,
                        Social: {
                            Nivel: 1,
                            XP: 0,
                            Mensajes: 0,
                            Minutos_Voz: 0,
                            Partidas_Registradas: 0
                        }
                    },
                    'datos_lol_soloq.json': plantillaJuegos,
                    'datos_lol_flex.json': plantillaJuegos,
                    'datos_lol_normals.json': plantillaJuegos,
                    'datos_lol_total.json': plantillaJuegos
                };

                for (const [nombreArchivo, contenidoVacio] of Object.entries(archivosCrear)) {
                    const rutaArchivo = path.join(carpetaUsuario, nombreArchivo);
                    if (!fs.existsSync(rutaArchivo)) {
                        fs.writeFileSync(rutaArchivo, JSON.stringify(contenidoVacio, null, 4), 'utf8');
                    }
                }
            }
        } catch (e) {
            console.error(`${c.r}·${c.b} [Core] Inicialización de carpetas de usuarios: ${c.r}Fallo${c.b}.`, e);
        }
    })
    .catch(() => {});

client.login(process.env.DISCORD_TOKEN);