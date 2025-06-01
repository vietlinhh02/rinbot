const { EmbedBuilder } = require('discord.js');
const FastUtils = require('../../utils/fastUtils');
const User = require('../../models/User');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'rindaily',
    description: 'Nhận Rin hàng ngày',
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 5 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'rindaily', 
                2, // Giảm cooldown
                this.executeRinDaily,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },

    async executeRinDaily(message, args) {
        try {
            const userId = message.author.id;
            const now = new Date();

            let user = await User.findOne({ userId });
            if (!user) {
                user = await User.create({ userId, rin: 0 });
            }

            if (user.lastDaily) {
                const lastDaily = new Date(user.lastDaily);
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const lastDailyDate = new Date(lastDaily.getFullYear(), lastDaily.getMonth(), lastDaily.getDate());

                if (today.getTime() === lastDailyDate.getTime()) {
                    const embed = new EmbedBuilder()
                        .setTitle('⏳ Đã nhận thưởng!')
                        .setDescription('Bạn đã nhận Rin hôm nay rồi. Hãy quay lại vào ngày mai!')
                        .setColor('#FF0000');
                    
                    return await message.reply({ embeds: [embed] });
                }
            }

            // Kiểm tra lại user trước khi cập nhật (tránh race condition)
            const freshUser = await User.findOne({ userId });
            if (freshUser.lastDaily) {
                const lastDaily = new Date(freshUser.lastDaily);
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const lastDailyDate = new Date(lastDaily.getFullYear(), lastDaily.getMonth(), lastDaily.getDate());

                if (today.getTime() === lastDailyDate.getTime()) {
                    return message.reply('❌ Bạn đã nhận Rin hôm nay rồi! (Phát hiện spam)');
                }
            }

            const reward = Math.floor(Math.random() * 151) + 50; // 50-200 Rin
            await FastUtils.updateFastUserRin(userId, reward);
            
            freshUser.lastDaily = now;
            await freshUser.save();

            const embed = new EmbedBuilder()
                .setTitle('🎁 Daily!')
                .setDescription(`${message.author}, nhận **${FastUtils.fastFormat(reward)} Rin**!`)
                .setColor('#00FF00');

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi rindaily:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 