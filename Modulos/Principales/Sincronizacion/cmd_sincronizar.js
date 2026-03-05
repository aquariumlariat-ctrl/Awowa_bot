// Modulos/Principales/Sincronizacion/cmd_sincronizar.js
const fs = require('fs');
const path = require('path');
const Usuario = require('../../../Base_Datos/MongoDB/Usuario');
const { extraerHistorial2026 } = require('./extractor');
const { formatearPartidas } = require('./procesador');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

module.exports = {
    name: 'sincronizar_perfil',
    async execute(message, args) {
        // Bloquear temporalmente al usuario para evitar dobles ejecuciones
        const msgCarga = await message.reply("🔄 \`Iniciando sistema de sincronización profunda...\`");
        
        // 👇 NUEVO LOG: INICIO DE COMANDO 👇
        console.log(`${c.a}·${c.b} [Sincronizacion] El usuario ${message.author.username} inició su sincronización de perfil.`);

        try {
            // 1. Buscar en BD
            const datosUsuario = await Usuario.findOne({ Discord_ID: message.author.id });
            if (!datosUsuario) {
                return msgCarga.edit("❌ \`No estás matriculado. Usa aurora!matricula primero.\`");
            }

            const numMatricula = datosUsuario.Numero_Matricula;
            const nickSeguro = datosUsuario.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
            const carpetaPath = path.join(__dirname, '../../../Base_Datos/Usuarios', `#${numMatricula}_${nickSeguro}`);

            if (!fs.existsSync(carpetaPath)) {
                return msgCarga.edit("❌ \`Error: Tu carpeta física no existe. Reinicia el bot para que el index.js la cree.\`");
            }

            // 2. Descargar toda la data de Riot de 2026
            const partidasClasificadas = await extraerHistorial2026(datosUsuario.PUUID, datosUsuario.Region, msgCarga);

            await msgCarga.edit("⚙️ \`Procesando estadísticas y compañeros... Escribiendo en disco local.\`");

            // 3. Procesar y guardar en los archivos
            const tipos = [
                { id: 'soloq', file: 'datos_lol_soloq.json' },
                { id: 'flex', file: 'datos_lol_flex.json' },
                { id: 'normals', file: 'datos_lol_normals.json' },
                { id: 'total', file: 'datos_lol_total.json' }
            ];

            for (const tipo of tipos) {
                const partidasCrudas = partidasClasificadas[tipo.id];
                const jsonCalculado = formatearPartidas(partidasCrudas, datosUsuario.PUUID);
                
                const rutaArchivo = path.join(carpetaPath, tipo.file);
                fs.writeFileSync(rutaArchivo, JSON.stringify(jsonCalculado, null, 4), 'utf8');
            }
            
            // 👇 NUEVO LOG: FIN DE COMANDO 👇
            console.log(`${c.v}·${c.b} [Sincronizacion] Sincronización de perfil de ${message.author.username} finalizada ${c.v}correctamente${c.b}.`);
            await msgCarga.edit("✅ **Sincronización completada.**\nTodos tus archivos `.json` locales (SoloQ, Flex, Normals y Total) han sido rellenados con éxito desde la Season 2026.");

        } catch (error) {
            console.error(`${c.r}·${c.b} [Sincronizacion] Sincronización de perfil de ${message.author.username}: ${c.r}Fallo${c.b}.`, error);
            await msgCarga.edit("💥 \`Ocurrió un error crítico durante la sincronización.\`");
        }
    }
};