const { EmbedBuilder } = require('discord.js');
const database = require('../storage/database');
const fileHandler = require('../utils/fileHandler');

class UploadCommand {
    async handleScreenshotUpload(interaction) {
        const playerId = interaction.options.getString('player_id');
        const description = interaction.options.getString('description') || 'No description provided';

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

        // Check for attachments
        const attachment = interaction.options.getAttachment('screenshot');
        if (!attachment) {
            // Check if there are any attachments in the message
            const messageAttachments = Array.from(interaction.message?.attachments?.values() || []);
            if (messageAttachments.length === 0) {
                await interaction.reply({ 
                    content: 'Please attach a screenshot file to upload!', 
                    ephemeral: true 
                });
                return;
            }
        }

        await interaction.deferReply();

        try {
            // Use the attachment from options or the first message attachment
            const fileToUpload = attachment || Array.from(interaction.message.attachments.values())[0];
            
            // Validate file type and size
            const validation = fileHandler.validateFile(fileToUpload);
            if (!validation.valid) {
                await interaction.editReply({ content: validation.error });
                return;
            }

            // Download and save the file
            const savedFile = await fileHandler.saveFile(fileToUpload, playerId);
            
            // Create screenshot record
            const screenshot = {
                id: savedFile.id,
                filename: savedFile.filename,
                originalName: fileToUpload.name,
                url: fileToUpload.url,
                description: description,
                uploadedAt: new Date().toISOString(),
                size: fileToUpload.size,
                contentType: fileToUpload.contentType
            };

            // Add screenshot to player
            database.addScreenshotToPlayer(playerId, screenshot);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Screenshot Uploaded Successfully')
                .addFields(
                    { name: 'Player ID', value: playerId, inline: true },
                    { name: 'Description', value: description, inline: true },
                    { name: 'File Size', value: `${(fileToUpload.size / 1024).toFixed(2)} KB`, inline: true }
                )
                .setImage(fileToUpload.url)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error uploading screenshot:', error);
            await interaction.editReply({ 
                content: 'An error occurred while uploading the screenshot. Please try again.' 
            });
        }
    }
}

module.exports = UploadCommand;
