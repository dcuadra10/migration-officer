const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const activeConversations = new Map();

client.on('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
});

client.on('channelDelete', (channel) => {
  for (const [userId, convo] of activeConversations.entries()) {
    if (convo.channelId === channel.id) {
      console.log(`🧹 Canal eliminado, cancelando flujo para ${userId}`);
      activeConversations.delete(userId);
    }
  }
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const userId = msg.author.id;
  const content = msg.content.trim();

  // Cancelación manual
  if (content === '!cancel') {
    if (activeConversations.has(userId)) {
      activeConversations.delete(userId);
      return msg.reply('❌ Solicitud cancelada.');
    } else {
      return msg.reply('⚠️ No tenés ninguna solicitud activa.');
    }
  }

  // Flujo nuevo
  if (!activeConversations.has(userId)) {
    activeConversations.set(userId, {
      step: 1,
      channelId: msg.channel.id,
      data: {}
    });
    return msg.reply('📝 Empezando tu solicitud. ¿Cuál es tu nombre de jugador?');
  }

  // Flujo existente
  const convo = activeConversations.get(userId);

  switch (convo.step) {
    case 1:
      convo.data.username = content;
      convo.step = 2;
      return msg.reply('📍 ¿Cuál es tu alianza actual?');
    case 2:
      convo.data.alliance = content;
      convo.step = 3;
      return msg.reply('📦 ¿Qué tipo de migración querés solicitar? (Ej: entrada, salida, cambio)');
    case 3:
      convo.data.migrationType = content;
      convo.step = 4;
      return msg.reply(`✅ Solicitud registrada:\n- Jugador: ${convo.data.username}\n- Alianza: ${convo.data.alliance}\n- Tipo: ${convo.data.migrationType}\n\n¿Confirmás con "sí" o querés cancelar con "!cancel"?`);
    case 4:
      if (content.toLowerCase() === 'sí') {
        // Acá podrías enviar a Sheets, notificar admins, etc.
        msg.reply('🚀 Solicitud confirmada y enviada.');
        activeConversations.delete(userId);
      } else {
        msg.reply('❌ Solicitud no confirmada. Usá "!cancel" si querés salir.');
      }
      break;
    default:
      msg.reply('⚠️ Error en el flujo. Cancelando...');
      activeConversations.delete(userId);
  }
});

client.login(process.env.DISCORD_TOKEN);
