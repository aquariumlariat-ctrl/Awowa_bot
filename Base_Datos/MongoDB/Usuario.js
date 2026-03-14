// Base_Datos/MongoDB/Usuario.js
const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    Discord_ID:       { type: String, required: true, unique: true },
    Discord_Nick:     { type: String, required: true },
    Numero_Matricula: { type: Number, unique: true },
    Riot_ID:          { type: String, required: true },
    PUUID:            { type: String, required: true },
    Region:           { type: String, required: true },
    Fecha:            { type: String, required: true },
    // ─────────────────────────────────────────────────────────────────────
    // 🏠 ID del servidor donde se matriculó el usuario.
    // Permite filtrar rankings directamente en MongoDB sin pasar arrays de IDs,
    // lo que hace el countDocuments de /nivel escalable a cualquier tamaño.
    // ─────────────────────────────────────────────────────────────────────
    Guild_ID:         { type: String, default: null },
    Icono_ID:         { type: Number, default: 29 },
    Nivel:            { type: Number, default: 1 },
    // Mixed acepta Objetos o Strings libremente (para rangos UNRANKED vs objeto)
    Rangos: {
        SoloQ: { type: mongoose.Schema.Types.Mixed, default: 'UNRANKED' },
        Flex:  { type: mongoose.Schema.Types.Mixed, default: 'UNRANKED' },
        TFT:   { type: mongoose.Schema.Types.Mixed, default: 'UNRANKED' }
    },
    Social: {
        Nivel:               { type: Number, default: 1 },
        XP:                  { type: Number, default: 0 },
        Mensajes:            { type: Number, default: 0 },
        Minutos_Voz:         { type: Number, default: 0 },
        Partidas_Registradas:{ type: Number, default: 0 }
    }
});

module.exports = mongoose.model('Usuario', usuarioSchema);