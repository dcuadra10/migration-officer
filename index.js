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
const multer = require('multer');

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        if (config.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(config.UPLOAD_DIR));

// CORS middleware for web requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Get all players
app.get('/api/players', (req, res) => {
    try {
        const players = database.getAllPlayers();
        res.json(players);
    } catch (error) {
        console.error('Error getting players:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific player
app.get('/api/players/:id', (req, res) => {
    try {
        const player = database.getPlayer(req.params.id);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player);
    } catch (error) {
        console.error('Error getting player:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// File upload endpoint
app.post('/api/upload/:playerId', upload.single('screenshot'), (req, res) => {
    try {
        const playerId = req.params.playerId;
        const description = req.body.description || 'No description provided';

        // Check if player exists
        const player = database.getPlayer(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create screenshot record
        const screenshot = {
            id: req.file.filename,
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: `/uploads/${req.file.filename}`,
            description: description,
            uploadedAt: new Date().toISOString(),
            size: req.file.size,
            contentType: req.file.mimetype
        };

        // Add screenshot to player
        database.addScreenshotToPlayer(playerId, screenshot);

        res.json({
            success: true,
            message: 'Screenshot uploaded successfully',
            screenshot: screenshot
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get player screenshots
app.get('/api/players/:id/screenshots', (req, res) => {
    try {
        const player = database.getPlayer(req.params.id);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player.screenshots || []);
    } catch (error) {
        console.error('Error getting screenshots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Database statistics endpoint
app.get('/api/stats', (req, res) => {
    try {
        const players = database.getAllPlayers();
        const totalPlayers = players.length;
        const totalScreenshots = players.reduce((total, player) => 
            total + (player.screenshots ? player.screenshots.length : 0), 0);
        
        const totalPower = players.reduce((total, player) => total + (player.power || 0), 0);
        const totalKp = players.reduce((total, player) => total + (player.kp || 0), 0);
        
        const averagePower = totalPlayers > 0 ? totalPower / totalPlayers : 0;
        const averageKp = totalPlayers > 0 ? totalKp / totalPlayers : 0;
        
        res.json({
            totalPlayers,
            totalScreenshots,
            averagePower,
            averageKp,
            totalPower,
            totalKp
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Simple web interface
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Discord Bot Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
                .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                .stat-card { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
                .stat-value { font-size: 2em; font-weight: bold; color: #333; }
                .stat-label { font-size: 0.9em; color: #666; }
                .endpoint { background: #e8f4f8; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .method { font-weight: bold; color: #0066cc; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Discord Bot Dashboard</h1>
                <p>Bot is running and connected to Discord!</p>
                
                <div id="stats" class="stats">
                    <div class="stat-card">
                        <div class="stat-value" id="playerCount">Loading...</div>
                        <div class="stat-label">Players</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="screenshotCount">Loading...</div>
                        <div class="stat-label">Screenshots</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="avgPower">Loading...</div>
                        <div class="stat-label">Avg Power</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="avgKp">Loading...</div>
                        <div class="stat-label">Avg KP</div>
                    </div>
                </div>

                <h2>Available API Endpoints</h2>
                <div class="endpoint">
                    <span class="method">GET</span> /api/players - Get all players
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> /api/players/:id - Get specific player
                </div>
                <div class="endpoint">
                    <span class="method">POST</span> /api/upload/:playerId - Upload screenshot for player
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> /api/players/:id/screenshots - Get player screenshots
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> /api/stats - Get database statistics
                </div>
            </div>

            <script>
                // Load stats
                fetch('/api/stats')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('playerCount').textContent = data.totalPlayers;
                        document.getElementById('screenshotCount').textContent = data.totalScreenshots;
                        document.getElementById('avgPower').textContent = Math.round(data.averagePower);
                        document.getElementById('avgKp').textContent = Math.round(data.averageKp);
                    })
                    .catch(error => {
                        console.error('Error loading stats:', error);
                    });
            </script>
        </body>
        </html>
    `);
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

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