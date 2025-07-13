# Discord Bot Player Stats System

## Overview

This is a Discord bot application that manages player statistics and screenshot uploads for what appears to be a gaming community. The system combines a Discord bot with a web server to handle player data management and file uploads.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Node.js** application with two main components:
  - Discord bot client using discord.js v14
  - Express web server for file uploads and API endpoints
- **File-based database** using JSON storage with in-memory Map for performance
- **Modular command system** with separate command handlers

### Storage Solution
- **Local JSON file storage** (`players.json`) for player data persistence
- **File system storage** for uploaded screenshots in `./uploads` directory
- **In-memory Map** for fast data access during runtime

### Bot Architecture
- **Slash commands** for Discord interactions
- **Intent-based permissions** for guild messages and direct messages
- **Embed-based responses** for rich Discord messages

## Key Components

### 1. Discord Bot Client (`index.js`)
- Initializes Discord client with necessary intents
- Registers slash commands for player management
- Handles bot authentication and connection

### 2. Web Server (`server.js`)
- Express server running on configurable port (default 8000)
- Multer middleware for file upload handling
- CORS enabled for cross-origin requests
- Static file serving for uploaded screenshots

### 3. Database Layer (`storage/database.js`)
- Simple file-based storage system
- Maps player IDs to player objects
- Automatic file persistence on data changes
- In-memory caching for performance

### 4. Command System
- **Stats Command** (`commands/stats.js`): Handles player addition and statistics management
- **Upload Command** (`commands/upload.js`): Manages screenshot uploads and associations

### 5. Utilities
- **File Handler** (`utils/fileHandler.js`): Validates and processes file uploads
- **Config** (`config.js`): Centralized configuration management

## Data Flow

### Player Management Flow
1. Discord user issues `/addplayer` command
2. Bot validates player ID uniqueness
3. Player data stored in memory Map and persisted to JSON file
4. Confirmation sent via Discord embed

### Screenshot Upload Flow
1. User uploads screenshot via Discord command
2. File validated for type and size limits
3. File downloaded from Discord CDN to local storage
4. File association stored in player's record
5. Confirmation sent with file details

### Data Persistence Flow
1. All player data changes trigger automatic file save
2. On startup, JSON file loaded into memory Map
3. File system used for screenshot storage with UUID naming

## External Dependencies

### Discord Integration
- **discord.js v14**: Primary bot framework
- **Discord API**: Slash commands and message handling
- **Discord CDN**: Source for uploaded file downloads

### File Processing
- **Multer**: File upload middleware
- **UUID**: Unique file naming
- **Built-in Node.js modules**: fs, path, https, http for file operations

### Web Framework
- **Express v5**: Web server framework
- **Built-in middleware**: JSON parsing, URL encoding, CORS

## Deployment Strategy

### Configuration
- Environment variables for sensitive data (Discord tokens)
- Configurable ports and file size limits
- Centralized config management

### File Storage
- Local file system storage for uploads
- Automatic directory creation for upload folder
- Static file serving for web access to uploads

### Process Management
- Single Node.js process handling both bot and web server
- File-based persistence eliminates database server dependency
- Startup script configured in package.json

### Security Considerations
- File type validation for uploads
- File size limits (8MB default)
- CORS configuration for web requests
- Environment variable protection for tokens

The system is designed for simplicity and ease of deployment, using file-based storage instead of a traditional database server. This makes it suitable for small to medium-sized Discord communities without requiring complex database setup.