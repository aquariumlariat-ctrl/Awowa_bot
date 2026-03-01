// Modulos/Utilidades/Canvas/diseno_perfil.js
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require('path');

try {
    const plusJakarta = path.join(__dirname, '../../../Fonts/PlusJakartaSans-Regular.ttf');
    GlobalFonts.registerFromPath(plusJakarta, 'Plus Jakarta Sans');
} catch (e) { /* Ignorar si no carga la fuente */ }

function obtenerColorKDA(kda) {
    const valor = parseFloat(kda);
    if (valor >= 6.0) return '#deccfb'; 
    if (valor >= 5.0) return '#ffe8a3'; 
    if (valor >= 4.0) return '#9ee0f4'; 
    if (valor >= 3.0) return '#c4eeb0'; 
    return '#ffffff';                   
}

function obtenerColorWR(wrTexto) {
    const valor = parseFloat(wrTexto);
    if (valor >= 65) return '#deccfb'; 
    if (valor >= 60) return '#ffe8a3'; 
    if (valor >= 55) return '#c4eeb0'; 
    if (valor >= 50) return '#ffffff'; 
    return '#ffb3ba';                  
}

function dibujarTextoSeparado(ctx, textoCompleto, xCentrado, y, font, colorSolido, colorFaded, separador = " l ") {
    const partes = textoCompleto.split(separador); 
    ctx.font = font;

    let widthTotal = 0;
    partes.forEach((parte, index) => {
        widthTotal += ctx.measureText(parte).width;
        if (index < partes.length - 1) widthTotal += ctx.measureText(separador).width;
    });

    let currentX = xCentrado - (widthTotal / 2);
    ctx.textAlign = 'left'; 

    partes.forEach((parte, index) => {
        ctx.fillStyle = colorSolido;
        ctx.fillText(parte, currentX, y);
        currentX += ctx.measureText(parte).width; 

        if (index < partes.length - 1) {
            ctx.fillStyle = colorFaded;
            ctx.fillText(separador, currentX, y);
            currentX += ctx.measureText(separador).width; 
        }
    });
}

// ==========================================
// ESTRUCTURA DE DATOS REALES (MOCK POR DEFECTO)
// ==========================================
const datosPerfilPorDefecto = {
    notables: [
        { champ: 'Ahri', kda: '2.4', wr: '100%', kdaStr: '8 l 2 l 10', partStr: '4 V l 0 D' },
        { champ: 'Yasuo', kda: '3.5', wr: '55%', kdaStr: '5 l 4 l 6', partStr: '55 V l 45 D' },
        { champ: 'Jinx', kda: '10.2', wr: '48%', kdaStr: '12 l 3 l 8', partStr: '48 V l 52 D' },
        { champ: 'LeeSin', kda: '5.8', wr: '60%', kdaStr: '15 l 2 l 4', partStr: '60 V l 40 D' },
        { champ: 'Thresh', kda: '1.1', wr: '25%', kdaStr: '20 l 1 l 15', partStr: '1 V l 3 D' }
    ],
    rendimiento: { wins: 345, losses: 310 },
    roles: [
        { nombre: 'MID', icono: 'https://i.imgur.com/WB2PDTS.png', wr: '62%', vic: '45 Victorias', der: '28 Derrotas' },
        { nombre: 'JG', icono: 'https://i.imgur.com/IKquw1O.png', wr: '48%', vic: '15 Victorias', der: '16 Derrotas' }
    ],
    historial: [
        { champ: 'Zed', vic: true }, { champ: 'Sylas', vic: false }, { champ: 'Ezreal', vic: true },
        { champ: 'Caitlyn', vic: true }, { champ: 'Ezreal', vic: false }, { champ: 'Nautilus', vic: true },
        { champ: 'Lulu', vic: false }, { champ: 'Jhin', vic: true }, { champ: 'Sylas', vic: true }
    ],
    companeros: [
        { icono: '23', nick: 'Faker', tag: 'KR1', partidas: '120 Partidas' },
        { icono: '24', nick: 'ShowMaker', tag: 'DK', partidas: '85 Partidas' },
        { icono: '11', nick: 'JugadorRandom', tag: 'LAS', partidas: '60 Partidas' },
        { icono: '14', nick: 'Ruler', tag: 'GEN', partidas: '42 Partidas' }
    ]
};

// ==========================================
// FUNCIÓN PRINCIPAL DE DIBUJO (AHORA DINÁMICA)
// ==========================================
async function generarBoceto(datos = datosPerfilPorDefecto) {
    const width = 800;
    const height = 350; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const margenLateral = 0;
    const inicioX = margenLateral; 
    const tituloY = 0; 

    const cajaSize = 50;
    const gapGral = 10; 
    const anchoBloqueKDA = 110; 
    const anchoBloqueWR = 110;  
    
    const anchoTotalBloque = cajaSize + gapGral + anchoBloqueKDA + gapGral + anchoBloqueWR;

    const subtituloFontSize = 17; 
    const fontBold = `bold ${subtituloFontSize}px "Plus Jakarta Sans"`;
    ctx.font = fontBold;

    const texto1 = 'Solo/Dúo', texto2 = 'Flexible', texto3 = 'Normal', texto4 = 'Total'; 
    const w1 = ctx.measureText(texto1).width;
    const w2 = ctx.measureText(texto2).width;
    const w3 = ctx.measureText(texto3).width;
    const w4 = ctx.measureText(texto4).width;
    
    const sumaTextos = w1 + w2 + w3 + w4;
    const gapMenu = (anchoTotalBloque - sumaTextos) / 3; 
    
    const centroBloqueX = inicioX + (anchoTotalBloque / 2);

    const tituloRangoFontSize = 25; 
    ctx.fillStyle = '#CDCECF'; 
    ctx.font = `bold ${tituloRangoFontSize}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Campeones Notables', centroBloqueX, tituloY);

    const subtituloY = tituloY + tituloRangoFontSize + 8; 
    ctx.textAlign = 'left'; 
    ctx.font = fontBold;

    ctx.fillStyle = '#dccaf9'; 
    ctx.fillText(texto1, inicioX, subtituloY); 
    
    ctx.fillStyle = '#CDCECF'; 
    ctx.globalAlpha = 0.5; 
    ctx.fillText(texto2, inicioX + w1 + gapMenu, subtituloY); 
    ctx.fillText(texto3, inicioX + w1 + gapMenu + w2 + gapMenu, subtituloY); 
    ctx.fillText(texto4, inicioX + w1 + gapMenu + w2 + gapMenu + w3 + gapMenu, subtituloY); 
    ctx.globalAlpha = 1.0;

    const radioCajitas = 5; 
    const espacioEntreCajas = gapGral; 
    const gapEntreBloques = gapGral; 
    
    const inicioCajasY = subtituloY + subtituloFontSize + 10; 

    const colorTextoGris = '#CDCECF';
    const colorSeparadorFaded = 'rgba(205, 206, 207, 0.4)'; 
    const fontPequena = 'bold 14px "Plus Jakarta Sans"';

    // 1. DIBUJAR CAMPEONES NOTABLES (DINÁMICO)
    for (let i = 0; i < 5; i++) {
        if(!datos.notables[i]) continue;
        const filaY = inicioCajasY + (i * (cajaSize + espacioEntreCajas));
        const dataChamp = datos.notables[i];

        ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
        ctx.beginPath();
        ctx.roundRect(inicioX, filaY, cajaSize, cajaSize, radioCajitas);
        ctx.fill();
        
        try {
            const img = await loadImage(`https://ddragon.leagueoflegends.com/cdn/14.4.1/img/champion/${dataChamp.champ}.png`);
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(inicioX, filaY, cajaSize, cajaSize, radioCajitas);
            ctx.clip(); 
            ctx.drawImage(img, inicioX - 4, filaY - 4, cajaSize + 8, cajaSize + 8);
            ctx.restore(); 
        } catch (e) {}

        const textoGrandeY = filaY + 7;  
        const textoPequenoY = filaY + 29; 

        // Bloque KDA
        const rectKdaX = inicioX + cajaSize + gapEntreBloques;
        ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
        ctx.beginPath();
        ctx.roundRect(rectKdaX, filaY, anchoBloqueKDA, cajaSize, radioCajitas);
        ctx.fill();

        const centroRectKdaX = rectKdaX + (anchoBloqueKDA / 2);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillStyle = obtenerColorKDA(dataChamp.kda);
        ctx.font = 'bold 20px "Plus Jakarta Sans"';
        ctx.fillText(`${dataChamp.kda} KDA`, centroRectKdaX, textoGrandeY);
        dibujarTextoSeparado(ctx, dataChamp.kdaStr, centroRectKdaX, textoPequenoY, fontPequena, colorTextoGris, colorSeparadorFaded);

        // Bloque WR
        const rectWrX = rectKdaX + anchoBloqueKDA + gapEntreBloques;
        ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
        ctx.beginPath();
        ctx.roundRect(rectWrX, filaY, anchoBloqueWR, cajaSize, radioCajitas);
        ctx.fill();

        const centroRectWrX = rectWrX + (anchoBloqueWR / 2);
        ctx.textAlign = 'center'; 
        ctx.fillStyle = obtenerColorWR(dataChamp.wr);
        ctx.font = 'bold 20px "Plus Jakarta Sans"'; 
        ctx.fillText(dataChamp.wr, centroRectWrX, textoGrandeY);
        dibujarTextoSeparado(ctx, dataChamp.partStr, centroRectWrX, textoPequenoY, fontPequena, colorTextoGris, colorSeparadorFaded);
    }

    // ==========================================
    // 4. BLOQUE DERECHO (ALINEADO A LA DERECHA)
    // ==========================================
    const margenDerecho = 10; 
    const totalCajasAbajo = 9;
    const sizeAbajo = 44; 
    const gapAbajo = 8; 
    const anchoColumnaDerecha = (totalCajasAbajo * sizeAbajo) + ((totalCajasAbajo - 1) * gapAbajo);

    const rectGrandeX = width - margenDerecho - anchoColumnaDerecha; 
    
    ctx.fillStyle = '#CDCECF'; 
    ctx.font = `bold ${tituloRangoFontSize}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Rendimiento Total', rectGrandeX, tituloY);

    const rectGrandeY = subtituloY + 3; 
    const rectGrandeAlto = 102; 
    const rectGrandeAncho = 102; 
    
    ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
    ctx.beginPath();
    ctx.roundRect(rectGrandeX, rectGrandeY, rectGrandeAncho, rectGrandeAlto, 10); 
    ctx.fill();

    // ==========================================
    // 5. CAJAS DE ROLES PRINCIPALES (DINÁMICO)
    // ==========================================
    const gapRoles = 10; 
    const cajitasX = rectGrandeX + rectGrandeAncho + gapRoles;
    const tituloRolesY = subtituloY; 
    
    ctx.fillStyle = '#CDCECF'; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Roles Principales', cajitasX, tituloRolesY);

    const cajitaSize = 40; 
    const gapSubtituloCaja = 4;
    const gapCajitasApiladas = 4;
    const caja1Y = tituloRolesY + subtituloFontSize + gapSubtituloCaja; 
    const caja2Y = caja1Y + cajitaSize + gapCajitasApiladas;

    const iconSize = 28;
    const offsetIcono = 6; 
    const textRolesX = cajitasX + cajitaSize + 12; 
    const separadorGris = "I";

    for(let r = 0; r < 2; r++) {
        if(!datos.roles[r]) continue;
        const rolData = datos.roles[r];
        const currentY = r === 0 ? caja1Y : caja2Y;

        ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
        ctx.beginPath();
        ctx.roundRect(cajitasX, currentY, cajitaSize, cajitaSize, radioCajitas); 
        ctx.fill();

        try {
            const imgRol = await loadImage(rolData.icono);
            ctx.drawImage(imgRol, cajitasX + offsetIcono, currentY + offsetIcono, iconSize, iconSize);
        } catch (e) {}

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff'; 
        ctx.font = 'bold 20px "Plus Jakarta Sans"';
        ctx.fillText(rolData.wr, textRolesX, currentY + (cajitaSize / 2)); 
        
        let currX = textRolesX + ctx.measureText(rolData.wr).width + 10;

        ctx.fillStyle = colorSeparadorFaded;
        ctx.font = 'bold 16px "Plus Jakarta Sans"'; 
        ctx.fillText(separadorGris, currX, currentY + (cajitaSize / 2) - 1); 
        
        currX += ctx.measureText(separadorGris).width + 10;

        ctx.font = fontPequena; 
        ctx.fillStyle = colorTextoGris;
        ctx.textBaseline = 'bottom';
        ctx.fillText(rolData.vic, currX, currentY + (cajitaSize / 2) - 2); 
        ctx.textBaseline = 'top';
        ctx.fillText(rolData.der, currX, currentY + (cajitaSize / 2) + 2); 
    }

    // CAJA KDA ELIMINADA COMO SOLICITASTE. ESPACIO LIMPIO A LA DERECHA.

    // ==========================================
    // 5.5 GRÁFICO DE MEDIALUNA (DINÁMICO)
    // ==========================================
    const wins = datos.rendimiento.wins;
    const losses = datos.rendimiento.losses;
    const totalGames = wins + losses; 
    const winRatePorcentaje = Math.round((wins / totalGames) * 100);

    const arcRadius = 38; 
    const arcLineWidth = 12; 
    const gapArco = 0.06; 

    const arcCenterX = rectGrandeX + (rectGrandeAncho / 2);
    const arcCenterY = rectGrandeY + 58; 

    const winAngle = Math.PI * (wins / totalGames);

    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI, Math.PI + winAngle - gapArco);
    ctx.lineWidth = arcLineWidth;
    ctx.strokeStyle = '#2d6cff'; 
    ctx.lineCap = 'round'; 
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI + winAngle + gapArco, Math.PI * 2);
    ctx.strokeStyle = '#e84057'; 
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a3b8ff'; 
    ctx.font = 'bold 18px "Plus Jakarta Sans"'; 
    ctx.fillText(`${winRatePorcentaje}%`, arcCenterX, arcCenterY - 6); 

    ctx.textBaseline = 'top';
    const separadorBigBox = "  I  "; 
    dibujarTextoSeparado(ctx, `${wins} V${separadorBigBox}${losses} D`, arcCenterX, arcCenterY + 18, fontPequena, '#ffffff', colorSeparadorFaded, separadorBigBox);

    // ==========================================
    // 6. MINI HISTORIAL (DINÁMICO)
    // ==========================================
    const gapSubtitulo = 10; 
    const historialTituloY = subtituloY + 105 + gapSubtitulo; 
    
    ctx.fillStyle = '#CDCECF'; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Mini Historial', rectGrandeX, historialTituloY);

    const inicioXAbajo = rectGrandeX;
    const yAbajo = historialTituloY + subtituloFontSize + gapSubtitulo;

    const overlayVictoriaPastel = 'rgba(196, 238, 176, 0.40)'; 
    const overlayDerrotaPastel = 'rgba(255, 179, 186, 0.40)';  

    for (let j = 0; j < Math.min(datos.historial.length, totalCajasAbajo); j++) {
        const xActual = inicioXAbajo + (j * (sizeAbajo + gapAbajo));
        const partida = datos.historial[j];

        ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
        ctx.beginPath();
        ctx.roundRect(xActual, yAbajo, sizeAbajo, sizeAbajo, radioCajitas);
        ctx.fill();
        
        try {
            const imgAbajo = await loadImage(`https://ddragon.leagueoflegends.com/cdn/14.4.1/img/champion/${partida.champ}.png`);
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(xActual, yAbajo, sizeAbajo, sizeAbajo, radioCajitas);
            ctx.clip(); 
            ctx.filter = 'grayscale(100%)'; 
            ctx.drawImage(imgAbajo, xActual - 4, yAbajo - 4, sizeAbajo + 8, sizeAbajo + 8);
            ctx.filter = 'none'; 
            ctx.restore(); 
        } catch (e) {}

        ctx.fillStyle = partida.vic ? overlayVictoriaPastel : overlayDerrotaPastel;
        ctx.beginPath();
        ctx.roundRect(xActual, yAbajo, sizeAbajo, sizeAbajo, radioCajitas);
        ctx.fill();
    }

    // ==========================================
    // 7. COMPAÑEROS FRECUENTES (DINÁMICO)
    // ==========================================
    const inicioYJugandoCon = yAbajo + sizeAbajo + gapSubtitulo; 
    
    ctx.fillStyle = '#CDCECF'; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Compañeros Frecuentes', rectGrandeX, inicioYJugandoCon);

    const inicioCajasJugandoY = inicioYJugandoCon + subtituloFontSize + gapSubtitulo; 
    const sizeJugado = 43; 
    const gapJugado = 8; 

    for(let k = 0; k < Math.min(datos.companeros.length, 4); k++) {
        const fila = Math.floor(k / 2);
        const columna = k % 2;
        const compa = datos.companeros[k];

        const yDuo = inicioCajasJugandoY + (fila * (sizeJugado + gapJugado));
        const xDuo = rectGrandeX + (columna * 260);
        
        ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
        ctx.beginPath();
        ctx.roundRect(xDuo, yDuo, sizeJugado, sizeJugado, radioCajitas);
        ctx.fill();

        try {
            const imgDuo = await loadImage(`https://ddragon.leagueoflegends.com/cdn/14.4.1/img/profileicon/${compa.icono}.png`);
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(xDuo, yDuo, sizeJugado, sizeJugado, radioCajitas);
            ctx.clip(); 
            ctx.drawImage(imgDuo, xDuo - 4, yDuo - 4, sizeJugado + 8, sizeJugado + 8);
            ctx.restore(); 
        } catch (e) {}

        const textoX = xDuo + sizeJugado + 12; 
        const maxAnchoTexto = 200 - (sizeJugado + 12); 
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(textoX, yDuo, maxAnchoTexto, sizeJugado); 
        ctx.clip(); 
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Plus Jakarta Sans"'; 
        ctx.textBaseline = 'top';
        ctx.fillText(compa.nick, textoX, yDuo + 1);

        if (compa.tag) {
            const nickWidth = ctx.measureText(compa.nick).width;
            ctx.fillStyle = '#8e94a0'; 
            ctx.font = fontPequena; 
            ctx.fillText('#' + compa.tag, textoX + nickWidth + 2, yDuo + 4); 
        }

        ctx.fillStyle = colorTextoGris;
        ctx.font = fontPequena; 
        ctx.fillText(compa.partidas, textoX, yDuo + 25); 

        ctx.restore(); 
    }

    return canvas.toBuffer('image/png');
}

// ==========================================
// LÓGICA PARA OBTENER DATOS DE LA API DE RIOT
// ==========================================
// Nota importante: Para sacar todo este nivel de detalle (roles, compañeros), 
// Riot no tiene un endpoint directo. Tienes que conseguir las últimas X partidas 
// de un jugador y calcular las estadísticas iterando sobre ellas.
async function obtenerDatosRiotAPI(riotIdGameName, riotIdTagLine, apiKey) {
    const headers = { "X-Riot-Token": apiKey };
    
    try {
        // 1. Obtener PUUID a través de Account-V1
        const resAccount = await fetch(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${riotIdGameName}/${riotIdTagLine}`, { headers });
        const accountData = await resAccount.json();
        const puuid = accountData.puuid;

        // 2. Obtener Summoner Data (Level, Profile Icon)
        const resSummoner = await fetch(`https://la1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, { headers });
        const summonerData = await resSummoner.json();

        // 3. Obtener Liga / Rendimiento Total
        const resLeague = await fetch(`https://la1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}`, { headers });
        const leagueData = await resLeague.json();
        
        // 4. Obtener Lista de últimas 20 partidas (Match-V5)
        const resMatches = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20`, { headers });
        const matchIds = await resMatches.json();

        // 5. Tendrías que iterar sobre cada 'matchId' haciendo un fetch a:
        // `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`
        // Para calcular:
        // - Qué rol jugó y si ganó/perdió (Para "Roles Principales")
        // - Con qué otros PUUIDs compartió equipo en múltiples juegos (Para "Compañeros Frecuentes")
        // - Qué campeones jugó y su KDA exacto (Para "Campeones Notables")

        /* AQUÍ TRANSFORMARÍAS LOS DATOS AL FORMATO DE 'datosPerfilPorDefecto' 
        Y LUEGO LLAMARÍAS A:
        return generarBoceto(datosTransformados);
        */
       
    } catch (error) {
        console.error("Error consultando Riot API:", error);
    }
}

module.exports = { generarBoceto, obtenerDatosRiotAPI };