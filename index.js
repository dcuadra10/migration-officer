const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const config = require('./config');
const database = require('./storage/database');
const statsCommand = require('./commands/stats');
const uploadCommand = require('./commands/upload');

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Initialize database
database.init();

// Command registry
const commands = [
    {
        name: 'addplayer',
        description: 'Add a new player to the database',
        options: [
            {
                name: 'id',
                description: 'Player ID',
                type: 3, // STRING
                required: true
            },
            {
                name: 'power',
                description: 'Player power level',
                type: 4, // INTEGER
                required: false
            },
            {
                name: 'kp',
                description: 'Player KP (Kill Points)',
                type: 4, // INTEGER
                required: false
            }
        ]
    },
    {
        name: 'updateplayer',
        description: 'Update player statistics',
        options: [
            {
                name: 'id',
                description: 'Player ID',
                type: 3, // STRING
                required: true
            },
            {
                name: 'power',
                description: 'New power level',
                type: 4, // INTEGER
                required: false
            },
            {
                name: 'kp',
                description: 'New KP value',
                type: 4, // INTEGER
                required: false
            }
        ]
    },
    {
        name: 'getplayer',
        description: 'Get player statistics',
        options: [
            {
                name: 'id',
                description: 'Player ID',
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: 'listplayers',
        description: 'List all players in the database'
    },
    {
        name: 'deleteplayer',
        description: 'Delete a player from the database',
        options: [
            {
                name: 'id',
                description: 'Player ID',
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: 'uploadscreenshot',
        description: 'Upload a screenshot for a player (use with attachment)',
        options: [
            {
                name: 'player_id',
                description: 'Player ID to associate screenshot with',
                type: 3, // STRING
                required: true
            },
            {
                name: 'description',
                description: 'Screenshot description',
                type: 3, // STRING
                required: false
            }
        ]
    }
];

// Register slash commands
async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
        
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(config.CLIENT_ID),
            { body: commands }
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Bot ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is ready and online!');
    registerCommands();
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
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
        console.error(`Error handling command ${commandName}:`, error);
        
        const errorMessage = 'An error occurred while processing your command. Please try again.';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Start the bot
client.login(config.DISCORD_TOKEN);

// Start Express server for file uploads
require('./server');
