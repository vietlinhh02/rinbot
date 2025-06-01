const { getGuildPrefix } = require('./database.js');
const config = require('../config/config.js');

/**
 * Lấy prefix của guild/server
 * @param {string} guildId - ID của guild
 * @returns {string} - Prefix của guild
 */
async function getPrefix(guildId) {
    try {
        if (!guildId) {
            return config.prefix; // Fallback cho DM
        }
        
        const dbPrefix = await getGuildPrefix(guildId);
        return dbPrefix || config.prefix;
    } catch (error) {
        console.error('Lỗi lấy prefix:', error);
        return config.prefix; // Fallback
    }
}

module.exports = {
    getPrefix
}; 