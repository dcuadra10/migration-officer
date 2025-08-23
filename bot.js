const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Comando básico de migración
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!migrar')) {
    // Simulación de migración
    const args = message.content.split(' ');
    const jugador = args[1] || 'Desconocido';
    const reino = args[2] || '???';

    message.channel.send(`🛫 Migración registrada: ${jugador} se va al reino ${reino}`);
  }
});

// Servidor Express para mantener Replit activo
const app = express();
app.get('/', (req, res) => {
  res.send('Bot de migración activo 🚀');
});
app.listen(3000, () => {
  console.log('Servidor web activo en puerto 3000');
});

// Login del bot
client.login(process.env.TOKEN);
