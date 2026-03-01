// API's/Riot/sincronizador.js
const cron = require('node-cron');
const Usuario = require('../../Base_Datos/MongoDB/Usuario.js');

// Como ya estamos dentro de la carpeta Riot, las rutas de las APIs son súper cortitas:
const { regionAPlatforma, obtenerSummoner, obtenerRangos } = require('./lol_api');
const { obtenerRangoTFT } = require('./tft_api');

function iniciarSincronizador(client) {
    // El string '0 12 * * *' significa: "A las 12:00 PM, todos los días"
    cron.schedule('0 12 * * *', async () => {
        console.log('🔄 [Sincronizador] Iniciando actualización diaria de cuentas a las 12:00 PM...');
        
        try {
            const usuarios = await Usuario.find();
            console.log(`📊 [Sincronizador] ${usuarios.length} cuentas encontradas. Evaluando...`);

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
                    console.log(`❌ [Sincronizador] No se pudo actualizar a: ${usuario.Riot_ID}`);
                }
            }
            
            console.log('🎉 [Sincronizador] ¡Actualización fantasma completada con éxito!');
            
            // Ruta ajustada para volver a la bitácora y refrescar la tarjeta
            const { actualizarGaleria } = require('../../Modulos/Principales/Matricula/bitacora');
            await actualizarGaleria(client);
            
        } catch (error) {
            console.error('❌ [Sincronizador] Error fatal:', error);
        }
    });
}

module.exports = { iniciarSincronizador };