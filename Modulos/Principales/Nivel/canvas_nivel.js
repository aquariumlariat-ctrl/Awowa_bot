// Modulos/Principales/Nivel/canvas_nivel.js
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require('path');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

try {
    GlobalFonts.registerFromPath(path.join(__dirname, '../../../Fonts/PlusJakartaSans-Bold.ttf'), 'JakartaBold');
    GlobalFonts.registerFromPath(path.join(__dirname, '../../../Fonts/PlusJakartaSans-Regular.ttf'), 'JakartaRegular');
} catch (e) {
    console.error(`${c.r}·${c.b} [Canvas Nivel] Error registrando fuentes.`, e.message);
}

// 🧠 Caché para imágenes estáticas
let avatarFijoCache = null;
let top3IconCache = null;

async function loadAvatarFijo() {
    if (avatarFijoCache) return avatarFijoCache;
    avatarFijoCache = await loadImage('https://i.imgur.com/48MynuQ.png');
    return avatarFijoCache;
}

async function loadTop3Icon() {
    if (top3IconCache) return top3IconCache;
    top3IconCache = await loadImage('https://i.imgur.com/D7dTn6l.png');
    return top3IconCache;
}

// 🛠️ Función mágica para oscurecer/aclarar colores HEX
function ajustarColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, c => ('0' + Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).substr(-2));
}

// 🎨 COLOR PRINCIPAL DE AURORA
const COLOR_AURORA = "#ff6d43";

// 📖 RANGOS DE AURORA — Unificados bajo el color de la marca
const RANGOS_DATA = [
    { lvl: 100, titulo: "Entidad Entre Mundos", color: COLOR_AURORA }, 
    { lvl: 95, titulo: "Voz del Gran Carnero", color: COLOR_AURORA },  
    { lvl: 90, titulo: "Leyenda Vastaya", color: COLOR_AURORA },       
    { lvl: 85, titulo: "Maestro de los Dos Reinos", color: COLOR_AURORA }, 
    { lvl: 80, titulo: "Caminante del Hogar", color: COLOR_AURORA },   
    { lvl: 75, titulo: "Guía de lo Invisible", color: COLOR_AURORA },  
    { lvl: 70, titulo: "Sabio de la Escarcha", color: COLOR_AURORA },  
    { lvl: 65, titulo: "Purificador de Almas", color: COLOR_AURORA },  
    { lvl: 60, titulo: "Heraldo de la Forja", color: COLOR_AURORA },   
    { lvl: 55, titulo: "Protector del Rebaño", color: COLOR_AURORA },  
    { lvl: 50, titulo: "Guardián de los Recuerdos", color: COLOR_AURORA }, 
    { lvl: 45, titulo: "Saltador de Reinos", color: COLOR_AURORA },    
    { lvl: 40, titulo: "Tejedor de Vínculos", color: COLOR_AURORA },   
    { lvl: 35, titulo: "Viajero de la Nieve", color: COLOR_AURORA },   
    { lvl: 30, titulo: "Amigo de los Extraviados", color: COLOR_AURORA }, 
    { lvl: 25, titulo: "Investigador de Runas", color: COLOR_AURORA }, 
    { lvl: 20, titulo: "Vidente del Velo", color: COLOR_AURORA },      
    { lvl: 15, titulo: "Estudiante Bryni", color: COLOR_AURORA },      
    { lvl: 10, titulo: "Caminante de la Tundra", color: COLOR_AURORA },
    { lvl: 5, titulo: "Oyente de los Susurros", color: COLOR_AURORA }, 
    { lvl: 0, titulo: "Forastero de Aamu", color: COLOR_AURORA }       
];

function obtenerDatosRango(nivel) {
    let rangoActual = RANGOS_DATA[RANGOS_DATA.length - 1]; 
    
    for (let i = 0; i < RANGOS_DATA.length; i++) {
        if (nivel >= RANGOS_DATA[i].lvl) {
            rangoActual = RANGOS_DATA[i];
            break;
        }
    }
    
    return { 
        titulo: rangoActual.titulo, 
        colorActual: rangoActual.color 
    };
}

const px = (n) => Math.round(n);

async function generarCanvasNivel(socialData, discordNick, avatarBuffer) {
    // 💡 AJUSTE DE MEDIDAS: Lienzo de 750x225 para tener márgenes perfectos
    const baseW = 750, baseH = 225, scale = 2; 
    const canvas = createCanvas(baseW * scale, baseH * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textRendering = 'optimizeLegibility';

    // 🎨 DATOS
    const nivel = socialData?.Nivel || 1;
    const xpActual = socialData?.XP || 2350; 
    const rankPos = socialData?.Posicion || 1; 
    
    const nombreUsuario = discordNick || "Desarrollador";
    
    const { titulo, colorActual } = obtenerDatosRango(nivel);
    
    const xpMeta = Math.floor(100 * Math.pow(nivel, 1.5));
    const progreso = Math.min(Math.max(xpActual / xpMeta, 0), 1); 

    // ==========================================
    // 🎨 CAJA DE CRISTAL DE FONDO
    // ==========================================
    ctx.fillStyle = 'rgba(23, 27, 35, 0.5)';
    ctx.beginPath();
    // 💡 Caja fija: empieza a 5px del lienzo, mide 740x215
    ctx.roundRect(5, 5, 740, 215, 8);
    ctx.fill();

    // ==========================================
    // 🎨 AVATAR (Borde Perfecto Anti-Sangrado)
    // ==========================================
    const avSize = 130;
    // 💡 Avatar ubicado a exactamente 30px del borde interior de la caja (X=5+30, Y=5+30)
    const avX = 35; 
    const avY = 35; 
    const rAv = 12; 
    const avatarFondoY = avY + avSize; 

    try {
        const avatarFijo = await loadAvatarFijo(); 
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(px(avX), px(avY), avSize, avSize, rAv);
        ctx.clip(); 
        ctx.drawImage(avatarFijo, px(avX), px(avY), avSize, avSize);
        ctx.restore(); 

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(px(avX), px(avY), avSize, avSize, rAv);
        ctx.clip(); 

        ctx.strokeStyle = '#ffffff'; 
        ctx.lineWidth = 4; 
        ctx.stroke();
        ctx.restore();

    } catch (error) {
        ctx.fillStyle = '#000000';
        ctx.beginPath(); 
        ctx.roundRect(px(avX), px(avY), avSize, avSize, rAv); 
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff'; 
        ctx.lineWidth = 2; 
        ctx.beginPath();
        ctx.roundRect(px(avX + 1), px(avY + 1), avSize - 2, avSize - 2, rAv);
        ctx.stroke();
    }

    // ==========================================
    // 🎨 TEXTO: NOMBRE (Alineación Adaptativa)
    // ==========================================
    const textYInferior = avatarFondoY + 5; 

    ctx.fillStyle = '#CDCECF';
    ctx.font = 'bold 20px "JakartaBold"'; 
    ctx.textBaseline = 'top';
    
    const nickW = ctx.measureText(nombreUsuario).width;

    if (nickW <= avSize) {
        ctx.textAlign = 'center';
        ctx.fillText(nombreUsuario, px(avX + (avSize / 2)), px(textYInferior));
    } else {
        ctx.textAlign = 'left';
        ctx.fillText(nombreUsuario, px(avX), px(textYInferior), px(400)); 
    }

    // ==========================================
    // 🎨 PANEL DE TEXTOS SUPERIOR DERECHO
    // ==========================================
    const textX = avX + avSize + 30; // X = 195
    
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const textTopY = avY + 8; // Eje Y Primera línea

    // 1. NIVEL 
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "JakartaBold"'; 
    const textoNivel = `Nivel ${nivel}`;
    
    ctx.fillText(textoNivel, px(textX), px(textTopY)); 
    
    const nivelW = ctx.measureText(textoNivel).width;

    // 2. SEPARADOR SUTIL 
    const divX = textX + nivelW + 20;
    ctx.beginPath();
    ctx.moveTo(px(divX), px(textTopY + 10)); 
    ctx.lineTo(px(divX), px(textTopY + 24)); 
    ctx.strokeStyle = 'rgba(205, 206, 207, 0.5)'; 
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. RANGO 
    ctx.fillStyle = '#ffffff'; 
    ctx.font = 'bold 34px "JakartaBold"'; 
    ctx.textAlign = 'left';
    const textoRango = `Rango #${rankPos}`;
    ctx.fillText(textoRango, px(divX + 20), px(textTopY));
    
    const rangoW = ctx.measureText(textoRango).width;

    // 🏆 ICONO TOP 3
    if (rankPos <= 3) {
        const iconSize = 34; 
        const iconX = divX + 20 + rangoW + 15; 
        const iconY = textTopY; 

        try {
            const top3Icon = await loadTop3Icon();
            ctx.drawImage(top3Icon, px(iconX), px(iconY), iconSize, iconSize);
        } catch (error) {}
    }

    // 4. TÍTULO DE CLASE (COLOR PLANO)
    const tituloY = textTopY + 42; 
    
    ctx.textAlign = 'left';
    ctx.font = 'bold 34px "JakartaBold"'; 
    ctx.fillStyle = colorActual; 
    ctx.fillText(titulo, px(textX), px(tituloY)); 

    // ==========================================
    // 🎨 BARRA DE PROGRESO INFERIOR (Derecha)
    // ==========================================
    const barraX = textX; 
    // 💡 La barra mide 520px para terminar exactamente a 30px del borde derecho
    const barraW = 520; 
    const barraH = 22;
    
    const barraY = tituloY + 52; 

    // 5. TEXTO DE EXP 
    ctx.fillStyle = '#CDCECF';
    ctx.font = 'bold 20px "JakartaBold"'; 
    ctx.textAlign = 'right'; 
    ctx.textBaseline = 'top'; 
    ctx.fillText(`${xpActual} / ${xpMeta} XP`, px(barraX + barraW), px(textYInferior));

    // ==========================================
    // 🎨 DIBUJAR LA BARRA DE PROGRESO
    // ==========================================
    
    const colorBarraIzq = colorActual;
    const colorBarraDer = ajustarColor(colorActual, 70); 

    const numBloques = 16, gap = 6, rBloque = 3; 
    const bloqueW = (barraW - (gap * (numBloques - 1))) / numBloques;

    ctx.beginPath();
    for(let i = 0; i < numBloques; i++) {
        ctx.roundRect(px(barraX + i * (bloqueW + gap)), px(barraY), px(bloqueW), barraH, rBloque);
    }
    ctx.fillStyle = 'rgba(12, 15, 20, 0.8)';
    ctx.fill();

    if (progreso > 0) {
        ctx.save();
        
        const extraDerecha = progreso >= 0.99 ? 20 : 0;
        
        ctx.beginPath(); 
        ctx.rect(px(barraX - 20), px(barraY - 20), (barraW * progreso) + 20 + extraDerecha, barraH + 40); 
        ctx.clip(); 

        ctx.beginPath();
        for(let i = 0; i < numBloques; i++) {
            ctx.roundRect(px(barraX + i * (bloqueW + gap)), px(barraY), px(bloqueW), barraH, rBloque);
        }
        
        const grad = ctx.createLinearGradient(px(barraX), 0, px(barraX + barraW), 0);
        grad.addColorStop(0, colorBarraIzq); 
        grad.addColorStop(1, colorBarraDer); 

        // 🚀 TÉCNICA DE GLOW
        ctx.save();
        ctx.filter = 'blur(5px)';
        ctx.globalAlpha = 0.7; 
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // 2. Dibujamos la barra nítida encima
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore(); 
    }

    return canvas.toBuffer('image/png');
}

module.exports = { generarCanvasNivel };