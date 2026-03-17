// Modulos/Principales/Perfil/cmd_test_canvas_social.js
// ─────────────────────────────────────────────────────────────────────────────
// 🧪 COMANDO DE PRUEBA — Solo uso interno (aurora!test_canvas_social)
// Genera el canvas social con datos extremos para verificar el diseño.
// ─────────────────────────────────────────────────────────────────────────────
const { AttachmentBuilder } = require('discord.js');
const { generarBocetoSocial } = require('./canvas_social');

module.exports = {
    name: 'test_canvas_social',
    description: '[INTERNO] Genera el canvas social con datos de prueba extremos.',

    async execute(message) {
        // ── CON PAREJA ────────────────────────────────────────────────────────
        const datosConPareja = {
            nivel:    100,
            xpActual: 99999,
            xpMeta:   100000,
            mensajes: 9999,
            horasVoz: 999,
            posicion: 1000,
            soulmate: {
                nombre:       'Guardián de los Recuerdos', // título más largo como nombre
                fecha:        '01/01/25',
                avatarBuffer: null
            },
            racha:      null,
            monedas:    null,
            reputacion: null,
            club:       null,
            amigos:     [],
            insignias:  []
        };

        // ── SIN PAREJA ────────────────────────────────────────────────────────
        const datosSinPareja = {
            ...datosConPareja,
            soulmate: null
        };

        await message.channel.send('`🧪 Canvas Social — Con pareja:`');
        const bufferConPareja = await generarBocetoSocial(datosConPareja);
        await message.channel.send({ files: [new AttachmentBuilder(bufferConPareja, { name: 'test_social_con_pareja.png' })] });

        await message.channel.send('`🧪 Canvas Social — Sin pareja:`');
        const bufferSinPareja = await generarBocetoSocial(datosSinPareja);
        await message.channel.send({ files: [new AttachmentBuilder(bufferSinPareja, { name: 'test_social_sin_pareja.png' })] });
    }
};