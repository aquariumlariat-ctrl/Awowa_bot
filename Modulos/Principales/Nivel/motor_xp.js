// Modulos/Principales/Nivel/motor_xp.js
const fs = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

// 🧠 Memoria RAM para Cooldowns y Sesiones de Voz
const cooldownsTexto = new Map();
const sesionesVoz = new Map();

// Función auxiliar para guardar el JSON localmente
function guardarJSONLocal(user) {
    const numMatricula = user.Numero_Matricula;
    const nickSeguro = user.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
    const jsonPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`, 'datos_basicos.json');
    
    if (fs.existsSync(jsonPath)) {
        let datos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        datos.Social = user.Social;
        fs.writeFileSync(jsonPath, JSON.stringify(datos, null, 4), 'utf8');
    }
}

// 📖 RANGOS DE AURORA
function obtenerTituloNivel(nivel) {
    if (nivel >= 100) return "Entidad Entre Mundos";
    if (nivel >= 95) return "Voz del Gran Carnero";
    if (nivel >= 90) return "Leyenda Vastaya";
    if (nivel >= 85) return "Maestro de los Dos Reinos";
    if (nivel >= 80) return "Caminante del Hogar";
    if (nivel >= 75) return "Guía de lo Invisible";
    if (nivel >= 70) return "Sabio de la Escarcha";
    if (nivel >= 65) return "Purificador de Almas";
    if (nivel >= 60) return "Heraldo de la Forja";
    if (nivel >= 55) return "Protector del Rebaño";
    if (nivel >= 50) return "Guardián de los Recuerdos";
    if (nivel >= 45) return "Saltador de Reinos";
    if (nivel >= 40) return "Tejedor de Vínculos";
    if (nivel >= 35) return "Viajero de la Nieve";
    if (nivel >= 30) return "Amigo de los Extraviados";
    if (nivel >= 25) return "Investigador de Runas";
    if (nivel >= 20) return "Vidente del Velo";
    if (nivel >= 15) return "Estudiante Bryni";
    if (nivel >= 10) return "Caminante de la Tundra";
    if (nivel >= 5) return "Oyente de los Susurros";
    return "Forastero de Aamu";
}

// 🧮 Lógica de Subida de Nivel
async function procesarNivel(client, discordUser, userDB) {
    let subioDeNivel = false;
    let nivelAlcanzado = userDB.Social.Nivel;

    // Fórmula Exponencial: XP Necesaria = 100 * (Nivel ^ 1.5)
    let xpMeta = Math.floor(100 * Math.pow(userDB.Social.Nivel, 1.5));

    // Bucle por si ganó demasiada XP de golpe y sube varios niveles
    while (userDB.Social.XP >= xpMeta) {
        userDB.Social.Nivel += 1;
        nivelAlcanzado = userDB.Social.Nivel;
        subioDeNivel = true;
        xpMeta = Math.floor(100 * Math.pow(userDB.Social.Nivel, 1.5));
    }

    if (subioDeNivel) {
        await userDB.save();
        guardarJSONLocal(userDB);

        // Si es múltiplo de 10, enviamos DM
        if (nivelAlcanzado % 10 === 0 && discordUser) {
            try {
                const titulo = obtenerTituloNivel(nivelAlcanzado);
                const dmChannel = await discordUser.createDM();
                await dmChannel.send(`✨ **¡Tu magia ha evolucionado!** Has alcanzado el **Nivel ${nivelAlcanzado}**. Ahora la Academia te reconoce como: **${titulo}**.`);
                console.log(`${c.v}·${c.b} [Nivel] ${discordUser.username} subió al nivel ${nivelAlcanzado} (DM Enviado).`);
            } catch (e) {
                console.log(`${c.a}·${c.b} [Nivel] ${discordUser.username} subió al nivel ${nivelAlcanzado} (MDs cerrados).`);
            }
        } else {
            console.log(`${c.v}·${c.b} [Nivel] ${discordUser?.username || userDB.Discord_Nick} subió al nivel ${nivelAlcanzado}.`);
        }
    } else {
        await userDB.save();
        guardarJSONLocal(userDB);
    }
}

// 💬 OTORGAR XP POR TEXTO
async function otorgarXPMensaje(client, message) {
    if (message.author.bot || !message.guild) return;

    const ahora = Date.now();
    const userId = message.author.id;
    const cooldownTiempo = 60000; // 60 segundos de enfriamiento

    const userDB = await Usuario.findOne({ Discord_ID: userId });
    if (!userDB || !userDB.Social) return; 

    userDB.Social.Mensajes += 1; 

    if (cooldownsTexto.has(userId)) {
        const expiracion = cooldownsTexto.get(userId) + cooldownTiempo;
        if (ahora < expiracion) {
            await userDB.save();
            guardarJSONLocal(userDB);
            return; 
        }
    }

    // Damos XP aleatoria (Entre 15 y 25)
    const xpGanada = Math.floor(Math.random() * (25 - 15 + 1)) + 15;
    userDB.Social.XP += xpGanada;
    
    cooldownsTexto.set(userId, ahora);
    await procesarNivel(client, message.author, userDB);
}

// 🎙️ OTORGAR XP POR VOZ
async function rastrearVoz(client, oldState, newState) {
    if (newState.member.user.bot) return;

    const userId = newState.member.id;
    const ahora = Date.now();

    const seUnio = !oldState.channelId && newState.channelId;
    const seFue = oldState.channelId && !newState.channelId;
    const seEnsordecio = !oldState.selfDeaf && newState.selfDeaf;
    const seDesensordecio = oldState.selfDeaf && !newState.selfDeaf;

    if ((seUnio && !newState.selfDeaf) || seDesensordecio) {
        sesionesVoz.set(userId, ahora);
        return;
    }

    if (seFue || seEnsordecio) {
        if (sesionesVoz.has(userId)) {
            const tiempoEntrada = sesionesVoz.get(userId);
            const minutosConectado = Math.floor((ahora - tiempoEntrada) / 60000);
            
            sesionesVoz.delete(userId); 

            if (minutosConectado > 0) {
                const userDB = await Usuario.findOne({ Discord_ID: userId });
                if (!userDB || !userDB.Social) return;

                // 10 XP por cada 5 minutos
                const ciclosXP = Math.floor(minutosConectado / 5);
                const xpGanada = ciclosXP * 10;

                userDB.Social.Minutos_Voz += minutosConectado;
                if (xpGanada > 0) {
                    userDB.Social.XP += xpGanada;
                }

                await procesarNivel(client, newState.member.user, userDB);
            }
        }
    }
}

// 🎮 OTORGAR XP POR PARTIDAS DE LOL
async function otorgarXPPartidas(client, userDB, partidasNuevas) {
    if (!userDB || !userDB.Social) return;

    const fechaMatriculaMs = userDB._id.getTimestamp().getTime();
    let xpGanadaTotal = 0;

    for (const match of partidasNuevas) {
        const fechaPartida = match.info.gameCreation;

        // Solo cuentan las partidas que se jugaron DESPUÉS de haberse matriculado
        if (fechaPartida < fechaMatriculaMs) continue;

        const yo = match.info.participants.find(p => p.puuid === userDB.PUUID);
        if (!yo) continue;

        // Si fue remake, no damos XP 
        if (match.info.gameDuration < 300) continue; 

        // 50 XP por victoria, 20 XP por derrota
        const xpPartida = yo.win ? 50 : 20;
        xpGanadaTotal += xpPartida;
        userDB.Social.Partidas_Registradas += 1;
    }

    if (xpGanadaTotal > 0) {
        userDB.Social.XP += xpGanadaTotal;
        console.log(`${c.a}·${c.b} [Nivel] Se otorgaron ${xpGanadaTotal} XP a ${userDB.Discord_Nick} por jugar a LoL.`);
        
        const discordUser = await client.users.fetch(userDB.Discord_ID).catch(() => null);
        await procesarNivel(client, discordUser, userDB);
    }
}

function iniciarMotorXP() {
    // Validamos que los mapas en RAM estén listos (esto es casi instantáneo, pero da seguridad)
    if (cooldownsTexto && sesionesVoz) {
        console.log(`${c.v}·${c.b} [Nivel] Motor de experiencia RPG iniciado ${c.v}correctamente${c.b}.`);
    } else {
        console.log(`${c.r}·${c.b} [Nivel] Motor de experiencia RPG: ${c.r}Fallo en la memoria RAM${c.b}.`);
    }
}

module.exports = { otorgarXPMensaje, rastrearVoz, otorgarXPPartidas, iniciarMotorXP };