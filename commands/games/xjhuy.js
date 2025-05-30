const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'xjhuy',
    description: 'Hủy bàn Xì Dách',
    async execute(message, args) {
        try {
            const channelId = message.channel.id;
            
            if (!global.games[channelId]) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Lỗi!')
                    .setDescription('Không có bàn nào đang hoạt động!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            const game = global.games[channelId];
            if (message.author.id !== game.host.id && !message.member.permissions.has('Administrator')) {
                const embed = new EmbedBuilder()
                    .setTitle('⛔ Lỗi!')
                    .setDescription('Chỉ nhà cái hoặc admin được hủy bàn!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            // Hoàn tiền nếu game chưa bắt đầu
            if (!game.started) {
                for (const [playerId, playerData] of Object.entries(game.players)) {
                    const { updateUserRin } = require('../../utils/database');
                    await updateUserRin(playerId, playerData.bet);
                }
            }

            delete global.games[channelId];
            
            const embed = new EmbedBuilder()
                .setTitle('🚫 Hủy bàn!')
                .setDescription(`Bàn chơi đã được ${message.author} hủy bỏ!${!game.started ? '\n💰 Đã hoàn tiền cho tất cả người chơi!' : ''}`)
                .setColor('#FF0000');
            
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi xjhuy:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 