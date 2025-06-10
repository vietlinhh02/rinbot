const { EmbedBuilder } = require('discord.js');
const ownerConfig = require('../../config/owner');

// Rigged settings (global)
global.taixiuRiggedSettings = {
    enabled: true,
    riggedMode: 'smart', // 'smart', 'aggressive', 'off'
    winRate: 65, // % nhà cái thắng mong muốn
    logRigged: true
};

module.exports = {
    name: 'taixiuadmin',
    aliases: ['txadmin', 'riggedtx'],
    description: '[ADMIN] Quản lý rigged dice Tài Xỉu',

    async execute(message, args) {
        // Kiểm tra chỉ owner bot được dùng
        if (message.author.id !== ownerConfig.ownerId) {
            // Log attempt nếu bật
            if (ownerConfig.security.logAccess) {
                console.log(`🚫 [SECURITY] User ${message.author.tag} (${message.author.id}) tried to access taixiuadmin`);
            }
            return message.reply('❌ Lệnh này chỉ dành cho owner bot!');
        }

        const subCommand = args[0]?.toLowerCase();

        if (!subCommand) {
            // Hiển thị status hiện tại
            const settings = global.taixiuRiggedSettings;
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 TAIXIU ADMIN PANEL')
                .setDescription('**Hệ thống Rigged Dice Management**')
                .addFields(
                    {
                        name: '⚙️ Cài đặt hiện tại',
                        value: `• **Trạng thái:** ${settings.enabled ? '🟢 BẬT' : '🔴 TẮT'}\n` +
                               `• **Chế độ:** ${settings.riggedMode.toUpperCase()}\n` +
                               `• **Tỷ lệ thắng:** ${settings.winRate}%\n` +
                               `• **Ghi log:** ${settings.logRigged ? 'BẬT' : 'TẮT'}`,
                        inline: true
                    },
                    {
                        name: '📋 Commands',
                        value: `• \`,txadmin on/off\` - Bật/tắt rigged\n` +
                               `• \`,txadmin mode <smart/aggressive>\` - Đổi chế độ\n` +
                               `• \`,txadmin rate <50-90>\` - Đặt tỷ lệ thắng\n` +
                               `• \`,txadmin log on/off\` - Bật/tắt log\n` +
                               `• \`,txadmin stats\` - Xem thống kê rigged`,
                        inline: true
                    },
                    {
                        name: '🎯 Chế độ rigged',
                        value: `**SMART:** Bias thông minh dựa trên:\n` +
                               `- Số tiền cược (càng lớn càng bias)\n` +
                               `- Xu hướng người chơi\n` +
                               `- Phá cầu dài (>3 phiên)\n\n` +
                               `**AGGRESSIVE:** Bias mạnh luôn về nhà cái`,
                        inline: false
                    }
                )
                .setColor(settings.enabled ? '#FF6B6B' : '#95A5A6')
                .setFooter({ text: settings.enabled ? '🔥 Rigged Mode ACTIVE' : '😇 Fair Mode' })
                .setTimestamp();

            // Gửi riêng cho owner qua DM
            try {
                await message.author.send({ embeds: [embed] });
                await message.reply('📨 Đã gửi admin panel vào DM của bạn!');
            } catch (error) {
                // Nếu không gửi được DM, reply bình thường nhưng delete sau 10s
                const reply = await message.reply({ embeds: [embed] });
                setTimeout(() => {
                    reply.delete().catch(() => {});
                }, 10000);
            }
        }

        switch (subCommand) {
            case 'on':
                global.taixiuRiggedSettings.enabled = true;
                return this.sendOwnerMessage(message, '🔥 **Rigged Dice đã BẬT!** Nhà cái sẽ có lợi thế.');

            case 'off':
                global.taixiuRiggedSettings.enabled = false;
                return this.sendOwnerMessage(message, '😇 **Rigged Dice đã TẮT!** Game sẽ fair 100%.');

            case 'mode':
                const mode = args[1]?.toLowerCase();
                if (!mode || !['smart', 'aggressive'].includes(mode)) {
                    return this.sendOwnerMessage(message, '❌ Chế độ không hợp lệ! Sử dụng: `smart` hoặc `aggressive`');
                }
                global.taixiuRiggedSettings.riggedMode = mode;
                return this.sendOwnerMessage(message, `⚙️ **Chế độ rigged:** ${mode.toUpperCase()}`);

            case 'rate':
                const rate = parseInt(args[1]);
                if (!rate || rate < 50 || rate > 90) {
                    return this.sendOwnerMessage(message, '❌ Tỷ lệ không hợp lệ! Sử dụng: 50-90%');
                }
                global.taixiuRiggedSettings.winRate = rate;
                return this.sendOwnerMessage(message, `📊 **Tỷ lệ thắng nhà cái:** ${rate}%`);

            case 'log':
                const logSetting = args[1]?.toLowerCase();
                if (logSetting === 'on') {
                    global.taixiuRiggedSettings.logRigged = true;
                    return this.sendOwnerMessage(message, '📝 **Log rigged đã BẬT!** Sẽ ghi chi tiết trong console.');
                } else if (logSetting === 'off') {
                    global.taixiuRiggedSettings.logRigged = false;
                    return this.sendOwnerMessage(message, '🔇 **Log rigged đã TẮT!**');
                } else {
                    return this.sendOwnerMessage(message, '❌ Sử dụng: `on` hoặc `off`');
                }

            case 'stats':
                await this.showRiggedStats(message);
                break;

            default:
                return this.sendOwnerMessage(message, '❌ Command không hợp lệ! Sử dụng `,txadmin` để xem hướng dẫn.');
        }
    },

    // Helper function để gửi message riêng tư cho owner
    async sendOwnerMessage(message, content) {
        try {
            // Thử gửi DM trước
            await message.author.send(content);
            // Reply công khai rất ngắn gọn
            const reply = await message.reply('✅ Done');
                         // Xóa reply sau thời gian config
             setTimeout(() => {
                 reply.delete().catch(() => {});
             }, ownerConfig.security.deleteAfter);
        } catch (error) {
            // Nếu không gửi được DM, reply bình thường nhưng delete sau 5s
            const reply = await message.reply(content);
            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 5000);
        }
    },

    async showRiggedStats(message) {
        try {
            // Đọc lịch sử từ file
            const fs = require('fs');
            let history = [];
            
            if (fs.existsSync('./data/taixiu_history.json')) {
                history = JSON.parse(fs.readFileSync('./data/taixiu_history.json', 'utf8'));
            }

            if (history.length === 0) {
                return message.reply('📊 Chưa có dữ liệu để phân tích!');
            }

            // Phân tích rigged effectiveness
            const totalGames = history.length;
            const recent20 = history.slice(-20);
            const recent50 = history.slice(-50);

            // Tính tỷ lệ Tài/Xỉu
            const taiCount = history.filter(h => h.result === 'tai').length;
            const xiuCount = history.filter(h => h.result === 'xiu').length;
            const taiPercent = ((taiCount / totalGames) * 100).toFixed(1);
            const xiuPercent = ((xiuCount / totalGames) * 100).toFixed(1);

            // Phân tích patterns
            let streakBreaks = 0;
            for (let i = 3; i < recent50.length; i++) {
                const prev3 = recent50.slice(i-3, i);
                const current = recent50[i];
                
                if (prev3.every(g => g.result === prev3[0].result) && current.result !== prev3[0].result) {
                    streakBreaks++;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 THỐNG KÊ RIGGED DICE')
                .setDescription('**Phân tích hiệu quả hệ thống bias**')
                .addFields(
                    {
                        name: '🎯 Tổng quan',
                        value: `• **Tổng phiên:** ${totalGames}\n` +
                               `• **Tài:** ${taiCount} (${taiPercent}%)\n` +
                               `• **Xỉu:** ${xiuCount} (${xiuPercent}%)\n` +
                               `• **Bias hiệu quả:** ${Math.abs(50 - parseFloat(taiPercent)) > 5 ? '🔥 CAO' : '📈 THẤP'}`,
                        inline: true
                    },
                    {
                        name: '⚡ Hiệu suất rigged',
                        value: `• **Phá cầu (50 phiên):** ${streakBreaks} lần\n` +
                               `• **Tỷ lệ ideal:** ${global.taixiuRiggedSettings.winRate}%\n` +
                               `• **Chế độ:** ${global.taixiuRiggedSettings.riggedMode.toUpperCase()}\n` +
                               `• **Trạng thái:** ${global.taixiuRiggedSettings.enabled ? '🟢 ACTIVE' : '🔴 OFF'}`,
                        inline: true
                    },
                    {
                        name: '📈 Cầu 20 phiên gần nhất',
                        value: `\`${recent20.map(h => h.result === 'tai' ? 'T' : 'X').join('-')}\``,
                        inline: false
                    }
                )
                .setColor('#FF6B6B')
                .setFooter({ text: '🎰 House Edge Analytics | Casino Management' })
                .setTimestamp();

            // Gửi stats cho owner qua DM
        try {
            await message.author.send({ embeds: [embed] });
            await message.reply('📊 Đã gửi thống kê rigged vào DM của bạn!');
        } catch (error) {
            // Fallback: reply bình thường nhưng delete sau 10s
            const reply = await message.reply({ embeds: [embed] });
            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 10000);
        }

        } catch (error) {
            console.error('Lỗi stats rigged:', error);
            await message.reply('❌ Có lỗi khi lấy thống kê rigged!');
        }
    }
}; 