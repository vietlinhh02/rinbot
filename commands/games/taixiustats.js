const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'taixiustats',
    aliases: ['txstats', 'caulong'],
    description: 'Xem thống kê và cầu dài Tài Xỉu',

    async execute(message, args) {
        try {
            // Lấy history từ taixiu command
            const taixiuCommand = message.client.commands.get('taixiu');
            if (!taixiuCommand) {
                return message.reply('❌ Game Tài Xỉu chưa được khởi tạo!');
            }

            // Access global history (cần export từ taixiu.js)
            const fs = require('fs');
            const path = './data/taixiu_history.json';
            
            let history = [];
            try {
                if (fs.existsSync(path)) {
                    history = JSON.parse(fs.readFileSync(path, 'utf8'));
                }
            } catch (error) {
                console.log('Không thể đọc history tài xỉu:', error);
            }

            if (history.length === 0) {
                return message.reply('📊 **Chưa có dữ liệu Tài Xỉu!**\n\nHãy chơi vài phiên để có thống kê.');
            }

            // Phân tích dữ liệu
            const totalGames = history.length;
            const taiCount = history.filter(h => h.result === 'tai').length;
            const xiuCount = history.filter(h => h.result === 'xiu').length;
            
            const taiPercent = ((taiCount / totalGames) * 100).toFixed(1);
            const xiuPercent = ((xiuCount / totalGames) * 100).toFixed(1);

            // Tìm cầu dài nhất
            function findLongestStreak(history, type) {
                let maxStreak = 0;
                let currentStreak = 0;
                
                for (const game of history) {
                    if (game.result === type) {
                        currentStreak++;
                        maxStreak = Math.max(maxStreak, currentStreak);
                    } else {
                        currentStreak = 0;
                    }
                }
                
                return maxStreak;
            }

            const longestTai = findLongestStreak(history, 'tai');
            const longestXiu = findLongestStreak(history, 'xiu');

            // Cầu hiện tại
            const recent = history.slice(-20);
            const cauString = recent.map(h => h.result === 'tai' ? 'T' : 'X').join('-');
            
            // Đếm cầu hiện tại
            const lastResult = history[history.length - 1]?.result;
            let currentStreak = 0;
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].result === lastResult) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            // Thống kê điểm số
            const points = history.map(h => h.total);
            const avgPoints = (points.reduce((a, b) => a + b, 0) / points.length).toFixed(1);
            const minPoints = Math.min(...points);
            const maxPoints = Math.max(...points);

            // Phân bố điểm
            const pointDistribution = {};
            for (let i = 3; i <= 18; i++) {
                pointDistribution[i] = points.filter(p => p === i).length;
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 THỐNG KÊ TÀI XỈU CHI TIẾT')
                .setDescription(`**📈 Cầu 20 phiên gần nhất:**\n\`${cauString}\`\n\n` +
                    `**🔥 Cầu hiện tại:** ${lastResult === 'tai' ? 'Tài' : 'Xỉu'} - ${currentStreak} phiên`)
                .addFields(
                    { 
                        name: '🎯 Tổng quan', 
                        value: `• **Tổng phiên:** ${totalGames.toLocaleString()}\n` +
                               `• **Tài:** ${taiCount} phiên (${taiPercent}%)\n` +
                               `• **Xỉu:** ${xiuCount} phiên (${xiuPercent}%)`, 
                        inline: true 
                    },
                    { 
                        name: '🏆 Kỷ lục cầu dài', 
                        value: `• **Cầu Tài:** ${longestTai} phiên\n` +
                               `• **Cầu Xỉu:** ${longestXiu} phiên\n` +
                               `• **Hiện tại:** ${currentStreak} phiên`, 
                        inline: true 
                    },
                    { 
                        name: '📊 Thống kê điểm', 
                        value: `• **Trung bình:** ${avgPoints} điểm\n` +
                               `• **Thấp nhất:** ${minPoints} điểm\n` +
                               `• **Cao nhất:** ${maxPoints} điểm`, 
                        inline: true 
                    }
                )
                .setColor(currentStreak >= 5 ? '#FF6B6B' : '#4ECDC4')
                .setFooter({ text: `${currentStreak >= 5 ? '🔥 Cầu đang nóng!' : '📈 Dữ liệu cập nhật realtime'}` })
                .setTimestamp();

            // Thêm phân bố điểm nếu yêu cầu chi tiết
            if (args[0] === 'full' || args[0] === 'chitiet') {
                let distributionText = '';
                for (let i = 3; i <= 18; i++) {
                    const count = pointDistribution[i] || 0;
                    const percent = totalGames > 0 ? ((count / totalGames) * 100).toFixed(1) : '0.0';
                    const resultType = i >= 11 ? 'T' : 'X';
                    distributionText += `${i}: ${count} (${percent}%) ${resultType}\n`;
                }

                embed.addFields({
                    name: '📋 Phân bố điểm số',
                    value: `\`\`\`\n${distributionText}\`\`\``,
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi thống kê tài xỉu:', error);
            await message.reply('❌ Có lỗi khi lấy thống kê Tài Xỉu!');
        }
    }
}; 