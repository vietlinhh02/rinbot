/**
 * Utility functions để quản lý tin nhắn Discord
 */

/**
 * Tự động xóa tin nhắn sau một khoảng thời gian
 * @param {Message} message - Tin nhắn cần xóa
 * @param {number} delay - Thời gian chờ (ms), mặc định 10 giây
 * @param {string} reason - Lý do xóa (để log)
 */
async function autoDeleteMessage(message, delay = 10000, reason = 'Auto cleanup') {
    if (!message || !message.delete) {
        console.log('Invalid message object for auto delete');
        return;
    }

    setTimeout(async () => {
        try {
            await message.delete();
            console.log(`Auto deleted message: ${reason}`);
        } catch (error) {
            console.log(`Cannot delete message (${reason}):`, error.message);
        }
    }, delay);
}

/**
 * Gửi tin nhắn tự xóa với thông báo
 * @param {Channel} channel - Channel để gửi
 * @param {string|Object} content - Nội dung tin nhắn
 * @param {number} delay - Thời gian chờ (ms)
 * @param {string} footerText - Text thêm vào footer
 */
async function sendAutoDeleteMessage(channel, content, delay = 10000, footerText = null) {
    try {
        let messageOptions = {};
        
        if (typeof content === 'string') {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setDescription(content)
                .setColor('#00FF00');
                
            if (footerText) {
                embed.setFooter({ text: footerText });
            } else {
                embed.setFooter({ text: `Tin nhắn này sẽ tự động ẩn sau ${Math.round(delay/1000)} giây` });
            }
            
            messageOptions.embeds = [embed];
        } else if (content.embeds) {
            messageOptions = content;
            // Thêm footer nếu có embed và chưa có footer
            if (content.embeds[0] && !content.embeds[0].footer) {
                const footerMsg = footerText || `Tin nhắn này sẽ tự động ẩn sau ${Math.round(delay/1000)} giây`;
                content.embeds[0].setFooter({ text: footerMsg });
            }
        } else {
            messageOptions.content = content;
        }

        const sentMessage = await channel.send(messageOptions);
        autoDeleteMessage(sentMessage, delay, 'Auto delete temp message');
        
        return sentMessage;
    } catch (error) {
        console.error('Error sending auto delete message:', error);
        return null;
    }
}

/**
 * Reply với tin nhắn tự xóa
 * @param {Message} message - Tin nhắn gốc để reply
 * @param {string|Object} content - Nội dung reply
 * @param {number} delay - Thời gian chờ (ms)
 * @param {boolean} ephemeral - Chỉ người dùng thấy (cho interaction)
 */
async function replyAutoDelete(message, content, delay = 10000, ephemeral = false) {
    try {
        let replyOptions = {};
        
        if (typeof content === 'string') {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setDescription(content)
                .setColor('#00FF00')
                .setFooter({ text: `Tin nhắn này sẽ tự động ẩn sau ${Math.round(delay/1000)} giây` });
            
            replyOptions.embeds = [embed];
        } else {
            replyOptions = content;
            // Thêm footer nếu có embed
            if (content.embeds && content.embeds[0] && !content.embeds[0].footer) {
                content.embeds[0].setFooter({ 
                    text: `Tin nhắn này sẽ tự động ẩn sau ${Math.round(delay/1000)} giây` 
                });
            }
        }
        
        if (ephemeral) {
            replyOptions.ephemeral = true;
        }

        const sentMessage = await message.reply(replyOptions);
        
        // Chỉ auto delete nếu không phải ephemeral
        if (!ephemeral) {
            autoDeleteMessage(sentMessage, delay, 'Auto delete reply');
        }
        
        return sentMessage;
    } catch (error) {
        console.error('Error replying with auto delete:', error);
        return null;
    }
}

/**
 * Thời gian chờ mặc định cho các loại tin nhắn
 */
const DELETE_DELAYS = {
    SUCCESS: 10000,      // 10 giây cho thông báo thành công
    ERROR: 15000,        // 15 giây cho thông báo lỗi  
    INFO: 30000,         // 30 giây cho thông tin
    HELP: 180000,        // 3 phút cho hướng dẫn
    GAME: 300000,        // 5 phút cho game
    TEMP: 5000           // 5 giây cho tin nhắn tạm
};

module.exports = {
    autoDeleteMessage,
    sendAutoDeleteMessage,
    replyAutoDelete,
    DELETE_DELAYS
}; 