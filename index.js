require('dotenv').config(); // Carga variables desde .env

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const axios = require('axios');
const { handleUserStep } = require('./stepsManager');
const { handleAdminResponse } = require('./submitMigration');

const TOKEN = process.env.DISCORD_TOKEN;
const HEALTHCHECK_URL = process.env.HEALTHCHECK_URL;

if (!TOKEN || !HEALTHCHECK_URL) {
  console.error('❌ Faltan variables en .env: DISCORD_TOKEN o HEALTHCHECK_URL');
  process.exit(1);
}

// 🟢 Servidor Express
const app = express();

// 🧠 Estado del último ping recibido
let lastPing = {
  method: null,
  timestamp: null
};

// Endpoint para monitoreo pasivo (Better Uptime)
app.get('/health', (req, res) => {
  lastPing = { method: 'GET', timestamp: new Date().toISOString() };
  console.log(`[HEALTH] GET recibido ✅: ${lastPing.timestamp}`);
  res.status(200).send('✅ Healthcheck OK');
});

// Endpoint para consultar el estado del último ping
app.get('/status', (req, res) => {
  if (!lastPing.timestamp) {
    return res.status(200).send('⏳ No se ha recibido ningún ping aún.');
  }
  res.status(200).json({
    lastMethod: lastPing.method,
    lastTimestamp: lastPing.timestamp
  });
});

// Servidor activo
app.listen(3000, () => {
  console.log('🌐 Express server running on port 3000');
});

// 🤖 Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['CHANNEL'], // Necesario para DMs
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// 🔄 Flujo de migración y comandos admin
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  console.log(`[DISCORD] Mensaje recibido de ${msg.author.username}: ${msg.content}`);

  // Flujo de usuario
  handleUserStep(msg);

  // Comandos de admin
  if (msg.content.startsWith('!approve') || msg.content.startsWith('!deny')) {
    handleAdminResponse(msg);
  }
});

// ⏱ Ping activo a Healthchecks.io cada minuto
setInterval(() => {
  axios.get(HEALTHCHECK_URL)
    .then(() => {
      lastPing = { method: 'OUTBOUND', timestamp: new Date().toISOString() };
      console.log(`[HEALTH] Ping enviado a Healthchecks.io ✅: ${lastPing.timestamp}`);
    })
    .catch(err => console.error(`[HEALTH] ❌ Error al enviar ping: ${err.message}`));
}, 60 * 1000); // cada 1 minuto

client.login(TOKEN);
