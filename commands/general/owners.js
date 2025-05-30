const { EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    name: 'owners',
    description: 'Hiển thị danh sách owner của bot',
    async execute(message, args) {
        try {
            const ownerIds = config.ownerIds;
            
            if (ownerIds.length === 0) {
                return message.reply('❌ Chưa có owner nào được cấu hình!');
            }

            // Tạo danh sách owner với thông tin user
            let ownerList = '';
            let validOwners = 0;

            for (let i = 0; i < ownerIds.length; i++) {
                const ownerId = ownerIds[i];
                try {
                    const user = await message.client.users.fetch(ownerId);
                    ownerList += `${i + 1}. **${user.displayName}** (${user.tag})\n   \`${ownerId}\`\n\n`;
                    validOwners++;
                } catch (error) {
                    ownerList += `${i + 1}. **⚠️ User không tồn tại**\n   \`${ownerId}\`\n\n`;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('👑 DANH SÁCH OWNER BOT')
                .setDescription(`**Tổng số owner:** ${ownerIds.length}\n` +
                    `**Owner hợp lệ:** ${validOwners}\n\n` +
                    `${ownerList}` +
                    `**🔧 Cấu hình:**\n` +
                    `• File: \`.env\`\n` +
                    `• Biến: \`DISCORD_OWNER_IDS\` hoặc \`DISCORD_OWNER_ID\`\n` +
                    `• Định dạng: \`ID1,ID2,ID3\`\n\n` +
                    `**📖 Hướng dẫn:** Xem \`OWNER_SETUP_GUIDE.md\``)
                .setColor('#FFD700')
                .setFooter({ 
                    text: config.isOwner(message.author.id) ? 
                        '✅ Bạn là owner!' : 
                        '❌ Bạn không phải owner' 
                })
                .setTimestamp();

            // Thêm thông tin về người gọi lệnh
            if (config.isOwner(message.author.id)) {
                embed.addFields({
                    name: '🎯 Quyền Hạn Owner',
                    value: '• `,addrin @user 1000` - Cộng Rin\n' +
                           '• Các lệnh admin khác...\n' +
                           '• Quản lý bot toàn diện',
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi owners command:', error);
            await message.reply('❌ Có lỗi xảy ra khi lấy thông tin owner!');
        }
    }
}; 