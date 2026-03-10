// Modulos/Principales/Perfil/perfil.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');

const { generarTarjetaMatricula } = require('../Matricula/canvas_matricula.js');
const { generarBoceto } = require('./canvas_resumen.js');
const { generarBocetoSocial } = require('./canvas_social.js'); // 👇 Añadido

const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

const ICONOS_ROLES = {
    'ADC': 'https://i.imgur.com/fJofENZ.png',
    'JG': 'https://i.imgur.com/IKquw1O.png',
    'MID': 'https://i.imgur.com/WB2PDTS.png',
    'SUPP': 'https://i.imgur.com/cHJSXyu.png',
    'TOP': 'https://i.imgur.com/qRq8eWu.png'
};

const TRADUCTOR_ROLES = {
    'TOP': 'TOP', 'JUNGLE': 'JG', 'MIDDLE': 'MID', 'BOTTOM': 'ADC', 'UTILITY': 'SUPP'
};

async function procesarDatosStats(jsonObj, gameName) {
    let champsArray = [];
    if (jsonObj && jsonObj.Campeones) {
        for (const [cName, stats] of Object.entries(jsonObj.Campeones)) {
            let kdaNum = stats.deaths === 0 ? (stats.kills + stats.assists) : ((stats.kills + stats.assists) / stats.deaths);
            let wr = stats.partidas > 0 ? Math.round((stats.victorias / stats.partidas) * 100) : 0;
            champsArray.push({
                champ: cName, games: stats.partidas, kda: kdaNum.toFixed(1), wr: `${wr}%`,
                kdaStr: stats.partidas > 0 ? `${(stats.kills/stats.partidas).toFixed(1)} l ${(stats.deaths/stats.partidas).toFixed(1)} l ${(stats.assists/stats.partidas).toFixed(1)}` : "0.0 l 0.0 l 0.0",
                partStr: `${stats.victorias} V l ${stats.derrotas} D`
            });
        }
    }
    const notablesFormateados = champsArray.sort((a,b) => b.games - a.games).slice(0,5);

    let rolesStats = {};
    if (jsonObj && jsonObj.Historial) {
        jsonObj.Historial.forEach(h => {
            if (h.esRemake) return; 
            let role = TRADUCTOR_ROLES[h.rol] || h.rol;
            if (!role || role === 'NONE' || role === 'Invalid') return;
            if (!rolesStats[role]) rolesStats[role] = { wins: 0, losses: 0, games: 0 };
            rolesStats[role].games++;
            h.victoria ? rolesStats[role].wins++ : rolesStats[role].losses++;
        });
    }

    const rolesFormateados = Object.keys(rolesStats)
        .sort((a, b) => rolesStats[b].games - rolesStats[a].games)
        .slice(0, 2)
        .map(r => {
            const s = rolesStats[r];
            const wr = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
            return { nombre: r, icono: ICONOS_ROLES[r] || ICONOS_ROLES['MID'], wr: `${wr}%`, vic: `${s.wins} Victorias`, der: `${s.losses} Derrotas` };
        });

    const historialFormateado = (jsonObj && jsonObj.Historial) ? jsonObj.Historial
        .filter(h => !h.esRemake) 
        .sort((a, b) => b.fecha - a.fecha)
        .slice(0, 9)
        .map(h => ({ champ: h.campeon, vic: h.victoria })) : [];

    const companerosFormateados = (jsonObj && jsonObj.Companeros) ? Object.values(jsonObj.Companeros)
        .sort((a, b) => b.partidas - a.partidas)
        .filter(c => c.partidas > 1) 
        .slice(0, 4)
        .map(c => ({
            icono: c.icono, nick: c.nick, tag: c.tag, partidas: `${c.partidas} Partidas`
        })) : [];

    return {
        nick: gameName, notables: notablesFormateados,
        rendimiento: { wins: jsonObj?.Resumen?.Victorias || 0, losses: jsonObj?.Resumen?.Derrotas || 0 },
        roles: rolesFormateados, historial: historialFormateado, companeros: companerosFormateados
    };
}

async function renderizarYGuardarPerfil(targetUser) {
    try {
        const numMatricula = targetUser.Numero_Matricula;
        const nickSeguro = targetUser.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
        const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);

        const [gameName, tagLine] = targetUser.Riot_ID.split('#');
        const tarjetaBuffer = await generarTarjetaMatricula({
            gameName: gameName, tagLine: tagLine, nivel: targetUser.Nivel,
            iconoId: targetUser.Icono_ID, soloq: targetUser.Rangos?.SoloQ || null,
            flex: targetUser.Rangos?.Flex || null, numeroUsuario: numMatricula
        });
        await fs.writeFile(path.join(carpetaPath, 'tarjeta.png'), tarjetaBuffer);

        const archivosStats = [
            { nombre: 'datos_lol_soloq.json', img: 'stats_soloq.png', tab: 0 },
            { nombre: 'datos_lol_flex.json', img: 'stats_flex.png', tab: 1 },
            { nombre: 'datos_lol_normals.json', img: 'stats_normals.png', tab: 2 },
            { nombre: 'datos_lol_total.json', img: 'stats_total.png', tab: 3 }
        ];

        for (const arch of archivosStats) {
            const jsonRuta = path.join(carpetaPath, arch.nombre);
            let jsonObj = { Campeones: {}, Historial: [], Companeros: {}, Resumen: { Victorias: 0, Derrotas: 0 } };
            if (fsSync.existsSync(jsonRuta)) {
                const dataCruda = await fs.readFile(jsonRuta, 'utf8');
                try { jsonObj = JSON.parse(dataCruda); } catch(e) {}
            }
            const paqueteFinal = await procesarDatosStats(jsonObj, gameName);
            const bocetoBuffer = await generarBoceto(paqueteFinal, arch.tab);
            await fs.writeFile(path.join(carpetaPath, arch.img), bocetoBuffer);
        }

        // 👇 Renderizamos el perfil Social en caché
        const bocetoSocialBuffer = await generarBocetoSocial();
        await fs.writeFile(path.join(carpetaPath, 'stats_social.png'), bocetoSocialBuffer);

        return true;
    } catch (error) {
        console.error(`${c.r}·${c.b} [Perfil] Renderizado en segundo plano para ${targetUser?.Discord_Nick}: ${c.r}Fallo${c.b}.`, error);
        return false;
    }
}

async function precargarPerfiles() {
    try {
        const todosLosUsuarios = await Usuario.find().sort({ Numero_Matricula: 1 });
        let dibujados = 0;
        let avisoMostrado = false;

        for (const user of todosLosUsuarios) {
            const numMatricula = user.Numero_Matricula;
            const nickSeguro = user.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
            const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);
            const rutaTarjeta = path.join(carpetaPath, 'tarjeta.png');
            
            const statsFiles = ['stats_soloq.png', 'stats_flex.png', 'stats_normals.png', 'stats_total.png', 'stats_social.png'];
            let needsRender = !fsSync.existsSync(rutaTarjeta);
            for (const s of statsFiles) {
                if (!fsSync.existsSync(path.join(carpetaPath, s))) needsRender = true;
            }

            if (needsRender) {
                if (!avisoMostrado) {
                    console.log(`${c.a}·${c.b} [Perfil] Dibujando perfiles faltantes en caché...`);
                    avisoMostrado = true;
                }
                const exito = await renderizarYGuardarPerfil(user);
                if (exito) {
                    console.log(`${c.v}·${c.b} [Perfil] Perfil de ${user.Discord_Nick} dibujado correctamente.`);
                    dibujados++;
                }
            }
        }
        if (dibujados > 0) {
            console.log(`${c.v}·${c.b} [Perfil] Proceso finalizado. Total de perfiles generados: ${c.v}${dibujados}${c.b}.`);
        }
    } catch (error) {
        console.error(`${c.r}·${c.b} [Perfil] Precarga de perfiles en el arranque: ${c.r}Fallo${c.b}.`, error);
    }
}

module.exports = { renderizarYGuardarPerfil, precargarPerfiles };