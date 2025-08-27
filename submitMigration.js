const { Client, EmbedBuilder } = require('discord.js');

const ADMIN_IDS = ['1211770249200795734', '1364726876316242010']; // Reemplazá con tus IDs
const pendingApprovals = new Map(); // userId → { approvals: [], denials: [], data }

function notifyAdminsForApproval(userData, msg) {
  const embed = new EmbedBuilder()
    .setTitle('📝 Nueva solicitud de migración')
    .addFields(
      { name: 'Nickname', value: userData.nickname },
      { name: 'ID', value: userData.ingame_id },
      { name: 'Kingdom', value: userData.kingdom },
      { name: 'Power', value: String(userData.power) },
      { name: 'Kill Points', value: String(userData.kp) },
      { name: 'Deaths', value: String(userData.deaths) },
      { name: 'Total Points', value: String((userData.kp + userData.deaths) || 0) }
    )
    .setImage(userData.power_kp_image)
    .setThumbnail(userData.deaths_image)
    .setFooter({ text: `User ID: ${userData.id}` });

  pendingApprovals.set(userData.id, {
    approvals: [],
    denials: [],
    data: userData,
  });

  ADMIN_IDS.forEach(async (adminId) => {
    try {
      const admin = await msg.client.users.fetch(adminId);
      await admin.send({ embeds: [embed] });
      await admin.send(`Para aprobar: \`!approve ${userData.id}\`\nPara rechazar: \`!deny ${userData.id}\``);
    } catch (err) {
      console.error(`❌ Error al enviar DM a admin ${adminId}:`, err);
    }
  });
}

function handleAdminResponse(msg) {
  const [command, targetId] = msg.content.split(' ');
  const adminId = msg.author.id;

  if (!ADMIN_IDS.includes(adminId)) return msg.reply('⛔ No estás autorizado para aprobar o denegar.');

  const entry = pendingApprovals.get(targetId);
  if (!entry) return msg.reply('❌ No hay solicitud pendiente para ese usuario.');

  if (command === '!approve') {
    if (!entry.approvals.includes(adminId)) entry.approvals.push(adminId);
    if (entry.approvals.length >= 2) {
      pendingApprovals.delete(targetId);
      return msg.reply('✅ Migración aprobada por todos los admins. Podés migrar cuando estés listo.');
    } else {
      return msg.reply(`🕓 Aprobación registrada. Faltan ${2 - entry.approvals.length} admin(s).`);
    }
  }

  if (command === '!deny') {
    if (!entry.denials.includes(adminId)) entry.denials.push(adminId);
    if (entry.denials.length >= 2) {
      pendingApprovals.delete(targetId);
      return msg.reply('❌ Migración denegada por todos los admins.');
    } else {
      return msg.reply(`🕓 Denegación registrada. Faltan ${2 - entry.denials.length} admin(s).`);
    }
  }
}

module.exports = { notifyAdminsForApproval, handleAdminResponse };
