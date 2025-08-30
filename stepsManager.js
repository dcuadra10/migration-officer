const { notifyAdminsForApproval, pendingRequests, saveRequests } = require('./submitMigration');

const pendingUserSteps = new Map();

const translations = {
  es: {
    ask_nickname: '🧑 ¿Cuál es tu nickname?',
    ask_id: '🆔 ¿Cuál es tu ID de juego?',
    ask_kingdom: '🏰 ¿En qué reino estás?',
    ask_power: '⚡ ¿Cuál es tu poder?',
    ask_kp: '🎯 ¿Cuántos kill points tenés?',
    ask_deaths: '💀 ¿Cuántas muertes tenés?',
    ask_screenshot: '📸 Subí una captura de tu perfil.',
    missing_image: '⚠️ Necesito una imagen para continuar.',
    confirm: '✅ Gracias. Tu solicitud será enviada a los administradores.'
  },
  en: {
    ask_nickname: '🧑 What is your nickname?',
    ask_id: '🆔 What is your in-game ID?',
    ask_kingdom: '🏰 What kingdom are you in?',
    ask_power: '⚡ What is your power?',
    ask_kp: '🎯 How many kill points do you have?',
    ask_deaths: '💀 How many deaths?',
    ask_screenshot: '📸 Please upload a screenshot of your profile.',
    missing_image: '⚠️ I need an image to continue.',
    confirm: '✅ Thank you. Your request will be sent to the admins.'
  }
};

function detectLanguage(content) {
  return content.trim().toLowerCase() === 'hola' ? 'es' : 'en';
}

async function handleUserStep(msg) {
  const userId = msg.author.id;
  const content = msg.content?.trim();
  let userState = pendingUserSteps.get(userId);

  if (!userState) {
    userState = {
      step: 'ask_nickname',
      language: detectLanguage(content),
      channelId: msg.channel.id
    };
  }

  const t = translations[userState.language];

  switch (userState.step) {
    case 'ask_nickname':
      userState.nickname = content;
      userState.step = 'ask_id';
      pendingUserSteps.set(userId, userState);
      return msg.reply(t.ask_id);

    case 'ask_id':
      userState.ingame_id = content;
      userState.step = 'ask_kingdom';
      return msg.reply(t.ask_kingdom);

    case 'ask_kingdom':
      userState.kingdom = content;
      userState.step = 'ask_power';
      return msg.reply(t.ask_power);

    case 'ask_power':
      userState.power = content;
      userState.step = 'ask_kp';
      return msg.reply(t.ask_kp);

    case 'ask_kp':
      userState.kp = content;
      userState.step = 'ask_deaths';
      return msg.reply(t.ask_deaths);

    case 'ask_deaths':
      userState.deaths = content;
      userState.step = 'ask_screenshot';
      return msg.reply(t.ask_screenshot);

    case 'ask_screenshot':
      if (!msg.attachments.size) {
        return msg.reply(t.missing_image);
      }

      userState.profile_image = msg.attachments.first().url;
      userState.step = 'done';
      pendingUserSteps.delete(userId);
      msg.reply(t.confirm);

      const summary = `
🧑 Nickname: ${userState.nickname}
🆔 ID: ${userState.ingame_id}
🏰 Kingdom: ${userState.kingdom}
⚡ Power: ${userState.power}
🎯 Kill Points: ${userState.kp}
💀 Deaths: ${userState.deaths}
📸 Screenshot: ${userState.profile_image}
`.trim();

      try {
        const approvalMessageId = await notifyAdminsForApproval(
          msg.client,
          userId,
          userState.language,
          summary
        );

        pendingRequests.set(userId, {
          channelId: msg.channel.id,
          language: userState.language,
          lastMessageId: msg.id,
          approvalMessageId
        });

        saveRequests();
      } catch (err) {
        console.error(`❌ Error al enviar solicitud: ${err.message}`);
        msg.channel.send('⚠️ No se pudo enviar la solicitud a los administradores.');
      }

      return;
  }

  pendingUserSteps.set(userId, userState);
}

function handleChannelDelete(channel) {
  for (const [userId, state] of pendingUserSteps.entries()) {
    if (state.channelId === channel.id) {
      pendingUserSteps.delete(userId);
      console.log(`🧹 Flujo cancelado para ${userId} por eliminación del canal`);
    }
  }
}

module.exports = {
  handleUserStep,
  pendingUserSteps,
  handleChannelDelete
};
