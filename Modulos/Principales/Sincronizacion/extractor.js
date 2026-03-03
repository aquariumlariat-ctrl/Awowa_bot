// Modulos/Principales/Sincronizacion/extractor.js
const plataformaARouting = {
    'la1': 'americas', 'la2': 'americas', 'na1': 'americas', 'br1': 'americas'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

// 🛡️ NUEVO: Fetcher con armadura anti-errores y reintentos automáticos
async function fetchConReintentos(url, headers, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { headers });
            if (res.status === 200) return await res.json();
            
            if (res.status === 429) {
                // Riot nos pide que frenemos un poco. Leemos cuánto tiempo exige.
                const retryAfter = res.headers.get('Retry-After');
                const tiempoEspera = retryAfter ? (parseInt(retryAfter) * 1000) + 500 : 2000;
                await delay(tiempoEspera);
                continue; // Volvemos a intentar el ciclo
            }
            
            if (res.status >= 500) {
                await delay(2000); // Error interno de Riot, esperamos 2 segs y reintentamos
                continue;
            }
            
            return null; // Si es un error 404 o raro, lo soltamos.
        } catch (e) {
            // Error de red local (socket hang up, timeout, etc.)
            await delay(1500);
        }
    }
    return null; // Si falló las 3 veces, nos rendimos con esa partida
}

async function extraerHistorial2026(puuid, plataforma, msgCarga) {
    const routing = plataformaARouting[plataforma] || 'americas';
    const headers = { 'X-Riot-Token': process.env.RIOT_API_KEY };
    
    // Fecha de corte: 8 de Enero de 2026 a las 12:00 PM
    const limiteTiempoMs = new Date('2026-01-08T12:00:00Z').getTime();

    const data = { soloq: [], flex: [], normals: [], total: [] };
    let start = 0;
    let seguir = true;
    let totalValidas = 0;

    while (seguir) {
        // Usamos el nuevo fetcher blindado para pedir los IDs
        const urlIds = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=100`;
        const chunkIds = await fetchConReintentos(urlIds, headers);
        
        if (!chunkIds || chunkIds.length === 0) break;

        // 🚀 MODO TURBO SEGURO: Lotes de 25 para no asfixiar los sockets
        for (let i = 0; i < chunkIds.length; i += 25) {
            const batch = chunkIds.slice(i, i + 25);
            const batchPromesas = batch.map(id => {
                const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${id}`;
                return fetchConReintentos(url, headers);
            });

            const partidas = await Promise.all(batchPromesas);
            
            for (const match of partidas) {
                if (!match || !match.info) continue;
                
                // Cortafuegos de fecha
                if (match.info.gameCreation < limiteTiempoMs) {
                    seguir = false;
                    break; 
                }

                const q = match.info.queueId;
                if (q === 420) { 
                    data.soloq.push(match); 
                    data.total.push(match); 
                } else if (q === 440) { 
                    data.flex.push(match); 
                    data.total.push(match); 
                } else if ([400, 430, 490].includes(q)) { 
                    data.normals.push(match); 
                    data.total.push(match); 
                }
                
                // Contamos todo lo que sea Grieta del Invocador
                if ([420, 440, 400, 430, 490].includes(q)) totalValidas++;
            }

            if (!seguir) break;
            
            if (msgCarga && totalValidas > 0 && i % 50 === 0) {
                await msgCarga.edit(`⚡ \`Modo Turbo: Extrayendo datos... (${totalValidas} partidas guardadas)\``).catch(()=>{});
            }
            
            // Pausa obligatoria entre lotes
            await delay(1000); 
        }
        start += 100;
    }
    return data;
}

module.exports = { extraerHistorial2026 };