// handleUserConfirmationReaction.js

const { ChannelType } = require('discord.js');
const { pendingRequests, saveRequests } = require('./submitMigration');

async function handleUserConfirmationReaction({ client, reaction, user }) {
  const emoji = reaction.emoji.name;
  const messageId = reaction.message.id;

  for (const [userId, request] of pendingRequests.entries()) {
    if (user.id !== userId) continue;
    if (messageId !== request.lastMessageId) continue;
    if (emoji !== '✅' && emoji !== '❌') continue;

    const { channelId, language } = request;
    const lang = language || 'en';

    const messages = {
      confirm: {
        es: '✅ Confirmación recibida. Gracias por migrar con nosotros.',
        en: '✅ Confirmation received. Thank you for migrating with us.'
      },
      cancel: {
        es: '❌ Has cancelado tu migración. Si fue un error, vuelve a iniciar el proceso.',
        en: '❌ You have cancelled your migration. If this was a mistake, please start again.'
      }
    };

    const text = emoji === '✅' ? messages.confirm[lang] : messages.cancel[lang];

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.error(`❌ Canal no encontrado para <@${userId}>`);
      return;
    }

    const guild = channel.guild;
    let member = guild?.members.cache.get(userId);
    if (!member && guild) {
      try {
        member = await guild.members.fetch(userId);
      } catch (err) {
        console.error(`❌ No se pudo obtener el miembro ${userId}: ${err.message}`);
      }
    }

    const origin = channel.type === ChannelType.DM ? 'dm' : 'channel';
    let dmSent = false;

    if (origin === 'channel' && member) {
      try {
        await member.send(text);
        dmSent = true;
        console.log(`📬 Mensaje enviado por DM a ${member.user.tag}`);
      } catch (err) {
        console.error(`❌ No se pudo enviar DM: ${err.message}`);
      }
    }

    if ((origin === 'dm' || !dmSent) && channel) {
      try {
        await channel.send(`📬 ${dmSent ? 'También' : ''} Mensaje enviado aquí:\n${text}`);
      } catch (err) {
        console.error(`❌ No se pudo enviar mensaje al canal: ${err.message}`);
      }
    }

    pendingRequests.delete(userId);
    saveRequests();
    console.log(`✅ <@${userId}> reaccionó con ${emoji} → solicitud eliminada`);
  }
}

module.exports = { handleUserConfirmationReaction };
