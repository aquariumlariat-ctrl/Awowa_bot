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

// 👇 PARCHE ACTUALIZADO: Para campeones nuevos
let PARCHE_ACTUAL = '15.4.1'; 

// Auto-actualizador silencioso del parche de Riot
fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    .then(res => res.json())
    .then(data => { 
        if (data && data[0]) PARCHE_ACTUAL = data[0]; 
    })
    .catch(() => {});

// ==========================================
// 🚀 SISTEMA DE CACHÉ X15 (MEMORIA RAM)
// ==========================================
const imageCache = new Map();

async function obtenerImagenSegura(urlOrPath) {
    if (imageCache.has(urlOrPath)) {
        return await imageCache.get(urlOrPath);
    }
    const promise = loadImage(urlOrPath).catch(err => {
        imageCache.delete(urlOrPath);
        throw err;
    });
    imageCache.set(urlOrPath, promise);
    return await promise;
}

// 🥇 FUNCIÓN DEFINITIVA: Limpiar halo blanco (Matte Removal)
async function limpiarHaloBlanco(img) {
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a === 0) continue;
        const alpha = a / 255;
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

// ⭐ Pixel Snapping Helper
const px = (n) => Math.round(n);

// ⭐ Micro-stroke para UI Profesional
function fillTextPro(ctx, text, x, y) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeText(text, px(x), px(y));
    ctx.fillText(text, px(x), px(y));
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

    let currentX = px(xCentrado - (widthTotal / 2));
    const cleanY = px(y);
    ctx.textAlign = 'left'; 

    partes.forEach((parte, index) => {
        ctx.fillStyle = colorSolido;
        ctx.fillText(parte, currentX, cleanY);
        currentX += ctx.measureText(parte).width; 

        if (index < partes.length - 1) {
            ctx.fillStyle = colorFaded;
            ctx.fillText(separador, currentX, cleanY);
            currentX += ctx.measureText(separador).width; 
        }
    });
    ctx.restore();
}

const datosPerfilPorDefecto = {
    nick: 'Jugador', notables: [], rendimiento: { wins: 0, losses: 0 }, roles: [], historial: [], companeros: []
};

async function generarBoceto(datos = datosPerfilPorDefecto, modoActivo = 0) {
    const baseWidth = 800;
    const baseHeight = 350; 
    
    // ⭐ Render en 2x (Look Retina)
    const scale = 2;
    const canvas = createCanvas(baseWidth * scale, baseHeight * scale);
    const ctx = canvas.getContext('2d');
    
    ctx.scale(scale, scale);

    // ⭐ High Quality Text Rendering global
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textRendering = 'optimizeLegibility';

    const margenLateral = 5, inicioX = margenLateral, tituloY = 0; 
    const cajaSize = 50, gapGral = 10, anchoBloqueKDA = 110, anchoBloqueWR = 110;  
    
    const subtituloFontSize = 17; 
    const fontBold = `bold ${subtituloFontSize}px "Plus Jakarta Sans"`;
    const fontPequena = 'bold 14px "Plus Jakarta Sans"';

    // ==========================================
    // 🎨 ENCABEZADO CON LOGO OPTIMIZADO (128x128)
    // ==========================================
    const fontSizeTituloVal = 26;
    const fontSizeSeparador = fontSizeTituloVal / 2;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    try {
        // 👇 Nuevo Logo Squoosh a 128x128px y en Blanco
        const imgLogo = await obtenerImagenSegura('https://i.imgur.com/ujdm5EE.png');
        const aspectRatioLogo = imgLogo.width / imgLogo.height;
        
        // Mantenemos la proporción áurea (0.92) para que baje a ~24px en pantalla
        const finalLogoHeight = fontSizeTituloVal * 0.92; 
        const finalLogoWidth = finalLogoHeight * aspectRatioLogo;
        const logoGap = 10;

        const safeWidth = px(finalLogoWidth);
        const safeHeight = px(finalLogoHeight);

        const logoY = tituloY + (fontSizeTituloVal - safeHeight) / 2;

        ctx.save();
        // Aseguramos interpolación de alta calidad al imprimir la imagen directa
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // Sombra UI sutil
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;

        ctx.drawImage(imgLogo, px(inicioX), px(logoY), safeWidth, safeHeight);
        ctx.restore();

        const xSeparador = inicioX + safeWidth + logoGap;
        ctx.font = `bold ${fontSizeSeparador}px "Plus Jakarta Sans"`;
        ctx.fillStyle = COLOR_SEPARADOR_FADED; 
        const centroVerticalY = tituloY + ((fontSizeTituloVal - fontSizeSeparador) / 2) + 2;
        ctx.fillText(' I ', px(xSeparador), px(centroVerticalY));
        
        const wSeparador = ctx.measureText(' I ').width;
        const xTitulo = xSeparador + wSeparador + logoGap;
        ctx.font = `bold ${fontSizeTituloVal}px "Plus Jakarta Sans"`;
        ctx.fillStyle = '#ffffff'; 
        
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
        ctx.fillText(`Panel de Invocador`, px(xTitulo), px(tituloY));
        ctx.shadowColor = 'transparent';

    } catch (e) {
        ctx.font = `bold ${fontSizeTituloVal}px "Plus Jakarta Sans"`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Panel de Invocador`, px(inicioX), px(tituloY));
    }

    // ==========================================
    // 🎨 SUBTÍTULOS (TABS DE MODOS DE JUEGO)
    // ==========================================
    ctx.font = fontBold;
    const t1 = 'Solo/Dúo', t2 = 'Flexible', t3 = 'Casuales', t4 = 'Total';
    const wt1 = ctx.measureText(t1).width, wt2 = ctx.measureText(t2).width;
    const wt3 = ctx.measureText(t3).width, wt4 = ctx.measureText(t4).width;

    const anchoCajasIzquierda = cajaSize + gapGral + anchoBloqueKDA + gapGral + anchoBloqueWR;
    const espacioTotalGaps = anchoCajasIzquierda - (wt1 + wt2 + wt3 + wt4);
    const gapTabs = espacioTotalGaps / 3;

    const xt1 = inicioX, xt2 = xt1 + wt1 + gapTabs, xt3 = xt2 + wt2 + gapTabs, xt4 = xt3 + wt3 + gapTabs;
    const tabsData = [
        { text: t1, x: xt1 }, { text: t2, x: xt2 },
        { text: t3, x: xt3 }, { text: t4, x: xt4 }
    ];

    ctx.textAlign = 'left'; 
    tabsData.forEach((tab, index) => {
        if (index === modoActivo) {
            ctx.fillStyle = '#dccaf9';
            ctx.globalAlpha = 1.0;
        } else {
            ctx.fillStyle = COLOR_TEXTO_BASE;
            ctx.globalAlpha = 0.5;
        }
        ctx.fillText(tab.text, px(tab.x), px(tituloY + 33));
    });
    ctx.globalAlpha = 1.0;

    const radioCajitas = 5, espacioEntreCajas = gapGral, inicioCajasY = tituloY + 60; 
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
            ctx.roundRect(px(inicioX), px(filaY), cajaSize, cajaSize, radioCajitas);
            ctx.roundRect(px(rectKdaX), px(filaY), anchoBloqueKDA, cajaSize, radioCajitas);
            ctx.roundRect(px(rectWrX), px(filaY), anchoBloqueWR, cajaSize, radioCajitas);
            ctx.fill();

            const dataChamp = datos.notables[i];
            
            let urlChamp = isNaN(dataChamp.champ) 
                ? `https://ddragon.leagueoflegends.com/cdn/${PARCHE_ACTUAL}/img/champion/${dataChamp.champ}.png` 
                : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${dataChamp.champ}.png`;

            try {
                const img = await obtenerImagenSegura(urlChamp);
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(px(inicioX), px(filaY), cajaSize, cajaSize, radioCajitas);
                ctx.clip(); 
                ctx.drawImage(img, px(inicioX - 4), px(filaY - 4), cajaSize + 8, cajaSize + 8);
                ctx.restore(); 
            } catch (e) {}

            ctx.textBaseline = 'middle'; 
            ctx.textAlign = 'center'; 
            ctx.fillStyle = obtenerColorKDA(dataChamp.kda);
            ctx.font = 'bold 20px "Plus Jakarta Sans"';
            
            fillTextPro(ctx, `${dataChamp.kda} KDA`, rectKdaX + (anchoBloqueKDA/2), filaY + 16);
            
            ctx.textBaseline = 'top';
            dibujarTextoSeparado(ctx, dataChamp.kdaStr, rectKdaX + (anchoBloqueKDA/2), filaY + 29, fontPequena, COLOR_TEXTO_BASE, COLOR_SEPARADOR_FADED);

            ctx.textBaseline = 'middle'; 
            ctx.textAlign = 'center'; 
            ctx.fillStyle = obtenerColorWR(dataChamp.wr);
            ctx.font = 'bold 20px "Plus Jakarta Sans"'; 
            
            fillTextPro(ctx, dataChamp.wr, rectWrX + (anchoBloqueWR/2), filaY + 16);
            
            ctx.textBaseline = 'top';
            dibujarTextoSeparado(ctx, dataChamp.partStr, rectWrX + (anchoBloqueWR/2), filaY + 29, fontPequena, COLOR_TEXTO_BASE, COLOR_SEPARADOR_FADED);

        } else {
            ctx.save(); 
            const k = i - numNotablesReal; 
            const alphaDinamico = Math.max(0.05, 0.5 - (k * 0.15)); 
            ctx.globalAlpha = alphaDinamico; 
            ctx.fillStyle = COLOR_BG_CAJA; 

            ctx.beginPath();
            ctx.roundRect(px(inicioX), px(filaY), cajaSize, cajaSize, radioCajitas);
            
            ctx.roundRect(px(rectKdaX + 30), px(filaY + 12), 50, 12, 4); 
            ctx.roundRect(px(rectKdaX + 15), px(filaY + 31), 80, 8, 4);  
            
            ctx.roundRect(px(rectWrX + 30), px(filaY + 12), 50, 12, 4); 
            ctx.roundRect(px(rectWrX + 15), px(filaY + 31), 80, 8, 4);  
            ctx.fill();
            ctx.restore(); 
        }
    }

    // ==========================================
    // 🎨 RENDIMIENTO TOTAL Y ROLES (DERECHA)
    // ==========================================
    const margenDerecho = 5, sizeAbajo = 44, gapAbajo = 8; 
    const rectGrandeX = baseWidth - margenDerecho - ((9 * sizeAbajo) + (8 * gapAbajo)); 
    const rectGrandeY = tituloY + 33, rectGrandeAncho = 102, rectGrandeAlto = 102; 
    
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath();
    ctx.roundRect(px(rectGrandeX), px(rectGrandeY), rectGrandeAncho, rectGrandeAlto, 10); 
    ctx.fill();

    const cajitasX = rectGrandeX + rectGrandeAncho + 10;
    
    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Roles Principales', px(cajitasX), px(tituloY + 33));

    const cajitaSize = 38; 
    const gapRoles = (rectGrandeAlto - subtituloFontSize - (cajitaSize * 2)) / 2; 
    
    const caja1Y = rectGrandeY + subtituloFontSize + gapRoles; 
    const caja2Y = rectGrandeY + rectGrandeAlto - cajitaSize; 
    const offsetIcono = 5, gapCajaTexto = 12; 
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
        ctx.roundRect(px(cajitasX), px(currentY), cajitaSize, cajitaSize, radioCajitas); 
        ctx.fill();

        if (datos.roles[r]) {
            const rolData = datos.roles[r];
            try {
                const imgRol = await obtenerImagenSegura(rolData.icono);
                ctx.drawImage(imgRol, px(cajitasX + offsetIcono), px(currentY + offsetIcono), 28, 28);
            } catch (e) {}

            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff'; 
            ctx.font = 'bold 20px "Plus Jakarta Sans"';
            
            fillTextPro(ctx, rolData.wr, textRolesX, centroCajitaY); 
            
            ctx.textAlign = 'left';
            ctx.fillStyle = COLOR_SEPARADOR_FADED;
            ctx.font = 'bold 16px "Plus Jakarta Sans"'; 
            ctx.fillText("I", px(posXSeparador), px(centroCajitaY - 1)); 
            
            const [numVic, wordVic] = rolData.vic.split(' '); 
            const [numDer, wordDer] = rolData.der.split(' ');

            ctx.font = fontBold; 
            ctx.fillStyle = COLOR_TEXTO_BASE;
            ctx.textBaseline = 'middle'; 
            const jointOffset = 10; 

            ctx.textAlign = 'center';
            ctx.fillText(numVic, px(posXNumerosCenter), px(centroCajitaY - jointOffset)); 
            ctx.textAlign = 'left';
            ctx.fillText(wordVic, px(posXPalabras), px(centroCajitaY - jointOffset)); 

            ctx.textAlign = 'center';
            ctx.fillText(numDer, px(posXNumerosCenter), px(centroCajitaY + jointOffset)); 
            ctx.textAlign = 'left';
            ctx.fillText(wordDer, px(posXPalabras), px(centroCajitaY + jointOffset)); 
        } else {
            try {
                const imgVacioRol = await obtenerImagenSegura('https://i.imgur.com/RsETmgr.png');
                ctx.save();
                ctx.globalAlpha = 0.7; 
                ctx.drawImage(imgVacioRol, px(cajitasX + offsetIcono), px(currentY + offsetIcono), 28, 28);
                ctx.restore();
            } catch (e) {}

            ctx.textBaseline = 'middle';
            ctx.fillStyle = COLOR_TEXTO_BASE; 
            ctx.font = fontBold; 
            
            const linea1 = "Sin partidas", linea2 = "registradas", jointOffset = 10; 
            ctx.textAlign = 'left';
            ctx.fillText(linea1, px(textRolesX), px(centroCajitaY - jointOffset));
            const widthLinea1 = ctx.measureText(linea1).width;
            const centroExactoLinea1X = textRolesX + (widthLinea1 / 2);
            ctx.textAlign = 'center';
            ctx.fillText(linea2, px(centroExactoLinea1X), px(centroCajitaY + jointOffset));
        }
    }

    // ==========================================
    // 🎨 MEDIALUNA / ARCO DE WINRATE 
    // ==========================================
    const wins = datos.rendimiento.wins || 0, losses = datos.rendimiento.losses || 0;
    const totalGames = wins + losses; 
    let winRatePorcentaje = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    let winAngle = totalGames > 0 ? Math.PI * (wins / totalGames) : 0;

    const arcRadius = 32, arcLineWidth = 12, outerRadius = arcRadius + (arcLineWidth / 2); 
    const bottomStroke = arcLineWidth / 2, gapArcText = 12, textHeight = 14; 

    const boxCenterY = rectGrandeY + (rectGrandeAlto / 2); 
    const centerOffset = (-outerRadius + (bottomStroke + gapArcText + textHeight)) / 2; 
    const arcCenterY = boxCenterY - centerOffset, arcCenterX = rectGrandeX + (rectGrandeAncho / 2);
    const textBaseY = arcCenterY + bottomStroke + gapArcText; 
    const gapArc = (wins > 0 && losses > 0) ? 0.06 : 0;

    ctx.lineWidth = arcLineWidth;
    ctx.lineCap = 'round'; 

    if (totalGames === 0) {
        ctx.beginPath();
        ctx.arc(px(arcCenterX), px(arcCenterY), arcRadius, Math.PI, Math.PI * 2);
        ctx.strokeStyle = COLOR_SEPARADOR_FADED; 
        ctx.stroke();
    } else {
        if (wins > 0) {
            ctx.beginPath();
            ctx.arc(px(arcCenterX), px(arcCenterY), arcRadius, Math.PI, Math.PI + winAngle - gapArc);
            ctx.strokeStyle = '#2d6cff'; 
            ctx.stroke();
        }
        if (losses > 0) {
            ctx.beginPath();
            ctx.arc(px(arcCenterX), px(arcCenterY), arcRadius, Math.PI + winAngle + gapArc, Math.PI * 2);
            ctx.strokeStyle = '#e84057'; 
            ctx.stroke();
        }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a3b8ff'; 
    ctx.font = 'bold 16px "Plus Jakarta Sans"'; 
    
    fillTextPro(ctx, `${winRatePorcentaje}%`, arcCenterX, arcCenterY - 2); 
    
    ctx.textBaseline = 'top';
    dibujarTextoSeparado(ctx, `${wins} V  I  ${losses} D`, arcCenterX, textBaseY, fontPequena, '#ffffff', COLOR_SEPARADOR_FADED, "  I  ");

    // =========================================================
    // 🎨 MINI HISTORIAL
    // =========================================================
    const historialTituloY = tituloY + 145; 
    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold; 
    ctx.textAlign = 'left';
    ctx.fillText('Mini Historial', px(rectGrandeX), px(historialTituloY));

    const yAbajo = historialTituloY + 26; 
    const numHistorialReal = datos.historial.length;

    for (let j = 0; j < 9; j++) {
        const xActual = rectGrandeX + (j * (sizeAbajo + gapAbajo));
        if (datos.historial[j]) {
            ctx.fillStyle = COLOR_BG_CAJA;
            ctx.beginPath();
            ctx.roundRect(px(xActual), px(yAbajo), sizeAbajo, sizeAbajo, radioCajitas);
            ctx.fill();
            const partida = datos.historial[j];

            let urlChampA = isNaN(partida.champ) 
                ? `https://ddragon.leagueoflegends.com/cdn/${PARCHE_ACTUAL}/img/champion/${partida.champ}.png` 
                : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${partida.champ}.png`;

            try {
                const imgAbajo = await obtenerImagenSegura(urlChampA);
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(px(xActual), px(yAbajo), sizeAbajo, sizeAbajo, radioCajitas);
                ctx.clip(); 
                ctx.filter = 'grayscale(100%)'; 
                ctx.drawImage(imgAbajo, px(xActual - 4), px(yAbajo - 4), sizeAbajo + 8, sizeAbajo + 8);
                ctx.filter = 'none'; 
                ctx.restore(); 
            } catch (e) {}

            ctx.fillStyle = partida.vic ? 'rgba(196, 238, 176, 0.4)' : 'rgba(255, 179, 186, 0.4)';
            ctx.beginPath();
            ctx.roundRect(px(xActual), px(yAbajo), sizeAbajo, sizeAbajo, radioCajitas);
            ctx.fill();
        } else {
            ctx.save();
            const kH = j - numHistorialReal; 
            const alphaDinamicoH = Math.max(0.05, 0.6 - (kH * 0.12)); 
            ctx.globalAlpha = alphaDinamicoH;
            
            ctx.fillStyle = COLOR_BG_CAJA;
            ctx.beginPath();
            ctx.roundRect(px(xActual), px(yAbajo), sizeAbajo, sizeAbajo, radioCajitas);
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
    ctx.fillText('Compañeros Frecuentes', px(rectGrandeX), px(inicioYJugandoCon));

    const inicioCajasJugandoY = inicioYJugandoCon + 26; 
    const sizeJugado = 43; 

    if (datos.companeros.length === 0) {
        try {
            let rawVacio;
            try {
                rawVacio = await obtenerImagenSegura(path.join(__dirname, 'Awowa_Shrug.png'));
            } catch (errLocal) {
                rawVacio = await obtenerImagenSegura('https://i.imgur.com/T9iD6lO.png');
            }
            const imgVacio = await limpiarHaloBlanco(rawVacio);
            const giantSquareSize = (2 * sizeJugado) + 8; 

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(px(rectGrandeX), px(inicioCajasJugandoY), giantSquareSize, giantSquareSize, radioCajitas);
            ctx.clip(); 
            ctx.globalAlpha = 1.0; 
            ctx.drawImage(imgVacio, px(rectGrandeX), px(inicioCajasJugandoY), giantSquareSize, giantSquareSize);
            ctx.restore(); 

            const textStartX = rectGrandeX + giantSquareSize + 20; 
            const centroTextosY = inicioCajasJugandoY + (giantSquareSize / 2); 

            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px "Plus Jakarta Sans"'; 
            ctx.fillText("No encontré datos", px(textStartX), px(centroTextosY - 18));
            ctx.fillStyle = COLOR_TEXTO_BASE; ctx.font = fontBold; 
            ctx.fillText("Este usuario no tiene ninguna", px(textStartX), px(centroTextosY + 4));
            ctx.fillText("partida con alguien en especial", px(textStartX), px(centroTextosY + 24));
        } catch (e) {}
    } else {
        for(let k = 0; k < 4; k++) {
            const fila = Math.floor(k / 2);
            const columna = k % 2;
            const yDuo = inicioCajasJugandoY + (fila * (sizeJugado + 8));
            const xDuo = rectGrandeX + (columna * 230);
            
            if (k < datos.companeros.length) {
                const compa = datos.companeros[k];
                ctx.fillStyle = COLOR_BG_CAJA;
                ctx.beginPath();
                ctx.roundRect(px(xDuo), px(yDuo), sizeJugado, sizeJugado, radioCajitas);
                ctx.fill();
                
                try {
                    const imgDuo = await obtenerImagenSegura(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${compa.icono}.jpg`);
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(px(xDuo), px(yDuo), sizeJugado, sizeJugado, radioCajitas);
                    ctx.clip(); 
                    ctx.drawImage(imgDuo, px(xDuo - 4), px(yDuo - 4), sizeJugado + 8, sizeJugado + 8);
                    ctx.restore(); 
                } catch (e) {}
                
                const textoX = xDuo + sizeJugado + 12; 
                const maxNickWidth = 170; 

                ctx.save();
                ctx.beginPath();
                ctx.rect(px(textoX), px(yDuo), maxNickWidth, sizeJugado); 
                ctx.clip(); 
                
                let currentFontSize = 20;
                ctx.font = `bold ${currentFontSize}px "Plus Jakarta Sans"`;
                while (ctx.measureText(compa.nick).width > maxNickWidth && currentFontSize > 12) {
                    currentFontSize--;
                    ctx.font = `bold ${currentFontSize}px "Plus Jakarta Sans"`;
                }

                ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top';
                ctx.fillText(compa.nick, px(textoX), px(yDuo + 1));
                ctx.fillStyle = COLOR_TEXTO_BASE; ctx.font = fontPequena; 
                ctx.fillText(compa.partidas, px(textoX), px(yDuo + 25)); 
                ctx.restore(); 

            } else {
                ctx.save();
                ctx.globalAlpha = 0.3; 
                ctx.fillStyle = COLOR_BG_CAJA; 
                ctx.beginPath();
                ctx.roundRect(px(xDuo), px(yDuo), sizeJugado, sizeJugado, radioCajitas);
                ctx.roundRect(px(xDuo + sizeJugado + 12), px(yDuo + 5), 110, 14, 4); 
                ctx.roundRect(px(xDuo + sizeJugado + 12), px(yDuo + 26), 60, 10, 4);  
                ctx.fill();
                ctx.restore();
            }
        }
    }

    return canvas.toBuffer('image/png');
}

module.exports = { generarBoceto };