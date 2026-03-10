require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Usuario = require('./Base_Datos/MongoDB/Usuario.js');

const c = { v: '\x1b[32m', a: '\x1b[33m', b: '\x1b[0m' };

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log(`${c.a}·${c.b} Conectado a MongoDB. Iniciando parche de migración Social...`);
    
    const usuarios = await Usuario.find();
    let actualizados = 0;

    for (const user of usuarios) {
        // 1. Actualizamos la nube (MongoDB)
        if (!user.Social || user.Social.Nivel === undefined) {
            user.Social = { Nivel: 1, XP: 0, Mensajes: 0, Minutos_Voz: 0, Partidas_Registradas: 0 };
            await user.save();
        }

        // 2. Actualizamos el archivo local (datos_basicos.json)
        const numMatricula = user.Numero_Matricula;
        const nickSeguro = user.Discord_Nick.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
        const carpetaUsuario = path.join(__dirname, 'Base_Datos', 'Usuarios', `#${numMatricula}_${nickSeguro}`);
        const jsonPath = path.join(carpetaUsuario, 'datos_basicos.json');

        if (fs.existsSync(jsonPath)) {
            let datos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (!datos.Social) {
                datos.Social = { Nivel: 1, XP: 0, Mensajes: 0, Minutos_Voz: 0, Partidas_Registradas: 0 };
                fs.writeFileSync(jsonPath, JSON.stringify(datos, null, 4), 'utf8');
                actualizados++;
            }
        }
    }

    console.log(`${c.v}·${c.b} Migración completada. ${actualizados} perfiles actualizados con éxito.`);
    process.exit(0);
}).catch(err => console.error("Error conectando a BD:", err));