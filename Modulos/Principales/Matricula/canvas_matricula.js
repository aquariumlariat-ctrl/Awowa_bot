// Modulos/Principales/Matricula/tarjeta_matricula.js
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

try {
    const plusJakarta = path.join(__dirname, '../../../Fonts/PlusJakartaSans-Regular.ttf');
    GlobalFonts.registerFromPath(plusJakarta, 'Plus Jakarta Sans');

    const notoCJK = path.join(__dirname, '../../../Fonts/NotoSansCJKSCRegular.otf');
    GlobalFonts.registerFromPath(notoCJK, 'Noto Sans CJK');
} catch {
    // Fuentes silenciadas
}

let avatarFijoCache = null;
let bannerCache = null;
const emblemasCache = new Map();

const TRADUCTOR_RANGOS = {
    'IRON': 'Hierro', 'BRONZE': 'Bronce', 'SILVER': 'Plata', 'GOLD': 'Oro',
    'PLATINUM': 'Platino', 'EMERALD': 'Esmeralda', 'DIAMOND': 'Diamante',
    'MASTER': 'Maestro', 'GRANDMASTER': 'Gran Maestro', 'CHALLENGER': 'Retador',
    'UNRANKED': 'Sin rango'
};

function formatearRango(tier, rank) {
    if (!tier || tier === 'UNRANKED') return 'Sin rango';
    const tierTraducido = TRADUCTOR_RANGOS[tier] || tier;
    if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) {
        return tierTraducido; 
    }
    return `${tierTraducido} ${rank || ''}`.trim();
}

async function loadAvatarFijo() {
    if (avatarFijoCache) return avatarFijoCache;
    avatarFijoCache = await loadImage('https://i.imgur.com/gXeTtUr.png');
    return avatarFijoCache;
}

async function loadBanner() {
    if (bannerCache) return bannerCache;
    bannerCache = await loadImage('https://i.imgur.com/FtTM90D.png');
    return bannerCache;
}

async function loadEmblema(url) {
    if (emblemasCache.has(url)) return emblemasCache.get(url);
    const imagen = await loadImage(url);
    emblemasCache.set(url, imagen);
    return imagen;
}

function tieneCaracteresAsiaticos(texto) {
    return /[\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(texto);
}

function obtenerFuente(texto, tamaño, peso = '') {
    return tieneCaracteresAsiaticos(texto) 
        ? `${peso} ${tamaño}px "Noto Sans CJK"`.trim() 
        : `${peso} ${tamaño}px "Plus Jakarta Sans"`.trim();
}

function dibujarTextoConSalto(ctx, texto, x, y, maxWidth, lineHeight) {
    const palabras = texto.split(' ');
    let linea = '';
    let yActual = y;

    for (let i = 0; i < palabras.length; i++) {
        const testLinea = linea + palabras[i] + ' ';
        if (ctx.measureText(testLinea).width > maxWidth && i > 0) {
            ctx.fillText(linea, x, yActual);
            linea = palabras[i] + ' ';
            yActual += lineHeight;
        } else {
            linea = testLinea;
        }
    }
    ctx.fillText(linea, x, yActual);
    return yActual;
}

function calcularAlturaTexto(ctx, texto, maxWidth, lineHeight, fontSize) {
    ctx.font = obtenerFuente(texto, fontSize, 'bold');
    const palabras = texto.split(' ');
    let linea = '';
    let numLineas = 1;

    for (let i = 0; i < palabras.length; i++) {
        const testLinea = linea + palabras[i] + ' ';
        if (ctx.measureText(testLinea).width > maxWidth && i > 0) {
            numLineas++;
            linea = palabras[i] + ' ';
        } else {
            linea = testLinea;
        }
    }
    return (numLineas - 1) * lineHeight + fontSize;
}

async function dibujarBloqueRango(ctx, x, y, numeroLPs, rangoUrl, textoInferior) {
    const cajaSize = 50;
    const gap = 10; 
    const anchoCajaTexto = 110; 
    const radio = 5;

    ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, cajaSize, cajaSize, radio);
    ctx.fill();

    try {
        const imagenRango = await loadEmblema(rangoUrl);
        ctx.drawImage(imagenRango, x, y, cajaSize, cajaSize);
    } catch {}

    const rectTextoX = x + cajaSize + gap;
    ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
    ctx.beginPath();
    ctx.roundRect(rectTextoX, y, anchoCajaTexto, cajaSize, radio);
    ctx.fill();

    let numeroTexto = numeroLPs >= 1000 ? `${(numeroLPs / 1000).toFixed(1).replace('.0', '')}k` : numeroLPs.toString();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Plus Jakarta Sans"';
    ctx.fillText(`${numeroTexto} LP`, rectTextoX + (anchoCajaTexto / 2), y + 7);

    ctx.fillStyle = '#CDCECF';
    ctx.font = 'bold 14px "Plus Jakarta Sans"'; 
    ctx.fillText(textoInferior, rectTextoX + (anchoCajaTexto / 2), y + 29);

    return cajaSize + gap + anchoCajaTexto;
}

async function generarTarjetaMatricula(datos) {
    const { gameName, tagLine, nivel, iconoId, soloq, flex, descripcion, numeroUsuario } = datos;

    // 👇 AJUSTE DE MARGEN GLOBAL (5px izquierda, 5px derecha) 👇
    const margenLateral = 5;

    const radioEsquinas = 10;
    const cuadradoSize = 150; 
    
    const anchoBloqueLPs = 170; 
    const gapGeneral = 11; 
    
    // Todos los elementos X se empujan 5px a la derecha sumando margenLateral
    const tituloX = margenLateral + anchoBloqueLPs + gapGeneral; 
    const tituloFontSize = 48; 
    const tagFontSize = tituloFontSize - 25;
    const descripcionFontSize = tagFontSize + 5;
    
    // El margen derecho también será de 5px (800 - X - 5)
    const maxWidth = 800 - tituloX - margenLateral; 
    
    const lineHeight = descripcionFontSize + 8;

    const rectBadgeAlto = 20 + 10;
    const inicioBloquesY = cuadradoSize - (rectBadgeAlto / 2) + rectBadgeAlto + 22;

    const cuadradoPequenoSize = 50;
    const tituloRangoFontSize = 17; 

    const tituloRango1Y = inicioBloquesY - 3; 
    const bloque1Y = tituloRango1Y + 28; 
    const tituloRango2Y = bloque1Y + cuadradoPequenoSize + 16; 
    const bloque2Y = tituloRango2Y + 28; 
    
    const finBloque2 = bloque2Y + cuadradoPequenoSize;

    const canvas = createCanvas(800, finBloque2);
    const ctx = canvas.getContext('2d');

    // Centrado dinámico del Avatar sobre los bloques que ahora inician en 5px
    const avatarX = margenLateral + 10;

    ctx.fillStyle = '#101216';
    ctx.beginPath();
    ctx.roundRect(avatarX, 0, cuadradoSize, cuadradoSize, radioEsquinas);
    ctx.fill();

    try {
        const imagen = await loadAvatarFijo();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(avatarX, 0, cuadradoSize, cuadradoSize, radioEsquinas);
        ctx.clip();
        ctx.drawImage(imagen, avatarX, 0, cuadradoSize, cuadradoSize);
        ctx.restore();
    } catch {}

    ctx.strokeStyle = '#fcfcfc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(avatarX + 1, 1, cuadradoSize - 2, cuadradoSize - 2, radioEsquinas);
    ctx.stroke();

    const nivelTexto = nivel.toString();
    ctx.font = obtenerFuente(nivelTexto, 20, 'bold');
    const rectBadgeAncho = ctx.measureText(nivelTexto).width + 10;
    const rectBadgeX = avatarX + (cuadradoSize - rectBadgeAncho) / 2;
    const rectBadgeY = cuadradoSize - (rectBadgeAlto / 2);

    ctx.fillStyle = 'rgba(23, 27, 35)';
    ctx.beginPath();
    ctx.roundRect(rectBadgeX, rectBadgeY, rectBadgeAncho, rectBadgeAlto, 5);
    ctx.fill();

    ctx.strokeStyle = '#CDCECF';
    ctx.beginPath();
    ctx.roundRect(rectBadgeX + 1, rectBadgeY + 1, rectBadgeAncho - 2, rectBadgeAlto - 2, 5);
    ctx.stroke();

    ctx.fillStyle = '#CDCECF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(nivelTexto, rectBadgeX + 5, rectBadgeY + 5);

    const textoDescripcion = descripcion || 'Soy nuevo por aquí, me muero de ganas por ver todo lo que Aurora es capaz de hacer...';
    const bloqueInicioY = (cuadradoSize / 2) - ((tituloFontSize + 10 + calcularAlturaTexto(ctx, textoDescripcion, maxWidth, lineHeight, descripcionFontSize)) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = obtenerFuente(gameName, tituloFontSize, 'bold');
    ctx.fillText(gameName, tituloX, bloqueInicioY);

    const tagX = tituloX + ctx.measureText(gameName).width + 10;
    const tagY = bloqueInicioY + (tituloFontSize / 2);

    ctx.fillStyle = '#CDCECF';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${tagFontSize}px "Plus Jakarta Sans"`;
    ctx.fillText('#', tagX, tagY);
    ctx.font = obtenerFuente(tagLine, tagFontSize, 'bold');
    ctx.fillText(tagLine, tagX + ctx.measureText('#').width, tagY);

    ctx.fillStyle = '#CDCECF';
    ctx.font = obtenerFuente(textoDescripcion, descripcionFontSize, 'bold');
    ctx.textBaseline = 'top';
    dibujarTextoConSalto(ctx, textoDescripcion, tituloX, bloqueInicioY + tituloFontSize + 10, maxWidth, lineHeight);

    const EMBLEMAS = {
        'IRON': 'https://i.imgur.com/Dmwh6j7.png', 'BRONZE': 'https://i.imgur.com/tWAs2Tp.png',
        'SILVER': 'https://i.imgur.com/JfxPozL.png', 'GOLD': 'https://i.imgur.com/nAwIMeB.png',
        'PLATINUM': 'https://i.imgur.com/WNb2i2r.png', 'EMERALD': 'https://i.imgur.com/jTU1dxa.png',
        'DIAMOND': 'https://i.imgur.com/ZOAZ2l4.png', 'MASTER': 'https://i.imgur.com/mond8dw.png',
        'GRANDMASTER': 'https://i.imgur.com/71qNNYf.png', 'CHALLENGER': 'https://i.imgur.com/iRSo81G.png',
        'UNRANKED': 'https://i.imgur.com/Fmjqyl2.png'
    };

    ctx.fillStyle = '#CDCECF';
    ctx.font = `bold ${tituloRangoFontSize}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Se aplican los 5px de margen lateral a los títulos y cajas de rangos
    ctx.fillText('Ranked Solo/Dúo', margenLateral, tituloRango1Y);
    
    const textoDivisionSoloq = formatearRango(soloq?.tier, soloq?.rank);
    await dibujarBloqueRango(ctx, margenLateral, bloque1Y, soloq ? soloq.lp : 0, soloq ? (EMBLEMAS[soloq.tier] || EMBLEMAS['UNRANKED']) : EMBLEMAS['UNRANKED'], textoDivisionSoloq);

    ctx.fillStyle = '#CDCECF';
    ctx.font = `bold ${tituloRangoFontSize}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Ranked Flexible', margenLateral, tituloRango2Y);
    
    const textoDivisionFlex = formatearRango(flex?.tier, flex?.rank);
    await dibujarBloqueRango(ctx, margenLateral, bloque2Y, flex ? flex.lp : 0, flex ? (EMBLEMAS[flex.tier] || EMBLEMAS['UNRANKED']) : EMBLEMAS['UNRANKED'], textoDivisionFlex);

    const bannerY = inicioBloquesY - 1; 
    const bannerAlto = 169; 
    
    try {
        const bannerImagen = await loadBanner();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(tituloX, bannerY, maxWidth, bannerAlto, radioEsquinas);
        ctx.clip();
        ctx.drawImage(bannerImagen, tituloX, bannerY, maxWidth, bannerAlto);
        ctx.restore();
    } catch {}

    ctx.strokeStyle = '#fcfcfc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tituloX + maxWidth - 16, bannerY);
    ctx.lineTo(tituloX + radioEsquinas, bannerY);
    ctx.arcTo(tituloX, bannerY, tituloX, bannerY + radioEsquinas, radioEsquinas);
    ctx.lineTo(tituloX, bannerY + bannerAlto - radioEsquinas);
    ctx.arcTo(tituloX, bannerY + bannerAlto, tituloX + radioEsquinas, bannerY + bannerAlto, radioEsquinas);
    ctx.lineTo(tituloX + maxWidth - 17, bannerY + bannerAlto);
    ctx.stroke();

    const anchoLibreBanner = 414; 
    const areaTextoCentroX = tituloX + (anchoLibreBanner / 2);
    
    const tamañoTituloBienvenido = tituloFontSize; 
    const tamañoSubtitulos = 20; 
    const gapTitulosBanner = 8; 
    
    const alturaTotalTextosBanner = tamañoTituloBienvenido + gapTitulosBanner + tamañoSubtitulos + gapTitulosBanner + tamañoSubtitulos;
    const inicioYBanner = (bannerY + (bannerAlto / 2)) - (alturaTotalTextosBanner / 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${tamañoTituloBienvenido}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top'; 
    ctx.fillText('¡Bienvenido!', areaTextoCentroX, inicioYBanner);

    ctx.fillStyle = '#CDCECF';
    ctx.font = obtenerFuente('Te matriculaste con éxito', tamañoSubtitulos, 'bold');
    ctx.fillText('Te matriculaste con éxito', areaTextoCentroX, inicioYBanner + tamañoTituloBienvenido + gapTitulosBanner);
    
    ctx.font = obtenerFuente(`Eres el usuario #${numeroUsuario || 1}`, tamañoSubtitulos, 'bold');
    ctx.fillText(`Eres el usuario #${numeroUsuario || 1}`, areaTextoCentroX, inicioYBanner + tamañoTituloBienvenido + gapTitulosBanner + tamañoSubtitulos + gapTitulosBanner);

    return canvas.toBuffer('image/png');
}

module.exports = { generarTarjetaMatricula };