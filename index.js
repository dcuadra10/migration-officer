require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', (msg) => {
  const user = msg.author.username;

  if (msg.content.toLowerCase() === '!ping') {
    msg.reply(`🏓 Pong! I'm alive, ${user}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
);
