// confirmUserMigration.js

/**
 * Envía un mensaje de confirmación al usuario cuando el admin aprueba con ✅.
 * Si el usuario inició por canal, se le responde por DM.
 * Si inició por DM, se le responde en el canal del ticket.
 * Si el DM falla, se responde en el canal como fallback.
 */

const { ChannelType } = require('discord.js');

async function confirmUserMigration({ client, request }) {
  const { channelId, language, discord_id } = request;
  const lang = language || 'en';

  const messages = {
    es: '✅ Confirmación recibida. Gracias por migrar con nosotros.',
    en: '✅ Confirmation received. Thank you for migrating with us.'
  };

  const text = messages[lang] || messages.en;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`❌ Canal no encontrado para <@${discord_id}>`);
    return;
  }

  const guild = channel.guild;
  let member = guild?.members.cache.get(discord_id);
  if (!member && guild) {
    try {
      member = await guild.members.fetch(discord_id);
    } catch (err) {
      console.error(`❌ No se pudo obtener el miembro ${discord_id}: ${err.message}`);
    }
  }

  // Detectar origen del usuario (canal o DM)
  const origin = channel.type === ChannelType.DM ? 'dm' : 'channel';

  let dmSent = false;

  // Si el usuario inició por canal, intentamos enviar por DM
  if (origin === 'channel' && member) {
    try {
      await member.send(text);
      dmSent = true;
      console.log(`📬 Confirmación enviada por DM a ${member.user.tag}`);
    } catch (err) {
      console.error(`❌ No se pudo enviar DM: ${err.message}`);
    }
  }

  // Si el usuario inició por DM o el DM falló, enviamos al canal
  if ((origin === 'dm' || !dmSent) && channel) {
    try {
      await channel.send(`📬 ${dmSent ? 'También' : ''} Confirmación enviada aquí:\n${text}`);
    } catch (err) {
      console.error(`❌ No se pudo enviar mensaje al canal: ${err.message}`);
    }
  }
}

module.exports = { confirmUserMigration };
