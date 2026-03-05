// APIs/Riot/tft_api.js

const TFT_API_KEY = process.env.TFT_API_KEY || process.env.RIOT_API_KEY;

// 👇 NUEVA FUNCIÓN DE PING 👇
async function verificarConexionTFT() {
    try {
        const url = `https://la1.api.riotgames.com/tft/status/v1/platform-data`;
        const res = await fetch(url, { headers: { "X-Riot-Token": TFT_API_KEY } });
        return res.status === 200;
    } catch {
        return false;
    }
}

async function riotFetch(url) {
    try {
        const res = await fetch(url, { headers: { "X-Riot-Token": TFT_API_KEY } });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function getPUUIDFromRiotID(gameName, tagLine) {
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const data = await riotFetch(url);
    return data ? data.puuid : null;
}

async function getTftRankByPUUID(puuid, plataforma) {
    const url = `https://${plataforma}.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`;
    const data = await riotFetch(url);
    
    if (!data || !Array.isArray(data)) return null;

    const rankedTFT = data.find(queue => queue.queueType === 'RANKED_TFT');
    if (!rankedTFT) return null;
    
    return {
        tier: rankedTFT.tier,
        rank: rankedTFT.rank,
        lp: rankedTFT.leaguePoints
    };
}

async function obtenerRangoTFT(gameName, tagLine, plataforma = 'la1') {
    try {
        const puuid = await getPUUIDFromRiotID(gameName, tagLine);
        if (!puuid) return null;

        return await getTftRankByPUUID(puuid, plataforma);
    } catch {
        return null;
    }
}

module.exports = {
    verificarConexionTFT, // Exportamos el ping
    obtenerRangoTFT
};