const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'taixiudebug',
    aliases: ['txdebug', 'checktx'],
    description: '[DEBUG] Check active tài xỉu games và troubleshoot',

    async execute(message, args) {
        try {
            // Lấy taixiu command để access games Map
            const taixiuCommand = message.client.commands.get('taixiu');
            if (!taixiuCommand) {
                return message.reply('❌ Tài xỉu command không tìm thấy!');
            }

            // Access games từ taixiu module (cần expose)
            const fs = require('fs');
            let activeGamesInfo = 'Không thể truy cập active games (cần expose games Map)';
            
            // Đọc history
            let historyCount = 0;
            let lastSession = 'N/A';
            try {
                if (fs.existsSync('./data/taixiu_history.json')) {
                    const history = JSON.parse(fs.readFileSync('./data/taixiu_history.json', 'utf8'));
                    historyCount = history.length;
                    lastSession = history.length > 0 ? history[history.length - 1].session : 'N/A';
                }
            } catch (error) {
                console.error('Debug read history error:', error);
            }

            const embed = new EmbedBuilder()
                .setTitle('🔧 TAIXIU DEBUG PANEL')
                .setDescription('**Thông tin debug và troubleshoot**')
                .addFields(
                    {
                        name: '📊 History Status',
                        value: `• **Total records:** ${historyCount}\n` +
                               `• **Last session:** #${lastSession}\n` +
                               `• **File exists:** ${fs.existsSync('./data/taixiu_history.json') ? '✅' : '❌'}`,
                        inline: true
                    },
                    {
                        name: '🎮 Active Games',
                        value: activeGamesInfo,
                        inline: true
                    },
                    {
                        name: '🔧 Common Issues',
                        value: `**"Không có ván game nào":**\n` +
                               `• Games Map bị clear\n` +
                               `• Channel ID không match\n` +
                               `• Interaction đã expired\n\n` +
                               `**"Interaction acknowledged":**\n` +
                               `• Duplicate handlers\n` +
                               `• Timing conflicts\n` +
                               `• Bot restart mid-game`,
                        inline: false
                    },
                    {
                        name: '💡 Troubleshooting',
                        value: `• **Fix no game:** Tạo game mới với \`,taixiu\`\n` +
                               `• **Fix interaction:** Restart bot\n` +
                               `• **Check logs:** Console có chi tiết\n` +
                               `• **Reset data:** Xóa file history nếu cần`,
                        inline: false
                    }
                )
                .setColor('#FFA500')
                .setFooter({ text: 'Debug Panel | For troubleshooting only' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi taixiu debug:', error);
            await message.reply(`❌ Có lỗi debug: ${error.message}`);
        }
    }
}; 