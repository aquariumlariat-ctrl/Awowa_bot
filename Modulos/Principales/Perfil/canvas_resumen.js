// Modulos/Principales/Perfil/canvas_resumen.js
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

try {
    const plusJakarta = path.join(__dirname, '../../../Fonts/PlusJakartaSans-Regular.ttf');
    GlobalFonts.registerFromPath(plusJakarta, 'Plus Jakarta Sans');
} catch (e) { /* Ignorar si no carga la fuente */ }

const COLOR_BG_CAJA = 'rgba(23, 27, 35, 0.5)'; 
const COLOR_TEXTO_BASE = '#CDCECF'; 
const COLOR_SEPARADOR_FADED = 'rgba(205, 206, 207, 0.4)';

// 🥇 FUNCIÓN DEFINITIVA: Limpiar halo blanco (Matte Removal / Unpremultiply)
async function limpiarHaloBlanco(img) {
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        let a = data[i + 3];

        if (a === 0) continue;

        const alpha = a / 255;

        // Eliminar matte blanco
        r = (r - (1 - alpha) * 255) / alpha;
        g = (g - (1 - alpha) * 255) / alpha;
        b = (b - (1 - alpha) * 255) / alpha;

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
}

function obtenerColorKDA(kda) {
    const valor = parseFloat(kda);
    if (isNaN(valor)) return COLOR_TEXTO_BASE;
    if (valor >= 6.0) return '#deccfb'; 
    if (valor >= 5.0) return '#ffe8a3'; 
    if (valor >= 4.0) return '#9ee0f4'; 
    if (valor >= 3.0) return '#c4eeb0'; 
    return '#ffffff';                   
}

function obtenerColorWR(wrTexto) {
    const valor = parseFloat(wrTexto);
    if (isNaN(valor)) return COLOR_TEXTO_BASE;
    if (valor >= 65) return '#deccfb'; 
    if (valor >= 60) return '#ffe8a3'; 
    if (valor >= 55) return '#c4eeb0'; 
    if (valor >= 50) return '#ffffff'; 
    return '#ffb3ba';                  
}

function dibujarTextoSeparado(ctx, textoCompleto, xCentrado, y, font, colorSolido, colorFaded, separador = " l ") {
    if (!textoCompleto) return;
    ctx.save();
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
    ctx.restore();
}

const datosPerfilPorDefecto = {
    nick: 'Jugador',
    notables: [],
    rendimiento: { wins: 0, losses: 0 },
    roles: [],
    historial: [],
    companeros: []
};

async function generarBoceto(datos = datosPerfilPorDefecto) {
    const width = 800;
    const height = 350; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const margenLateral = 5;
    const inicioX = margenLateral; 
    const tituloY = 0; 

    const cajaSize = 50;
    const gapGral = 10; 
    const anchoBloqueKDA = 110; 
    const anchoBloqueWR = 110;  
    
    const subtituloFontSize = 17; 
    const fontBold = `bold ${subtituloFontSize}px "Plus Jakarta Sans"`;
    const fontPequena = 'bold 14px "Plus Jakarta Sans"';

    // ==========================================
    // 🎨 ENCABEZADO CON LOGO BLANCO Y SEPARADOR CENTRADO
    // ==========================================
    const fontSizeTituloVal = 26;
    const fontSizeSeparador = fontSizeTituloVal / 2;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    try {
        const imgLogo = await loadImage('https://i.imgur.com/V6uxCxA.png');
        
        const aspectRatioLogo = imgLogo.width / imgLogo.height;
        const finalLogoHeight = 19; 
        const finalLogoWidth = finalLogoHeight * aspectRatioLogo;
        const logoGap = 10;

        const safeWidth = Math.ceil(finalLogoWidth);
        const safeHeight = Math.ceil(finalLogoHeight);

        const tempCanvas = createCanvas(safeWidth, safeHeight);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(imgLogo, 0, 0, safeWidth, safeHeight);
        tempCtx.globalCompositeOperation = 'source-in'; 
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, safeWidth, safeHeight);

        const logoY = tituloY + Math.floor((fontSizeTituloVal - safeHeight) / 2) + 1;
        ctx.drawImage(tempCanvas, inicioX, logoY);

        const xSeparador = inicioX + safeWidth + logoGap;
        ctx.font = `bold ${fontSizeSeparador}px "Plus Jakarta Sans"`;
        ctx.fillStyle = COLOR_SEPARADOR_FADED; 
        
        const centroVerticalY = tituloY + ((fontSizeTituloVal - fontSizeSeparador) / 2) + 2;
        ctx.fillText(' I ', xSeparador, centroVerticalY);
        
        const wSeparador = ctx.measureText(' I ').width;

        const xTitulo = xSeparador + wSeparador + logoGap;
        ctx.font = `bold ${fontSizeTituloVal}px "Plus Jakarta Sans"`;
        ctx.fillStyle = '#ffffff'; 
        ctx.fillText(`Panel de Invocador`, xTitulo, tituloY);

    } catch (e) {
        ctx.font = `bold ${fontSizeTituloVal}px "Plus Jakarta Sans"`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Panel de Invocador`, inicioX, tituloY);
    }

    // ==========================================
    // 🎨 SUBTÍTULOS (TABS DE MODOS DE JUEGO JUSTIFICADAS)
    // ==========================================
    ctx.font = fontBold;
    
    const t1 = 'Solo/Dúo';
    const t2 = 'Flexible';
    const t3 = 'Casuales'; 
    const t4 = 'Total';

    const wt1 = ctx.measureText(t1).width;
    const wt2 = ctx.measureText(t2).width;
    const wt3 = ctx.measureText(t3).width;
    const wt4 = ctx.measureText(t4).width;

    const anchoCajasIzquierda = cajaSize + gapGral + anchoBloqueKDA + gapGral + anchoBloqueWR;
    const espacioTotalGaps = anchoCajasIzquierda - (wt1 + wt2 + wt3 + wt4);
    const gapTabs = espacioTotalGaps / 3;

    const xt1 = inicioX;
    const xt2 = xt1 + wt1 + gapTabs;
    const xt3 = xt2 + wt2 + gapTabs;
    const xt4 = xt3 + wt3 + gapTabs;

    ctx.fillStyle = '#dccaf9'; 
    ctx.textAlign = 'left'; 
    ctx.fillText(t1, xt1, tituloY + 33); 
    
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COLOR_TEXTO_BASE;
    ctx.fillText(t2, xt2, tituloY + 33); 
    ctx.fillText(t3, xt3, tituloY + 33); 
    ctx.fillText(t4, xt4, tituloY + 33); 
    ctx.globalAlpha = 1.0;

    const radioCajitas = 5; 
    const espacioEntreCajas = gapGral; 
    const inicioCajasY = tituloY + 60; 

    const numNotablesReal = datos.notables.length;

    // =========================================================
    // 🎨 CAMPEONES NOTABLES
    // =========================================================
    for (let i = 0; i < 5; i++) {
        const filaY = inicioCajasY + (i * (cajaSize + espacioEntreCajas));
        const rectKdaX = inicioX + cajaSize + gapGral;
        const rectWrX = rectKdaX + anchoBloqueKDA + gapGral;

        if (datos.notables[i]) {
            ctx.fillStyle = COLOR_BG_CAJA;
            ctx.beginPath();
            ctx.roundRect(inicioX, filaY, cajaSize, cajaSize, radioCajitas);
            ctx.roundRect(rectKdaX, filaY, anchoBloqueKDA, cajaSize, radioCajitas);
            ctx.roundRect(rectWrX, filaY, anchoBloqueWR, cajaSize, radioCajitas);
            ctx.fill();

            const dataChamp = datos.notables[i];
            
            let urlChamp = '';
            if (isNaN(dataChamp.champ)) {
                urlChamp = `https://ddragon.leagueoflegends.com/cdn/14.6.1/img/champion/${dataChamp.champ}.png`;
            } else {
                urlChamp = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${dataChamp.champ}.png`;
            }

            try {
                const img = await loadImage(urlChamp);
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(inicioX, filaY, cajaSize, cajaSize, radioCajitas);
                ctx.clip(); 
                ctx.drawImage(img, inicioX - 4, filaY - 4, cajaSize + 8, cajaSize + 8);
                ctx.restore(); 
            } catch (e) {
                console.error(`[Canvas] Falló imagen Champ Notable (${dataChamp.champ}):`, e.message);
            }

            ctx.textBaseline = 'top';
            ctx.textAlign = 'center'; 
            ctx.fillStyle = obtenerColorKDA(dataChamp.kda);
            ctx.font = 'bold 20px "Plus Jakarta Sans"';
            ctx.fillText(`${dataChamp.kda} KDA`, rectKdaX + (anchoBloqueKDA/2), filaY + 7);
            
            dibujarTextoSeparado(ctx, dataChamp.kdaStr, rectKdaX + (anchoBloqueKDA/2), filaY + 29, fontPequena, COLOR_TEXTO_BASE, COLOR_SEPARADOR_FADED);

            ctx.textAlign = 'center'; 
            ctx.fillStyle = obtenerColorWR(dataChamp.wr);
            ctx.font = 'bold 20px "Plus Jakarta Sans"'; 
            ctx.fillText(dataChamp.wr, rectWrX + (anchoBloqueWR/2), filaY + 7);
            
            dibujarTextoSeparado(ctx, dataChamp.partStr, rectWrX + (anchoBloqueWR/2), filaY + 29, fontPequena, COLOR_TEXTO_BASE, COLOR_SEPARADOR_FADED);

        } else {
            ctx.save(); 
            const k = i - numNotablesReal; 
            const alphaDinamico = Math.max(0.05, 0.6 - (k * 0.20)); 
            
            ctx.globalAlpha = alphaDinamico; 

            ctx.fillStyle = COLOR_BG_CAJA;
            ctx.beginPath();
            ctx.roundRect(inicioX, filaY, cajaSize, cajaSize, radioCajitas);
            ctx.roundRect(rectKdaX, filaY, anchoBloqueKDA, cajaSize, radioCajitas);
            ctx.roundRect(rectWrX, filaY, anchoBloqueWR, cajaSize, radioCajitas);
            ctx.fill();

            ctx.restore(); 
        }
    }

    // ==========================================
    // 🎨 RENDIMIENTO TOTAL Y ROLES (DERECHA)
    // ==========================================
    const margenDerecho = 5; 
    const sizeAbajo = 44; 
    const gapAbajo = 8; 
    const rectGrandeX = width - margenDerecho - ((9 * sizeAbajo) + (8 * gapAbajo)); 
    
    const rectGrandeY = tituloY + 33; 
    const rectGrandeAncho = 102; 
    const rectGrandeAlto = 102; 
    
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath();
    ctx.roundRect(rectGrandeX, rectGrandeY, rectGrandeAncho, rectGrandeAlto, 10); 
    ctx.fill();

    const cajitasX = rectGrandeX + rectGrandeAncho + 10;
    
    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Roles Principales', cajitasX, tituloY + 33);

    const cajitaSize = 38; 
    const gapRoles = (rectGrandeAlto - subtituloFontSize - (cajitaSize * 2)) / 2; 
    
    const caja1Y = rectGrandeY + subtituloFontSize + gapRoles; 
    const caja2Y = rectGrandeY + rectGrandeAlto - cajitaSize; 
    const offsetIcono = 5; 
    
    const gapCajaTexto = 12; 
    const textRolesX = cajitasX + cajitaSize + gapCajaTexto; 

    ctx.font = 'bold 20px "Plus Jakarta Sans"';
    let maxWrWidth = 0;
    for(let r = 0; r < 2; r++) {
        if(datos.roles[r]) {
            const currentWidth = ctx.measureText(datos.roles[r].wr).width;
            if(currentWidth > maxWrWidth) maxWrWidth = currentWidth;
        }
    }

    ctx.font = fontBold; 
    let maxNumWidth = 0;
    for(let r = 0; r < 2; r++) {
        if(datos.roles[r]) {
            const [numVic] = datos.roles[r].vic.split(' ');
            const [numDer] = datos.roles[r].der.split(' ');
            const w1 = ctx.measureText(numVic).width;
            const w2 = ctx.measureText(numDer).width;
            if (w1 > maxNumWidth) maxNumWidth = w1;
            if (w2 > maxNumWidth) maxNumWidth = w2;
        }
    }

    const posXSeparador = textRolesX + maxWrWidth + gapCajaTexto; 
    ctx.font = 'bold 16px "Plus Jakarta Sans"';
    const wSeparadorRoles = ctx.measureText("I").width;
    const posXInicioTextosPequeños = posXSeparador + wSeparadorRoles + gapCajaTexto;
    const posXNumerosCenter = posXInicioTextosPequeños + (maxNumWidth / 2);
    const posXPalabras = posXNumerosCenter + (maxNumWidth / 2) + 4; 

    for(let r = 0; r < 2; r++) {
        const currentY = r === 0 ? caja1Y : caja2Y;
        const centroCajitaY = currentY + (cajitaSize / 2);

        ctx.fillStyle = COLOR_BG_CAJA;
        ctx.beginPath();
        ctx.roundRect(cajitasX, currentY, cajitaSize, cajitaSize, radioCajitas); 
        ctx.fill();

        if (datos.roles[r]) {
            const rolData = datos.roles[r];
            
            try {
                const imgRol = await loadImage(rolData.icono);
                ctx.drawImage(imgRol, cajitasX + offsetIcono, currentY + offsetIcono, 28, 28);
            } catch (e) {}

            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff'; 
            ctx.font = 'bold 20px "Plus Jakarta Sans"';
            ctx.fillText(rolData.wr, textRolesX, centroCajitaY); 
            
            ctx.textAlign = 'left';
            ctx.fillStyle = COLOR_SEPARADOR_FADED;
            ctx.font = 'bold 16px "Plus Jakarta Sans"'; 
            ctx.fillText("I", posXSeparador, centroCajitaY - 1); 
            
            const [numVic, wordVic] = rolData.vic.split(' '); 
            const [numDer, wordDer] = rolData.der.split(' ');

            ctx.font = fontBold; 
            ctx.fillStyle = COLOR_TEXTO_BASE;
            ctx.textBaseline = 'middle'; 
            
            const jointOffset = 10; 

            ctx.textAlign = 'center';
            ctx.fillText(numVic, posXNumerosCenter, centroCajitaY - jointOffset); 
            ctx.textAlign = 'left';
            ctx.fillText(wordVic, posXPalabras, centroCajitaY - jointOffset); 

            ctx.textAlign = 'center';
            ctx.fillText(numDer, posXNumerosCenter, centroCajitaY + jointOffset); 
            ctx.textAlign = 'left';
            ctx.fillText(wordDer, posXPalabras, centroCajitaY + jointOffset); 
        } else {
            // CAJA DE ROL VACÍA
            try {
                const imgVacioRol = await loadImage('https://i.imgur.com/RsETmgr.png');
                ctx.save();
                ctx.globalAlpha = 0.7; 
                ctx.drawImage(imgVacioRol, cajitasX + offsetIcono, currentY + offsetIcono, 28, 28);
                ctx.restore();
            } catch (e) {}

            ctx.textBaseline = 'middle';
            ctx.fillStyle = COLOR_TEXTO_BASE; 
            
            ctx.font = fontBold; 
            
            const linea1 = "Sin partidas";
            const linea2 = "registradas";
            const jointOffset = 10; 

            ctx.textAlign = 'left';
            ctx.fillText(linea1, textRolesX, centroCajitaY - jointOffset);

            const widthLinea1 = ctx.measureText(linea1).width;
            const centroExactoLinea1X = textRolesX + (widthLinea1 / 2);

            ctx.textAlign = 'center';
            ctx.fillText(linea2, centroExactoLinea1X, centroCajitaY + jointOffset);
        }
    }

    // ==========================================
    // 🎨 MEDIALUNA / ARCO DE WINRATE 
    // ==========================================
    const wins = datos.rendimiento.wins || 0;
    const losses = datos.rendimiento.losses || 0;
    const totalGames = wins + losses; 
    let winRatePorcentaje = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    let winAngle = totalGames > 0 ? Math.PI * (wins / totalGames) : 0;

    const arcRadius = 32; 
    const arcLineWidth = 12;
    const outerRadius = arcRadius + (arcLineWidth / 2); 
    const bottomStroke = arcLineWidth / 2; 

    const gapArcText = 12; 
    const textHeight = 14; 

    const segmentTotalHeight = outerRadius + bottomStroke + gapArcText + textHeight; 
    
    const boxCenterY = rectGrandeY + (rectGrandeAlto / 2); 
    
    const centerOffset = (-outerRadius + (bottomStroke + gapArcText + textHeight)) / 2; 
    
    const arcCenterY = boxCenterY - centerOffset; 
    const arcCenterX = rectGrandeX + (rectGrandeAncho / 2);
    
    const textBaseY = arcCenterY + bottomStroke + gapArcText; 
    
    const gapArc = (wins > 0 && losses > 0) ? 0.06 : 0;

    ctx.lineWidth = arcLineWidth;
    ctx.lineCap = 'round'; 

    if (totalGames === 0) {
        ctx.beginPath();
        ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI, Math.PI * 2);
        ctx.strokeStyle = COLOR_SEPARADOR_FADED; 
        ctx.stroke();
    } else {
        if (wins > 0) {
            ctx.beginPath();
            ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI, Math.PI + winAngle - gapArc);
            ctx.strokeStyle = '#2d6cff'; 
            ctx.stroke();
        }
        if (losses > 0) {
            ctx.beginPath();
            ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI + winAngle + gapArc, Math.PI * 2);
            ctx.strokeStyle = '#e84057'; 
            ctx.stroke();
        }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a3b8ff'; 
    ctx.font = 'bold 16px "Plus Jakarta Sans"'; 
    ctx.fillText(`${winRatePorcentaje}%`, arcCenterX, arcCenterY - 2); 

    ctx.textBaseline = 'top';
    dibujarTextoSeparado(ctx, `${wins} V  I  ${losses} D`, arcCenterX, textBaseY, fontPequena, '#ffffff', COLOR_SEPARADOR_FADED, "  I  ");

    // =========================================================
    // 🎨 MINI HISTORIAL
    // =========================================================
    const historialTituloY = tituloY + 145; 
    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left';
    ctx.fillText('Mini Historial', rectGrandeX, historialTituloY);

    const yAbajo = historialTituloY + 27;
    const numHistorialReal = datos.historial.length;

    for (let j = 0; j < 9; j++) {
        const xActual = rectGrandeX + (j * (sizeAbajo + gapAbajo));
        if (datos.historial[j]) {
            ctx.fillStyle = COLOR_BG_CAJA;
            ctx.beginPath();
            ctx.roundRect(xActual, yAbajo, sizeAbajo, sizeAbajo, radioCajitas);
            ctx.fill();
            const partida = datos.historial[j];

            let urlChampA = '';
            if (isNaN(partida.champ)) {
                urlChampA = `https://ddragon.leagueoflegends.com/cdn/14.6.1/img/champion/${partida.champ}.png`;
            } else {
                urlChampA = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${partida.champ}.png`;
            }

            try {
                const imgAbajo = await loadImage(urlChampA);
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(xActual, yAbajo, sizeAbajo, sizeAbajo, radioCajitas);
                ctx.clip(); 
                ctx.filter = 'grayscale(100%)'; 
                ctx.drawImage(imgAbajo, xActual - 4, yAbajo - 4, sizeAbajo + 8, sizeAbajo + 8);
                ctx.filter = 'none'; 
                ctx.restore(); 
            } catch (e) {
                console.error(`[Canvas] Falló imagen Champ Historial (${partida.champ}):`, e.message);
            }

            ctx.fillStyle = partida.vic ? 'rgba(196, 238, 176, 0.4)' : 'rgba(255, 179, 186, 0.4)';
            ctx.beginPath();
            ctx.roundRect(xActual, yAbajo, sizeAbajo, sizeAbajo, radioCajitas);
            ctx.fill();
        } else {
            ctx.save();
            const kH = j - numHistorialReal; 
            const alphaDinamicoH = Math.max(0.05, 0.6 - (kH * 0.12)); 
            ctx.globalAlpha = alphaDinamicoH;
            ctx.fillStyle = COLOR_BG_CAJA;
            ctx.beginPath();
            ctx.roundRect(xActual, yAbajo, sizeAbajo, sizeAbajo, radioCajitas);
            ctx.fill();
            ctx.restore();
        }
    }

    // ==========================================
    // 🎨 COMPAÑEROS FRECUENTES 
    // ==========================================
    const inicioYJugandoCon = yAbajo + sizeAbajo + 15; 
    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Compañeros Frecuentes', rectGrandeX, inicioYJugandoCon);

    const inicioCajasJugandoY = inicioYJugandoCon + 27; 
    const sizeJugado = 43; 

    if (datos.companeros.length === 0) {
        try {
            let rawVacio;
            try {
                rawVacio = await loadImage(path.join(__dirname, 'Awowa_Shrug.png'));
            } catch (errLocal) {
                rawVacio = await loadImage('https://i.imgur.com/T9iD6lO.png');
            }
            
            const imgVacio = await limpiarHaloBlanco(rawVacio);

            const giantSquareHeight = (2 * sizeJugado) + 8; 
            const giantSquareSize = giantSquareHeight; 
            
            const emptyGridStartX = rectGrandeX;
            const emptyGridStartY = inicioCajasJugandoY;

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(emptyGridStartX, emptyGridStartY, giantSquareSize, giantSquareSize, radioCajitas);
            ctx.clip(); 
            
            ctx.globalAlpha = 1.0; 
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            
            ctx.drawImage(imgVacio, emptyGridStartX, emptyGridStartY, giantSquareSize, giantSquareSize);
            
            ctx.restore(); 

            const textStartX = emptyGridStartX + giantSquareSize + 20; 
            const centroTextosY = emptyGridStartY + (giantSquareSize / 2); 

            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = '#ffffff'; 
            ctx.font = 'bold 18px "Plus Jakarta Sans"'; 
            ctx.fillText("No encontré datos", textStartX, centroTextosY - 18);

            ctx.fillStyle = COLOR_TEXTO_BASE; 
            ctx.font = fontBold; 
            ctx.fillText("Este usuario no tiene ninguna", textStartX, centroTextosY + 4);
            ctx.fillText("partida con alguien en especial", textStartX, centroTextosY + 24);
            
        } catch (e) {
            console.error(`${c.r}·${c.b} [Canvas] Carga de imagen de estado vacío: ${c.r}Fallo${c.b}.`, e);
        }
    } else {
        for(let k = 0; k < Math.min(datos.companeros.length, 4); k++) {
            const fila = Math.floor(k / 2);
            const columna = k % 2;
            const compa = datos.companeros[k];
            
            const yDuo = inicioCajasJugandoY + (fila * (sizeJugado + 8));
            // 👇 SOLUCIÓN: Separación calibrada a 230px para que no se salga del lienzo
            const xDuo = rectGrandeX + (columna * 230);
            
            ctx.fillStyle = COLOR_BG_CAJA;
            ctx.beginPath();
            ctx.roundRect(xDuo, yDuo, sizeJugado, sizeJugado, radioCajitas);
            ctx.fill();
            
            try {
                const imgDuo = await loadImage(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${compa.icono}.jpg`);
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(xDuo, yDuo, sizeJugado, sizeJugado, radioCajitas);
                ctx.clip(); 
                ctx.drawImage(imgDuo, xDuo - 4, yDuo - 4, sizeJugado + 8, sizeJugado + 8);
                ctx.restore(); 
            } catch (e) {
                console.error(`[Canvas] Falló imagen Perfil Duo (${compa.icono}):`, e.message);
            }
            
            const textoX = xDuo + sizeJugado + 12; 
            
            // 👇 SOLUCIÓN: Ancho máximo fijo y absoluto (170px) para las letras
            const maxNickWidth = 170; 

            ctx.save();
            ctx.beginPath();
            ctx.rect(textoX, yDuo, maxNickWidth, sizeJugado); 
            ctx.clip(); 
            
            // 👇 MECÁNICA PRO: Auto-escalado de fuente bajando hasta 12px
            let currentFontSize = 20;
            ctx.font = `bold ${currentFontSize}px "Plus Jakarta Sans"`;
            
            while (ctx.measureText(compa.nick).width > maxNickWidth && currentFontSize > 12) {
                currentFontSize--;
                ctx.font = `bold ${currentFontSize}px "Plus Jakarta Sans"`;
            }

            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'top';
            ctx.fillText(compa.nick, textoX, yDuo + 1);
            
            ctx.fillStyle = COLOR_TEXTO_BASE;
            ctx.font = fontPequena; 
            ctx.fillText(compa.partidas, textoX, yDuo + 25); 
            ctx.restore(); 
        }
    }

    return canvas.toBuffer('image/png');
}

module.exports = { generarBoceto };