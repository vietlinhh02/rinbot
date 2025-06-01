const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');

module.exports = {
    name: 'cf',
    description: 'Tung xu cược Rin, thắng x2, thua mất tiền. Cú pháp: cf <số tiền>',
    async execute(message, args) {
        const userId = message.author.id;
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Số Rin phải là số dương!');
        }
        const userRin = await getUserRin(userId);
        if (userRin < amount) {
            return message.reply('❌ Bạn không đủ Rin để cược!');
        }
        // Gửi hiệu ứng tung xu
        const animEmbed = new EmbedBuilder()
            .setTitle('🪙 ĐANG TUNG XU...')
            .setDescription('Đang tung xu, chờ kết quả...')
            .setColor('#AAAAAA');
        const sentMsg = await message.reply({ embeds: [animEmbed] });
        setTimeout(async () => {
            const result = Math.random() < 0.45 ? 'win' : 'lose';
            let desc = '';
            if (result === 'win') {
                await updateUserRin(userId, amount);
                desc = `🎉 Bạn **THẮNG**! Nhận được **${amount} Rin** (x2)`;
            } else {
                await updateUserRin(userId, -amount);
                desc = `😢 Bạn **THUA**! Mất **${amount} Rin**`;
            }
            const resultEmbed = new EmbedBuilder()
                .setTitle('🪙 KẾT QUẢ TUNG XU')
                .setDescription(desc)
                .setColor(result === 'win' ? '#00FF00' : '#FF0000');
            await sentMsg.edit({ embeds: [resultEmbed] });
        }, 1200);
    }
}; 