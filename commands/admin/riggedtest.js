const { EmbedBuilder } = require('discord.js');
const ownerConfig = require('../../config/owner');

module.exports = {
    name: 'riggedtest',
    aliases: ['testrig', 'demorig'],
    description: '[ADMIN] Test rigged dice với simulation',

    async execute(message, args) {
        // Kiểm tra chỉ owner bot được dùng
        if (message.author.id !== ownerConfig.ownerId) {
            // Log attempt nếu bật
            if (ownerConfig.security.logAccess) {
                console.log(`🚫 [SECURITY] User ${message.author.tag} (${message.author.id}) tried to access riggedtest`);
            }
            return message.reply('❌ Lệnh này chỉ dành cho owner bot!');
        }

        const numTests = parseInt(args[0]) || 50;
        if (numTests < 10 || numTests > 200) {
            return message.reply('❌ Số test phải từ 10-200! VD: `,riggedtest 50`');
        }

        await message.reply('🎲 **Đang chạy simulation rigged dice...**');

        // Weighted dice function (copy từ taixiu.js)
        function weightedDiceRoll(weights = [1, 1, 1, 1, 1, 1]) {
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            const random = Math.random() * totalWeight;
            let cumulative = 0;
            
            for (let i = 0; i < weights.length; i++) {
                cumulative += weights[i];
                if (random <= cumulative) {
                    return i + 1;
                }
            }
            return 6; // fallback
        }

        // Test scenarios
        const scenarios = [
            {
                name: '🎯 FAIR (Không rigged)',
                weights: [1, 1, 1, 1, 1, 1],
                description: 'Xúc xắc công bằng 100%'
            },
            {
                name: '📉 BIAS XỈU (Smart)',
                weights: [1.2, 1.1, 1.1, 0.95, 0.9, 0.85],
                description: 'Bias nhẹ về Xỉu (số thấp)'
            },
            {
                name: '📈 BIAS TÀI (Smart)', 
                weights: [0.85, 0.9, 0.95, 1.1, 1.1, 1.2],
                description: 'Bias nhẹ về Tài (số cao)'
            },
            {
                name: '🔥 FORCE XỈU (Aggressive)',
                weights: [1.8, 1.6, 1.4, 0.7, 0.5, 0.3],
                description: 'Bias mạnh về Xỉu'
            },
            {
                name: '🚀 FORCE TÀI (Aggressive)',
                weights: [0.3, 0.5, 0.7, 1.4, 1.6, 1.8],
                description: 'Bias mạnh về Tài'
            }
        ];

        let resultsText = '';

        for (const scenario of scenarios) {
            let taiCount = 0;
            let xiuCount = 0;
            let totalSum = 0;
            let diceDistribution = [0, 0, 0, 0, 0, 0]; // Đếm mỗi mặt xúc xắc

            // Chạy simulation
            for (let i = 0; i < numTests; i++) {
                const dice1 = weightedDiceRoll(scenario.weights);
                const dice2 = weightedDiceRoll(scenario.weights);
                const dice3 = weightedDiceRoll(scenario.weights);
                const total = dice1 + dice2 + dice3;
                
                totalSum += total;
                diceDistribution[dice1-1]++;
                diceDistribution[dice2-1]++;
                diceDistribution[dice3-1]++;

                if (total >= 11) {
                    taiCount++;
                } else {
                    xiuCount++;
                }
            }

            const taiPercent = ((taiCount / numTests) * 100).toFixed(1);
            const xiuPercent = ((xiuCount / numTests) * 100).toFixed(1);
            const avgTotal = (totalSum / numTests).toFixed(1);

            // Tính phân bố xúc xắc
            const totalDiceRolls = numTests * 3;
            const dicePercents = diceDistribution.map(count => ((count / totalDiceRolls) * 100).toFixed(1));

            resultsText += `**${scenario.name}**\n`;
            resultsText += `*${scenario.description}*\n`;
            resultsText += `• Tài: ${taiCount}/${numTests} (${taiPercent}%)\n`;
            resultsText += `• Xỉu: ${xiuCount}/${numTests} (${xiuPercent}%)\n`;
            resultsText += `• Trung bình: ${avgTotal} điểm\n`;
            resultsText += `• Xúc xắc: [${dicePercents.join('%, ')}%]\n`;
            resultsText += `• Bias: [${scenario.weights.join(', ')}]\n\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🧪 RIGGED DICE SIMULATION (${numTests} tests)`)
            .setDescription('**Kết quả test với các scenario bias khác nhau:**\n\n' + resultsText)
            .addFields(
                {
                    name: '📊 Phân tích',
                    value: `• **Fair:** Tài ≈ 50%, Xỉu ≈ 50%\n` +
                           `• **Smart bias:** Lệch 5-15%\n` +
                           `• **Aggressive:** Lệch 20-40%\n` +
                           `• **Xúc xắc chuẩn:** Mỗi mặt ≈ 16.7%`,
                    inline: false
                }
            )
            .setColor('#FF6B6B')
            .setFooter({ text: '🎰 Casino Rigged Analytics | For Educational Purpose Only' })
            .setTimestamp();

        // Gửi kết quả cho owner qua DM
        try {
            await message.author.send({ embeds: [embed] });
            await message.reply('🧪 Đã gửi kết quả test rigged vào DM của bạn!');
        } catch (error) {
            // Fallback: reply bình thường nhưng delete sau 15s
            const reply = await message.reply({ embeds: [embed] });
            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 15000);
        }
    }
}; 