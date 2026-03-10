// Modulos/Principales/Sincronizacion/actualizador_bg.js
const fs = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { extraerNuevasPartidas } = require('./extractor');
const { inyectarNuevasPartidas } = require('./procesador');
const { otorgarXPPartidas } = require('../Nivel/motor_xp');
const { renderizarYGuardarPerfil } = require('../Perfil/perfil'); 

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

const delay = ms => new Promise(res => setTimeout(res, ms));

async function ejecutarMotorSilencioso(client) {  // <-- Añade (client) aquí
    console.log(`${c.v}·${c.b} [Sincronizacion] Iniciando escaneo de partidas de League of Legends...`);
    try {
        const todosLosUsuarios = await Usuario.find().sort({ Numero_Matricula: 1 });
        let totalNuevasPartidas = 0; 

        for (const user of todosLosUsuarios) {
            const numMatricula = user.Numero_Matricula;
            const nickSeguro = user.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
            const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);

            if (!fs.existsSync(carpetaPath)) continue;
            const totalPath = path.join(carpetaPath, 'datos_lol_total.json');
            if (!fs.existsSync(totalPath)) continue;
            
            let jsonTotal = JSON.parse(fs.readFileSync(totalPath, 'utf8'));

            const conocidos = new Set(jsonTotal.Historial ? jsonTotal.Historial.map(h => h.matchId) : []);
            const nuevasPartidas = await extraerNuevasPartidas(user.PUUID, user.Region, conocidos);

            if (nuevasPartidas.total.length > 0) {
                totalNuevasPartidas += nuevasPartidas.total.length;
                console.log(`${c.v}·${c.b} [Sincronizacion] +${nuevasPartidas.total.length} partidas sincronizadas para ${user.Riot_ID} (${user.Discord_Nick}).`);
                
                // 👇 MAGIA DE XP 👇
                if (client) {
                    await otorgarXPPartidas(client, user, nuevasPartidas.total);
                }

                const tipos = [
                    { id: 'soloq', file: 'datos_lol_soloq.json' },
                    { id: 'flex', file: 'datos_lol_flex.json' },
                    { id: 'normals', file: 'datos_lol_normals.json' },
                    { id: 'total', file: 'datos_lol_total.json' }
                ];

                for (const tipo of tipos) {
                    if (nuevasPartidas[tipo.id].length > 0) {
                        const rutaArchivo = path.join(carpetaPath, tipo.file);
                        let jsonActual = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
                        jsonActual = inyectarNuevasPartidas(jsonActual, nuevasPartidas[tipo.id], user.PUUID);
                        fs.writeFileSync(rutaArchivo, JSON.stringify(jsonActual, null, 4), 'utf8');
                    }
                }
                
                // 👇 MAGIA AUTOMÁTICA: REDIBUJAMOS LA FOTO EN CACHÉ 👇
                await renderizarYGuardarPerfil(user);
                console.log(`${c.a}·${c.b} [Sincronizacion] Caché visual de ${user.Discord_Nick} actualizada en segundo plano.`);

                await delay(1000); 
            } else {
                await delay(200); 
            }
        }

        if (totalNuevasPartidas === 0) {
            console.log(`${c.a}·${c.b} [Sincronizacion] Escaneo finalizado sin novedades (0 partidas nuevas).`);
        } else {
            console.log(`${c.v}·${c.b} [Sincronizacion] Ciclo completado. Se almacenaron ${c.v}${totalNuevasPartidas}${c.b} partidas nuevas.`);
        }

    } catch (error) {
        console.error(`${c.r}·${c.b} [Sincronizacion] Error crítico en el motor de fondo: ${c.r}Fallo${c.b}.`, error);
    }
}

function iniciarCronSincronizacion(client) {
    const minMilisegundos = 20 * 60 * 1000;
    
    // Le pasamos el client a ejecutarMotorSilencioso
    setInterval(() => ejecutarMotorSilencioso(client), minMilisegundos);
    
    setTimeout(() => ejecutarMotorSilencioso(client), 10000);
}

module.exports = { iniciarCronSincronizacion };