const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getLocalizedText(lang, type) {
  const messages = {
    es: {
      prompt: '¿Desea migrar?',
      yes: '✅ Sí migrará',
      no: '❌ No migrará',
      approved: 'Tu solicitud de **no migrar** ha sido aprobada.',
      confirmed: 'Gracias por confirmar que migrarás ✅'
    },
    en: {
      prompt: 'Do you wish to migrate?',
      yes: '✅ Will migrate',
      no: '❌ Will not migrate',
      approved: 'Your request **not to migrate** has been approved.',
      confirmed: 'Thank you for confirming you will migrate ✅'
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

    if (action === 'migrate') {
      if (interaction.customId.startsWith('migrate_no')) {
        await interaction.reply({ content: getLocalizedText(lang, 'approved'), ephemeral: true });

        try {
          await targetUser.send(getLocalizedText(lang, 'approved'));
        } catch (err) {
          console.error(`❌ No se pudo enviar DM a ${targetUser.tag}: ${err.message}`);
        }
      }

      if (interaction.customId.startsWith('migrate_yes')) {
        await interaction.reply({ content: getLocalizedText(lang, 'confirmed'), ephemeral: true });
      }
    }
  }
};
