const { EmbedBuilder } = require('discord.js');
const database = require('../storage/database');

class StatsCommand {
    async addPlayer(interaction) {
        const playerId = interaction.options.getString('id');
        const power = interaction.options.getInteger('power') || 0;
        const kp = interaction.options.getInteger('kp') || 0;

        // Validate player ID
        if (!playerId || playerId.trim().length === 0) {
            await interaction.reply({ content: 'Player ID cannot be empty!', ephemeral: true });
            return;
        }

        // Check if player already exists
        const existingPlayer = database.getPlayer(playerId);
        if (existingPlayer) {
            await interaction.reply({ 
                content: `Player with ID "${playerId}" already exists! Use /updateplayer to modify their stats.`, 
                ephemeral: true 
            });
            return;
        }

        // Add player to database
        const player = {
            id: playerId.trim(),
            power: power,
            kp: kp,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            screenshots: []
        };

        database.addPlayer(player);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Player Added Successfully')
            .addFields(
                { name: 'Player ID', value: player.id, inline: true },
                { name: 'Power', value: player.power.toString(), inline: true },
                { name: 'KP', value: player.kp.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async updatePlayer(interaction) {
        const playerId = interaction.options.getString('id');
        const newPower = interaction.options.getInteger('power');
        const newKp = interaction.options.getInteger('kp');

        // Validate player ID
        if (!playerId || playerId.trim().length === 0) {
            await interaction.reply({ content: 'Player ID cannot be empty!', ephemeral: true });
            return;
        }

        // Check if player exists
        const player = database.getPlayer(playerId);
        if (!player) {
            await interaction.reply({ 
                content: `Player with ID "${playerId}" not found! Use /addplayer to add them first.`, 
                ephemeral: true 
            });
            return;
        }

        // Update player stats
        const updates = {};
        if (newPower !== null) updates.power = newPower;
        if (newKp !== null) updates.kp = newKp;

        if (Object.keys(updates).length === 0) {
            await interaction.reply({ 
                content: 'No updates provided! Please specify at least one stat to update.', 
                ephemeral: true 
            });
            return;
        }

        const updatedPlayer = database.updatePlayer(playerId, updates);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Player Updated Successfully')
            .addFields(
                { name: 'Player ID', value: updatedPlayer.id, inline: true },
                { name: 'Power', value: updatedPlayer.power.toString(), inline: true },
                { name: 'KP', value: updatedPlayer.kp.toString(), inline: true }
            )
            .setFooter({ text: `Last updated: ${new Date(updatedPlayer.updatedAt).toLocaleString()}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async getPlayer(interaction) {
        const playerId = interaction.options.getString('id');

        // Validate player ID
        if (!playerId || playerId.trim().length === 0) {
            await interaction.reply({ content: 'Player ID cannot be empty!', ephemeral: true });
            return;
        }

        // Get player from database
        const player = database.getPlayer(playerId);
        if (!player) {
            await interaction.reply({ 
                content: `Player with ID "${playerId}" not found!`, 
                ephemeral: true 
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Player Stats: ${player.id}`)
            .addFields(
                { name: 'Power', value: player.power.toString(), inline: true },
                { name: 'KP', value: player.kp.toString(), inline: true },
                { name: 'Screenshots', value: player.screenshots.length.toString(), inline: true }
            )
            .setFooter({ text: `Created: ${new Date(player.createdAt).toLocaleString()}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async listPlayers(interaction) {
        const players = database.getAllPlayers();

        if (players.length === 0) {
            await interaction.reply({ content: 'No players found in the database!', ephemeral: true });
            return;
        }

        // Sort players by power (descending)
        const sortedPlayers = players.sort((a, b) => b.power - a.power);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Player Database (${players.length} players)`)
            .setTimestamp();

        // Add players to embed (limit to 25 fields due to Discord limits)
        const displayPlayers = sortedPlayers.slice(0, 25);
        
        displayPlayers.forEach((player, index) => {
            embed.addFields({
                name: `${index + 1}. ${player.id}`,
                value: `Power: ${player.power} | KP: ${player.kp}`,
                inline: true
            });
        });

        if (sortedPlayers.length > 25) {
            embed.setFooter({ text: `Showing top 25 players out of ${players.length}` });
        }

        await interaction.reply({ embeds: [embed] });
    }

    async deletePlayer(interaction) {
        const playerId = interaction.options.getString('id');

        // Validate player ID
        if (!playerId || playerId.trim().length === 0) {
            await interaction.reply({ content: 'Player ID cannot be empty!', ephemeral: true });
            return;
        }

        // Check if player exists
        const player = database.getPlayer(playerId);
        if (!player) {
            await interaction.reply({ 
                content: `Player with ID "${playerId}" not found!`, 
                ephemeral: true 
            });
            return;
        }

        // Delete player from database
        database.deletePlayer(playerId);

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Player Deleted Successfully')
            .setDescription(`Player "${playerId}" has been removed from the database.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = new StatsCommand();
