const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const config = require('../../config/config');

module.exports = {
    name: 'toprin',
    description: 'Hiển thị top users có nhiều Rin nhất kèm User ID',
    usage: 'toprin [số lượng]',
    category: 'admin',
    async execute(message, args) {
        // Kiểm tra quyền owner
        if (!config.isOwner(message.author.id)) {
            return message.reply('⛔ Lệnh này chỉ dành cho owner bot!');
        }

        try {
            // Số lượng top users cần hiển thị (mặc định 10)
            const limit = parseInt(args[0]) || 10;

            if (limit < 1 || limit > 50) {
                return message.reply('❌ Số lượng phải từ 1 đến 50!');
            }

            // Lấy top users từ database
            const topUsers = await User.find({})
                .sort({ rin: -1 })
                .limit(limit)
                .select('userId rin displayName username');

            if (topUsers.length === 0) {
                return message.reply('❌ Không tìm thấy user nào trong database!');
            }

            // Tạo embed hiển thị
            const embed = new EmbedBuilder()
                .setTitle(`🏆 TOP ${limit} USERS CÓ NHIỀU RIN NHẤT`)
                .setColor('#FFD700')
                .setTimestamp()
                .setFooter({ 
                    text: `Yêu cầu bởi ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            let description = '';
            const userInfos = [];

            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const rank = i + 1;
                
                // Thử lấy thông tin user từ Discord
                let displayName = user.displayName || user.username || 'Unknown';
                try {
                    const discordUser = await message.client.users.fetch(user.userId);
                    displayName = discordUser.tag || discordUser.username;
                } catch (error) {
                    // Nếu không lấy được thông tin Discord, dùng thông tin từ DB
                }

                const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
                
                description += `${rankEmoji} **#${rank}** - ${displayName}\n`;
                description += `💰 **${user.rin.toLocaleString()}** Rin\n`;
                description += `🆔 \`${user.userId}\`\n\n`;

                // Lưu thông tin để export
                userInfos.push({
                    rank: rank,
                    userId: user.userId,
                    displayName: displayName,
                    rin: user.rin
                });
            }

            embed.setDescription(description);

            // Tạo nút để copy IDs
            const topUserIds = topUsers.map(u => u.userId).join('\n');
            
            const reply = await message.reply({ embeds: [embed] });

            // Gửi IDs trong code block riêng biệt
            const idsEmbed = new EmbedBuilder()
                .setTitle('📋 DANH SÁCH USER IDS')
                .setDescription(`\`\`\`\n${topUserIds}\n\`\`\``)
                .setColor('#00FF00')
                .setFooter({ text: 'Copy danh sách IDs này để sử dụng cho lệnh announce' });

            await message.channel.send({ embeds: [idsEmbed] });

            // Gửi thống kê tổng quan
            const totalUsers = await User.countDocuments();
            const totalRin = await User.aggregate([
                { $group: { _id: null, total: { $sum: '$rin' } } }
            ]);

            const statsEmbed = new EmbedBuilder()
                .setTitle('📊 THỐNG KÊ TỔNG QUAN')
                .addFields(
                    { name: '👥 Tổng Users', value: totalUsers.toLocaleString(), inline: true },
                    { name: '💰 Tổng Rin trong hệ thống', value: (totalRin[0]?.total || 0).toLocaleString(), inline: true },
                    { name: '🎯 Top Users chiếm', value: `${((topUsers.reduce((sum, u) => sum + u.rin, 0) / (totalRin[0]?.total || 1)) * 100).toFixed(2)}%`, inline: true }
                )
                .setColor('#FF6B6B');

            await message.channel.send({ embeds: [statsEmbed] });

        } catch (error) {
            console.error('Lỗi toprin:', error);
            message.reply('❌ Có lỗi xảy ra khi lấy dữ liệu top rin!');
        }
    }
}; 