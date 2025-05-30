const { EmbedBuilder } = require('discord.js');
const { getUserRin, getGuildPrefix } = require('../../utils/database');
const os = require('os');

module.exports = {
    name: 'rin',
    description: 'Hiển thị thông tin tổng quan về RinBot',
    async execute(message, args, client) {
        try {
            // Lấy thông tin cần thiết
            const userRin = await getUserRin(message.author.id);
            const guildPrefix = await getGuildPrefix(message.guild.id);
            
            // Thông tin bot
            const uptime = process.uptime();
            const uptimeString = formatUptime(uptime);
            const serverCount = client.guilds.cache.size;
            const userCount = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
            const memoryUsage = process.memoryUsage();
            const memoryUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            
            const embed = new EmbedBuilder()
                .setTitle('🤖 THÔNG TIN RINBOT')
                .setThumbnail(client.user.displayAvatarURL())
                .setColor('#00FFFF')
                .addFields(
                    {
                        name: '👤 Thông tin cá nhân',
                        value: `💰 **Rin của bạn:** ${userRin.toLocaleString()} Rin\n🏷️ **Tên:** ${message.author.displayName}\n🆔 **ID:** ${message.author.id}`,
                        inline: true
                    },
                    {
                        name: '🏛️ Thông tin server',
                        value: `📝 **Prefix hiện tại:** \`${guildPrefix}\`\n🏷️ **Tên server:** ${message.guild.name}\n👥 **Thành viên:** ${message.guild.memberCount}`,
                        inline: true
                    },
                    {
                        name: '📊 Thống kê bot',
                        value: `🌐 **Servers:** ${serverCount}\n👨‍👩‍👧‍👦 **Người dùng:** ${userCount.toLocaleString()}\n⏱️ **Uptime:** ${uptimeString}\n💾 **RAM:** ${memoryUsed}MB`,
                        inline: false
                    },
                    {
                        name: '🎮 Games có sẵn',
                        value: 
                            `🃏 **Xì Dách** - \`${guildPrefix}xjgo\` / \`${guildPrefix}xjbot\`\n` +
                            `🎲 **Cờ Tỷ Phú** - \`${guildPrefix}typhu\` / \`${guildPrefix}tpbot\`\n` +
                            `🎰 **Bầu Cua** - \`${guildPrefix}bcgo\` / \`${guildPrefix}bcbot\`\n` +
                            `🐾 **Thú Cưng** - \`${guildPrefix}muapet\`\n` +
                            `🌱 **Trồng Cây** - \`${guildPrefix}muacay\``,
                        inline: true
                    },
                    {
                        name: '⚙️ Lệnh hữu ích',
                        value:
                            `💰 **Kiểm tra Rin** - \`${guildPrefix}rincheck\`\n` +
                            `🎁 **Nhận Rin hàng ngày** - \`${guildPrefix}rindaily\`\n` +
                            `📚 **Hướng dẫn** - \`${guildPrefix}rinhelp\`\n` +
                            `🔧 **Đổi prefix** - \`${guildPrefix}setprefix\`\n` +
                            `💸 **Gửi Rin** - \`${guildPrefix}grin @user\``,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `RinBot v2.0 • Node.js ${process.version} • Được tạo bởi Viet Linhh`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi lệnh rin:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Có lỗi xảy ra khi lấy thông tin!')
                .setColor('#FF0000');
            await message.reply({ embeds: [errorEmbed] });
        }
    }
};

// Utility function để format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
} 