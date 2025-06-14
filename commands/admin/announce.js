const { EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    name: 'announce',
    description: 'Gửi thông báo đến các user ID được chỉ định, có thể kèm ảnh',
    usage: 'announce <user_ids> <message> [--image=url]',
    category: 'admin',
    async execute(message, args) {
        // Kiểm tra quyền owner
        if (!config.isOwner(message.author.id)) {
            return message.reply('⛔ Lệnh này chỉ dành cho owner bot!');
        }

        if (args.length < 2) {
            const helpEmbed = new EmbedBuilder()
                .setTitle('📢 HƯỚNG DẪN SỬ DỤNG LỆNH ANNOUNCE')
                .setDescription(
                    '**Cú pháp:**\n' +
                    '```announce <user_ids> <message> [--image=url]```\n\n' +
                    '**Ví dụ:**\n' +
                    '• `announce 123456789,987654321 Chúc mừng bạn!`\n' +
                    '• `announce all Thông báo cho tất cả`\n' +
                    '• `announce 123456789 Chúc mừng! --image=https://example.com/image.png`\n' +
                    '• `announce @user1,@user2 Tin nhắn cho 2 người`\n\n' +
                    '**Cách chỉ định user:**\n' +
                    '• `123456789,987654321` - Danh sách ID cách nhau bởi dấu phẩy\n' +
                    '• `all` - Gửi cho tất cả user trong database\n' +
                    '• `@user1,@user2` - Mention users\n' +
                    '• `top10` - Top 10 users có nhiều rin nhất'
                )
                .setColor('#FF9900')
                .setFooter({ text: 'Sử dụng lệnh toprin để lấy danh sách ID' });

            return message.reply({ embeds: [helpEmbed] });
        }

        try {
            const userIdsArg = args[0];
            let imageUrl = null;
            
            // Tách message và tìm image URL
            let messageContent = args.slice(1).join(' ');
            const imageMatch = messageContent.match(/--image=(\S+)/);
            if (imageMatch) {
                imageUrl = imageMatch[1];
                messageContent = messageContent.replace(/--image=\S+/, '').trim();
            }

            // Kiểm tra nếu có attachment
            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    imageUrl = attachment.url;
                }
            }

            if (!messageContent.trim()) {
                return message.reply('❌ Vui lòng nhập nội dung thông báo!');
            }

            // Xử lý danh sách user IDs
            let targetUserIds = [];

            if (userIdsArg.toLowerCase() === 'all') {
                // Gửi cho tất cả users
                const User = require('../../models/User');
                const allUsers = await User.find({}).select('userId');
                targetUserIds = allUsers.map(u => u.userId);
            } else if (userIdsArg.toLowerCase().startsWith('top')) {
                // Gửi cho top users
                const topCount = parseInt(userIdsArg.replace('top', '')) || 10;
                const User = require('../../models/User');
                const topUsers = await User.find({})
                    .sort({ rin: -1 })
                    .limit(topCount)
                    .select('userId');
                targetUserIds = topUsers.map(u => u.userId);
            } else if (userIdsArg.includes('@')) {
                // Xử lý mentions
                const mentions = message.mentions.users;
                targetUserIds = mentions.map(user => user.id);
            } else {
                // Xử lý danh sách IDs
                targetUserIds = userIdsArg.split(/[,\s]+/).filter(id => id.trim());
            }

            if (targetUserIds.length === 0) {
                return message.reply('❌ Không tìm thấy user ID nào hợp lệ!');
            }

            // Tạo embed thông báo
            const announceEmbed = new EmbedBuilder()
                .setTitle('📢 THÔNG BÁO QUAN TRỌNG')
                .setDescription(messageContent)
                .setColor('#FF6B35')
                .setTimestamp()
                .setFooter({ 
                    text: `Từ ${message.guild?.name || 'Bot Admin'}`,
                    iconURL: message.guild?.iconURL() || message.client.user.displayAvatarURL()
                });

            // Thêm ảnh nếu có
            if (imageUrl) {
                announceEmbed.setImage(imageUrl);
            }

            // Gửi thông báo xác nhận
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔄 ĐANG GỬI THÔNG BÁO...')
                .setDescription(`Sẽ gửi đến **${targetUserIds.length}** users`)
                .addFields(
                    { name: '📝 Nội dung', value: messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent },
                    { name: '🖼️ Ảnh', value: imageUrl ? 'Có' : 'Không' },
                    { name: '👥 Số lượng', value: targetUserIds.length.toString() }
                )
                .setColor('#FFA500');

            const confirmMsg = await message.reply({ embeds: [confirmEmbed] });

            // Gửi DM cho từng user
            let successCount = 0;
            let failCount = 0;
            const failedUsers = [];

            for (const userId of targetUserIds) {
                try {
                    const user = await message.client.users.fetch(userId);
                    await user.send({ embeds: [announceEmbed] });
                    successCount++;
                    
                    // Delay nhỏ để tránh rate limit
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    failCount++;
                    failedUsers.push(userId);
                    console.error(`Không thể gửi DM cho user ${userId}:`, error.message);
                }
            }

            // Cập nhật kết quả
            const resultEmbed = new EmbedBuilder()
                .setTitle('✅ HOÀN TẤT GỬI THÔNG BÁO')
                .addFields(
                    { name: '✅ Thành công', value: successCount.toString(), inline: true },
                    { name: '❌ Thất bại', value: failCount.toString(), inline: true },
                    { name: '📊 Tỷ lệ', value: `${((successCount / targetUserIds.length) * 100).toFixed(1)}%`, inline: true }
                )
                .setColor(failCount === 0 ? '#00FF00' : '#FFA500');

            if (failedUsers.length > 0 && failedUsers.length <= 10) {
                resultEmbed.addFields({
                    name: '❌ Users thất bại',
                    value: failedUsers.join(', ')
                });
            } else if (failedUsers.length > 10) {
                resultEmbed.addFields({
                    name: '❌ Users thất bại',
                    value: `${failedUsers.slice(0, 10).join(', ')}... và ${failedUsers.length - 10} users khác`
                });
            }

            await confirmMsg.edit({ embeds: [resultEmbed] });

            // Log hoạt động
            console.log(`[ANNOUNCE] ${message.author.tag} đã gửi thông báo đến ${successCount}/${targetUserIds.length} users`);

        } catch (error) {
            console.error('Lỗi announce:', error);
            message.reply('❌ Có lỗi xảy ra khi gửi thông báo!');
        }
    }
};
