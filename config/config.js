require('dotenv').config();

module.exports = {
    // Bot configuration
    token: process.env.DISCORD_TOKEN || 'your_bot_token_here',
    mongoUri: process.env.MONGO_URI || '',
    prefix: process.env.DEFAULT_PREFIX || ',',
    
    // Owner configuration - hỗ trợ nhiều owner
    get ownerIds() {
        const ownerString = process.env.DISCORD_OWNER_IDS || process.env.DISCORD_OWNER_ID || '429078973562093569,1328980118223458388';
        if (!ownerString) return [];
        
        // Hỗ trợ cả định dạng cũ (single ID) và mới (multiple IDs cách nhau bởi dấu phẩy)
        return ownerString.split(',').map(id => id.trim()).filter(id => id);
    },
    
    // Helper function để kiểm tra user có phải owner không
    isOwner(userId) {
        return this.ownerIds.includes(userId);
    },
    
    // Deploy notification config
    deployWebhook: {
        id: process.env.DEPLOY_WEBHOOK_ID || null,
        token: process.env.DEPLOY_WEBHOOK_TOKEN || null,
        channelId: process.env.DEPLOY_CHANNEL_ID || null
    },
    
    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    
    intents: [
        'Guilds',
        'GuildMessages',
        'MessageContent',
        'GuildMembers',
        'GuildMessageReactions'
    ],
    
    // Validation function
    validate() {
        const errors = [];
        
        if (!this.token || this.token === 'your_bot_token_here') {
            errors.push('❌ DISCORD_TOKEN không hợp lệ');
        }
        
        if (!this.mongoUri) {
            errors.push('❌ MONGO_URI không được cung cấp');
        }
        
        if (this.deployWebhook.id && !this.deployWebhook.token) {
            errors.push('⚠️ DEPLOY_WEBHOOK_TOKEN không được cung cấp');
        }
        
        // Kiểm tra owner IDs
        const ownerIds = this.ownerIds;
        if (ownerIds.length === 0) {
            errors.push('⚠️ Chưa cấu hình DISCORD_OWNER_IDS hoặc DISCORD_OWNER_ID');
        } else {
            // Kiểm tra định dạng của từng owner ID
            const invalidIds = ownerIds.filter(id => !/^\d{17,19}$/.test(id));
            if (invalidIds.length > 0) {
                errors.push(`❌ Owner ID không hợp lệ: ${invalidIds.join(', ')}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};