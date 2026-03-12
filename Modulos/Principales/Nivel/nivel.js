// Modulos/Principales/Nivel/motor_xp.js
const Usuario = require('../../../Base_Datos/MongoDB/Usuario.js');

// ⏱️ Mapa para controlar el Anti-Spam de mensajes en texto
const cooldownsMensajes = new Map();

// 🔧 CONFIGURACIÓN DEL SISTEMA
const COOLDOWN_SEGUNDOS = 60; // 1 minuto entre mensajes válidos para XP
const XP_TEXTO_MIN = 15;
const XP_TEXTO_MAX = 25;
const XP_VOZ_POR_MINUTO = 10;

// 📖 RANGOS (Solo necesitamos los títulos y niveles para saber cuándo avisar)
const RANGOS_DATA = [
    { lvl: 100, titulo: "Entidad Entre Mundos" }, 
    { lvl: 95, titulo: "Voz del Gran Carnero" },  
    { lvl: 90, titulo: "Leyenda Vastaya" },       
    { lvl: 85, titulo: "Maestro de los Dos Reinos" }, 
    { lvl: 80, titulo: "Caminante del Hogar" },   
    { lvl: 75, titulo: "Guía de lo Invisible" },  
    { lvl: 70, titulo: "Sabio de la Escarcha" },  
    { lvl: 65, titulo: "Purificador de Almas" },  
    { lvl: 60, titulo: "Heraldo de la Forja" },   
    { lvl: 55, titulo: "Protector del Rebaño" },  
    { lvl: 50, titulo: "Guardián de los Recuerdos" }, 
    { lvl: 45, titulo: "Saltador de Reinos" },    
    { lvl: 40, titulo: "Tejedor de Vínculos" },   
    { lvl: 35, titulo: "Viajero de la Nieve" },   
    { lvl: 30, titulo: "Amigo de los Extraviados" }, 
    { lvl: 25, titulo: "Investigador de Runas" }, 
    { lvl: 20, titulo: "Vidente del Velo" },      
    { lvl: 15, titulo: "Estudiante Bryni" },      
    { lvl: 10, titulo: "Caminante de la Tundra" },
    { lvl: 5, titulo: "Oyente de los Susurros" }, 
    { lvl: 0, titulo: "Forastero de Aamu" }       
];

// Función para saber qué título tiene un nivel específico
function obtenerTituloRango(nivel) {
    for (let i = 0; i < RANGOS_DATA.length; i++) {
        if (nivel >= RANGOS_DATA[i].lvl) {
            return RANGOS_DATA[i].titulo;
        }
    }
    return RANGOS_DATA[RANGOS_DATA.length - 1].titulo;
}

// 📈 Fórmula matemática para calcular cuánta XP requiere el nivel actual
function calcularXPMeta(nivel) {
    const nivelSeguro = nivel < 1 ? 1 : nivel;
    return Math.floor(100 * Math.pow(nivelSeguro, 1.5));
}

// 🎉 Lógica compartida para revisar si alguien subió de nivel y avisarle
async function procesarSubidaNivel(client, userDB, userId, username, channel = null) {
    let nivelAnterior = userDB.Social.Nivel || 1;
    let subioNivel = false;
    let xpMeta = calcularXPMeta(userDB.Social.Nivel);

    // Bucle `while` en caso de que alguien gane tanta XP de golpe que suba múltiples niveles
    while (userDB.Social.XP >= xpMeta) {
        userDB.Social.XP -= xpMeta; // Le restamos la XP usada para subir de nivel
        userDB.Social.Nivel += 1; // Sube 1 nivel
        subioNivel = true;
        xpMeta = calcularXPMeta(userDB.Social.Nivel); // Recalculamos la nueva meta
    }

    // Si subió de nivel, comprobamos si también cambió de rango
    if (subioNivel) {
        const tituloAnterior = obtenerTituloRango(nivelAnterior);
        const tituloNuevo = obtenerTituloRango(userDB.Social.Nivel);

        // Si el título es diferente (cruzó un umbral múltiplo de 5)
        if (tituloAnterior !== tituloNuevo) {
            try {
                // Cargamos los mensajes en vivo desde Discord
                let msg = {};
                try { 
                    delete require.cache[require.resolve('./mensajes.js')];
                    msg = require('./mensajes.js'); 
                } catch(e) {
                    msg = { AlertaNivel: (u, n, r) => `🎉 ¡Felicidades ${u}! Has alcanzado el **Nivel ${n}** y te conviertes en **${r}**.` };
                }

                const mencion = `<@${userId}>`;
                const textoAlerta = typeof msg.AlertaNivel === 'function' ? msg.AlertaNivel(mencion, userDB.Social.Nivel, tituloNuevo) : msg.AlertaNivel;

                if (channel) {
                    // Si subió de nivel por chatear, lo anunciamos en el mismo canal
                    await channel.send(textoAlerta);
                } else {
                    // Si subió por estar en llamada de voz, le enviamos un Mensaje Directo
                    const userDiscord = await client.users.fetch(userId);
                    if (userDiscord) {
                        await userDiscord.send(textoAlerta);
                    }
                }
            } catch (error) {
                console.log(`[Motor XP] No se pudo enviar alerta de nivel para ${username}.`);
            }
        }
    }

    return subioNivel;
}

// ==========================================
// 💬 1. SISTEMA DE XP POR MENSAJES DE TEXTO
// ==========================================
async function otorgarXPMensaje(client, message) {
    const userId = message.author.id;

    // 1. Revisar Cooldown (Anti-Spam)
    const ahora = Date.now();
    if (cooldownsMensajes.has(userId)) {
        const tiempoVencimiento = cooldownsMensajes.get(userId) + (COOLDOWN_SEGUNDOS * 1000);
        if (ahora < tiempoVencimiento) return; // Si aún está en enfriamiento, no le damos XP
    }

    // 2. Aplicar nuevo cooldown
    cooldownsMensajes.set(userId, ahora);

    // 3. Buscar al usuario en la base de datos
    const userDB = await Usuario.findOne({ Discord_ID: userId });
    if (!userDB || !userDB.Social) return;

    // 4. Calcular XP aleatoria
    const xpGanada = Math.floor(Math.random() * (XP_TEXTO_MAX - XP_TEXTO_MIN + 1)) + XP_TEXTO_MIN;

    // 5. Sumar a las estadísticas
    userDB.Social.XP += xpGanada;
    userDB.Social.Mensajes += 1; 

    // 6. Comprobar si subió de nivel y rango (Pasamos message.channel para avisar ahí mismo)
    await procesarSubidaNivel(client, userDB, userId, message.author.username, message.channel);

    // 7. Guardar en MongoDB
    await userDB.save().catch(() => {});
}

// ==========================================
// 🎙️ 2. SISTEMA DE XP POR LLAMADA DE VOZ
// ==========================================
async function rastrearVoz(client, oldState, newState) {
    // Ya no usamos eventos inestables, el cronjob abajo hace el trabajo pesado
}

// ==========================================
// ⚙️ 3. INICIALIZADOR Y MOTOR EN SEGUNDO PLANO
// ==========================================
function iniciarMotorXP(client) {
    console.log('\x1b[32m·\x1b[0m [Motor XP] El sistema de ganancia pasiva ha arrancado.');

    // Configuramos un escáner que revisa todos los canales de voz CADA 1 MINUTO
    setInterval(async () => {
        if (!client || !client.guilds) return;

        const usuariosParaXP = [];

        client.guilds.cache.forEach(guild => {
            guild.channels.cache.filter(c => c.isVoiceBased()).forEach(channel => {
                
                // Si hay menos de 2 personas reales en el canal, nadie gana XP (Anti-AFK solitarios)
                const usuariosReales = channel.members.filter(m => !m.user.bot);
                if (usuariosReales.size < 2) return;

                // Evaluamos a cada miembro del canal
                usuariosReales.forEach(member => {
                    // No gana XP si está ensordecido o silenciado
                    if (member.voice.selfMute || member.voice.serverMute || member.voice.selfDeaf || member.voice.serverDeaf) {
                        return;
                    }
                    usuariosParaXP.push(member.id);
                });
            });
        });

        if (usuariosParaXP.length === 0) return;

        const usuariosDB = await Usuario.find({ Discord_ID: { $in: usuariosParaXP } });

        for (const userDB of usuariosDB) {
            if (!userDB.Social) continue;

            userDB.Social.XP += XP_VOZ_POR_MINUTO;
            userDB.Social.Minutos_Voz += 1; 

            // Le pasamos `null` al canal, así le mandará el mensaje por Privado si subió por voz
            await procesarSubidaNivel(client, userDB, userDB.Discord_ID, userDB.Discord_Nick, null);
            await userDB.save().catch(() => {});
        }

    }, 60000); // 60,000 ms = 1 Minuto
}

module.exports = { otorgarXPMensaje, rastrearVoz, iniciarMotorXP };