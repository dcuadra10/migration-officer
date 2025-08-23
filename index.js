const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
const express = require('express');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds
  ]
});

const pendingUserSteps = new Map();

// 🔢 Conversión de sufijos (1b → 1000000000, 1.5m → 1500000, etc.)
function parseValue(input) {
  if (!input) return 0;
  const str = input.toLowerCase().replace(/,/g, '').trim();
  const match = str.match(/^([\d.]+)([kmb])?$/);
  if (!match) return parseInt(str, 10);

  const num = parseFloat(match[1]);
  const suffix = match[2];

  switch (suffix) {
    case 'k': return Math.round(num * 1_000);
    case 'm': return Math.round(num * 1_000_000);
    case 'b': return Math.round(num * 1_000_000_000);
    default: return Math.round(num);
  }
}

function calculatePoints({ power, kp, deaths }) {
  return Math.floor((power / 10000) + (kp / 100000) + (deaths / 1000));
}

client.on('messageCreate', async (msg) => {
  if (msg.content === '!status') {
    return msg.reply('🟢 Bot activo en:\nhttps://d66a139a-6604-4677-9fbe-91e08d894e56-00-21kovy3axu5a2.spock.replit.dev:3000/');
  }

  if (msg.author.bot || msg.channel.type !== 0) return;

  const userId = msg.author.id;
  let userState = pendingUserSteps.get(userId);

  if (!userState) {
    userState = { id: userId, step: 'ask_nickname' };
    pendingUserSteps.set(userId, userState);
    return msg.reply('📛 What is your in-game nickname?');
  }

  switch (userState.step) {
    case 'ask_nickname':
      userState.nickname = msg.content.trim();
      userState.step = 'ask_ingameid';
      msg.reply('🆔 What is your in-game ID?');
      break;

    case 'ask_ingameid':
      userState.ingame_id = msg.content.trim();
      userState.step = 'ask_kingdom';
      msg.reply('🏰 What kingdom are you from?');
      break;

    case 'ask_kingdom':
      userState.kingdom = msg.content.trim();
      userState.step = 'ask_power';
      msg.reply('⚔️ How much Power do you have? (e.g. 1.2b, 500m)');
      break;

    case 'ask_power':
      userState.power = parseValue(msg.content);
      userState.step = 'ask_kp';
      msg.reply('🔫 How many Kill Points do you have? (e.g. 800m, 1.5b)');
      break;

    case 'ask_kp':
      userState.kp = parseValue(msg.content);
      userState.step = 'ask_deaths';
      msg.reply('💀 How many Deaths do you have? (e.g. 50k, 120000)');
      break;

    case 'ask_deaths':
      userState.deaths = parseValue(msg.content);
      userState.step = 'ask_screenshot';
      msg.reply('📸 Upload your Power/KP image.');
      break;

    case 'ask_screenshot':
      if (!msg.attachments || msg.attachments.size === 0) {
        return msg.reply('📎 You must upload an image.');
      }
      userState.power_kp_image = msg.attachments.first().url;
      userState.step = 'ask_deathshot';
      msg.reply('🧸 Upload your Deaths screen image.');
      break;

    case 'ask_deathshot':
      if (!msg.attachments || msg.attachments.size === 0) {
        return msg.reply('📍 You must upload the Deaths image.');
      }
      userState.step = 'ask_migration_decision';
      msg.reply('🧭 Can this player migrate? Type `yes` or `no`.');
      userState.deaths_image = msg.attachments.first().url;
      userState.step = 'done';



      const payload = {
        discord_id: userId,
        discord_name: msg.author.username,
        nickname: userState.nickname,
        ingame_id: userState.ingame_id,
        kingdom: userState.kingdom,
        power: userState.power,
        kp: userState.kp,
        deaths: userState.deaths,
        total_points: calculatePoints(userState),
        power_kp_image: userState.power_kp_image,
        deaths_image: userState.deaths_image,
        can_migrate: 'pending',
        created_at: new Date().toISOString()
      };


      try {
        const res = await fetch("https://script.google.com/macros/s/AKfycbyD6ld64palrNsbgGPDtAjLm3fheCy4AvxQKuy0T6l3DJndJxxX8pfGqqYNRm2coenc/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const text = await res.text();
        msg.reply(`✅ Data sent: ${text}`);
      } catch (err) {
        msg.reply(`❌ Error sending data: ${err.message}`);
      }

      pendingUserSteps.delete(userId);
      break;
  }
});

// 🟢 Mantener Replit activo
const app = express();
app.get('/', (req, res) => res.send('Bot is online'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web server running'));


client.login(process.env.DISCORD_TOKEN);
