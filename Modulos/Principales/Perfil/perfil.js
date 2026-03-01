const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generarBoceto } = require('./ruta/hacia/tu/diseno_perfil.js'); // <-- Ajusta esta ruta
// Si no tienes axios instalado, usa: npm install axios
const axios = require('axios'); 

const RIOT_API_KEY = 'TU_RIOT_API_KEY_AQUI'; // Pon tu llave de desarrollador aquí
const REGION_ROUTING = 'americas'; // americas, asia, europe, sea
const REGION_LOL = 'la1'; // la1, la2, euw1, na1, etc.

// Diccionario para mapear los roles de Riot a nuestros iconos
const ICONOS_ROLES = {
    'BOTTOM': 'https://i.imgur.com/fJofENZ.png', // ADC
    'JUNGLE': 'https://i.imgur.com/IKquw1O.png', // JG
    'MIDDLE': 'https://i.imgur.com/WB2PDTS.png', // MID
    'UTILITY': 'https://i.imgur.com/cHJSXyu.png', // SUPP
    'TOP': 'https://i.imgur.com/qRq8eWu.png'      // TOP
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Muestra el perfil de League of Legends de un jugador')
        .addStringOption(option => 
            option.setName('riot_id')
                .setDescription('Ejemplo: Faker#KR1')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply(); // Le decimos a Discord que espere, esto toma unos segundos

        const riotIdInput = interaction.options.getString('riot_id');
        const [gameName, tagLine] = riotIdInput.split('#');

        if (!gameName || !tagLine) {
            return interaction.editReply('❌ Formato incorrecto. Debes usar el formato Nombre#Tag (ej: Faker#KR1)');
        }

        try {
            // 1. Obtener PUUID
            const accountRes = await axios.get(`https://${REGION_ROUTING}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`);
            const puuid = accountRes.data.puuid;

            // 2. Obtener Summoner Data (Para el ID de la liga)
            const summonerRes = await axios.get(`https://${REGION_LOL}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`);
            const summonerId = summonerRes.data.id;

            // 3. Obtener Winrate Total (Solo/Duo)
            const leagueRes = await axios.get(`https://${REGION_LOL}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${RIOT_API_KEY}`);
            const rankedData = leagueRes.data.find(q => q.queueType === 'RANKED_SOLO_5x5');
            let winsTotal = 0, lossesTotal = 0;
            if (rankedData) {
                winsTotal = rankedData.wins;
                lossesTotal = rankedData.losses;
            }

            // 4. Obtener las últimas 15 partidas (15 para no saturar la API gratuita de golpe)
            const matchesRes = await axios.get(`https://${REGION_ROUTING}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=15&api_key=${RIOT_API_KEY}`);
            const matchIds = matchesRes.data;

            // 5. Descargar los detalles de esas 15 partidas en paralelo
            const matchPromises = matchIds.map(id => axios.get(`https://${REGION_ROUTING}.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${RIOT_API_KEY}`));
            const matchesDetails = await Promise.all(matchPromises);

            // --- VARIABLES PARA ACUMULAR DATOS ---
            let champsStats = {};
            let rolesStats = {};
            let miniHistorial = [];
            
            // Procesar cada partida
            for (const match of matchesDetails) {
                const info = match.data.info;
                const participant = info.participants.find(p => p.puuid === puuid);
                if (!participant) continue;

                const isWin = participant.win;

                // A. Llenar Mini Historial
                miniHistorial.push({
                    champ: participant.championName,
                    vic: isWin
                });

                // B. Acumular Stats de Campeones
                const champName = participant.championName;
                if (!champsStats[champName]) {
                    champsStats[champName] = { kills: 0, deaths: 0, assists: 0, wins: 0, losses: 0, games: 0 };
                }
                champsStats[champName].kills += participant.kills;
                champsStats[champName].deaths += participant.deaths;
                champsStats[champName].assists += participant.assists;
                champsStats[champName].games += 1;
                isWin ? champsStats[champName].wins++ : champsStats[champName].losses++;

                // C. Acumular Stats de Roles
                const role = participant.teamPosition; // TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
                if (role && role !== '') {
                    if (!rolesStats[role]) rolesStats[role] = { wins: 0, losses: 0, games: 0 };
                    rolesStats[role].games += 1;
                    isWin ? rolesStats[role].wins++ : rolesStats[role].losses++;
                }
            }

            // --- TRANSFORMAR Y ORDENAR DATOS PARA EL CANVAS ---

            // Formatear Campeones Notables (Top 5 con más partidas)
            const topChamps = Object.keys(champsStats)
                .sort((a, b) => champsStats[b].games - champsStats[a].games)
                .slice(0, 5)
                .map(champ => {
                    const stats = champsStats[champ];
                    const kdaNum = stats.deaths === 0 ? (stats.kills + stats.assists) : ((stats.kills + stats.assists) / stats.deaths);
                    const wrPorcentaje = Math.round((stats.wins / stats.games) * 100);
                    
                    return {
                        champ: champ,
                        kda: kdaNum.toFixed(1),
                        wr: `${wrPorcentaje}%`,
                        kdaStr: `${Math.round(stats.kills/stats.games)} l ${Math.round(stats.deaths/stats.games)} l ${Math.round(stats.assists/stats.games)}`,
                        partStr: `${stats.wins} V l ${stats.losses} D`
                    };
                });

            // Formatear Roles Principales (Top 2)
            const topRoles = Object.keys(rolesStats)
                .sort((a, b) => rolesStats[b].games - rolesStats[a].games)
                .slice(0, 2)
                .map(role => {
                    const stats = rolesStats[role];
                    const wrPorcentaje = Math.round((stats.wins / stats.games) * 100);
                    return {
                        nombre: role,
                        icono: ICONOS_ROLES[role] || ICONOS_ROLES['MIDDLE'], // Fallback por si acaso
                        wr: `${wrPorcentaje}%`,
                        vic: `${stats.wins} Victorias`,
                        der: `${stats.losses} Derrotas`
                    };
                });

            // Ensamblar el objeto final
            const datosParaCanvas = {
                notables: topChamps,
                rendimiento: { wins: winsTotal || 1, losses: lossesTotal || 1 }, // || 1 evita divisiones por cero
                roles: topRoles,
                historial: miniHistorial,
                companeros: [ // Mockeados por ahora para no quemar la API
                    { icono: '23', nick: 'DuoAmigo1', tag: 'LAS', partidas: '12 Partidas' },
                    { icono: '24', nick: 'TryhardMaster', tag: 'LAN', partidas: '8 Partidas' }
                ]
            };

            // 6. Enviar a nuestro generador de imágenes
            const imagenBuffer = await generarBoceto(datosParaCanvas);
            const attachment = new AttachmentBuilder(imagenBuffer, { name: 'perfil.png' });

            // 7. Responder en Discord
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Hubo un error al buscar este jugador. Verifica el Riot ID o intenta más tarde.');
        }
    },
};