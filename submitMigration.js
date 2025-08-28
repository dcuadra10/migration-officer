const { EmbedBuilder } = require('discord.js');

const pendingRequests = new Map(); // userId → { channelId, language, data }

const notifyAdminsForApproval = async (msg, userId, language, data) => {
  const adminIds = process.env.ADMIN_IDS?.split(',') || [];

  if (adminIds.length === 0) {
    console.error('❌ ADMIN_IDS no está definido en .env');
    return msg.channel.send('⚠️ Error interno: no se pudo acceder a los administradores.');
  }

  const summaryText = typeof data?.summary === 'string' ? data.summary : '⚠️ No se proporcionó resumen.';

  const embed = new EmbedBuilder()
    .setTitle('📥 Nueva solicitud de migración')
    .setDescription(`Usuario: <@${userId}>\nIdioma: ${language}\n\nResumen:\n${summaryText}`)
    .setColor(0x00bfff)
    .setTimestamp();

  pendingRequests.set(userId, {
    channelId: msg.channel.id,
    language,
    data
  });

  for (const id of adminIds) {
    try {
      const admin = await msg.client.users.fetch(id);
      await admin.send({
        content: `🛠️ Comandos disponibles:\n\`!approve @${userId}\`\n\`!deny @${userId}\`\n\`!cancel @${userId}\``,
        embeds: [embed]
      });
    } catch (err) {
      console.error(`❌ No se pudo enviar DM a ${id}: ${err.message}`);
    }
  }

  msg.channel.send('✅ Tu solicitud ha sido enviada a los administradores.');
};

const handleAdminResponse = async (msg) => {
  const content = msg.content.trim();
  const args = content.split(' ');
  const command = args[0].toLowerCase();
  const userMention = args[1];

  if (!userMention || !userMention.startsWith('<@') || !userMention.endsWith('>')) {
    return msg.reply('❌ Formato incorrecto. Usa: !approve @usuario');
  }

  const userId = userMention.replace(/[<@!>]/g, '');
  const request = pendingRequests.get(userId);
  if (!request) return msg.reply('⚠️ No hay solicitud pendiente para ese usuario.');

  const user = await msg.client.users.fetch(userId);
  const channel = await msg.client.channels.fetch(request.channelId);

  if (command === '!approve') {
    await user.send(`✅ Tu migración ha sido aprobada. Puedes continuar.`);
    await channel.send(`✅ <@${userId}> ha sido aprobado.`);
    pendingRequests.delete(userId);
    if (channel.name.startsWith('ticket-')) await channel.delete();
  } else if (command === '!deny') {
    await user.send(`❌ Tu migración fue rechazada. Contacta a soporte si tienes dudas.`);
    await channel.send(`❌ <@${userId}> ha sido rechazado.`);
    pendingRequests.delete(userId);
    if (channel.name.startsWith('ticket-')) await channel.delete();
  } else if (command === '!cancel') {
    await user.send(`🚫 Tu solicitud fue cancelada por un administrador.`);
    await channel.send(`🚫 <@${userId}> ha sido cancelado.`);
    pendingRequests.delete(userId);
    if (channel.name.startsWith('ticket-')) await channel.delete();
  } else {
    msg.reply('❌ Comando no reconocido.');
  }
};

const handleUserChannelCancel = async (msg) => {
  const content = msg.content.trim().toLowerCase();
  if (content !== '!cancel') return;

  const userId = msg.author.id;
  const request = pendingRequests.get(userId);
  if (!request) return msg.reply('⚠️ No tienes ninguna solicitud pendiente.');

  if (msg.channel.id !== request.channelId) {
    return msg.reply('❌ Este comando solo puede usarse en tu canal de solicitud.');
  }

  await msg.reply('🚫 Has cancelado tu solicitud.');
  await msg.channel.send(`🚫 <@${userId}> canceló su solicitud desde el canal.`);
  pendingRequests.delete(userId);
  if (msg.channel.name.startsWith('ticket-')) await msg.channel.delete();
};

module.exports = {
  notifyAdminsForApproval,
  handleAdminResponse,
  handleUserChannelCancel
};
