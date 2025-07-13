require('dotenv').config();
const { Client, GatewayIntentBits, Collection, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const database = require('./storage/database');
const StatsCommand = require('./commands/stats');
const UploadCommand = require('./commands/upload');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize command handlers
const statsCommand = new StatsCommand();
const uploadCommand = new UploadCommand();

// Create commands collection
client.commands = new Collection();

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('addplayer')
    .setDescription('Add a new player to the database')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Player ID')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('power')
        .setDescription('Player power level')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('kp')
        .setDescription('Player KP')
        .setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('updateplayer')
    .setDescription('Update player statistics')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Player ID')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('power')
        .setDescription('New power level')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('kp')
        .setDescription('New KP')
        .setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('getplayer')
    .setDescription('Get player information')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Player ID')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('listplayers')
    .setDescription('List all players'),
  
  new SlashCommandBuilder()
    .setName('deleteplayer')
    .setDescription('Delete a player from the database')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Player ID')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('uploadscreenshot')
    .setDescription('Upload a screenshot for a player')
    .addStringOption(option =>
      option.setName('player_id')
        .setDescription('Player ID')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('screenshot')
        .setDescription('Screenshot file')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Screenshot description')
        .setRequired(false))
];

// Register commands
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(config.CLIENT_ID),
      { body: commands }
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

// Bot event handlers
client.once('ready', async () => {
  console.log(`✅ Bot connected as ${client.user.tag}`);
  
  // Initialize database
  database.init();
  
  // Register slash commands
  await registerCommands();
  
  console.log('🚀 Bot is ready to use!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  try {
    switch (commandName) {
      case 'addplayer':
        await statsCommand.addPlayer(interaction);
        break;
      case 'updateplayer':
        await statsCommand.updatePlayer(interaction);
        break;
      case 'getplayer':
        await statsCommand.getPlayer(interaction);
        break;
      case 'listplayers':
        await statsCommand.listPlayers(interaction);
        break;
      case 'deleteplayer':
        await statsCommand.deletePlayer(interaction);
        break;
      case 'uploadscreenshot':
        await uploadCommand.handleScreenshotUpload(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command!', ephemeral: true });
    }
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    
    const errorMessage = 'There was an error executing this command!';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Legacy message handler for ping command
client.on('messageCreate', (msg) => {
  if (msg.content.toLowerCase() === '!ping') {
    msg.reply(`🏓 Pong! I'm alive, ${msg.author.username}`);
  }
});

// Initialize Express server
const app = express();
require('./server')(app, database);

// Start both services
async function startServices() {
  try {
    // Start Discord bot
    await client.login(config.DISCORD_TOKEN);
    
    // Start web server
    const server = app.listen(config.PORT, '0.0.0.0', () => {
      console.log(`🌐 Web server running on port ${config.PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        client.destroy();
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Error starting services:', error);
    process.exit(1);
  }
}

startServices();
