// Modulos/Principales/Sincronizacion/extractor.js
const plataformaARouting = {
    'la1': 'americas', 'la2': 'americas', 'na1': 'americas', 'br1': 'americas'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

// 🎯 CONSTANTE UNIVERSAL DE TIEMPO (8 de Enero 2026 - 12:00 PM UTC)
const FECHA_INICIO_STRING = '2026-01-08T12:00:00Z';
const INICIO_SEASON_MS = new Date(FECHA_INICIO_STRING).getTime(); 

async function fetchConReintentos(url, headers, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { headers });
            if (res.status === 200) return await res.json();
            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After');
                const tiempoEspera = retryAfter ? (parseInt(retryAfter) * 1000) + 500 : 2000;
                await delay(tiempoEspera);
                continue;
            }
            if (res.status >= 500) { await delay(2000); continue; }
            return null;
        } catch (e) { await delay(1500); }
    }
    return null;
}

// 🔄 SINCRO MANUAL (Todo de 0)
async function extraerHistorial2026(puuid, plataforma, msgCarga) {
    const routing = plataformaARouting[plataforma] || 'americas';
    const headers = { 'X-Riot-Token': process.env.RIOT_API_KEY };
    
    const data = { soloq: [], flex: [], normals: [], total: [] };
    let start = 0;
    let seguir = true;
    let totalValidas = 0;

    while (seguir) {
        const urlIds = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=100`;
        const chunkIds = await fetchConReintentos(urlIds, headers);
        
        if (!chunkIds || chunkIds.length === 0) break;

        for (let i = 0; i < chunkIds.length; i += 25) {
            const batch = chunkIds.slice(i, i + 25);
            const batchPromesas = batch.map(id => fetchConReintentos(`https://${routing}.api.riotgames.com/lol/match/v5/matches/${id}`, headers));
            const partidas = await Promise.all(batchPromesas);
            
            for (const match of partidas) {
                if (!match || !match.info) continue;
                
                if (match.info.gameCreation < INICIO_SEASON_MS) {
                    seguir = false;
                    break; 
                }

                const q = match.info.queueId;
                if (q === 420) { data.soloq.push(match); data.total.push(match); } 
                else if (q === 440) { data.flex.push(match); data.total.push(match); } 
                else if ([400, 430, 490].includes(q)) { data.normals.push(match); data.total.push(match); }
                
                if ([420, 440, 400, 430, 490].includes(q)) totalValidas++;
            }

            if (!seguir) break;
            if (msgCarga && totalValidas > 0 && i % 50 === 0) {
                await msgCarga.edit(`⚡ \`Extrayendo datos de Season 2026... (${totalValidas} partidas)\``).catch(()=>{});
            }
            await delay(1000); 
        }
        start += 100;
    }
    return data;
}

// 🔄 SINCRO AUTOMÁTICA (Cruzando IDs)
async function extraerNuevasPartidas(puuid, plataforma, matchIdsConocidos) {
    const routing = plataformaARouting[plataforma] || 'americas';
    const headers = { 'X-Riot-Token': process.env.RIOT_API_KEY };
    
    const data = { soloq: [], flex: [], normals: [], total: [] };
    let start = 0;
    let seguir = true;

    while (seguir) {
        // Pedimos la lista sin fechas, pura lista limpia
        const urlIds = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=100`;
        const chunkIds = await fetchConReintentos(urlIds, headers);
        
        if (!chunkIds || chunkIds.length === 0) break;

        // 🛡️ MAGIA: Filtramos cruzando con lo que ya tienes guardado
        const idsAProcesar = [];
        for (const id of chunkIds) {
            if (matchIdsConocidos.has(id)) {
                // Si encontramos una partida que ya tienes, paramos la búsqueda por completo.
                seguir = false;
                break;
            }
            idsAProcesar.push(id);
        }

        if (idsAProcesar.length === 0) break;

        // Extraer detalles SOLAMENTE de las partidas genuinamente nuevas
        for (let i = 0; i < idsAProcesar.length; i += 25) {
            const batch = idsAProcesar.slice(i, i + 25);
            const batchPromesas = batch.map(id => fetchConReintentos(`https://${routing}.api.riotgames.com/lol/match/v5/matches/${id}`, headers));
            const partidas = await Promise.all(batchPromesas);
            
            for (const match of partidas) {
                if (!match || !match.info) continue;

                if (match.info.gameCreation < INICIO_SEASON_MS) {
                    seguir = false;
                    break;
                }

                const q = match.info.queueId;
                if (q === 420) { data.soloq.push(match); data.total.push(match); } 
                else if (q === 440) { data.flex.push(match); data.total.push(match); } 
                else if ([400, 430, 490].includes(q)) { data.normals.push(match); data.total.push(match); }
            }
            await delay(1000); 
        }
        
        start += 100;
    }
    return data;
}

module.exports = { extraerHistorial2026, extraerNuevasPartidas };