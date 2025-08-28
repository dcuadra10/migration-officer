const pendingUserSteps = new Map();
const { notifyAdminsForApproval } = require('./submitMigration');

const translations = {
  es: {
    ask_nickname: '📛 ¿Cuál es tu nombre en el juego?',
    ask_ingameid: '🆔 ¿Cuál es tu ID de jugador?',
    ask_kingdom: '🏰 ¿En qué reino estás?',
    ask_power: '⚡ ¿Cuánto poder tienes?',
    ask_kp: '🎯 ¿Cuántos puntos de kill tienes?',
    ask_deaths: '💀 ¿Cuántas muertes tienes?',
    ask_screenshot: '📸 Por favor sube una captura de pantalla de tu perfil in-game.',
    confirm: '✅ Gracias. Tu solicitud será enviada a los administradores.',
  },
  en: {
    ask_nickname: '📛 What is your in-game nickname?',
    ask_ingameid: '🆔 What is your in-game ID?',
    ask_kingdom: '🏰 What kingdom are you in?',
    ask_power: '⚡ How much power do you have?',
    ask_kp: '🎯 How many kill points do you have?',
    ask_deaths: '💀 How many deaths do you have?',
    ask_screenshot: '📸 Please upload a screenshot of your in-game profile.',
    confirm: '✅ Thank you. Your request will be sent to the admins.',
  }
};

function detectLanguage(content) {
  const lowered = content.toLowerCase();
  if (lowered.includes('hola') || lowered.includes('buenas')) return 'es';
  if (lowered.includes('hello') || lowered.includes('hi')) return 'en';
  return 'en';
}

async function handleUserStep(msg) {
  const userId = msg.author.id;
  const content = msg.content.trim();
  let userState = pendingUserSteps.get(userId);

  if (!userState) {
    const lang = detectLanguage(content);
    userState = { id: userId, step: 'ask_nickname', language: lang, channelId: msg.channel.id };
    pendingUserSteps.set(userId, userState);
    return msg.reply(translations[lang].ask_nickname);
  }

  const t = translations[userState.language];

  switch (userState.step) {
    case 'ask_nickname':
      userState.nickname = content;
      userState.step = 'ask_ingameid';
      return msg.reply(t.ask_ingameid);

    case 'ask_ingameid':
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
      if (!msg.attachments.size) return msg.reply('📎 Please upload an image.');
      userState.profile_image = msg.attachments.first().url;
      userState.step = 'done';
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

      return notifyAdminsForApproval(msg, userId, userState.language, { summary });
  }
}

function handleChannelDelete(channel) {
  for (const [userId, state] of pendingUserSteps.entries()) {
    if (state.channelId === channel.id) {
      pendingUserSteps.delete(userId);
      console.log(`🧹 Flujo cancelado para ${userId} por eliminación del canal`);
    }
  }
}

module.exports = { handleUserStep, pendingUserSteps, handleChannelDelete };
