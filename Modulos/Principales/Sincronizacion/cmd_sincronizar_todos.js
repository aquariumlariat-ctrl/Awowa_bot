// Modulos/Principales/Sincronizacion/cmd_sincronizar_todos.js
const fs = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { extraerHistorial2026 } = require('./extractor');
const { formatearPartidas } = require('./procesador');

const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    name: 'sincronizar_todos',
    async execute(message, args) {
        const msgCarga = await message.reply("🚀 \`Iniciando sincronización masiva en MODO TURBO...\`\n⚠️ *Aprovechando límites extendidos de la API de Producción.*");

        try {
            const todosLosUsuarios = await Usuario.find().sort({ Numero_Matricula: 1 });
            const total = todosLosUsuarios.length;

            if (total === 0) {
                return msgCarga.edit("❌ \`No hay usuarios registrados en la base de datos.\`");
            }

            let completados = 0;
            let fallidos = 0;

            for (const user of todosLosUsuarios) {
                try {
                    await msgCarga.edit(`⚡ \`Sincronizando usuario ${completados + 1} de ${total}...\`\n👤 **${user.Discord_Nick}** (Matrícula #${user.Numero_Matricula})`).catch(()=>{});

                    const numMatricula = user.Numero_Matricula;
                    const nickSeguro = user.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
                    const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);

                    if (!fs.existsSync(carpetaPath)) {
                        fs.mkdirSync(carpetaPath, { recursive: true });
                    }

                    const partidasClasificadas = await extraerHistorial2026(user.PUUID, user.Region, null);

                    const tipos = [
                        { id: 'soloq', file: 'datos_lol_soloq.json' },
                        { id: 'flex', file: 'datos_lol_flex.json' },
                        { id: 'normals', file: 'datos_lol_normals.json' },
                        { id: 'total', file: 'datos_lol_total.json' }
                    ];

                    for (const tipo of tipos) {
                        const partidasCrudas = partidasClasificadas[tipo.id];
                        const jsonCalculado = formatearPartidas(partidasCrudas, user.PUUID);
                        
                        const rutaArchivo = path.join(carpetaPath, tipo.file);
                        fs.writeFileSync(rutaArchivo, JSON.stringify(jsonCalculado, null, 4), 'utf8');
                    }

                    completados++;
                    
                    // ⏱️ Pausa de solo 1 segundo entre usuarios 
                    await delay(1000); 

                } catch (errUser) {
                    console.error(`Error sincronizando a ${user.Discord_Nick}:`, errUser);
                    fallidos++;
                }
            }

            await msgCarga.edit(`✅ **Sincronización masiva TURBO finalizada.**\n📊 **Resumen:**\n- Completados: \`${completados}\`\n- Fallidos: \`${fallidos}\`\n- Total procesados: \`${total}\``).catch(()=>{});

        } catch (error) {
            console.error("Error en sincronización masiva:", error);
            await message.channel.send("💥 \`Ocurrió un error crítico durante la inicialización de la sincronización masiva.\`");
        }
    }
};