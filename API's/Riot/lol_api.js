// API's/Riot/lol_api.js

const regionAPlatforma = {
    'LAN': 'la1', 'LAS': 'la2', 'NA': 'na1', 'BR': 'br1'
};

const plataformaARouting = {
    'la1': 'americas', 'la2': 'americas', 'na1': 'americas', 'br1': 'americas'
};

// Función para pausar la ejecución y no ser baneados por Riot
const delay = ms => new Promise(res => setTimeout(res, ms));

// 🛡️ Fetch Blindado anti-saturación
async function fetchSeguro(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.status === 200) return res;
            if (res.status === 429) {
                await delay(2000);
                continue;
            }
            return res; 
        } catch (e) {
            await delay(1000);
        }
    }
    return { status: 500 };
}

async function verificarCuentaRiot(gameName, tagLine) {
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    try {
        const response = await fetchSeguro(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
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
        const response = await fetchSeguro(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        if (response.status === 200) return await response.json();
        return null;
    } catch {
        return null;
    }
}

// 🔥 NUEVO ENDPOINT DE RIOT: Directo por PUUID sin pasar por el Summoner ID obsoleto
async function obtenerRangos(puuid, plataforma) {
    const url = `https://${plataforma}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    try {
        const response = await fetchSeguro(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
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

// Extractor original intacto con su cortafuegos
async function obtenerTodasLasPartidas(puuid, plataforma, queueId = 420, msgCarga) {
    try {
        const routing = plataformaARouting[plataforma] || 'americas';
        const headers = { 'X-Riot-Token': process.env.RIOT_API_KEY };
        
        const inicioSeason2026 = new Date('2026-01-07T00:00:00Z');
        const limiteTiempoMs = inicioSeason2026.getTime(); 
        
        let partidasValidas = [];
        let start = 0;
        let buscarMas = true;
        let totalAnalizadas = 0;

        while (buscarMas) {
            const urlIds = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=10&queue=${queueId}`;
            const idsRes = await fetch(urlIds, { headers });
            
            if (idsRes.status !== 200) break;
            const chunkIds = await idsRes.json();
            
            if (chunkIds.length === 0) break;

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

            for (const match of chunkData) {
                if (!match || !match.info) continue;

                const fechaPartidaMs = match.info.gameCreation;

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

            if (tocamosFondo) break; 
            start += 10;
            await delay(1250); 
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