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

async function loadAvatarFijo() {
    if (avatarFijoCache) return avatarFijoCache;
    avatarFijoCache = await loadImage('https://i.imgur.com/gXeTtUr.png');
    return avatarFijoCache;
}

async function loadBanner() {
    if (bannerCache) return bannerCache;
    bannerCache = await loadImage('https://i.imgur.com/1LzQDJq.png');
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

async function dibujarBloqueRango(ctx, x, y, numeroLPs, rangoUrl, anchoFijo = null) {
    const cuadradoPequenoSize = 50;
    const radio = 5;
    const numeroFontSize = 30;
    const lpsFontSize = numeroFontSize - 15;
    const separacionTexto = 3;

    ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, cuadradoPequenoSize, cuadradoPequenoSize, [radio, 0, 0, radio]);
    ctx.fill();

    try {
        const imagenRango = await loadEmblema(rangoUrl);
        ctx.drawImage(imagenRango, x + 1, y, cuadradoPequenoSize, cuadradoPequenoSize);
    } catch {}

    let numeroTexto = numeroLPs >= 1000 ? `${(numeroLPs / 1000).toFixed(1).replace('.0', '')}k` : numeroLPs.toString();

    let rectTextoWidth;
    if (anchoFijo) {
        rectTextoWidth = anchoFijo - cuadradoPequenoSize;
    } else {
        ctx.font = `${numeroFontSize}px "Plus Jakarta Sans"`;
        const nW = ctx.measureText(numeroTexto).width;
        ctx.font = `${lpsFontSize}px "Plus Jakarta Sans"`;
        const lW = ctx.measureText('LPS').width;
        rectTextoWidth = nW + separacionTexto + lW + 20;
    }

    const rectTextoHeight = 50;
    const rectTextoX = x + cuadradoPequenoSize;
    const rectTextoY = y;

    ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
    ctx.beginPath();
    ctx.roundRect(rectTextoX, rectTextoY, rectTextoWidth, rectTextoHeight, [0, radio, radio, 0]);
    ctx.fill();

    const textoInicio = 46;
    const anchoAreaTexto = (cuadradoPequenoSize + rectTextoWidth) - textoInicio;

    ctx.font = `${numeroFontSize}px "Plus Jakarta Sans"`;
    const numeroWidth = ctx.measureText(numeroTexto).width;
    ctx.font = `${lpsFontSize}px "Plus Jakarta Sans"`;
    const lpsWidth = ctx.measureText('LPS').width;
    const textoInicioX = x + textoInicio + (anchoAreaTexto - (numeroWidth + separacionTexto + lpsWidth)) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = `${numeroFontSize}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(numeroTexto, textoInicioX, rectTextoY + rectTextoHeight / 2);

    ctx.fillStyle = '#CDCECF';
    ctx.font = `${lpsFontSize}px "Plus Jakarta Sans"`;
    ctx.fillText('LPS', textoInicioX + numeroWidth + separacionTexto, rectTextoY + rectTextoHeight / 2);

    return cuadradoPequenoSize + rectTextoWidth;
}

async function generarTarjetaMatricula(datos) {
    const { gameName, tagLine, nivel, iconoId, soloq, flex, descripcion, numeroUsuario } = datos;

    const radioEsquinas = 10;
    const margenLateral = 20;
    const cuadradoSize = 150;
    const tituloX = cuadradoSize + margenLateral;
    const tituloFontSize = 48;
    const tagFontSize = tituloFontSize - 25;
    const descripcionFontSize = tagFontSize + 5;
    const maxWidth = 800 - tituloX - 10;
    const lineHeight = descripcionFontSize + 8;

    const rectBadgeAlto = 20 + 10;
    const inicioBloquesY = cuadradoSize - (rectBadgeAlto / 2) + rectBadgeAlto + 22;

    const cuadradoPequenoSize = 50;
    const margenTituloBloque = 5;

    // Aquí independizamos el tamaño del texto para que no se vea raro
    const tituloRangoFontSize = 25; 

    const tituloRango1Y = inicioBloquesY;
    const bloque1Y = tituloRango1Y + tituloRangoFontSize + margenTituloBloque;
    const tituloRango2Y = bloque1Y + cuadradoPequenoSize + 15;
    const bloque2Y = tituloRango2Y + tituloRangoFontSize + margenTituloBloque;
    const finBloque2 = bloque2Y + cuadradoPequenoSize;

    const canvas = createCanvas(800, finBloque2);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e2328';
    ctx.beginPath();
    ctx.roundRect(0, 0, cuadradoSize, cuadradoSize, radioEsquinas);
    ctx.fill();

    try {
        const imagen = await loadAvatarFijo();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, cuadradoSize, cuadradoSize, radioEsquinas);
        ctx.clip();
        ctx.drawImage(imagen, 0, 0, cuadradoSize, cuadradoSize);
        ctx.restore();
    } catch {}

    ctx.strokeStyle = '#CDCECF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, cuadradoSize - 2, cuadradoSize - 2, radioEsquinas);
    ctx.stroke();

    const nivelTexto = nivel.toString();
    ctx.font = obtenerFuente(nivelTexto, 20, 'bold');
    const rectBadgeAncho = ctx.measureText(nivelTexto).width + 10;
    const rectBadgeX = (cuadradoSize - rectBadgeAncho) / 2;
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

    const centroAvatarX = cuadradoSize / 2;

    // 1. Título "Solo/Dúo"
    ctx.fillStyle = '#CDCECF';
    ctx.font = `bold ${tituloRangoFontSize}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Solo/Dúo', centroAvatarX, tituloRango1Y);
    
    await dibujarBloqueRango(ctx, 0, bloque1Y, soloq ? soloq.lp : 0, soloq ? (EMBLEMAS[soloq.tier] || EMBLEMAS['UNRANKED']) : EMBLEMAS['UNRANKED'], cuadradoSize);

    // 2. Título "Flexible"
    ctx.fillStyle = '#CDCECF';
    ctx.font = `bold ${tituloRangoFontSize}px "Plus Jakarta Sans"`; // ¡Aquí reseteamos el tamaño!
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Flexible', centroAvatarX, tituloRango2Y);
    
    await dibujarBloqueRango(ctx, 0, bloque2Y, flex ? flex.lp : 0, flex ? (EMBLEMAS[flex.tier] || EMBLEMAS['UNRANKED']) : EMBLEMAS['UNRANKED'], cuadradoSize);

    const bannerAlto = (bloque2Y + cuadradoPequenoSize) - tituloRango1Y;
    ctx.fillStyle = '#1e2328';
    ctx.beginPath();
    ctx.roundRect(tituloX, tituloRango1Y, maxWidth, bannerAlto, radioEsquinas);
    ctx.fill();

    try {
        const bannerImagen = await loadBanner();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(tituloX, tituloRango1Y, maxWidth, bannerAlto, radioEsquinas);
        ctx.clip();
        ctx.drawImage(bannerImagen, tituloX, tituloRango1Y, maxWidth, bannerAlto);
        ctx.restore();
    } catch {}

    ctx.strokeStyle = '#CDCECF';
    ctx.beginPath();
    ctx.roundRect(tituloX + 1, tituloRango1Y + 1, maxWidth - 2, bannerAlto - 2, radioEsquinas);
    ctx.stroke();

    const areaTextoCentroX = tituloX + 1 + (436 / 2);
    const inicioYBanner = (tituloRango1Y + (bannerAlto / 2)) - ((tituloFontSize + 10 + descripcionFontSize + 5 + descripcionFontSize) / 2);

    // 3. Texto del Banner (centrado en su lugar correcto)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${tituloFontSize}px "Plus Jakarta Sans"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top'; // ¡El reset mágico para que no se baje el texto!
    
    ctx.fillText('¡Bienvenido!', areaTextoCentroX, inicioYBanner);

    ctx.fillStyle = '#CDCECF';
    ctx.font = obtenerFuente('Te matriculaste con éxito', descripcionFontSize, 'bold');
    ctx.fillText('Te matriculaste con éxito', areaTextoCentroX, inicioYBanner + tituloFontSize + 10);
    ctx.font = obtenerFuente(`Eres el usuario #${numeroUsuario || 1}`, descripcionFontSize, 'bold');
    ctx.fillText(`Eres el usuario #${numeroUsuario || 1}`, areaTextoCentroX, inicioYBanner + tituloFontSize + 10 + descripcionFontSize + 5);

    return canvas.toBuffer('image/png');
}

module.exports = { generarTarjetaMatricula };