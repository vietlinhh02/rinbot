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
                const timeDiff = now - lastDaily;
                const hoursDiff = timeDiff / (1000 * 60 * 60);

                if (hoursDiff < 24) {
                    const embed = new EmbedBuilder()
                        .setTitle('⏳ Đã nhận thưởng!')
                        .setDescription('Bạn đã nhận Rin hôm nay rồi. Hãy quay lại sau 24 giờ!')
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