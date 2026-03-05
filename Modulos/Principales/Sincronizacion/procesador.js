// Modulos/Principales/Sincronizacion/procesador.js

// 🧠 REGLA DE ORO: Única fuente de la verdad para validar Remakes
function esRemakeReal(info) {
    const duracionS = info.gameDuration > 10000 
        ? Math.floor(info.gameDuration / 1000) 
        : info.gameDuration;

    if (info.endOfGameResult) {
        const endResult = info.endOfGameResult;
        if (
            endResult === "Abort_TooFewPlayers" || 
            endResult === "Remake" || 
            endResult === "Abort_Unexpected"
        ) {
            return true;
        }
    }

    if (duracionS <= 270) {
        return true;
    }

    return false;
}

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

        const cName = yo.championName;
        const matchId = match.metadata.matchId;

        // 👻 SI ES REMAKE: Lo guardamos en el historial pero saltamos las matemáticas
        if (esRemakeReal(info)) {
            json.Historial.push({
                matchId: matchId,
                fecha: info.gameCreation,
                queueId: info.queueId,
                campeon: cName,
                kills: yo.kills,
                deaths: yo.deaths,
                assists: yo.assists,
                victoria: yo.win,
                rol: yo.teamPosition || yo.individualPosition || "NONE",
                esRemake: true // 👈 Marca especial para romper el bucle y usar en Canvas
            });
            continue; 
        }

        // 👇 CONTEO PRECISO (Partidas reales) 👇
        const win = yo.win;

        // 1. Resumen
        if (win) json.Resumen.Victorias++;
        else json.Resumen.Derrotas++;

        // 2. Campeones
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
            matchId: matchId,
            fecha: info.gameCreation,
            queueId: info.queueId,
            campeon: cName,
            kills: yo.kills,
            deaths: yo.deaths,
            assists: yo.assists,
            victoria: win,
            rol: yo.teamPosition || yo.individualPosition || "NONE",
            esRemake: false
        });
    }

    // Calcular WinRate Total Final
    const tGames = json.Resumen.Victorias + json.Resumen.Derrotas;
    json.Resumen.WinRate = tGames > 0 ? Math.round((json.Resumen.Victorias / tGames) * 100) : 0;

    return json;
}

function inyectarNuevasPartidas(jsonActual, partidasNuevas, miPuuid) {
    for (const match of partidasNuevas) {
        const info = match.info;
        const matchId = match.metadata.matchId;

        // 🛡️ Prevención de duplicados
        if (jsonActual.Historial.some(h => h.matchId === matchId)) continue;

        const yo = info.participants.find(p => p.puuid === miPuuid);
        if (!yo) continue;

        const cName = yo.championName;

        // 👻 SI ES REMAKE EN EL CRON: Lo inyectamos pero no sumamos a las stats
        if (esRemakeReal(info)) {
            jsonActual.Historial.push({
                matchId: matchId,
                fecha: info.gameCreation,
                queueId: info.queueId,
                campeon: cName,
                kills: yo.kills,
                deaths: yo.deaths,
                assists: yo.assists,
                victoria: yo.win,
                rol: yo.teamPosition || yo.individualPosition || "NONE",
                esRemake: true // 👈 Se inyecta la marca
            });
            continue;
        }

        const win = yo.win;

        // 1. Sumar al Resumen
        if (win) jsonActual.Resumen.Victorias++;
        else jsonActual.Resumen.Derrotas++;

        // 2. Sumar a Campeones
        if (!jsonActual.Campeones[cName]) {
            jsonActual.Campeones[cName] = { partidas: 0, victorias: 0, derrotas: 0, kills: 0, deaths: 0, assists: 0 };
        }
        jsonActual.Campeones[cName].partidas++;
        if (win) jsonActual.Campeones[cName].victorias++;
        else jsonActual.Campeones[cName].derrotas++;
        
        jsonActual.Campeones[cName].kills += yo.kills;
        jsonActual.Campeones[cName].deaths += yo.deaths;
        jsonActual.Campeones[cName].assists += yo.assists;

        // 3. Sumar a Compañeros
        const myTeam = yo.teamId;
        const companeros = info.participants.filter(p => p.teamId === myTeam && p.puuid !== miPuuid);
        
        for (const compa of companeros) {
            const cPuuid = compa.puuid;
            if (!jsonActual.Companeros[cPuuid]) {
                jsonActual.Companeros[cPuuid] = { nick: compa.riotIdGameName || compa.summonerName, tag: compa.riotIdTagline || "", icono: compa.profileIcon, partidas: 0, victorias: 0, derrotas: 0 };
            }
            jsonActual.Companeros[cPuuid].partidas++;
            if (win) jsonActual.Companeros[cPuuid].victorias++;
            else jsonActual.Companeros[cPuuid].derrotas++;
        }

        // 4. Inyectar al Historial
        jsonActual.Historial.push({
            matchId: matchId,
            fecha: info.gameCreation,
            queueId: info.queueId,
            campeon: cName,
            kills: yo.kills,
            deaths: yo.deaths,
            assists: yo.assists,
            victoria: win,
            rol: yo.teamPosition || yo.individualPosition || "NONE",
            esRemake: false
        });
    }

    // Recalcular WinRate
    const tGames = jsonActual.Resumen.Victorias + jsonActual.Resumen.Derrotas;
    jsonActual.Resumen.WinRate = tGames > 0 ? Math.round((jsonActual.Resumen.Victorias / tGames) * 100) : 0;

    return jsonActual;
}

module.exports = { formatearPartidas, inyectarNuevasPartidas };