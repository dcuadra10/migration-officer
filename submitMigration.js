const ADMIN_IDS = ['1211770249200795734', '1364726876316242010'];
const userResponses = new Map();

function getFlag(lang) {
  return lang === 'es' ? '🇪🇸 Español' : '🇺🇸 English';
}

async function notifyAdminsForApproval(userState, msg) {
  const embed = {
    title: '📝 New Migration Request',
    fields: [
      { name: '🌐 Language', value: getFlag(userState.language), inline: true },
      { name: '📛 Nickname', value: userState.nickname },
      { name: '🆔 ID', value: userState.ingame_id },
      { name: '🏰 Kingdom', value: userState.kingdom },
      { name: '⚡ Power', value: userState.power },
      { name: '🎯 Kill Points', value: userState.kp },
      { name: '💀 Deaths', value: userState.deaths }
    ],
    image: { url: userState.profile_image },
    footer: { text: `Reply with !approve ${userState.id} or !deny ${userState.id}` }
  };

  for (const adminId of ADMIN_IDS) {
    try {
      const adminUser = await msg.client.users.fetch(adminId);
      await adminUser.send({
        content: `📥 Migration request from <@${userState.id}>`,
        embeds: [embed],
        files: [userState.profile_image]
      });
    } catch (err) {
      console.error(`❌ Error sending to admin ${adminId}: ${err.message}`);
    }
  }

  userResponses.set(userState.id, { ...userState, status: 'pending' });
}

function handleAdminResponse(msg) {
  const content = msg.content.trim();
  const isApproval = content.startsWith('!approve');
  const isDenial = content.startsWith('!deny');
  const isCancel = content.startsWith('!cancel');

  if (!isApproval && !isDenial && !isCancel) return;

  const targetUserId = content.split(' ')[1];
  if (!targetUserId) {
    return msg.reply('⚠️ You must specify a user ID. Example: `!approve 1234567890`');
  }

  msg.client.users.fetch(targetUserId)
    .then(user => {
      const userState = userResponses.get(targetUserId);
      if (!userState) {
        return msg.reply(`⚠️ No migration data found for <@${targetUserId}>.`);
      }

      const lang = userState.language;

      if (isCancel) {
        userResponses.delete(targetUserId);
        user.send(lang === 'es'
          ? '🗑️ Tu solicitud de migración fue cancelada por un administrador.'
          : '🗑️ Your migration request was cancelled by an admin.')
          .catch(() => {});
        return msg.reply(`🗑️ Migration request for <@${targetUserId}> has been cancelled.`);
      }

      const prompt = lang === 'es'
        ? '✅ Tu solicitud fue aprobada. Por favor responde:\n\n*Sí voy a poder migrar*\n*No voy a poder migrar*'
        : '✅ Your request has been approved. Please reply:\n\n*Yes I will be able to migrate*\n*No I won’t be able to migrate*';

      if (isApproval) {
        user.send(prompt)
          .then(() => msg.reply(`📬 Approval message sent to <@${targetUserId}>.`))
          .catch(err => {
            console.error(`❌ Error sending approval DM: ${err.message}`);
            msg.reply(`⚠️ Could not send DM to <@${targetUserId}>.`);
          });
      } else {
        user.send(lang === 'es'
          ? '❌ Tu solicitud de migración fue rechazada.'
          : '❌ Your migration request has been denied.')
          .then(() => msg.reply(`📬 Denial message sent to <@${targetUserId}>.`))
          .catch(err => {
            console.error(`❌ Error sending denial DM: ${err.message}`);
            msg.reply(`⚠️ Could not send DM to <@${targetUserId}>.`);
          });
      }
    })
    .catch(err => {
      console.error(`❌ Error fetching user ${targetUserId}: ${err.message}`);
      msg.reply(`⚠️ Could not find user <@${targetUserId}>.`);
    });
}

async function handleUserDM(msg) {
  const userId = msg.author.id;
  const content = msg.content.toLowerCase();
  if (!userResponses.has(userId)) return;

  const userState = userResponses.get(userId);
  const lang = userState.language;
  let status = null;

  const yes = lang === 'es' ? 'sí voy a poder migrar' : 'yes i will be able to migrate';
  const no = lang === 'es' ? 'no voy a poder migrar' : 'no i won’t be able to migrate';

  if (content.includes(yes)) {
    status = lang === 'es'
      ? '✅ El usuario confirmó que podrá migrar.'
      : '✅ User confirmed they will migrate.';
  } else if (content.includes(no)) {
    status = lang === 'es'
      ? '❌ El usuario indicó que no podrá migrar.'
      : '❌ User said they cannot migrate.';
  }

  if (!status) return;

  userResponses.set(userId, { ...userState, status });

  const embed = {
    title: lang === 'es' ? '📣 Respuesta del usuario' : '📣 User Response',
    description: status,
    fields: [
      { name: '🌐 Language', value: getFlag(lang), inline: true },
      { name: '📛 Nickname', value: userState.nickname },
      { name: '🆔 ID', value: userState.ingame_id },
      { name: '🏰 Kingdom', value: userState.kingdom },
      { name: '⚡ Power', value: userState.power },
      { name: '🎯 Kill Points', value: userState.kp },
      { name: '💀 Deaths', value: userState.deaths }
    ],
    image: { url: userState.profile_image },
    footer: { text: `Reply with !approve ${userId} or !deny ${userId}` }
  };

  for (const adminId of ADMIN_IDS) {
    try {
      const adminUser = await msg.client.users.fetch(adminId);
      await adminUser.send({
        content: lang === 'es'
          ? `📬 Actualización de <@${userId}>`
          : `📬 Update from <@${userId}>`,
        embeds: [embed],
        files: [userState.profile_image]
      });
    } catch (err) {
      console.error(`❌ Error notifying admin ${adminId}: ${err.message}`);
    }
  }

  await msg.reply(lang === 'es'
    ? '✅ Tu respuesta fue enviada a los administradores.'
    : '✅ Your response has been sent to the admins.');
}

module.exports = {
  notifyAdminsForApproval,
  handleAdminResponse,
  handleUserDM
};
