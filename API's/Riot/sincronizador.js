// API's/Riot/sincronizador.js
const cron = require('node-cron');
const Usuario = require('../../Base_Datos/MongoDB/Usuario.js');

const { regionAPlatforma, obtenerSummoner, obtenerRangos } = require('./lol_api');
const { obtenerRangoTFT } = require('./tft_api');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

function iniciarSincronizador(client) {
    // El string '0 12 * * *' significa: "A las 12:00 PM, todos los días"
    cron.schedule('0 12 * * *', async () => {
        console.log(`${c.v}·${c.b} [Sincronizacion] Actualización diaria de cuentas a las 12:00 PM ${c.v}iniciada${c.b}.`);
        
        try {
            const usuarios = await Usuario.find();
            console.log(`${c.v}·${c.b} [Sincronizacion] Evaluación de ${usuarios.length} cuentas procesada ${c.v}correctamente${c.b}.`);

            for (let i = 0; i < usuarios.length; i++) {
                const usuario = usuarios[i];
                
                try {
                    const plataforma = regionAPlatforma[usuario.Region];
                    const [gameName, tagLine] = usuario.Riot_ID.split('#');

                    const summoner = await obtenerSummoner(usuario.PUUID, plataforma);
                    const rangos = await obtenerRangos(usuario.PUUID, plataforma);
                    const tft = await obtenerRangoTFT(gameName, tagLine, plataforma);

                    if (summoner) {
                        usuario.Nivel = summoner.summonerLevel;
                        usuario.Icono_ID = summoner.profileIconId;
                    }
                    usuario.Rangos.SoloQ = rangos.soloq;
                    usuario.Rangos.Flex = rangos.flex;
                    usuario.Rangos.TFT = tft;

                    await usuario.save();
                    
                    // 🚦 LA MAGIA ANTI-BAN: Le pedimos a Node.js que se espere 1.5 segundos.
                    await new Promise(r => setTimeout(r, 1500)); 
                    
                } catch (err) {
                    console.log(`${c.r}·${c.b} [Sincronizacion] Actualización de la cuenta ${usuario.Riot_ID}: ${c.r}Fallo${c.b}.`);
                }
            }
            
            console.log(`${c.v}·${c.b} [Sincronizacion] Actualización fantasma completada ${c.v}correctamente${c.b}.`);
            
            // Ruta ajustada para volver a la bitácora y refrescar la tarjeta
            const { actualizarGaleria } = require('../../Modulos/Principales/Matricula/bitacora');
            await actualizarGaleria(client);
            
        } catch (error) {
            console.error(`${c.r}·${c.b} [Sincronizacion] Proceso de actualización masiva: ${c.r}Fallo crítico${c.b}.`, error);
        }
    });
}

module.exports = { iniciarSincronizador };