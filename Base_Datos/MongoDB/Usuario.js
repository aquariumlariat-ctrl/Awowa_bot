// Base_Datos/MongoDB/Usuario.js
const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    Discord_ID: { type: String, required: true, unique: true },
    Discord_Nick: { type: String, required: true },
    Numero_Matricula: { type: Number, unique: true },
    Riot_ID: { type: String, required: true },
    PUUID: { type: String, required: true },
    Region: { type: String, required: true },
    Fecha: { type: String, required: true },
    Icono_ID: { type: Number, default: 29 }, 
    Nivel: { type: Number, default: 1 },     
    Rangos: {
        SoloQ: { type: String, default: 'UNRANKED' },
        Flex: { type: String, default: 'UNRANKED' },
        TFT: { type: String, default: 'UNRANKED' }
    },
    // 👇 NUEVO BLOQUE SOCIAL 👇
    Social: {
        Nivel: { type: Number, default: 1 },
        XP: { type: Number, default: 0 },
        Mensajes: { type: Number, default: 0 },
        Minutos_Voz: { type: Number, default: 0 },
        Partidas_Registradas: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model('Usuario', usuarioSchema);