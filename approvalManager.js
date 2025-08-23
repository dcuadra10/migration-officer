// approvalManager.js
module.exports = class ApprovalManager {
  constructor(client, guildId, adminRoleName) {
    this.client = client;
    this.guildId = guildId;
    this.adminRoleName = adminRoleName;
  }

  async isAdmin(userId) {
    const guild = await this.client.guilds.fetch(this.guildId);
    const member = await guild.members.fetch(userId);
    return member.roles.cache.some(role => role.name === this.adminRoleName);
  }

  async handleCommand(message) {
    if (message.channel.type !== 'DM') return;

    const isAuthorized = await this.isAdmin(message.author.id);
    if (!isAuthorized) {
      return message.reply("⛔ No estás autorizado para usar este comando.");
    }

    const content = message.content.trim();
    if (content.startsWith("!approve")) {
      // lógica de aprobación
      return message.reply("✅ Aprobación registrada.");
    } else if (content.startsWith("!deny")) {
      // lógica de denegación
      return message.reply("❌ Denegación registrada.");
    }
  }
};
