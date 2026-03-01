// Base_Datos/MongoDB/IntentoMatricula.js
const mongoose = require('mongoose');

const intentoMatriculaSchema = new mongoose.Schema({
    Discord_ID: { type: String, required: true, unique: true },
    Fallos: { type: Number, default: 0 },
    CooldownHasta: { type: Date, default: null }
});

module.exports = mongoose.model('IntentoMatricula', intentoMatriculaSchema);