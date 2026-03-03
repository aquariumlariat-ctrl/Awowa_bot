// API's/Riot/lol_api.js

const regionAPlatforma = {
    'LAN': 'la1', 'LAS': 'la2', 'NA': 'na1', 'BR': 'br1'
};

const plataformaARouting = {
    'la1': 'americas', 'la2': 'americas', 'na1': 'americas', 'br1': 'americas'
};

// Función para pausar la ejecución y no ser baneados por Riot
const delay = ms => new Promise(res => setTimeout(res, ms));

async function verificarCuentaRiot(gameName, tagLine) {
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    try {
        const response = await fetch(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        if (response.status === 200) return { existe: true, data: await response.json() };
        if (response.status === 404) return { existe: false };
        return { existe: false, error: true };
    } catch {
        return { existe: false, error: true };
    }
}

async function obtenerSummoner(puuid, plataforma) {
    const url = `https://${plataforma}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    try {
        const response = await fetch(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        if (response.status === 200) return await response.json();
        return null;
    } catch {
        return null;
    }
}

async function obtenerRangos(summonerId, plataforma) {
    const url = `https://${plataforma}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    try {
        const response = await fetch(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        if (response.status === 200) {
            const data = await response.json();
            const rangos = { soloq: null, flex: null };
            data.forEach(queue => {
                if (queue.queueType === 'RANKED_SOLO_5x5') {
                    rangos.soloq = { tier: queue.tier, rank: queue.rank, lp: queue.leaguePoints, wins: queue.wins, losses: queue.losses };
                } else if (queue.queueType === 'RANKED_FLEX_SR') {
                    rangos.flex = { tier: queue.tier, rank: queue.rank, lp: queue.leaguePoints, wins: queue.wins, losses: queue.losses };
                }
            });
            return rangos;
        }
        return { soloq: null, flex: null };
    } catch {
        return { soloq: null, flex: null };
    }
}

// 👇 EL EXTRACTOR CON EL "CORTAFUEGOS" MANUAL PARA EVADIR EL BUG DE RIOT
async function obtenerTodasLasPartidas(puuid, plataforma, queueId = 420, msgCarga) {
    try {
        const routing = plataformaARouting[plataforma] || 'americas';
        const headers = { 'X-Riot-Token': process.env.RIOT_API_KEY };
        
        // Fecha de corte EXACTA (7 de enero de 2026)
        const inicioSeason2026 = new Date('2026-01-07T00:00:00Z');
        const limiteTiempoMs = inicioSeason2026.getTime(); 
        
        let partidasValidas = [];
        let start = 0;
        let buscarMas = true;
        let totalAnalizadas = 0;

        // Bucle infinito hasta que topemos con una partida de 2025
        while (buscarMas) {
            // Pedimos los IDs de 10 en 10
            const urlIds = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=10&queue=${queueId}`;
            const idsRes = await fetch(urlIds, { headers });
            
            if (idsRes.status !== 200) break;
            const chunkIds = await idsRes.json();
            
            if (chunkIds.length === 0) break; // Ya no hay más partidas en absoluto

            // Descargamos las 10 partidas en paralelo para que sea rápido
            const matchPromises = chunkIds.map(async id => {
                const res = await fetch(`https://${routing}.api.riotgames.com/lol/match/v5/matches/${id}`, { headers });
                if (res.status === 429) {
                    await delay(5000); 
                    return null;
                }
                return res.status === 200 ? await res.json() : null;
            });
            
            const chunkData = await Promise.all(matchPromises);
            let tocamosFondo = false;

            // Revisamos una por una
            for (const match of chunkData) {
                if (!match || !match.info) continue;

                const fechaPartidaMs = match.info.gameCreation;

                // 🛑 EL CORTAFUEGOS: Si es vieja, detenemos todo
                if (fechaPartidaMs < limiteTiempoMs) {
                    tocamosFondo = true;
                    buscarMas = false; 
                } else {
                    partidasValidas.push(match);
                    totalAnalizadas++;
                }
            }

            if (msgCarga && !tocamosFondo) {
                await msgCarga.edit(`⏳ \`Procesando... ${totalAnalizadas} partidas de SoloQ encontradas hasta ahora.\``).catch(()=>{});
            }

            if (tocamosFondo) break; // Rompemos el ciclo while porque ya llegamos a 2025

            start += 10;
            await delay(1250); // Pausa obligatoria para respetar a Riot (1.25 segs)
        }
        
        return partidasValidas;
    } catch (e) {
        console.error("Error al extraer todas las partidas:", e);
        return [];
    }
}

module.exports = {
    regionAPlatforma,
    verificarCuentaRiot,
    obtenerSummoner,
    obtenerRangos,
    obtenerTodasLasPartidas
};