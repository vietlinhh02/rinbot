const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'xjbet',
    description: 'Tham gia bàn Xì Dách với số tiền tùy chọn',
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 2 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'xjbet', 
                2, // 2 giây cooldown
                this.executeXJBet,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },

    async executeXJBet(message, args) {
        try {
            const channelId = String(message.channel.id);
            const betAmount = parseInt(args[0]);
            
            if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Vui lòng nhập số tiền hợp lệ!\n**Cách dùng:** `,xjbet [số tiền]`\n**Ví dụ:** `,xjbet 150`')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            const game = global.games[channelId];
            if (!game) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Không có bàn game nào! Hãy tạo bàn mới với `,xjgo`')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            if (game.started) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Game đã bắt đầu, không thể tham gia!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            if (message.author.id in game.players) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Bạn đã tham gia rồi!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            if (message.author.id === game.host.id) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Nhà cái không thể tham gia!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            const userRin = await getUserRin(message.author.id);
            if (userRin < betAmount) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription(`Bạn không đủ ${betAmount} Rin! (Hiện có: ${userRin} Rin)`)
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            // Thêm player vào game
            game.players[message.author.id] = {
                user: message.author,
                bet: betAmount,
                cards: [],
                done: false
            };

            const embed = new EmbedBuilder()
                .setTitle('✅ Tham gia thành công!')
                .setDescription(`**${message.author.displayName}** đã tham gia với **${betAmount} Rin**!`)
                .setColor('#00FF00');

            await message.reply({ embeds: [embed] });

            // Update main message
            if (game.gameMessage) {
                const xjgoCommand = require('./xjgo');
                await xjgoCommand.updateGameMessage(game.gameMessage, channelId);
            }

        } catch (error) {
            console.error('❌ Lỗi xjbet:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 