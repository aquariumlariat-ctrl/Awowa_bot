// Modulos/Principales/Sincronizacion/actualizador_bg.js
const fs = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { extraerNuevasPartidas } = require('./extractor');
const { inyectarNuevasPartidas } = require('./procesador');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function ejecutarMotorSilencioso() {
    console.log("🔄 [CRON] Iniciando revisión silenciosa de partidas nuevas...");
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

            // 🛡️ Creamos una "lista negra" (Set) con los IDs de las partidas que ya tienes
            const conocidos = new Set(jsonTotal.Historial ? jsonTotal.Historial.map(h => h.matchId) : []);

            const nuevasPartidas = await extraerNuevasPartidas(user.PUUID, user.Region, conocidos);

            if (nuevasPartidas.total.length > 0) {
                totalNuevasPartidas += nuevasPartidas.total.length;
                console.log(`✨ [CRON] ${nuevasPartidas.total.length} partidas nuevas procesadas para ${user.Discord_Nick}`);
                
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
                await delay(1000); 
            } else {
                await delay(200); 
            }
        }

        if (totalNuevasPartidas === 0) {
            console.log("✅ [CRON] Revisión terminada, sin nuevas partidas...");
        } else {
            console.log(`✅ [CRON] Revisión terminada. Se sincronizaron un total de ${totalNuevasPartidas} partidas nuevas.`);
        }

    } catch (error) {
        console.error("❌ [CRON] Error:", error);
    }
}

function iniciarCronSincronizacion(client) {
    // Se ejecuta 1 minuto después de encender el bot 
    setTimeout(() => {
        ejecutarMotorSilencioso();
        // Se repite cada 10 minutos
        setInterval(ejecutarMotorSilencioso, 10 * 60 * 1000);
    }, 60 * 1000);
}

module.exports = { iniciarCronSincronizacion };