const path = require('path');

const config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'your_bot_token_here',
    CLIENT_ID: process.env.CLIENT_ID || 'your_client_id_here',
    PORT: process.env.PORT || 3000,
    MAX_FILE_SIZE: 8 * 1024 * 1024, // 8MB max file size
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    UPLOAD_DIR: path.join(__dirname, 'uploads')
};

module.exports = config;

