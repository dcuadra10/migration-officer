require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ChannelType, EmbedBuilder } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');
const { handleMigrationResponse } = require('./migrationDecision');


const {
  handleUserStep,
  handleChannelDelete
} = require('./stepsManager');

const {
  notifyAdminsForApproval,
  handleUserDM,
  handleUserChannelCancel,
  pendingRequests,
  saveRequests
} = require('./submitMigration');

const TOKEN = process.env.DISCORD_TOKEN;
const HEALTHCHECK_URL = process.env.HEALTHCHECK_URL;
const SHEETS_WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL;

if (!TOKEN || !HEALTHCHECK_URL || !SHEETS_WEBHOOK_URL) {
  console.error('❌ Missing .env variables');
  process.exit(1);
}

// 🌐 Express server for health monitoring
const app = express();
let lastPing = { method: null, timestamp: null };

app.get('/health', (req, res) => {
  lastPing = { method: 'GET', timestamp: new Date().toISOString() };
  console.log(`[HEALTH] GET ✅: ${lastPing.timestamp}`);
  res.status(200).send('✅ Healthcheck OK');
});

app.get('/status', (req, res) => {
  if (!lastPing.timestamp) return res.status(200).send('⏳ No ping received yet.');
  res.status(200).json(lastPing);
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel,
    Partials.User,
    Partials.Message,
    Partials.Reaction
  ]
});

client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.trim();

  if (msg.channel.type === ChannelType.DM) {
    return handleUserDM(msg);
  }

  if (content.startsWith('!cancel')) {
    return handleUserChannelCancel(msg);
  }

  return handleUserStep(msg);
});

client.on('interactionCreate', async interaction => {
  const { handleMigrationResponse } = require('./migrationDecision');
  await handleMigrationResponse(interaction);
});


client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot || !reaction.message) return;

  const emoji = reaction.emoji.name;
  const msg = reaction.message;

  // ✅❌ Reacciones de admins en mensaje de aprobación
  if (msg.embeds?.[0]?.title?.includes('solicitud de migración')) {
    const match = msg.embeds[0].description?.match(/<@(\d+)>/);
    if (!match) return;

    const userId = match[1];
    const request = pendingRequests.get(userId);
    if (!request) return;

    const channel = await client.channels.fetch(request.channelId).catch(() => null);
    const guild = channel?.guild;
    const member = guild?.members.cache.get(userId);
    const lang = request.language || 'en';

    const messages = {
      approve: {
        es: '✅ Tu migración ha sido aprobada.',
        en: '✅ Your migration has been approved.'
      },
      deny: {
        es: '❌ Tu migración fue rechazada. Contacta a soporte si tienes dudas.',
        en: '❌ Your migration was denied. Contact support if you have questions.'
      }
    };
require('./handleUserConfirmationReaction').handleUserConfirmationReaction({ client, reaction, user });

    const text = emoji === '✅' ? messages.approve[lang] : messages.deny[lang];

    let dmSent = false;
    try {
      if (!member) throw new Error('Miembro no encontrado en cache');
      await member.send(text);
      dmSent = true;
      console.log(`📬 DM enviado a ${member.user.tag}: ${text}`);
    } catch (err) {
      console.error(`❌ Falló el DM a <@${userId}>: ${err.message}`);
    }

    await channel?.send(`${emoji} <@${userId}> ha sido ${emoji === '✅' ? 'aprobado' : 'rechazado'}. Idioma: ${lang}`);
    if (!dmSent) {
      await channel?.send(`⚠️ No se pudo enviar DM a <@${userId}>. Enviando mensaje aquí:\n${text}`);
    }

    // ✅ Enviar datos al webhook solo si fue aprobado
    if (emoji === '✅') {
 const promptMessages = {
  es: 'Reacciona con ✅ para confirmar tu migración o ❌ para cancelarla.',
  en: 'React with ✅ to confirm your migration or ❌ to cancel it.'
};

const confirmText = promptMessages[lang] || promptMessages.en;

const prompt = await channel.send(`<@${userId}> ${confirmText}`);
await prompt.react('✅');
await prompt.react('❌');


request.lastMessageId = prompt.id;
saveRequests();

    // Actualizar embed de aprobación
    try {
      const approvalChannel = await client.channels.fetch(request.approvalChannelId);
      const approvalMessage = await approvalChannel.messages.fetch(request.approvalMessageId);
      const embed = approvalMessage.embeds[0];
      const updatedEmbed = EmbedBuilder.from(embed).setFooter({
        text: `Estado: ${emoji === '✅' ? 'aprobado' : 'rechazado'} (admin)`
      });
      await approvalMessage.edit({ embeds: [updatedEmbed] });
    } catch (err) {
      console.error('❌ No se pudo editar el embed de aprobación:', err.message);
    }

    pendingRequests.delete(userId);
    saveRequests();

if (channel?.name?.startsWith('ticket-')) {
  try {
    await channel.send('📌 Este canal se cerrará en breve...');
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error(`❌ No se pudo eliminar el canal ${channel.name}: ${err.message}`);
  }
  } // ← cierre del bloque de aprobación del admin

  // 🚫 Reacción de cancelación del usuario
  for (const [userId, request] of pendingRequests.entries()) {
    if (user.id !== userId) continue;
    if (reaction.message.id !== request.lastMessageId) continue;
    if (emoji !== '🚫') continue;

    const channel = await client.channels.fetch(request.channelId).catch(() => null);
    await channel?.send(`🚫 <@${userId}> canceló su solicitud desde la reacción.`);
    pendingRequests.delete(userId);
    saveRequests();

    if (channel?.name?.startsWith('ticket-')) {
      try {
        await channel.delete();
      } catch (err) {
        console.error(`❌ No se pudo eliminar el canal ${channel.name}: ${err.message}`);
      }
    }
}; // ← cierre correcto del client.on('messageReactionAdd')
client.on('channelDelete', handleChannelDelete);
client.login(TOKEN);
