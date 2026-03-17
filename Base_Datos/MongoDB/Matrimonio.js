// Base_Datos/MongoDB/Matrimonio.js
const mongoose = require('mongoose');

const matrimonioSchema = new mongoose.Schema({
    Usuario1_ID: { type: String, required: true },
    Usuario2_ID: { type: String, required: true },
    Fecha:       { type: Date,   default: Date.now }
});

// Índices globales — sin Guild_ID
matrimonioSchema.index({ Usuario1_ID: 1 });
matrimonioSchema.index({ Usuario2_ID: 1 });

module.exports = mongoose.model('Matrimonio', matrimonioSchema);