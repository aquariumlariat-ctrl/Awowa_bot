// APIs/Riot/lol_api.js

const regionAPlatforma = {
    'LAN': 'la1',
    'LAS': 'la2',
    'NA': 'na1',
    'BR': 'br1'
};

const plataformaARouting = {
    'la1': 'americas',
    'la2': 'americas',
    'na1': 'americas',
    'br1': 'americas'
};

async function verificarCuentaRiot(gameName, tagLine, region) {
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

async function obtenerRangos(puuid, plataforma) {
    const url = `https://${plataforma}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    
    try {
        const response = await fetch(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        
        if (response.status === 200) {
            const data = await response.json();
            const rangos = { soloq: null, flex: null };
            
            data.forEach(queue => {
                if (queue.queueType === 'RANKED_SOLO_5x5') {
                    rangos.soloq = { tier: queue.tier, rank: queue.rank, lp: queue.leaguePoints };
                } else if (queue.queueType === 'RANKED_FLEX_SR') {
                    rangos.flex = { tier: queue.tier, rank: queue.rank, lp: queue.leaguePoints };
                }
            });
            
            return rangos;
        }
        return { soloq: null, flex: null };
    } catch {
        return { soloq: null, flex: null };
    }
}

async function obtenerCampeonesFavoritos(puuid, plataforma) {
    const url = `https://${plataforma}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`;
    
    try {
        const response = await fetch(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        
        if (response.status === 200) {
            const data = await response.json();
            return data.map(champ => ({
                championId: champ.championId,
                championName: `Champion ${champ.championId}`, 
                championEmoji: '⭐', 
                championPoints: champ.championPoints
            }));
        }
        return [];
    } catch {
        return [];
    }
}

async function obtenerUltimasPartidas(puuid, plataforma) {
    try {
        const routing = plataformaARouting[plataforma];
        const matchListUrl = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`;
        
        const response = await fetch(matchListUrl, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        if (response.status !== 200) return [];
        
        const matchList = await response.json();
        const partidasFiltradas = [];
        
        for (const matchId of matchList.slice(0, 3)) {
            try {
                const matchUrl = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
                const matchResponse = await fetch(matchUrl, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
                
                if (matchResponse.status !== 200) continue;
                
                const matchData = await matchResponse.json();
                const participantData = matchData.info.participants.find(p => p.puuid === puuid);
                
                if (!participantData) continue;
                
                partidasFiltradas.push({
                    championId: participantData.championId,
                    championName: participantData.championName,
                    championEmoji: '⭐',
                    queueId: matchData.info.queueId,
                    queueName: 'Clasificatoria',
                    win: participantData.win
                });
            } catch {
                continue;
            }
        }
        return partidasFiltradas;
    } catch {
        return [];
    }
}

async function obtenerRolesPrincipales(puuid, plataforma) {
    try {
        const routing = plataformaARouting[plataforma];
        const matchListUrl = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20`;
        
        const matchListResponse = await fetch(matchListUrl, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
        if (matchListResponse.status !== 200) return null;
        
        const matchList = await matchListResponse.json();
        const rolesContador = { 'TOP': 0, 'JUNGLE': 0, 'MIDDLE': 0, 'BOTTOM': 0, 'UTILITY': 0 };
        const colasPermitidas = [420, 440, 400];
        let totalPartidas = 0;
        
        for (const matchId of matchList) {
            try {
                const matchUrl = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
                const matchResponse = await fetch(matchUrl, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });
                
                if (matchResponse.status !== 200) continue;
                
                const matchData = await matchResponse.json();
                if (!colasPermitidas.includes(matchData.info.queueId)) continue;
                
                const participantData = matchData.info.participants.find(p => p.puuid === puuid);
                if (!participantData || !participantData.teamPosition) continue;
                
                const role = participantData.teamPosition;
                if (rolesContador[role] !== undefined) {
                    rolesContador[role]++;
                    totalPartidas++;
                }
            } catch {
                continue;
            }
        }
        
        if (totalPartidas === 0) return null;
        
        return Object.entries(rolesContador)
            .filter(([_, cantidad]) => cantidad > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([rol, cantidad]) => ({
                rol: rol,
                cantidad: cantidad,
                porcentaje: Math.round((cantidad / totalPartidas) * 100)
            }));
    } catch {
        return null;
    }
}

module.exports = {
    regionAPlatforma,
    verificarCuentaRiot,
    obtenerSummoner,
    obtenerRangos,
    obtenerCampeonesFavoritos,
    obtenerUltimasPartidas,
    obtenerRolesPrincipales
};