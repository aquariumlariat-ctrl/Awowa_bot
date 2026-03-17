// Base_Datos/MongoDB/CooldownDivorcio.js
const mongoose = require('mongoose');

const cooldownDivorcioSchema = new mongoose.Schema({
    Discord_ID:   { type: String, required: true },
    DisponibleEn: { type: Date,   required: true }
});

// Un registro global por usuario
cooldownDivorcioSchema.index({ Discord_ID: 1 }, { unique: true });

module.exports = mongoose.model('CooldownDivorcio', cooldownDivorcioSchema);