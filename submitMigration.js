const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMigrationPrompt } = require('./migrationDecision');

const REQUESTS_FILE = path.join(__dirname, 'requests.json');
const pendingRequests = new Map();

// 🧠 Cargar solicitudes previas
if (fs.existsSync(REQUESTS_FILE)) {
  try {
    const raw = fs.readFileSync(REQUESTS_FILE);
    const data = JSON.parse(raw);
    for (const [userId, value] of Object.entries(data)) {
      pendingRequests.set(userId, value);
    }
    console.log(`📂 Cargadas ${pendingRequests.size} solicitudes pendientes.`);
  } catch (err) {
    console.error('❌ Error al cargar requests.json:', err.message);
  }
}

// 💾 Guardar solicitudes
function saveRequests() {
  const obj = Object.fromEntries(pendingRequests);
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(obj, null, 2));
}

// 📬 Enviar solicitud al canal de aprobaciones
async function notifyAdminsForApproval(client, userId, language, summary) {
  const channelId = process.env.APPROVAL_CHANNEL_ID;
  console.log(`🔍 Buscando canal de aprobación: ${channelId}`);
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) throw new Error('❌ Canal de aprobación no encontrado');

  const embed = new EmbedBuilder()
    .setTitle('📥 Nueva solicitud de migración')
    .setDescription(`Usuario: <@${userId}>\nIdioma: ${language}\n\nResumen:\n${summary || '⚠️ No se proporcionó resumen.'}`)
    .setColor(0x00bfff)
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await msg.react('✅');
  await msg.react('❌');

  return msg.id;
}

// 📩 Manejo de DM del usuario
async function handleUserDM(msg) {
  const userId = msg.author.id;
  const request = pendingRequests.get(userId);
  if (!request) return;

  await msg.reply(`📨 Tu solicitud está en revisión. Idioma: ${request.language}`);
}

// 🚫 Cancelación desde canal
async function handleUserChannelCancel(msg) {
  const userId = msg.author.id;
  const request = pendingRequests.get(userId);
  if (!request) return;
  if (msg.channel.id !== request.channelId) return;

  await msg.channel.send(`🚫 <@${userId}> canceló su solicitud desde el canal.`);
  pendingRequests.delete(userId);
  saveRequests();

  if (msg.channel.name.startsWith('ticket-')) {
    try {
      await msg.channel.delete();
    } catch (err) {
      console.error(`❌ No se pudo eliminar el canal ${msg.channel.name}: ${err.message}`);
    }
  }
}

// 🧩 Función principal para crear ticket
async function submitMigration(interaction) {
  const userId = interaction.user.id;
  const guild = interaction.guild;
  const client = interaction.client;
  const lang = interaction.locale?.startsWith('es') ? 'es' : 'en';

  const channelName = `ticket-${userId}`;
  const existing = guild.channels.cache.find(c => c.name === channelName);
  if (existing) {
    return interaction.reply({ content: '📌 Ya tienes un ticket abierto.', ephemeral: true });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: 0, // GUILD_TEXT
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: userId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
      },
      {
        id: process.env.ADMIN_ROLE_ID,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AddReactions]
      },
      {
        id: client.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions]
      }
    ]
  });

  const summary = '📝 El usuario ha solicitado migrar. Esperando aprobación.';
  const approvalMessageId = await notifyAdminsForApproval(client, userId, lang, summary);

  const ticketEmbed = new EmbedBuilder()
    .setTitle(lang === 'es' ? 'Solicitud enviada' : 'Request Submitted')
    .setDescription(lang === 'es'
      ? 'Tu solicitud fue enviada a los administradores. Espera su aprobación.'
      : 'Your request was sent to the admins. Please wait for approval.')
    .setColor(0x00ff99)
    .setTimestamp();

  const ticketMsg = await channel.send({ embeds: [ticketEmbed] });
  await ticketMsg.react('🚫');

  // ✅ Botones de migración en el idioma correcto
  await sendMigrationPrompt(channel, interaction.user, lang);

  pendingRequests.set(userId, {
    channelId: channel.id,
    language: lang,
    lastMessageId: ticketMsg.id,
    approvalChannelId: process.env.APPROVAL_CHANNEL_ID,
    approvalMessageId
  });

  saveRequests();

  await interaction.reply({
    content: lang === 'es'
      ? '✅ Solicitud enviada. Revisa tu ticket.'
      : '✅ Request submitted. Check your ticket.',
    ephemeral: true
  });
}

// ✅ Exportar funciones
module.exports = {
  submitMigration,
  notifyAdminsForApproval,
  handleUserDM,
  handleUserChannelCancel,
  pendingRequests,
  saveRequests
};
