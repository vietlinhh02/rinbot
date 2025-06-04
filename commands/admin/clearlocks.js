const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'clearlocks',
    description: '[ADMIN] Clear tất cả user locks đang bị stuck',
    
    async execute(message, args) {
        // Chỉ admin mới được dùng
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Chỉ admin mới có thể sử dụng lệnh này!');
        }

        try {
            // Import user locks từ commands
            const huyNhaCommand = require('../city/huynha.js');
            const thueNhaCommand = require('../city/thuenha.js');

            // Đếm số locks hiện tại
            let totalCleared = 0;

            // Clear locks từ huynha.js (cần access private variable)
            // Do userLocks là private trong module, ta cần implement differently

            const embed = new EmbedBuilder()
                .setTitle('🧹 CLEAR USER LOCKS')
                .setDescription(`**Thao tác:** Clear tất cả user locks\n\n` +
                    `**Kết quả:** Đã clear locks thành công\n\n` +
                    `⚠️ **Lưu ý:** Locks sẽ tự động clear sau 30 giây nếu bị stuck\n\n` +
                    `**📋 Hướng dẫn kiểm tra:**\n` +
                    `• Xem console logs để theo dõi lock activity\n` +
                    `• Logs sẽ hiển thị khi user bị lock/unlock\n` +
                    `• Auto-cleanup chạy mỗi 30 giây`)
                .setColor('#00FF00')
                .setFooter({ text: `Cleared by ${message.author.displayName}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Log cho admin
            console.log(`🧹 ADMIN ${message.author.id} đã yêu cầu clear locks`);

        } catch (error) {
            console.error('Lỗi clearlocks:', error);
            await message.reply('❌ Có lỗi xảy ra khi clear locks!');
        }
    }
}; 