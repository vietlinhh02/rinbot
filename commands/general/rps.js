const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'rps',
    description: 'Chơi kéo búa bao với bot',
    
    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('✂️ KÉO BÚA BAO')
                    .setDescription('**Cách chơi:**\n' +
                        '`,rps keo` hoặc `,rps k` - Ra kéo ✂️\n' +
                        '`,rps bua` hoặc `,rps b` - Ra búa 🔨\n' +
                        '`,rps bao` hoặc `,rps p` - Ra bao 📄\n\n' +
                        '**Luật chơi:**\n' +
                        '• Kéo thắng bao\n' +
                        '• Búa thắng kéo\n' +
                        '• Bao thắng búa')
                    .setColor('#0099ff');
                
                return message.reply({ embeds: [embed] });
            }
            
            const userChoice = args[0].toLowerCase();
            const choices = {
                'keo': { name: 'Kéo', emoji: '✂️', beats: 'bao' },
                'k': { name: 'Kéo', emoji: '✂️', beats: 'bao' },
                'bua': { name: 'Búa', emoji: '🔨', beats: 'keo' },
                'b': { name: 'Búa', emoji: '🔨', beats: 'keo' },
                'bao': { name: 'Bao', emoji: '📄', beats: 'bua' },
                'p': { name: 'Bao', emoji: '📄', beats: 'bua' }
            };
            
            if (!choices[userChoice]) {
                return message.reply('❌ Lựa chọn không hợp lệ! Dùng: `keo`, `bua`, hoặc `bao`');
            }
            
            const choiceKeys = ['keo', 'bua', 'bao'];
            const botChoice = choiceKeys[Math.floor(Math.random() * choiceKeys.length)];
            
            const userMove = choices[userChoice];
            const botMove = choices[botChoice];
            
            let result = '';
            let resultColor = '';
            let resultEmoji = '';
            
            if (userChoice === botChoice || 
                (userChoice === 'k' && botChoice === 'keo') ||
                (userChoice === 'b' && botChoice === 'bua') ||
                (userChoice === 'p' && botChoice === 'bao')) {
                result = '🤝 **HÒA!**';
                resultColor = '#ffaa00';
                resultEmoji = '😐';
            } else if (userMove.beats === botChoice) {
                result = '🎉 **BẠN THẮNG!**';
                resultColor = '#00ff00';
                resultEmoji = '😄';
            } else {
                result = '😞 **BẠN THUA!**';
                resultColor = '#ff0000';
                resultEmoji = '😢';
            }
            
            const embed = new EmbedBuilder()
                .setTitle('✂️🔨📄 KÉO BÚA BAO')
                .setColor(resultColor)
                .addFields(
                    {
                        name: '👤 Bạn chọn',
                        value: `${userMove.emoji} **${userMove.name}**`,
                        inline: true
                    },
                    {
                        name: '🤖 Bot chọn',
                        value: `${botMove.emoji} **${botMove.name}**`,
                        inline: true
                    },
                    {
                        name: '🏆 Kết quả',
                        value: result,
                        inline: false
                    }
                )
                .setDescription(`${resultEmoji} ${result === '🤝 **HÒA!**' ? 'Cả hai cùng chọn giống nhau!' : 
                    result === '🎉 **BẠN THẮNG!**' ? `${userMove.name} thắng ${botMove.name}!` : 
                    `${botMove.name} thắng ${userMove.name}!`}`)
                .setFooter({ 
                    text: `${message.author.displayName} vs Bot | Chơi lại: ,rps [keo/bua/bao]` 
                })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi rps:', error);
            await message.reply('❌ Có lỗi xảy ra khi chơi kéo búa bao!');
        }
    }
}; 