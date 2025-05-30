const { EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    name: 'owners',
    description: 'Xem danh sách chủ sở hữu bot',
    
    async execute(message, args) {
        // Chỉ owner mới xem được danh sách owner
        if (!config.isOwner(message.author.id)) {
            return message.reply('🔒 Chỉ owner bot mới có thể xem danh sách này!');
        }

        try {
            const ownerIds = config.ownerIds;
            
            if (ownerIds.length === 0) {
                const noOwnerEmbed = new EmbedBuilder()
                    .setTitle('⚠️ CHƯA CẤU HÌNH OWNER')
                    .setDescription('**Chưa có owner nào được cấu hình!**\n\n' +
                        '🔧 **Để cấu hình:**\n' +
                        '• Thêm `DISCORD_OWNER_IDS=your_id_here` vào file .env\n' +
                        '• Hoặc `OWNER_ID=your_id_here` cho 1 owner\n' +
                        '• Restart bot sau khi cấu hình')
                    .setColor('#FF6600')
                    .setTimestamp();
                
                return message.reply({ embeds: [noOwnerEmbed] });
            }

            // Lấy thông tin của các owner
            let ownerList = '';
            let validOwners = 0;
            
            for (let i = 0; i < ownerIds.length; i++) {
                const ownerId = ownerIds[i];
                try {
                    const user = await message.client.users.fetch(ownerId);
                    ownerList += `**${i + 1}.** ${user.displayName} (\`${user.tag}\`)\n`;
                    ownerList += `    └ ID: \`${ownerId}\`\n`;
                    ownerList += `    └ Status: ${user.presence?.status === 'online' ? '🟢 Online' : '⚪ Offline'}\n\n`;
                    validOwners++;
                } catch (error) {
                    ownerList += `**${i + 1}.** ❌ Unknown User\n`;
                    ownerList += `    └ ID: \`${ownerId}\`\n`;
                    ownerList += `    └ Status: ⚠️ Invalid ID\n\n`;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('👑 DANH SÁCH CHỦ SỞ HỮU BOT')
                .setDescription(`**Bot hiện có ${ownerIds.length} owner được cấu hình:**\n\n${ownerList}`)
                .addFields(
                    {
                        name: '📊 Thống kê',
                        value: `• Tổng: ${ownerIds.length} owner\n• Hợp lệ: ${validOwners} owner\n• Không hợp lệ: ${ownerIds.length - validOwners} owner`,
                        inline: true
                    },
                    {
                        name: '🔑 Quyền đặc biệt',
                        value: '• Lệnh `,update` (cập nhật bot)\n• Lệnh `,owners` (xem danh sách)\n• Quyền tối cao với bot',
                        inline: true
                    }
                )
                .setColor('#FFD700')
                .setFooter({ text: `Yêu cầu bởi: ${message.author.tag}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi owners command:', error);
            await message.reply('❌ Có lỗi xảy ra khi lấy danh sách owner!');
        }
    }
}; 