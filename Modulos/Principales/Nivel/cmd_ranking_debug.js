// Modulos/Utilidades/Estado/cmd_ranking_debug.js
// Comando temporal de diagnóstico — muestra el estado interno del ranking.
// Úsalo para verificar qué tiene cargado el motor en memoria.
// Una vez confirmado que todo funciona, puedes borrar este archivo.

const { PermissionsBitField } = require('discord.js');
const { obtenerPuesto } = require('../../Principales/Nivel/motor_ranking');

// Acceso directo al Map interno para diagnóstico
const motorRanking = require('../../Principales/Nivel/motor_ranking');

module.exports = {
    name: 'ranking_debug',
    description: 'Diagnóstico del ranking en memoria para este servidor.',

    async execute(message) {
        if (!message.guild || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        // Accedemos al módulo directamente para ver el Map interno
        // Esto funciona porque Node.js cachea los módulos
        const rankings = motorRanking._rankings ?? null;

        if (!rankings) {
            return message.reply([
                '⚠️ No se puede acceder al Map interno.',
                'Asegúrate de que `motor_ranking.js` exporta `_rankings` para debug.',
                'Añade `_rankings: rankings` al `module.exports` temporalmente.'
            ].join('\n'));
        }

        const guildId = message.guild.id;
        const lista   = rankings.get(guildId);

        if (!lista) {
            return message.reply(`❌ No hay ranking cargado para este servidor (\`${guildId}\`).\nEl motor puede no haber inicializado aún.`);
        }

        const top5 = lista.slice(0, 5).map((e, i) =>
            `\`${i + 1}.\` <@${e.userId}> — Nivel ${e.nivel} | ${e.xp} XP`
        ).join('\n') || 'Lista vacía.';

        const tuPuesto = obtenerPuesto(guildId, message.author.id);

        await message.reply([
            `📊 **Ranking en memoria — ${message.guild.name}**`,
            `• Total usuarios indexados: \`${lista.length}\``,
            `• Tu puesto: \`#${tuPuesto}\``,
            ``,
            `**Top 5:**`,
            top5
        ].join('\n'));
    }
};