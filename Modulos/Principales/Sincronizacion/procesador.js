// Modulos/Principales/Sincronizacion/procesador.js

function formatearPartidas(partidas, miPuuid) {
    const json = {
        Resumen: { Victorias: 0, Derrotas: 0, WinRate: 0 },
        Campeones: {},
        Companeros: {},
        Historial: []
    };

    for (const match of partidas) {
        const info = match.info;
        const yo = info.participants.find(p => p.puuid === miPuuid);
        if (!yo) continue;

        // Estandarizar duración a segundos
        const duracionS = info.gameDuration > 10000 
            ? Math.floor(info.gameDuration / 1000) 
            : info.gameDuration;

        let esRemake = false;

        // 🎯 1. BLOQUEO ESPECÍFICO DE RESULTADOS NULOS
        if (info.endOfGameResult) {
            const endResult = info.endOfGameResult;
            // Solo bloqueamos los estados que Riot clasifica como abortos o remakes literales
            if (endResult === "Abort_TooFewPlayers" || endResult === "Remake" || endResult === "Abort_Unexpected") {
                esRemake = true;
            }
        }

        // 🎯 2. BLOQUEO POR TIEMPO FÍSICO (El salvavidas definitivo)
        // Ninguna partida normal dura menos de 4.5 minutos (270 segundos). 
        // Si dura menos de eso, fue un Remake sí o sí, sin importar lo que diga el texto.
        if (duracionS <= 270) {
            esRemake = true;
        }

        // Si es un remake real, la saltamos y no suma ni victorias ni derrotas.
        if (esRemake) continue;

        // 👇 CONTEO PRECISO 👇
        const win = yo.win;

        // 1. Resumen
        if (win) json.Resumen.Victorias++;
        else json.Resumen.Derrotas++;

        // 2. Campeones
        const cName = yo.championName;
        if (!json.Campeones[cName]) {
            json.Campeones[cName] = { partidas: 0, victorias: 0, derrotas: 0, kills: 0, deaths: 0, assists: 0 };
        }
        json.Campeones[cName].partidas++;
        if (win) json.Campeones[cName].victorias++;
        else json.Campeones[cName].derrotas++;
        
        json.Campeones[cName].kills += yo.kills;
        json.Campeones[cName].deaths += yo.deaths;
        json.Campeones[cName].assists += yo.assists;

        // 3. Compañeros (Mismo equipo, distinto PUUID)
        const myTeam = yo.teamId;
        const companeros = info.participants.filter(p => p.teamId === myTeam && p.puuid !== miPuuid);
        
        for (const compa of companeros) {
            const cPuuid = compa.puuid;
            if (!json.Companeros[cPuuid]) {
                json.Companeros[cPuuid] = {
                    nick: compa.riotIdGameName || compa.summonerName,
                    tag: compa.riotIdTagline || "",
                    icono: compa.profileIcon,
                    partidas: 0,
                    victorias: 0,
                    derrotas: 0
                };
            }
            json.Companeros[cPuuid].partidas++;
            if (win) json.Companeros[cPuuid].victorias++;
            else json.Companeros[cPuuid].derrotas++;
        }

        // 4. Historial Básico
        json.Historial.push({
            matchId: match.metadata.matchId,
            fecha: info.gameCreation,
            queueId: info.queueId,
            campeon: cName,
            kills: yo.kills,
            deaths: yo.deaths,
            assists: yo.assists,
            victoria: win,
            rol: yo.teamPosition || yo.individualPosition || "NONE"
        });
    }

    // Calcular WinRate Total Final
    const tGames = json.Resumen.Victorias + json.Resumen.Derrotas;
    json.Resumen.WinRate = tGames > 0 ? Math.round((json.Resumen.Victorias / tGames) * 100) : 0;

    return json;
}

module.exports = { formatearPartidas };