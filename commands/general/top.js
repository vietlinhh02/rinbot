const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { getPrefix } = require('../../utils/prefixHelper');

module.exports = {
    name: 'top',
    description: 'Xem bảng xếp hạng người giàu nhất',
    async execute(message, args, client) {
        try {
            const prefix = await getPrefix(message.guild?.id);
            
            // Xử lý arguments
            const option = args[0]?.toLowerCase();
            let limit = 10;
            let sortBy = 'rin';
            let sortOrder = -1;
            let title = '💰 BẢNG XẾP HẠNG NGƯỜI GIÀU';
            let description = '**Top 10 thành viên giàu nhất server**';
            
            // Kiểm tra options
            if (option === 'all' || option === 'full') {
                limit = 50;
                description = '**Top 50 thành viên giàu nhất server**';
            } else if (option === 'poor' || option === 'ngheo') {
                sortOrder = 1;
                title = '💸 BẢNG XẾP HẠNG NGƯỜI NGHÈO';
                description = '**Top 10 thành viên nghèo nhất server**';
            } else if (option === 'help') {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('📊 HƯỚNG DẪN LỆNH TOP')
                    .setDescription('**Các cách sử dụng lệnh top:**')
                    .addFields(
                        {
                            name: '🏆 Cơ bản',
                            value: `• \`${prefix}top\` - Top 10 người giàu nhất\n` +
                                   `• \`${prefix}top all\` - Top 50 người giàu nhất\n` +
                                   `• \`${prefix}top full\` - Top 50 người giàu nhất`,
                            inline: false
                        },
                        {
                            name: '💸 Đặc biệt',
                            value: `• \`${prefix}top poor\` - Top 10 người nghèo nhất\n` +
                                   `• \`${prefix}top ngheo\` - Top 10 người nghèo nhất`,
                            inline: false
                        },
                        {
                            name: '💡 Ghi chú',
                            value: '• Bảng xếp hạng cập nhật real-time\n' +
                                   '• Chỉ hiển thị thành viên có tài khoản\n' +
                                   '• Vị trí của bạn luôn được hiển thị',
                            inline: false
                        }
                    )
                    .setColor('#0099FF');

                return await message.reply({ embeds: [helpEmbed] });
            }
            
            // Lấy dữ liệu user
            const topUsers = await User.find()
                .sort({ [sortBy]: sortOrder })
                .limit(limit)
                .select('userId rin');

            if (topUsers.length === 0) {
                const noDataEmbed = new EmbedBuilder()
                    .setTitle('📊 BẢNG XẾP HẠNG')
                    .setDescription('Chưa có dữ liệu về tài sản của các thành viên!')
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [noDataEmbed] });
            }

            // Tìm vị trí của user hiện tại
            const currentUser = await User.findOne({ userId: message.author.id });
            let currentUserRank = null;
            let currentUserRin = 0;

            if (currentUser) {
                currentUserRin = currentUser.rin;
                const usersBetterThanCurrent = await User.countDocuments({ 
                    rin: { $gt: currentUser.rin } 
                });
                currentUserRank = usersBetterThanCurrent + 1;
            }

            // Tạo embed
            const embedColor = sortOrder === 1 ? '#FF6B6B' : '#FFD700';
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(embedColor)
                .setThumbnail(client.user.displayAvatarURL());

            // Tạo danh sách top users
            let topList = '';
            const medals = sortOrder === 1 ? ['💸', '😭', '😿'] : ['🥇', '🥈', '🥉'];
            const moneyEmoji = sortOrder === 1 ? '🪙' : '💰';
            
            for (let i = 0; i < Math.min(topUsers.length, 10); i++) {
                const user = topUsers[i];
                let displayName = 'Unknown User';
                
                try {
                    // Thử lấy thông tin user từ Discord
                    const discordUser = await message.client.users.fetch(user.userId);
                    displayName = discordUser.displayName || discordUser.username;
                } catch (error) {
                    // Nếu không lấy được thông tin, giữ nguyên Unknown User
                    console.log(`Không thể lấy thông tin user ${user.userId}`);
                }

                const rank = i + 1;
                const medal = rank <= 3 ? medals[rank - 1] : `${rank}.`;
                const rinFormatted = user.rin.toLocaleString();
                
                topList += `${medal} **${displayName}**\n`;
                topList += `${moneyEmoji} ${rinFormatted} Rin\n\n`;
            }
            
            // Nếu có nhiều hơn 10 users và là mode "all", hiển thị thêm
            if (topUsers.length > 10 && limit > 10) {
                let remainingList = '\n**🔢 Danh sách đầy đủ:**\n';
                for (let i = 10; i < topUsers.length; i++) {
                    const user = topUsers[i];
                    let displayName = 'Unknown User';
                    
                    try {
                        const discordUser = await message.client.users.fetch(user.userId);
                        displayName = discordUser.displayName || discordUser.username;
                    } catch (error) {
                        console.log(`Không thể lấy thông tin user ${user.userId}`);
                    }

                    const rank = i + 1;
                    const rinFormatted = user.rin.toLocaleString();
                    remainingList += `${rank}. **${displayName}** - ${rinFormatted} Rin\n`;
                }
                
                if (remainingList.length > 2048) {
                    remainingList = remainingList.substring(0, 2000) + '...\n*(Danh sách quá dài)*';
                }
                
                embed.addFields({
                    name: '📋 Danh sách chi tiết',
                    value: remainingList,
                    inline: false
                });
            }

            embed.addFields({
                name: '🏆 Bảng xếp hạng',
                value: topList,
                inline: false
            });

            // Thêm thông tin user hiện tại
            if (currentUserRank) {
                const topLimit = limit === 50 ? 50 : 10;
                const userInfo = currentUserRank <= topLimit 
                    ? `Bạn đang ở vị trí **#${currentUserRank}** trong top ${topLimit}! 🎉`
                    : `Vị trí của bạn: **#${currentUserRank}**\n💰 Tài sản: **${currentUserRin.toLocaleString()} Rin**`;

                embed.addFields({
                    name: '📈 Vị trí của bạn',
                    value: userInfo,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📈 Vị trí của bạn',
                    value: `Bạn chưa có trong bảng xếp hạng.\nGõ \`${prefix}rindaily\` để bắt đầu kiếm Rin!`,
                    inline: false
                });
            }

            // Thêm hướng dẫn (chỉ cho top giàu)
            if (sortOrder === -1) {
                embed.addFields({
                    name: '💡 Cách kiếm Rin',
                    value: `• \`${prefix}rindaily\` - Nhận Rin hàng ngày\n` +
                           `• \`${prefix}work\` - Làm việc kiếm tiền\n` +
                           `• \`${prefix}baucua\` - Chơi bầu cua\n` +
                           `• \`${prefix}xidach\` - Chơi xì dách\n` +
                           `• \`${prefix}muacay\` - Đầu tư farm kiếm lời`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '🆘 Cách thoát nghèo',
                    value: `• \`${prefix}rindaily\` - Nhận 200 Rin mỗi ngày\n` +
                           `• \`${prefix}work\` - Làm việc chăm chỉ\n` +
                           `• \`${prefix}thuenha\` - Đầu tư bất động sản\n` +
                           `• \`${prefix}muapet\` - Nuôi pet sinh lời\n` +
                           `• **Tránh:** Cờ bạc, chi tiêu hoang phí`,
                    inline: false
                });
            }

            const totalUsers = await User.countDocuments();
            embed.setFooter({ 
                text: `${option ? `[${option.toUpperCase()}] ` : ''}Cập nhật: ${new Date().toLocaleString('vi-VN')} • ${totalUsers} thành viên • ${prefix}top help`,
                iconURL: message.client.user.displayAvatarURL()
            });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi top command:', error);
            await message.reply('❌ Có lỗi xảy ra khi lấy bảng xếp hạng!');
        }
    }
}; 