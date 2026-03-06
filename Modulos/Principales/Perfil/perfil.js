// Modulos/Principales/Perfil/perfil.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');

const { generarTarjetaMatricula } = require('../Matricula/canvas_matricula.js');
const { generarBoceto } = require('./canvas_resumen.js');

// 🎨 Paleta de colores ANSI
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

async function renderizarYGuardarPerfil(targetUser) {
    try {
        const numMatricula = targetUser.Numero_Matricula;
        const nickSeguro = targetUser.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
        const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);
        const archivoSoloQ = path.join(carpetaPath, 'datos_lol_soloq.json');

        const dataCruda = await fs.readFile(archivoSoloQ, 'utf8');
        const jsonSoloq = JSON.parse(dataCruda);

        const [gameName, tagLine] = targetUser.Riot_ID.split('#');
        const tarjetaBuffer = await generarTarjetaMatricula({
            gameName: gameName, tagLine: tagLine, nivel: targetUser.Nivel,
            iconoId: targetUser.Icono_ID, soloq: targetUser.Rangos?.SoloQ || null,
            flex: targetUser.Rangos?.Flex || null, numeroUsuario: numMatricula
        });

        let champsArray = [];
        for (const [cName, stats] of Object.entries(jsonSoloq.Campeones)) {
            let kdaNum = stats.deaths === 0 ? (stats.kills + stats.assists) : ((stats.kills + stats.assists) / stats.deaths);
            let wr = Math.round((stats.victorias / stats.partidas) * 100);
            champsArray.push({
                champ: cName, games: stats.partidas, kda: kdaNum.toFixed(1), wr: `${wr}%`,
                kdaStr: `${(stats.kills/stats.partidas).toFixed(1)} l ${(stats.deaths/stats.partidas).toFixed(1)} l ${(stats.assists/stats.partidas).toFixed(1)}`,
                partStr: `${stats.victorias} V l ${stats.derrotas} D`
            });
        }
        const notablesFormateados = champsArray.sort((a,b) => b.games - a.games).slice(0,5);

        let rolesStats = {};
        jsonSoloq.Historial.forEach(h => {
            if (h.esRemake) return; 
            let role = TRADUCTOR_ROLES[h.rol] || h.rol;
            if (!role || role === 'NONE' || role === 'Invalid') return;
            if (!rolesStats[role]) rolesStats[role] = { wins: 0, losses: 0, games: 0 };
            rolesStats[role].games++;
            h.victoria ? rolesStats[role].wins++ : rolesStats[role].losses++;
        });

        const rolesFormateados = Object.keys(rolesStats)
            .sort((a, b) => rolesStats[b].games - rolesStats[a].games)
            .slice(0, 2)
            .map(r => {
                const s = rolesStats[r];
                const wr = Math.round((s.wins / s.games) * 100);
                return { nombre: r, icono: ICONOS_ROLES[r] || ICONOS_ROLES['MID'], wr: `${wr}%`, vic: `${s.wins} Victorias`, der: `${s.losses} Derrotas` };
            });

        const historialFormateado = jsonSoloq.Historial
            .filter(h => !h.esRemake) 
            .sort((a, b) => b.fecha - a.fecha)
            .slice(0, 9)
            .map(h => ({ champ: h.campeon, vic: h.victoria }));

        const companerosFormateados = Object.values(jsonSoloq.Companeros)
            .sort((a, b) => b.partidas - a.partidas)
            .filter(c => c.partidas > 1) 
            .slice(0, 4)
            .map(c => ({
                icono: c.icono, nick: c.nick.length > 10 ? c.nick.substring(0, 10) + '...' : c.nick,
                tag: c.tag, partidas: `${c.partidas} Partidas`
            }));

        const paqueteFinal = {
            nick: gameName, notables: notablesFormateados,
            rendimiento: { wins: jsonSoloq.Resumen.Victorias, losses: jsonSoloq.Resumen.Derrotas },
            roles: rolesFormateados, historial: historialFormateado, companeros: companerosFormateados
        };

        const bocetoBuffer = await generarBoceto(paqueteFinal);

        await fs.writeFile(path.join(carpetaPath, 'tarjeta.png'), tarjetaBuffer);
        await fs.writeFile(path.join(carpetaPath, 'stats_soloq.png'), bocetoBuffer);

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
            const rutaStats = path.join(carpetaPath, 'stats_soloq.png');

            if (!fsSync.existsSync(rutaTarjeta) || !fsSync.existsSync(rutaStats)) {
                
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