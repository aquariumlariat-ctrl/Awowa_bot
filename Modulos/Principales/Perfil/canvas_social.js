// Modulos/Principales/Perfil/canvas_social.js
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

try {
    const plusJakarta = path.join(__dirname, '../../../Fonts/PlusJakartaSans-Regular.ttf');
    GlobalFonts.registerFromPath(plusJakarta, 'Plus Jakarta Sans');
} catch (e) {}

const COLOR_BG_CAJA = 'rgba(23, 27, 35, 0.5)'; 
const COLOR_TEXTO_BASE = '#CDCECF'; 
const COLOR_ACCENTO = '#a3b8ff'; 

const px = (n) => Math.round(n);

function fillTextPro(ctx, text, x, y) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeText(text, px(x), px(y));
    ctx.fillText(text, px(x), px(y));
}

const fakeData = {
    nivel: 42,
    rangoSocial: "Guardián de la Academia",
    xpActual: 8450,
    xpMeta: 10000,
    racha: 28,
    monedas: 12500,
    mensajes: 15420,
    horasVoz: 450,
    reputacion: 342,
    club: { nombre: 'Skye Esports', tag: 'SKYE', rol: 'Capitán' },
    soulmate: { nombre: 'Toukabloom', fecha: '12/05/2025' },
    amigos: [
        { nombre: 'Faker' },
        { nombre: 'Deft' },
        { nombre: 'Keria' }
    ],
    insignias: [true, true, true, true, false, false, false, false]
};

async function generarBocetoSocial() {
    const baseWidth = 800;
    // 👇 ALTURA RECORTADA (-50px)
    const baseHeight = 300; 
    
    const scale = 2;
    const canvas = createCanvas(baseWidth * scale, baseHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textRendering = 'optimizeLegibility';

    const margenLateral = 5, inicioX = margenLateral; 
    const radioCajas = 8;
    const fontBoldL = `bold 18px "Plus Jakarta Sans"`;
    const fontBold = `bold 16px "Plus Jakarta Sans"`;
    const fontPequena = 'bold 13px "Plus Jakarta Sans"';

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // 👇 Inicia pegado arriba sin los títulos
    const inicioCajasY = 5;

    // ==========================================
    // 🎨 COLUMNA IZQUIERDA (Nivel, Actividad, Roles)
    // ==========================================
    const col1X = inicioX;
    const col1W = 260; 
    const gap = 10;

    // 1. CAJA DE NIVEL Y XP
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath();
    ctx.roundRect(col1X, inicioCajasY, col1W, 110, radioCajas);
    ctx.fill();

    ctx.fillStyle = COLOR_ACCENTO;
    ctx.font = fontBold;
    ctx.fillText('Nivel de Academia', px(col1X + 15), px(inicioCajasY + 15));

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 32px "Plus Jakarta Sans"`;
    fillTextPro(ctx, `${fakeData.nivel}`, col1X + 15, inicioCajasY + 40);
    
    ctx.font = fontPequena;
    ctx.fillStyle = COLOR_TEXTO_BASE;
    ctx.fillText(fakeData.rangoSocial, px(col1X + 60), px(inicioCajasY + 55));

    const barraX = col1X + 15;
    const barraY = inicioCajasY + 85;
    const barraW = col1W - 30;
    ctx.fillStyle = 'rgba(12, 15, 20, 0.6)';
    ctx.beginPath(); ctx.roundRect(px(barraX), px(barraY), barraW, 10, 5); ctx.fill();
    
    const progreso = fakeData.xpActual / fakeData.xpMeta;
    ctx.fillStyle = '#36d1dc';
    ctx.beginPath(); ctx.roundRect(px(barraX), px(barraY), barraW * progreso, 10, 5); ctx.fill();

    // 2. CAJA DE ACTIVIDAD
    const actY = inicioCajasY + 110 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col1X, actY, col1W, 100, radioCajas); ctx.fill();

    ctx.fillStyle = '#fce28b'; 
    ctx.font = fontBold;
    ctx.fillText('Billetera y Stats', px(col1X + 15), px(actY + 12));

    ctx.fillStyle = '#ffffff'; ctx.font = fontPequena;
    ctx.fillText(`🪙 ${fakeData.monedas} Coins`, px(col1X + 15), px(actY + 40));
    ctx.fillText(`🔥 Racha: ${fakeData.racha} Días`, px(col1X + 130), px(actY + 40));
    ctx.fillText(`💬 ${fakeData.mensajes} Msjs`, px(col1X + 15), px(actY + 65));
    ctx.fillText(`🎙️ ${fakeData.horasVoz}h Voz`, px(col1X + 130), px(actY + 65));

    // 3. ROLES ESPECIALES
    const rolesY = actY + 100 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col1X, rolesY, col1W, 60, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE;
    ctx.font = fontPequena;
    ctx.fillText('Roles Destacados:', px(col1X + 15), px(rolesY + 10));
    
    ctx.fillStyle = 'rgba(255, 179, 186, 0.3)';
    ctx.beginPath(); ctx.roundRect(col1X + 15, rolesY + 30, 90, 20, 4); ctx.fill();
    ctx.fillStyle = '#ffb3ba'; ctx.fillText('Nitro Booster', px(col1X + 22), px(rolesY + 33));

    // ==========================================
    // 🎨 COLUMNA CENTRAL
    // ==========================================
    const col2X = col1X + col1W + gap;

    // 4. SOULMATE
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col2X, inicioCajasY, col1W, 130, radioCajas); ctx.fill();

    ctx.fillStyle = '#ffb3ba'; 
    ctx.font = fontBoldL;
    ctx.textAlign = 'center';
    ctx.fillText('Vínculo del Alma', px(col2X + col1W/2), px(inicioCajasY + 15));

    ctx.fillStyle = 'rgba(255, 179, 186, 0.2)';
    ctx.beginPath(); ctx.arc(px(col2X + col1W/2), px(inicioCajasY + 70), 30, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#ffffff'; ctx.font = fontPequena;
    ctx.fillText(`Unido a ${fakeData.soulmate.nombre}`, px(col2X + col1W/2), px(inicioCajasY + 110));

    // 5. CÍRCULO ÍNTIMO
    const amigosY = inicioCajasY + 130 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col2X, amigosY, col1W, 140, radioCajas); ctx.fill();

    ctx.fillStyle = '#9ee0f4';
    ctx.font = fontBold;
    ctx.textAlign = 'left';
    ctx.fillText('Círculo Íntimo', px(col2X + 15), px(amigosY + 12));

    for(let i=0; i<3; i++) {
        const yPos = amigosY + 40 + (i*32);
        ctx.fillStyle = 'rgba(158, 224, 244, 0.2)';
        ctx.beginPath(); ctx.arc(px(col2X + 30), px(yPos + 10), 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = fontPequena;
        ctx.fillText(fakeData.amigos[i].nombre, px(col2X + 50), px(yPos + 4));
        ctx.fillStyle = COLOR_TEXTO_BASE;
        ctx.fillText(`Interacciones: ${150 - i*30}`, px(col2X + 140), px(yPos + 4));
    }

    // ==========================================
    // 🎨 COLUMNA DERECHA
    // ==========================================
    const col3X = col2X + col1W + gap;
    const col3W = baseWidth - margenLateral - col3X;

    // 6. CLUB
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col3X, inicioCajasY, col3W, 100, radioCajas); ctx.fill();

    ctx.fillStyle = '#c4eeb0'; 
    ctx.font = fontBold;
    ctx.fillText('Club Competitivo', px(col3X + 15), px(inicioCajasY + 15));

    ctx.fillStyle = 'rgba(196, 238, 176, 0.2)';
    ctx.beginPath(); ctx.roundRect(col3X + 15, inicioCajasY + 40, 45, 45, 8); ctx.fill();

    ctx.fillStyle = '#ffffff'; ctx.font = `bold 18px "Plus Jakarta Sans"`;
    ctx.fillText(`[${fakeData.club.tag}] ${fakeData.club.nombre}`, px(col3X + 70), px(inicioCajasY + 45));
    ctx.fillStyle = COLOR_TEXTO_BASE; ctx.font = fontPequena;
    ctx.fillText(`Rango: ${fakeData.club.rol}`, px(col3X + 70), px(inicioCajasY + 68));

    // 7. REPUTACIÓN
    const repY = inicioCajasY + 100 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col3X, repY, col3W, 70, radioCajas); ctx.fill();

    ctx.fillStyle = '#dccaf9';
    ctx.font = fontBold;
    ctx.fillText('Reputación', px(col3X + 15), px(repY + 10));

    ctx.fillStyle = '#ffffff'; ctx.font = `bold 24px "Plus Jakarta Sans"`;
    fillTextPro(ctx, `🌟 ${fakeData.reputacion} Elogios`, col3X + 15, repY + 35);

    // 8. INSIGNIAS
    const insY = repY + 70 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col3X, insY, col3W, 100, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE;
    ctx.font = fontBold;
    ctx.fillText('Vitrina de Logros', px(col3X + 15), px(insY + 10));

    const sizeIns = 36;
    for(let i=0; i<8; i++) {
        const fila = Math.floor(i / 4);
        const col = i % 4;
        const xPos = col3X + 15 + (col * (sizeIns + 12));
        const yPos = insY + 35 + (fila * (sizeIns + 8));

        ctx.fillStyle = 'rgba(12, 15, 20, 0.6)';
        ctx.beginPath(); ctx.roundRect(xPos, yPos, sizeIns, sizeIns, 6); ctx.fill();

        if(fakeData.insignias[i]) {
            ctx.fillStyle = '#fce28b';
            ctx.beginPath(); ctx.arc(xPos + sizeIns/2, yPos + sizeIns/2, 10, 0, Math.PI*2); ctx.fill();
        }
    }

    return canvas.toBuffer('image/png');
}

module.exports = { generarBocetoSocial };