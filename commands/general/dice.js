const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'dice',
    description: 'Tung xúc xắc ngẫu nhiên',
    
    async execute(message, args) {
        try {
            // Mặc định tung 1 xúc xắc 6 mặt
            let numDice = 1;
            let numSides = 6;
            
            // Parse args nếu có
            if (args.length > 0) {
                const input = args[0];
                
                // Format: 2d6 (2 xúc xắc 6 mặt)
                if (input.includes('d')) {
                    const parts = input.split('d');
                    numDice = parseInt(parts[0]) || 1;
                    numSides = parseInt(parts[1]) || 6;
                } else {
                    // Chỉ số mặt: dice 20
                    numSides = parseInt(input) || 6;
                }
            }
            
            // Giới hạn để tránh spam
            numDice = Math.min(Math.max(1, numDice), 10);
            numSides = Math.min(Math.max(2, numSides), 100);
            
            // Tung xúc xắc
            const results = [];
            let total = 0;
            
            for (let i = 0; i < numDice; i++) {
                const roll = Math.floor(Math.random() * numSides) + 1;
                results.push(roll);
                total += roll;
            }
            
            // Tạo emoji xúc xắc cho các số đặc biệt
            const getDiceEmoji = (num) => {
                const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
                return num <= 6 ? diceEmojis[num - 1] : `**${num}**`;
            };
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 TUNG XÚC XẮC')
                .setColor('#FFD700')
                .addFields(
                    {
                        name: '📊 Thông tin',
                        value: `**Số xúc xắc:** ${numDice}\n**Số mặt:** ${numSides}`,
                        inline: true
                    },
                    {
                        name: '🎯 Kết quả',
                        value: results.map(r => getDiceEmoji(r)).join(' '),
                        inline: true
                    },
                    {
                        name: '🔢 Tổng điểm',
                        value: `**${total}**`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `${message.author.displayName} đã tung xúc xắc | Dùng: ,dice 2d20` 
                })
                .setTimestamp();
                
            // Thêm mô tả chi tiết nếu tung nhiều xúc xắc
            if (numDice > 1) {
                embed.setDescription(`**Chi tiết:** ${results.map((r, i) => `Xúc xắc ${i + 1}: ${r}`).join(' | ')}`);
            }
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi dice:', error);
            await message.reply('❌ Có lỗi xảy ra khi tung xúc xắc!');
        }
    }
}; 