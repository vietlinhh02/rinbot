const { EmbedBuilder } = require('discord.js');
const { getGuildPrefix } = require('../../utils/database');

module.exports = {
    name: 'gamestatus',
    description: 'Kiểm tra trạng thái games đang chạy (admin only)',
    async execute(message, args, client) {
        // Kiểm tra quyền admin
        if (!message.member.permissions.has('Administrator')) {
            return await message.reply('❌ Bạn cần quyền Administrator để sử dụng lệnh này!');
        }

        const channelId = message.channel.id;
        const prefix = await getGuildPrefix(message.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Trạng thái Games')
            .setColor('#0099FF')
            .setTimestamp();

        let gameCount = 0;
        let gameInfo = '';

        // Kiểm tra Xì Dách
        if (global.games && global.games[channelId]) {
            const game = global.games[channelId];
            gameCount++;
            gameInfo += `🃏 **Xì Dách**\n`;
            gameInfo += `• Nhà cái: ${game.host.displayName}\n`;
            gameInfo += `• Người chơi: ${Object.keys(game.players).length}\n`;
            gameInfo += `• Trạng thái: ${game.started ? 'Đang chơi' : 'Chờ bắt đầu'}\n`;
            if (game.started) {
                gameInfo += `• Lượt hiện tại: ${game.currentPlayerIndex + 1}/${game.playerOrder.length}\n`;
            }
            gameInfo += `• Lệnh hủy: \`${prefix}xjhuy\`\n\n`;
        }

        // Kiểm tra Cờ Tỷ Phú
        const typhuCommand = client.commands.get('typhu');
        if (typhuCommand) {
            // Access the rooms Map from the module
            const { rooms } = require('../games/typhu');
            if (rooms && rooms.has(channelId)) {
                const room = rooms.get(channelId);
                gameCount++;
                gameInfo += `🎲 **Cờ Tỷ Phú**\n`;
                gameInfo += `• Chủ phòng: ${room.host.displayName}\n`;
                gameInfo += `• Người chơi: ${Object.keys(room.players).length}\n`;
                gameInfo += `• Trạng thái: ${room.started ? '🔴 Đang chơi' : '🟡 Chờ bắt đầu'}\n`;
                if (room.started) {
                    const currentPlayer = room.players[room.turnOrder[room.currentTurn]];
                    gameInfo += `• Lượt hiện tại: ${currentPlayer?.user.displayName || 'N/A'}\n`;
                }
                gameInfo += `• Lệnh hủy: Admin có thể kick tất cả khỏi channel\n\n`;
            }
        }

        // Kiểm tra Bầu Cua (user host)
        const baucuaCommand = client.commands.get('bcgo');
        if (baucuaCommand) {
            // This would need the games Map to be exported from baucua.js
            // For now, we'll mention it in the response
        }

        // Kiểm tra Bầu Cua Bot
        const bcbotCommand = client.commands.get('bcbot');
        if (bcbotCommand) {
            // Similar issue - would need exported botGames Map
        }

        if (gameCount === 0) {
            embed.setDescription('✅ Không có game nào đang chạy trong kênh này.');
        } else {
            embed.setDescription(`🎯 Tìm thấy ${gameCount} game đang chạy:\n\n${gameInfo}`);
        }

        embed.setFooter({ 
            text: `Admin Panel • Total games: ${gameCount}`,
            iconURL: client.user.displayAvatarURL()
        });

        await message.reply({ embeds: [embed] });
    }
}; 