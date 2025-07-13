const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.players = new Map();
        this.dataFile = path.join(__dirname, 'players.json');
    }

    // Initialize database
    init() {
        this.loadFromFile();
        console.log('Database initialized');
    }

    // Load data from file
    loadFromFile() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf8');
                const playersData = JSON.parse(data);
                
                // Convert array back to Map
                this.players = new Map(playersData.map(player => [player.id, player]));
                console.log(`Loaded ${this.players.size} players from file`);
            }
        } catch (error) {
            console.error('Error loading database from file:', error);
        }
    }

    // Save data to file
    saveToFile() {
        try {
            // Convert Map to array for JSON serialization
            const playersArray = Array.from(this.players.values());
            fs.writeFileSync(this.dataFile, JSON.stringify(playersArray, null, 2));
        } catch (error) {
            console.error('Error saving database to file:', error);
        }
    }

    // Add a new player
    addPlayer(player) {
        if (this.players.has(player.id)) {
            throw new Error(`Player with ID ${player.id} already exists`);
        }

        this.players.set(player.id, player);
        this.saveToFile();
        return player;
    }

    // Get a player by ID
    getPlayer(playerId) {
        return this.players.get(playerId) || null;
    }

    // Update a player
    updatePlayer(playerId, updates) {
        const player = this.players.get(playerId);
        if (!player) {
            throw new Error(`Player with ID ${playerId} not found`);
        }

        // Update player properties
        Object.assign(player, updates);
        player.updatedAt = new Date().toISOString();

        this.players.set(playerId, player);
        this.saveToFile();
        return player;
    }

    // Delete a player
    deletePlayer(playerId) {
        const deleted = this.players.delete(playerId);
        if (deleted) {
            this.saveToFile();
        }
        return deleted;
    }

    // Get all players
    getAllPlayers() {
        return Array.from(this.players.values());
    }

    // Add screenshot to player
    addScreenshotToPlayer(playerId, screenshot) {
        const player = this.players.get(playerId);
        if (!player) {
            throw new Error(`Player with ID ${playerId} not found`);
        }

        if (!player.screenshots) {
            player.screenshots = [];
        }

        player.screenshots.push(screenshot);
        player.updatedAt = new Date().toISOString();

        this.players.set(playerId, player);
        this.saveToFile();
        return player;
    }

    // Get player screenshots
    getPlayerScreenshots(playerId) {
        const player = this.players.get(playerId);
        return player ? player.screenshots || [] : [];
    }

    // Get database statistics
    getStats() {
        const players = Array.from(this.players.values());
        const totalScreenshots = players.reduce((sum, player) => sum + (player.screenshots?.length || 0), 0);
        
        return {
            totalPlayers: players.length,
            totalScreenshots: totalScreenshots,
            averagePower: players.length > 0 ? players.reduce((sum, p) => sum + p.power, 0) / players.length : 0,
            averageKp: players.length > 0 ? players.reduce((sum, p) => sum + p.kp, 0) / players.length : 0
        };
    }
}

module.exports = new Database();
