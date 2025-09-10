const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { pendingRequests, saveRequests } = require('./submitMigration');

function getLocalizedText(lang, type) {
  const messages = {
    es: {
      prompt: '¿Desea migrar?',
      yes: '✅ Sí migrará',
      no: '❌ No migrará',
      approved: 'Tu solicitud de **no migrar** ha sido aprobada.',
      confirmed: 'Gracias por confirmar que migrarás ✅',
      closing: '📌 Este canal se cerrará en breve...'
    },
    en: {
      prompt: 'Do you wish to migrate?',
      yes: '✅ Will migrate',
      no: '❌ Will not migrate',
      approved: 'Your request **not to migrate** has been approved.',
      confirmed: 'Thank you for confirming you will migrate ✅',
      closing: '📌 This channel will close shortly...'
    }
  };
  return messages[lang]?.[type] || messages.en[type];
}

module.exports = {
  sendMigrationPrompt: async (channel, targetUser, lang = 'en') => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`migrate_yes_${targetUser.id}_${lang}`)
        .setLabel(getLocalizedText(lang, 'yes'))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`migrate_no_${targetUser.id}_${lang}`)
        .setLabel(getLocalizedText(lang, 'no'))
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${getLocalizedText(lang, 'prompt')} ${targetUser}`,
      components: [row]
    });
  },

  handleMigrationResponse: async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, , userId, lang = 'en'] = interaction.customId.split('_');
    const targetUser = await interaction.client.users.fetch(userId);
    const request = pendingRequests.get(userId);

    if (action !== 'migrate' || !request) return;

    if (interaction.customId.startsWith('migrate_no')) {
      await interaction.reply({ content: getLocalizedText(lang, 'approved'), ephemeral: true });

      try {
        await targetUser.send(getLocalizedText(lang, 'approved'));
      } catch (err) {
        console.error(`❌ No se pudo enviar DM a ${targetUser.tag}: ${err.message}`);
      }

      // Webhook: registrar decisión
      const payload = {
        discord_id: userId,
        decision: 'no_migrate',
        language: lang,
        timestamp: new Date().toISOString()
      };

      try {
        await fetch(process.env.SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log(`📤 Webhook enviado para no migrar: ${targetUser.tag}`);
      } catch (err) {
        console.error('❌ Error al enviar decisión al webhook:', err.message);
      }

      // Actualizar embed de aprobación
      try {
        const approvalChannel = await interaction.client.channels.fetch(request.approvalChannelId);
        const approvalMessage = await approvalChannel.messages.fetch(request.approvalMessageId);
        const embed = approvalMessage.embeds[0];
        const updatedEmbed = EmbedBuilder.from(embed).setFooter({
          text: `Estado: no migrará (usuario)`
        });
        await approvalMessage.edit({ embeds: [updatedEmbed] });
      } catch (err) {
        console.error('❌ No se pudo editar el embed de aprobación:', err.message);
      }

      // Cerrar canal
      const channel = await interaction.client.channels.fetch(request.channelId).catch(() => null);
      if (channel?.name?.startsWith('ticket-')) {
        try {
          await channel.send(getLocalizedText(lang, 'closing'));
          setTimeout(() => channel.delete().catch(() => {}), 5000);
        } catch (err) {
          console.error(`❌ No se pudo eliminar el canal ${channel.name}: ${err.message}`);
        }
      }
      const request = require('./submitMigration').pendingRequests.get(userId);
if (request?.approvalChannelId && request?.approvalMessageId) {
  try {
    const approvalChannel = await interaction.client.channels.fetch(request.approvalChannelId);
    const approvalMessage = await approvalChannel.messages.fetch(request.approvalMessageId);
    const embed = approvalMessage.embeds[0];
    const updatedEmbed = EmbedBuilder.from(embed).setFooter({
      text: `Estado: no migrará (usuario)`
    });
    await approvalMessage.edit({ embeds: [updatedEmbed] });
  } catch (err) {
    console.error('❌ No se pudo editar el embed de aprobación:', err.message);
  }
}


      pendingRequests.delete(userId);
      saveRequests();
    }

    if (interaction.customId.startsWith('migrate_yes')) {
      await interaction.reply({ content: getLocalizedText(lang, 'confirmed'), ephemeral: true });
    }
  }
};

