// Modulos/Utilidades/Editor_Mensajes/handler.js
const fs = require('fs').promises;
const path = require('path');
const { sincronizarMensajes } = require('./parser');

const CONFIG_PATH = path.join(__dirname, 'config.json');

async function estaHabilitado() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(data);
        return config.enabled && config.sistemas && config.sistemas.length > 0;
    } catch {
        return false;
    }
}

async function getSistemas() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        return JSON.parse(data).sistemas || [];
    } catch {
        return [];
    }
}

async function handleMessageUpdate(oldMessage, newMessage) {
    if (newMessage.author.bot) return;

    const habilitado = await estaHabilitado();
    if (!habilitado) return;

    const sistemas = await getSistemas();
    // Buscamos si el canal donde se editó el mensaje es uno de nuestros sistemas
    const sistema = sistemas.find(s => s.channelId === newMessage.channel.id);
    
    if (!sistema) return; // Si no es un canal vigilado, lo ignoramos

    // Construimos la ruta dinámica de salida
    const outputPath = path.join(__dirname, sistema.outputPath);
    
    // Disparamos el parser
    await sincronizarMensajes(newMessage.channel, outputPath, sistema.nombre, 'edit');
}

module.exports = {
    handleMessageUpdate,
    estaHabilitado,
    getSistemas
};