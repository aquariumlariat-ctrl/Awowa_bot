// test_partidas.js
require('dotenv').config();

const RIOT_API_KEY = process.env.RIOT_API_KEY || 'TU_LLAVE_AQUI'; 

const GAME_NAME = 'Moth';
const TAG_LINE = 'カタルシス';
const REGION_ROUTING = 'americas'; 
const QUEUE_ID = 420; // Ranked Solo/Duo

const delay = ms => new Promise(res => setTimeout(res, ms));

async function ejecutarTest() {
    if (!RIOT_API_KEY || RIOT_API_KEY === 'TU_LLAVE_AQUI') {
        return console.error("❌ ERROR: Falta tu RIOT_API_KEY. Ponla en el código o en .env");
    }

    console.log(`=================================================`);
    console.log(`🔎 BUSCANDO JUGADOR: ${GAME_NAME}#${TAG_LINE}`);
    console.log(`=================================================\n`);

    try {
        console.log(`1️⃣ Obteniendo PUUID...`);
        const accRes = await fetch(`https://${REGION_ROUTING}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(GAME_NAME)}/${encodeURIComponent(TAG_LINE)}`, {
            headers: { 'X-Riot-Token': RIOT_API_KEY }
        });
        
        if (!accRes.ok) throw new Error(`Error buscando cuenta. Código: ${accRes.status}`);
        const puuid = (await accRes.json()).puuid;
        console.log(`✅ PUUID encontrado: ${puuid}\n`);

        // Fecha de corte EXACTA
        const inicioSeason2026 = new Date('2026-01-07T00:00:00Z');
        const limiteTiempoMs = inicioSeason2026.getTime(); // En milisegundos para comparar fácil
        
        console.log(`2️⃣ Escaneando historial buscando partidas jugadas DESPUÉS del 7 de enero de 2026...`);
        
        let partidasValidas = [];
        let start = 0;
        let buscarMas = true;

        console.log(`\nFECHA Y HORA\t\tCAMPEÓN\t\tRESULTADO`);
        console.log(`---------------------------------------------------------`);

        while (buscarMas) {
            // Pedimos los IDs de 10 en 10 para no descargar de más si encontramos rápido el límite
            const urlIds = `https://${REGION_ROUTING}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=10&queue=${QUEUE_ID}`;
            const idsRes = await fetch(urlIds, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
            
            if (!idsRes.ok) break;
            const chunkIds = await idsRes.json();
            
            if (chunkIds.length === 0) break; // Ya no hay más partidas en la cuenta

            // Revisamos este pequeño lote
            for (let i = 0; i < chunkIds.length; i++) {
                const matchId = chunkIds[i];
                
                const matchRes = await fetch(`https://${REGION_ROUTING}.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
                    headers: { 'X-Riot-Token': RIOT_API_KEY }
                });

                if (matchRes.status === 429) {
                    console.log("⚠️ Pausa de seguridad (Riot limit)...");
                    await delay(5000);
                    i--; // Reintentar la misma
                    continue;
                }

                if (!matchRes.ok) continue;

                const matchData = await matchRes.json();
                const fechaPartidaMs = matchData.info.gameCreation;

                // 🛑 EL CORTAFUEGOS: Si la partida es más vieja que nuestra fecha límite, DETENEMOS TODO.
                if (fechaPartidaMs < limiteTiempoMs) {
                    buscarMas = false; // Rompemos el ciclo While
                    break;             // Rompemos el ciclo For
                }

                // Si pasó el filtro, la mostramos y la guardamos
                const participant = matchData.info.participants.find(p => p.puuid === puuid);
                if (participant) {
                    partidasValidas.push(matchData);

                    const fechaStr = new Date(fechaPartidaMs).toLocaleString('es-ES', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });
                    const champ = participant.championName.padEnd(12, ' ');
                    const resultado = participant.win ? '🟩 VICTORIA' : '🟥 DERROTA';
                    const stats = `${participant.kills}/${participant.deaths}/${participant.assists}`;
                    
                    console.log(`[${fechaStr}]\t${champ}\t${resultado}  (KDA: ${stats})`);
                }

                await delay(100); // Pequeña pausa
            }
            
            start += 10; // Pasamos a las siguientes 10
        }

        console.log(`\n=================================================`);
        console.log(`✅ BÚSQUEDA COMPLETADA. Se encontraron exactamente ${partidasValidas.length} partidas válidas de esta Season.`);
        console.log(`=================================================`);

    } catch (error) {
        console.error("❌ Ocurrió un error inesperado:", error.message);
    }
}

ejecutarTest();