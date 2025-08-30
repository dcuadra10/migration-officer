const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class FileHandler {
    constructor() {
        this.ensureUploadDir();
    }

    // Ensure upload directory exists
    ensureUploadDir() {
        if (!fs.existsSync(config.UPLOAD_DIR)) {
            fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
        }
    }

    // Validate file type and size
    validateFile(attachment) {
        // Check file size
        if (attachment.size > config.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File too large! Maximum size is ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`
            };
        }

        // Check file type
        if (!config.ALLOWED_FILE_TYPES.includes(attachment.contentType)) {
            return {
                valid: false,
                error: `Invalid file type! Allowed types: ${config.ALLOWED_FILE_TYPES.join(', ')}`
            };
        }

        return { valid: true };
    }

    // Save file to local storage
    async saveFile(attachment, playerId) {
        return new Promise((resolve, reject) => {
            const fileId = uuidv4();
            const fileExtension = path.extname(attachment.name) || '.png';
            const filename = `${playerId}_${fileId}${fileExtension}`;
            const filepath = path.join(config.UPLOAD_DIR, filename);

            // Choose http or https based on URL
            const client = attachment.url.startsWith('https:') ? https : http;

            const file = fs.createWriteStream(filepath);
            
            client.get(attachment.url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download file: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve({
                        id: fileId,
                        filename: filename,
                        filepath: filepath,
                        size: attachment.size
                    });
                });

                file.on('error', (error) => {
                    fs.unlink(filepath, () => {}); // Delete file on error
                    reject(error);
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    // Delete file from storage
    deleteFile(filename) {
        const filepath = path.join(config.UPLOAD_DIR, filename);
        
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            return true;
        }
        
        return false;
    }

    // Get file info
    getFileInfo(filename) {
        const filepath = path.join(config.UPLOAD_DIR, filename);
        
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            return {
                filename: filename,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            };
        }
        
        return null;
    }

    // List all files in upload directory
    listFiles() {
        try {
            const files = fs.readdirSync(config.UPLOAD_DIR);
            return files.map(filename => this.getFileInfo(filename)).filter(Boolean);
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }

    // Clean up old files (optional utility)
    cleanupOldFiles(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const files = this.listFiles();
        let deletedCount = 0;

        files.forEach(fileInfo => {
            if (fileInfo.created < cutoffDate) {
                if (this.deleteFile(fileInfo.filename)) {
                    deletedCount++;
                }
            }
        });

        return deletedCount;
    }
}

module.exports = new FileHandler();
