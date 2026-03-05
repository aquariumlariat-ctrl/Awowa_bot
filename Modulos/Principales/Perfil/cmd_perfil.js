// Modulos/Principales/Perfil/cmd_perfil.js

const { AttachmentBuilder } = require('discord.js');
const { generarBoceto } = require('../../Utilidades/Canvas/diseno_perfil.js');
const { verificarCuentaRiot, obtenerSummoner, obtenerRangos, obtenerTodasLasPartidas, regionAPlatforma } = require('../../../API\'s/Riot/lol_api.js');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

const ICONOS_ROLES = {
    'ADC': 'https://i.imgur.com/fJofENZ.png',
    'JG': 'https://i.imgur.com/IKquw1O.png',
    'MID': 'https://i.imgur.com/WB2PDTS.png',
    'SUPP': 'https://i.imgur.com/cHJSXyu.png',
    'TOP': 'https://i.imgur.com/qRq8eWu.png'
};

module.exports = [
    {
        name: 'perfil',
        description: 'Muestra la tarjeta de perfil de League of Legends con TODOS los datos de SoloQ.',
        async execute(message, args) {
            
            if (!args || args.length === 0) {
                return message.reply('❌ ¡Te faltó el nombre! Usa el formato: `aurora!perfil [Región] Nombre#Tag`');
            }

            let regionElegida = 'LAN'; 
            let riotIdInput = '';

            const regionesValidas = ['LAN', 'LAS', 'NA', 'BR'];
            if (regionesValidas.includes(args[0].toUpperCase())) {
                regionElegida = args[0].toUpperCase();
                riotIdInput = args.slice(1).join(''); 
            } else {
                riotIdInput = args.join(''); 
            }

            if (!riotIdInput.includes('#')) {
                return message.reply('❌ Formato incorrecto. Recuerda incluir el Tag (ej: `Faker#KR1`).');
            }

            const [gameName, tagLine] = riotIdInput.split('#');
            const plataforma = regionAPlatforma[regionElegida];

            const msgCarga = await message.reply('⏳ `Buscando perfil en la base de datos de Riot...`');

            try {
                // 1. IDs y Summoner Data
                const cuentaRiot = await verificarCuentaRiot(gameName, tagLine);
                if (!cuentaRiot.existe) return msgCarga.edit(`❌ No se encontró la cuenta **${riotIdInput}**.`);
                const puuid = cuentaRiot.data.puuid;

                const summonerData = await obtenerSummoner(puuid, plataforma);
                if (!summonerData) return msgCarga.edit('❌ Error al obtener los datos del Invocador.');
                
                // 2. Obtener TODAS LAS PARTIDAS DE SOLOQ (queue: 420)
                const partidasCrudas = await obtenerTodasLasPartidas(puuid, plataforma, 420, msgCarga);

                if (!partidasCrudas || partidasCrudas.length === 0) {
                    return msgCarga.edit('⚠️ Este jugador no tiene partidas de SoloQ para analizar en esta temporada.').catch(()=>{});
                }

                await msgCarga.edit('⏳ `Cálculos finalizados. Dibujando el lienzo de perfil...`').catch(()=>{});

                // 3. Procesar la información
                let champsStats = {};
                let rolesStats = {};
                let miniHistorial = [];
                let companerosStats = {};

                let totalKills = 0;
                let totalDeaths = 0;
                let totalAssists = 0;
                let validGamesForKda = 0;
                
                // 👇 NUESTROS CONTADORES MANUALES DE VICTORIAS Y DERROTAS
                let realWins = 0;
                let realLosses = 0;

                partidasCrudas.forEach(match => {
                    if (!match.info || match.info.queueId !== 420) return;

                    const myParticipant = match.info.participants.find(p => p.puuid === puuid);
                    if (!myParticipant) return;

                    const isWin = myParticipant.win;
                    const myTeamId = myParticipant.teamId;
                    
                    // Sumamos a nuestro contador global
                    isWin ? realWins++ : realLosses++;

                    // Solo el historial de los últimos 9 juegos visualmente
                    if (miniHistorial.length < 9) {
                        miniHistorial.push({ champ: myParticipant.championName, vic: isWin });
                    }

                    // KDA Global
                    totalKills += myParticipant.kills;
                    totalDeaths += myParticipant.deaths;
                    totalAssists += myParticipant.assists;
                    validGamesForKda++;

                    // Stats de Campeones
                    const champ = myParticipant.championName;
                    if (!champsStats[champ]) champsStats[champ] = { kills: 0, deaths: 0, assists: 0, wins: 0, losses: 0, games: 0 };
                    champsStats[champ].kills += myParticipant.kills;
                    champsStats[champ].deaths += myParticipant.deaths;
                    champsStats[champ].assists += myParticipant.assists;
                    champsStats[champ].games++;
                    isWin ? champsStats[champ].wins++ : champsStats[champ].losses++;

                    // Stats de Roles
                    let role = myParticipant.teamPosition;
                    if (role === 'UTILITY') role = 'SUPP';
                    else if (role === 'BOTTOM') role = 'ADC';
                    else if (role === 'MIDDLE') role = 'MID';
                    else if (role === 'JUNGLE') role = 'JG';
                    
                    if (role && role !== 'Invalid') {
                        if (!rolesStats[role]) rolesStats[role] = { wins: 0, losses: 0, games: 0 };
                        rolesStats[role].games++;
                        isWin ? rolesStats[role].wins++ : rolesStats[role].losses++;
                    }

                    // Compañeros
                    match.info.participants.forEach(p => {
                        if (p.teamId === myTeamId && p.puuid !== puuid) {
                            if (!companerosStats[p.puuid]) {
                                companerosStats[p.puuid] = {
                                    nick: p.riotIdGameName || p.summonerName || 'Desconocido',
                                    tag: p.riotIdTagline || '',
                                    icono: p.profileIcon, 
                                    games: 0
                                };
                            }
                            companerosStats[p.puuid].games++;
                        }
                    });
                });

                // 4. Formateo de Canvas
                const notablesFormateados = Object.keys(champsStats)
                    .sort((a, b) => champsStats[b].games - champsStats[a].games)
                    .slice(0, 5)
                    .map(c => {
                        const s = champsStats[c];
                        const kdaNum = s.deaths === 0 ? (s.kills + s.assists) : ((s.kills + s.assists) / s.deaths);
                        const wr = Math.round((s.wins / s.games) * 100);
                        return {
                            champ: c,
                            kda: kdaNum.toFixed(1),
                            wr: `${wr}%`,
                            kdaStr: `${(s.kills/s.games).toFixed(1)} l ${(s.deaths/s.games).toFixed(1)} l ${(s.assists/s.games).toFixed(1)}`,
                            partStr: `${s.wins} V l ${s.losses} D`
                        };
                    });

                const rolesFormateados = Object.keys(rolesStats)
                    .sort((a, b) => rolesStats[b].games - rolesStats[a].games)
                    .slice(0, 2)
                    .map(r => {
                        const s = rolesStats[r];
                        const wr = Math.round((s.wins / s.games) * 100);
                        return {
                            nombre: r,
                            icono: ICONOS_ROLES[r] || ICONOS_ROLES['MID'],
                            wr: `${wr}%`,
                            vic: `${s.wins} Victorias`,
                            der: `${s.losses} Derrotas`
                        };
                    });

                const companerosFormateados = Object.values(companerosStats)
                    .sort((a, b) => b.games - a.games)
                    .filter(c => c.games > 1) 
                    .slice(0, 4)
                    .map(c => ({
                        icono: c.icono,
                        nick: c.nick.length > 10 ? c.nick.substring(0, 10) + '...' : c.nick,
                        tag: c.tag,
                        partidas: `${c.games} Partidas`
                    }));

                let kdaGlobalNum = '0.0';
                let kdaGlobalStr = '0.0 l 0.0 l 0.0';
                
                if (validGamesForKda > 0) {
                    const avgK = (totalKills / validGamesForKda).toFixed(1);
                    const avgD = (totalDeaths / validGamesForKda).toFixed(1);
                    const avgA = (totalAssists / validGamesForKda).toFixed(1);
                    const ratio = totalDeaths === 0 ? (totalKills + totalAssists).toFixed(1) : ((totalKills + totalAssists) / totalDeaths).toFixed(1);
                    
                    kdaGlobalNum = ratio;
                    kdaGlobalStr = `${avgK} l ${avgD} l ${avgA}`;
                }

                // 👇 Empaquetamos los datos manuales que sacamos de las partidas reales
                const paqueteFinal = {
                    notables: notablesFormateados,
                    rendimiento: { wins: realWins, losses: realLosses }, 
                    roles: rolesFormateados,
                    historial: miniHistorial,
                    companeros: companerosFormateados,
                    kdaPromedio: {
                        num: kdaGlobalNum,
                        detalles: kdaGlobalStr
                    }
                };

                const imagenBuffer = await generarBoceto(paqueteFinal);
                const attachment = new AttachmentBuilder(imagenBuffer, { name: 'perfil.png' });

                await msgCarga.edit({ 
                    content: `✨ Aquí tienes el perfil de **${gameName}** (Basado en **${validGamesForKda}** partidas totales de SoloQ):`, 
                    files: [attachment] 
                }).catch(()=>{});

            } catch (error) {
                // 👇 AQUI APLICAMOS EL ESTÁNDAR 👇
                console.error(`${c.r}·${c.b} [Perfil] Ejecución del comando perfil: ${c.r}Fallo${c.b}.`, error);
                await msgCarga.edit('❌ Hubo un error crítico procesando este perfil.').catch(()=>{});
            }
        }
    }
];