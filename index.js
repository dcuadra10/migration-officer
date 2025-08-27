require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const axios = require('axios');
const { handleUserStep, handleChannelDelete } = require('./stepsManager');
const {
  notifyAdminsForApproval,
  handleAdminResponse,
  handleUserDM
} = require('./submitMigration');

const TOKEN = process.env.DISCORD_TOKEN;
const HEALTHCHECK_URL = process.env.HEALTHCHECK_URL;

if (!TOKEN || !HEALTHCHECK_URL) {
  console.error('❌ Missing .env variables');
  process.exit(1);
}

// 🌐 Express server for uptime monitoring
const app = express();
let lastPing = { method: null, timestamp: null };

app.get('/health', (req, res) => {
  lastPing = { method: 'GET', timestamp: new Date().toISOString() };
  console.log(`[HEALTH] GET ✅: ${lastPing.timestamp}`);
  res.status(200).send('✅ Healthcheck OK');
});

app.get('/status', (req, res) => {
  if (!lastPing.timestamp) return res.status(200).send('⏳ No ping received yet.');
  res.status(200).json({
    lastMethod: lastPing.method,
    lastTimestamp: lastPing.timestamp
  });
});

app.listen(3000, () => {
  console.log('🌐 Express server running on port 3000');
});

// 🤖 Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

client.once('clientReady', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.trim();

  // 📩 Mensaje por DM
  if (msg.channel.type === 1) {
    return handleUserDM(msg);
  }

  // 🛡️ Comandos de admin
  if (
    content.startsWith('!approve') ||
    content.startsWith('!deny') ||
    content.startsWith('!cancel')
  ) {
    return handleAdminResponse(msg);
  }

  // 👤 Flujo de usuario
  return handleUserStep(msg);
});

client.on('channelDelete', handleChannelDelete);

// 🔁 Ping de salud cada minuto
setInterval(() => {
  axios
    .get(HEALTHCHECK_URL)
    .then(() => {
      lastPing = { method: 'OUTBOUND', timestamp: new Date().toISOString() };
      console.log(`[HEALTH] Ping sent ✅: ${lastPing.timestamp}`);
    })
    .catch((err) =>
      console.error(`[HEALTH] ❌ Ping error: ${err.message}`)
    );
}, 60 * 1000);

client.login(TOKEN);
