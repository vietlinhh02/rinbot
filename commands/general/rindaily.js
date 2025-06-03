const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { autoDeleteMessage, DELETE_DELAYS } = require('../../utils/messageUtils');

module.exports = {
    name: 'rindaily',
    description: 'Nhận 200 Rin mỗi ngày',
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const now = new Date();
            const today = now.toDateString();
            
            // Kiểm tra đã nhận daily hôm nay chưa
            const User = require('../../models/User');
            let user = await User.findOne({ userId });
            
            if (!user) {
                user = await User.create({ userId, rin: 0 });
            }
            
            if (user.lastDaily && new Date(user.lastDaily).toDateString() === today) {
                const nextReset = new Date();
                nextReset.setDate(nextReset.getDate() + 1);
                nextReset.setHours(0, 0, 0, 0);
                
                const timeUntilReset = nextReset - now;
                const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
                const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('⏰ Đã nhận daily hôm nay')
                    .setDescription(`Bạn đã nhận 200 Rin hôm nay rồi!\n\n` +
                        `⏱️ **Thời gian reset:** ${hours}h ${minutes}p nữa\n` +
                        `🕛 **Reset lúc:** 00:00 ngày mai`)
                    .setColor('#FFA500')
                    .setFooter({ text: `Tin nhắn này sẽ tự động ẩn sau ${DELETE_DELAYS.INFO/1000} giây` });

                const errorMessage = await message.reply({ embeds: [errorEmbed] });
                autoDeleteMessage(errorMessage, DELETE_DELAYS.INFO, 'Daily cooldown cleanup');
                return;
            }
            
            // Nhận daily
            const dailyAmount = 200;
            await updateUserRin(userId, dailyAmount);
            user.lastDaily = now;
            await user.save();
            
            const newBalance = await getUserRin(userId);
            
            const successEmbed = new EmbedBuilder()
                .setTitle('🎉 Nhận Daily Thành Công!')
                .setDescription(`**+${dailyAmount} Rin** đã được thêm vào tài khoản!\n\n` +
                    `💰 **Số dư hiện tại:** ${newBalance.toLocaleString()} Rin\n` +
                    `📅 **Quay lại vào:** Ngày mai (00:00)`)
                .setColor('#00FF00')
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ text: `Tin nhắn này sẽ tự động ẩn sau ${DELETE_DELAYS.SUCCESS/1000} giây` })
                .setTimestamp();

            const successMessage = await message.reply({ embeds: [successEmbed] });
            autoDeleteMessage(successMessage, DELETE_DELAYS.SUCCESS, 'Daily success cleanup');

        } catch (error) {
            console.error('Lỗi rindaily:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi hệ thống')
                .setDescription('Không thể nhận daily. Vui lòng thử lại sau!')
                .setColor('#FF0000')
                .setFooter({ text: `Tin nhắn này sẽ tự động ẩn sau ${DELETE_DELAYS.ERROR/1000} giây` });

            const errorMessage = await message.reply({ embeds: [errorEmbed] });
            autoDeleteMessage(errorMessage, DELETE_DELAYS.ERROR, 'Daily error cleanup');
        }
    }
}; 