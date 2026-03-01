// Modelos/Usuario.js
const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    Discord_ID: { type: String, required: true, unique: true },
    Discord_Nick: { type: String, required: true },
    Fecha: { type: String, required: true }, 
    Riot_ID: { type: String, required: true },
    Region: { type: String, required: true },
    PUUID: { type: String, required: true },
    Nivel: { type: Number, required: true },     // 👈 NUEVO
    Icono_ID: { type: Number, required: true },  // 👈 NUEVO
    Rangos: {
        Flex: { type: Object, default: null },
        SoloQ: { type: Object, default: null },
        TFT: { type: Object, default: null } 
    }
});

module.exports = mongoose.model('Usuario', usuarioSchema);