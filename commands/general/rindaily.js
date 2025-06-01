const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const User = require('../../models/User');

module.exports = {
    name: 'rindaily',
    description: 'Nhận Rin hàng ngày',
    async execute(message, args) {
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

            const reward = Math.floor(Math.random() * 151) + 50; // 50-200 Rin
            await updateUserRin(userId, reward);
            
            user.lastDaily = now;
            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('🎁 Nhận thưởng hàng ngày!')
                .setDescription(`${message.author}, bạn nhận được **${reward} Rin**!`)
                .setColor('#00FF00');

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi rindaily:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 