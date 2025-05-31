const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Kiểm tra độ trễ của bot',
    
    async execute(message, args) {
        try {
            const sent = await message.reply('🏓 Đang kiểm tra ping...');
            
            const timeDiff = sent.createdTimestamp - message.createdTimestamp;
            const apiLatency = Math.round(message.client.ws.ping);
            
            // Đánh giá chất lượng ping
            const getPingQuality = (ping) => {
                if (ping < 100) return { text: 'Tuyệt vời', emoji: '🟢', color: '#00ff00' };
                if (ping < 200) return { text: 'Tốt', emoji: '🟡', color: '#ffff00' };
                if (ping < 300) return { text: 'Bình thường', emoji: '🟠', color: '#ff8000' };
                return { text: 'Chậm', emoji: '🔴', color: '#ff0000' };
            };
            
            const botQuality = getPingQuality(timeDiff);
            const apiQuality = getPingQuality(apiLatency);
            
            const embed = new EmbedBuilder()
                .setTitle('🏓 PING & LATENCY')
                .setColor(botQuality.color)
                .addFields(
                    {
                        name: '🤖 Bot Response Time',
                        value: `${botQuality.emoji} **${timeDiff}ms** (${botQuality.text})`,
                        inline: true
                    },
                    {
                        name: '🌐 API Latency',
                        value: `${apiQuality.emoji} **${apiLatency}ms** (${apiQuality.text})`,
                        inline: true
                    },
                    {
                        name: '📊 Trạng thái',
                        value: `${timeDiff < 200 && apiLatency < 200 ? '✅ Bot hoạt động tốt!' : '⚠️ Bot có thể lag!'}`,
                        inline: false
                    }
                )
                .setDescription('**📈 Thông tin chi tiết:**\n' +
                    `• **Bot Response:** Thời gian bot phản hồi tin nhắn\n` +
                    `• **API Latency:** Độ trễ kết nối tới Discord API\n` +
                    `• **Uptime:** ${this.formatUptime(message.client.uptime)}\n\n` +
                    `*Ping được đo bằng milliseconds (ms)*`)
                .setFooter({ 
                    text: `Requested by ${message.author.displayName} | Bot đang online!` 
                })
                .setTimestamp();
            
            await sent.edit({ content: '', embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi ping:', error);
            await message.reply('❌ Không thể kiểm tra ping!');
        }
    },
    
    // Helper function để format uptime
    formatUptime(uptimeMs) {
        const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((uptimeMs % (60 * 60 * 1000)) / (60 * 1000));
        
        let uptime = '';
        if (days > 0) uptime += `${days}d `;
        if (hours > 0) uptime += `${hours}h `;
        uptime += `${minutes}m`;
        
        return uptime;
    }
}; 