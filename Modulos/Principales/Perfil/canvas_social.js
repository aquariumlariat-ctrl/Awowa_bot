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
const COLOR_AURORA = "#ff6d43"; 

const px = (n) => Math.round(n);

function fillTextPro(ctx, text, x, y) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeText(text, px(x), px(y));
    ctx.fillText(text, px(x), px(y));
}

function ajustarColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, c => ('0' + Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).substr(-2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────
const RANGOS_DATA_SOCIAL = [
    { lvl: 100, titulo: "Entidad Entre Mundos",    color: COLOR_AURORA },
    { lvl: 95,  titulo: "Voz del Gran Carnero",    color: COLOR_AURORA },
    { lvl: 90,  titulo: "Leyenda Vastaya",          color: COLOR_AURORA },
    { lvl: 85,  titulo: "Maestro de los Dos Reinos",color: COLOR_AURORA },
    { lvl: 80,  titulo: "Caminante del Hogar",      color: COLOR_AURORA },
    { lvl: 75,  titulo: "Guía de lo Invisible",     color: COLOR_AURORA },
    { lvl: 70,  titulo: "Sabio de la Escarcha",     color: COLOR_AURORA },
    { lvl: 65,  titulo: "Purificador de Almas",     color: COLOR_AURORA },
    { lvl: 60,  titulo: "Heraldo de la Forja",      color: COLOR_AURORA },
    { lvl: 55,  titulo: "Protector del Rebaño",     color: COLOR_AURORA },
    { lvl: 50,  titulo: "Guardián de los Recuerdos",color: COLOR_AURORA },
    { lvl: 45,  titulo: "Saltador de Reinos",       color: COLOR_AURORA },
    { lvl: 40,  titulo: "Tejedor de Vínculos",      color: COLOR_AURORA },
    { lvl: 35,  titulo: "Viajero de la Nieve",      color: COLOR_AURORA },
    { lvl: 30,  titulo: "Amigo de los Extraviados", color: COLOR_AURORA },
    { lvl: 25,  titulo: "Investigador de Runas",    color: COLOR_AURORA },
    { lvl: 20,  titulo: "Vidente del Velo",         color: COLOR_AURORA },
    { lvl: 15,  titulo: "Estudiante Bryni",         color: COLOR_AURORA },
    { lvl: 10,  titulo: "Caminante de la Tundra",   color: COLOR_AURORA },
    { lvl: 5,   titulo: "Oyente de los Susurros",   color: COLOR_AURORA },
    { lvl: 0,   titulo: "Forastero de Aamu",        color: COLOR_AURORA }
];

function obtenerRangoSocial(nivel) {
    for (const r of RANGOS_DATA_SOCIAL) {
        if (nivel >= r.lvl) return { titulo: r.titulo, colorActual: r.color };
    }
    const last = RANGOS_DATA_SOCIAL[RANGOS_DATA_SOCIAL.length - 1];
    return { titulo: last.titulo, colorActual: last.color };
}

function calcularXPMetaSocial(nivel) {
    const n = nivel < 1 ? 1 : nivel;
    return Math.floor(100 * Math.pow(n, 1.5));
}

const PENDIENTE = '—';

// ─────────────────────────────────────────────────────────────────────────────
// datos = objeto construido en perfil.js con los campos reales del usuario.
// ─────────────────────────────────────────────────────────────────────────────
async function generarBocetoSocial(datos = {}) {
    // 👇 --- SE RESTAURAN LOS DATOS DINÁMICOS REALES --- 👇
    const nivel    = datos.nivel    ?? 1;
    const xpActual = datos.xpActual ?? 0;
    const xpMeta   = datos.xpMeta   ?? calcularXPMetaSocial(nivel);
    const mensajes = datos.mensajes ?? 0;
    const horasVoz = datos.horasVoz ?? 0;
    const ranking  = datos.ranking  ?? 1;

    const { titulo: rangoSocial, colorActual } = obtenerRangoSocial(nivel);

    const racha      = datos.racha      ?? null;
    const monedas    = datos.monedas    ?? null;
    const reputacion = datos.reputacion ?? null;
    const club       = datos.club       ?? null;
    const soulmate   = datos.soulmate   ?? null;
    const amigos     = datos.amigos     ?? [];
    const insignias  = datos.insignias  ?? [];
    // 👆 --- FIN RESTAURACIÓN --- 👆
    
    const baseWidth = 800;
    const baseHeight = 327; 
    
    const scale = 2;
    const canvas = createCanvas(baseWidth * scale, baseHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textRendering = 'optimizeLegibility';

    const margenLateral = 5, inicioX = margenLateral; 
    const radioCajas = 8;
    
    const subtituloFontSize = 17; 
    const fontBold = `bold ${subtituloFontSize}px "Plus Jakarta Sans"`;
    const fontPequena = 'bold 14px "Plus Jakarta Sans"';

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const inicioCajasY = 5;

    // ==========================================
    // 🎨 DISTRIBUCIÓN DE COLUMNAS
    // ==========================================
    const gap = 10;
    const col1X = inicioX;
    const col1W = 310; 
    
    const col2X = col1X + col1W + gap;
    const col2W = 230; 
    
    const col3X = col2X + col2W + gap;
    const col3W = 230; 

    // ==========================================
    // 🎨 COLUMNA IZQUIERDA (Nivel, Actividad, Roles)
    // ==========================================
    
    // 1. CAJA DE NIVEL Y XP
    const box1H = 120; 
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath();
    ctx.roundRect(col1X, inicioCajasY, col1W, box1H, radioCajas);
    ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE;
    ctx.font = fontBold;
    ctx.fillText('Nivel en la Academia', px(col1X + 15), px(inicioCajasY + 12));

    const centerY = inicioCajasY + 62; 

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 46px "Plus Jakarta Sans"`; 
    fillTextPro(ctx, `${nivel}`, col1X + 15, centerY);

    const widthNum = ctx.measureText(`${nivel}`).width;
    const textX = col1X + 15 + widthNum + 15; 
    const maxTextWidth = col1W - (textX - col1X) - 15; 

    ctx.textAlign = 'left';
    ctx.fillStyle = COLOR_TEXTO_BASE; 
    const jointOffset = 11; 

    let fontClasif = subtituloFontSize;
    const txtClasif = `Puesto #${ranking} en el servidor`;
    ctx.font = `bold ${fontClasif}px "Plus Jakarta Sans"`;
    while(ctx.measureText(txtClasif).width > maxTextWidth && fontClasif > 11) {
        fontClasif--;
        ctx.font = `bold ${fontClasif}px "Plus Jakarta Sans"`;
    }
    ctx.fillText(txtClasif, px(textX), px(centerY - jointOffset));

    let fontRango = subtituloFontSize;
    ctx.font = `bold ${fontRango}px "Plus Jakarta Sans"`;
    while(ctx.measureText(rangoSocial).width > maxTextWidth && fontRango > 11) {
        fontRango--;
        ctx.font = `bold ${fontRango}px "Plus Jakarta Sans"`;
    }
    ctx.fillText(rangoSocial, px(textX), px(centerY + jointOffset));

    ctx.textBaseline = 'top';

    // 👇 BARRA DE PROGRESO 
    const barraX = col1X + 15;
    const barraW = col1W - 30;
    const barraH = 12; 
    const barraY = inicioCajasY + box1H - 24;
    const progreso = Math.min(Math.max(xpActual / xpMeta, 0), 1) || 0; // Se asegura de que no de NaN
    
    const numBloques = 12, gapBloques = 4, rBloque = 2;
    const bloqueW = (barraW - (gapBloques * (numBloques - 1))) / numBloques;

    ctx.beginPath();
    for (let i = 0; i < numBloques; i++) {
        ctx.roundRect(px(barraX + i * (bloqueW + gapBloques)), px(barraY), px(bloqueW), barraH, rBloque);
    }
    ctx.fillStyle = 'rgba(12, 15, 20, 0.6)';
    ctx.fill();

    if (progreso > 0) {
        ctx.save();
        const extraDerecha = progreso >= 0.99 ? 20 : 0;
        
        ctx.beginPath();
        ctx.rect(px(barraX - 5), px(barraY - 5), (barraW * progreso) + 5 + extraDerecha, barraH + 10);
        ctx.clip();

        ctx.beginPath();
        for (let i = 0; i < numBloques; i++) {
            ctx.roundRect(px(barraX + i * (bloqueW + gapBloques)), px(barraY), px(bloqueW), barraH, rBloque);
        }

        const colorBarraIzq = ajustarColor(colorActual, 50);
        const colorBarraDer = ajustarColor(colorActual, -30);
        
        const grad = ctx.createLinearGradient(px(barraX), 0, px(barraX + barraW), 0);
        grad.addColorStop(0, colorBarraIzq);
        grad.addColorStop(1, colorBarraDer); 

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }

    // 2. CAJA DE ACTIVIDAD
    const actY = inicioCajasY + box1H + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col1X, actY, col1W, 100, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE;
    ctx.font = fontBold;
    ctx.fillText('Billetera y Stats', px(col1X + 15), px(actY + 12));

    ctx.fillStyle = '#ffffff'; ctx.font = fontPequena;
    ctx.fillText(`🪙 ${monedas !== null ? monedas + ' Coins' : PENDIENTE}`,     px(col1X + 15),  px(actY + 40));
    ctx.fillText(`🔥 Racha: ${racha !== null ? racha + ' Días' : PENDIENTE}`,   px(col1X + 160), px(actY + 40));
    ctx.fillText(`💬 ${mensajes} Msjs`,                                          px(col1X + 15),  px(actY + 65));
    ctx.fillText(`🎙️ ${horasVoz}h Voz`,                                         px(col1X + 160), px(actY + 65));

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

    // 4. SOULMATE
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col2X, inicioCajasY, col2W, 130, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE;
    ctx.font = fontBold; 
    ctx.textAlign = 'center';
    ctx.fillText('Vínculo del Alma', px(col2X + col2W/2), px(inicioCajasY + 15));

    ctx.fillStyle = 'rgba(255, 179, 186, 0.2)';
    ctx.beginPath(); ctx.arc(px(col2X + col2W/2), px(inicioCajasY + 70), 30, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = soulmate ? '#ffffff' : COLOR_TEXTO_BASE;
    ctx.font = fontPequena;
    ctx.fillText(
        soulmate ? `Unido a ${soulmate.nombre}` : 'Próximamente',
        px(col2X + col2W/2), px(inicioCajasY + 110)
    );

    // 5. CÍRCULO ÍNTIMO
    const amigosY = inicioCajasY + 130 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col2X, amigosY, col2W, 140, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold;
    ctx.textAlign = 'left';
    ctx.fillText('Círculo Íntimo', px(col2X + 15), px(amigosY + 12));

    if (amigos.length > 0) {
        for(let i = 0; i < Math.min(amigos.length, 3); i++) {
            const yPos = amigosY + 40 + (i*32);
            ctx.fillStyle = 'rgba(158, 224, 244, 0.2)';
            ctx.beginPath(); ctx.arc(px(col2X + 30), px(yPos + 10), 12, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = '#ffffff'; ctx.font = fontPequena;
            ctx.textAlign = 'left';
            ctx.fillText(amigos[i].nombre, px(col2X + 50), px(yPos + 4));
            
            if (amigos[i].interacciones !== undefined) {
                ctx.fillStyle = COLOR_TEXTO_BASE;
                ctx.textAlign = 'right';
                ctx.fillText(`${amigos[i].interacciones}`, px(col2X + col2W - 15), px(yPos + 4));
            }
        }
        ctx.textAlign = 'left';
    } else {
        ctx.fillStyle = COLOR_TEXTO_BASE;
        ctx.font = fontPequena;
        ctx.textAlign = 'center';
        ctx.fillText('Próximamente', px(col2X + col2W / 2), px(amigosY + 75));
        ctx.textAlign = 'left';
    }

    // ==========================================
    // 🎨 COLUMNA DERECHA
    // ==========================================

    // 6. CLUB
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col3X, inicioCajasY, col3W, 100, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold;
    ctx.fillText('Club Competitivo', px(col3X + 15), px(inicioCajasY + 15));

    ctx.fillStyle = 'rgba(196, 238, 176, 0.2)';
    ctx.beginPath(); ctx.roundRect(col3X + 15, inicioCajasY + 40, 45, 45, 8); ctx.fill();

    if (club) {
        ctx.fillStyle = '#ffffff'; ctx.font = `bold 18px "Plus Jakarta Sans"`;
        ctx.fillText(`[${club.tag}]`, px(col3X + 70), px(inicioCajasY + 40));
        ctx.font = fontPequena; ctx.fillText(`${club.nombre}`, px(col3X + 70), px(inicioCajasY + 60));
        ctx.fillStyle = COLOR_TEXTO_BASE; 
        ctx.fillText(`Rango: ${club.rol}`, px(col3X + 70), px(inicioCajasY + 75));
    } else {
        ctx.fillStyle = COLOR_TEXTO_BASE; ctx.font = fontPequena;
        ctx.fillText('Sin club', px(col3X + 70), px(inicioCajasY + 55));
    }

    // 7. REPUTACIÓN
    const repY = inicioCajasY + 100 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col3X, repY, col3W, 70, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold;
    ctx.fillText('Reputación', px(col3X + 15), px(repY + 10));

    ctx.fillStyle = '#ffffff'; ctx.font = `bold 24px "Plus Jakarta Sans"`;
    fillTextPro(
        ctx,
        reputacion !== null ? `🌟 ${reputacion} Elogios` : `🌟 ${PENDIENTE}`,
        col3X + 15, repY + 35
    );

    // 8. INSIGNIAS
    const insY = repY + 70 + gap;
    ctx.fillStyle = COLOR_BG_CAJA;
    ctx.beginPath(); ctx.roundRect(col3X, insY, col3W, 100, radioCajas); ctx.fill();

    ctx.fillStyle = COLOR_TEXTO_BASE; 
    ctx.font = fontBold;
    ctx.fillText('Vitrina de Logros', px(col3X + 15), px(insY + 10));

    const sizeIns = 36;
    for(let i = 0; i < 8; i++) {
        const fila = Math.floor(i / 4);
        const col  = i % 4;
        const xPos = col3X + 15 + (col * (sizeIns + 12));
        const yPos = insY + 35 + (fila * (sizeIns + 8));

        ctx.fillStyle = 'rgba(12, 15, 20, 0.6)';
        ctx.beginPath(); ctx.roundRect(xPos, yPos, sizeIns, sizeIns, 6); ctx.fill();

        if (insignias[i]) {
            ctx.fillStyle = '#fce28b';
            ctx.beginPath(); ctx.arc(xPos + sizeIns/2, yPos + sizeIns/2, 10, 0, Math.PI*2); ctx.fill();
        }
    }

    return canvas.toBuffer('image/png');
}

module.exports = { generarBocetoSocial };