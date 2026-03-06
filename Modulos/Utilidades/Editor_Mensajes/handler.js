// Modulos/Utilidades/Sincronizador/handler.js
const fs = require('fs').promises;
const path = require('path');
const { sincronizarMensajes } = require('./parser');

const CONFIG_PATH = path.join(__dirname, 'config.json');

async function estaHabilitado() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(data);
        return config.enabled && !!config.channelId;
    } catch {
        return false;
    }
}

async function obtenerChannelId() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        return JSON.parse(data).channelId;
    } catch {
        return null;
    }
}

async function handleMessageUpdate(oldMessage, newMessage) {
    if (newMessage.author.bot) return;

    const habilitado = await estaHabilitado();
    if (!habilitado) return;

    const channelId = await obtenerChannelId();
    if (newMessage.channel.id !== channelId) return;

    // 👇 MODIFICACIÓN: Le avisamos al parser que fue una edición 👇
    await sincronizarMensajes(newMessage.channel, 'edit');
}

module.exports = {
    handleMessageUpdate,
    estaHabilitado,
    obtenerChannelId
};