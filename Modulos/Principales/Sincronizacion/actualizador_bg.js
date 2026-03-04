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

        for (const user of todosLosUsuarios) {
            const numMatricula = user.Numero_Matricula;
            const nickSeguro = user.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
            const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);

            if (!fs.existsSync(carpetaPath)) continue;

            // Leer archivo total para ver cuándo fue su última partida
            const totalPath = path.join(carpetaPath, 'datos_lol_total.json');
            if (!fs.existsSync(totalPath)) continue;
            
            let jsonTotal = JSON.parse(fs.readFileSync(totalPath, 'utf8'));

            // Buscar el timestamp de la partida más reciente
            let startTime = Math.floor(new Date('2026-01-08T12:00:00Z').getTime() / 1000); // Base season 2026
            if (jsonTotal.Historial && jsonTotal.Historial.length > 0) {
                // Buscamos el número mayor en "fecha"
                const lastMatch = jsonTotal.Historial.reduce((prev, current) => (prev.fecha > current.fecha) ? prev : current);
                // Lo pasamos a segundos y sumamos 1 seg para no repetir la partida
                startTime = Math.floor(lastMatch.fecha / 1000) + 1;
            }

            // Preguntarle a Riot: "¿Hay algo después de este startTime?"
            const nuevasPartidas = await extraerNuevasPartidas(user.PUUID, user.Region, startTime);

            // Si encontró partidas, las inyectamos. Si no, pasamos de largo instantáneamente.
            if (nuevasPartidas.total.length > 0) {
                console.log(`✨ [CRON] Encontradas ${nuevasPartidas.total.length} partidas nuevas para ${user.Discord_Nick}`);
                
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
                await delay(1000); // Pausa solo si extrajimos algo pesado
            } else {
                await delay(200); // Pausa minúscula si no hubo nada para no saturar internet
            }
        }
    } catch (error) {
        console.error("❌ [CRON] Error en la ejecución del actualizador silencioso:", error);
    }
}

function iniciarCronSincronizacion(client) {
    // Se ejecuta 1 minuto después de encender el bot (por primera vez)
    setTimeout(() => {
        ejecutarMotorSilencioso();
        // Luego, se repite en un bucle cada 10 minutos
        setInterval(ejecutarMotorSilencioso, 10 * 60 * 1000);
    }, 60 * 1000);
}

module.exports = { iniciarCronSincronizacion };