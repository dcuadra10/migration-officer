const fs = require('fs');
const path = require('path');
const storePath = path.join(__dirname, 'store.json');

function loadStore() {
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStore(data) {
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

function saveTicket(ticket) {
  const store = loadStore();
  const id = `${ticket.userId}-${Date.now()}`;
  store.push({ id, ...ticket });
  saveStore(store);
  return id;
}

function getTicketByUserId(userId) {
  const store = loadStore();
  return store.find(t => t.userId === userId);
}

function getTicketByMessageId(messageId) {
  const store = loadStore();
  return store.find(t => t.messageId === messageId);
}

async function updateTicket(client, id, updates) {
  const store = loadStore();
  const index = store.findIndex(t => t.id === id);
  if (index === -1) return false;

  const ticket = store[index];
  Object.assign(ticket, updates);
  store[index] = ticket;
  saveStore(store);

  // Si tiene messageId, editar el embed en canal
  if (ticket.messageId && updates.status) {
    try {
      const channelId = process.env.APPROVAL_CHANNEL_ID;
      const channel = await client.channels.fetch(channelId);
      const message = await channel.messages.fetch(ticket.messageId);
      const embed = message.embeds[0];

      const updatedEmbed = {
        ...embed,
        fields: embed.fields.map(f =>
          f.name === 'Estado'
            ? { ...f, value: `🟡 ${updates.status} (${updates.source})` }
            : f
        )
      };

      await message.edit({ embeds: [updatedEmbed] });
    } catch (err) {
      console.error('No se pudo editar el mensaje de aprobación:', err.message);
    }
  }

  return true;
}

module.exports = {
  saveTicket,
  getTicketByUserId,
  getTicketByMessageId,
  updateTicket
};
