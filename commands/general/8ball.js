const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: '8ball',
    description: 'Hỏi quả cầu pha lê về tương lai',
    
    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🔮 QUAÛ CAàU PHA LEA')
                    .setDescription('**Cách sử dụng:**\n' +
                        '`,8ball <câu hỏi>`\n\n' +
                        '**Ví dụ:**\n' +
                        '`,8ball Hôm nay tôi có may mắn không?`\n' +
                        '`,8ball Tôi có nên mua cây này không?`\n' +
                        '`,8ball Bot có thông minh không?`\n\n' +
                        '**Lưu ý:** Hãy hỏi câu hỏi có thể trả lời bằng có/không!')
                    .setColor('#9932cc')
                    .setThumbnail('https://images.emojiterra.com/google/noto-emoji/unicode-15/color/512px/1f52e.png');
                
                return message.reply({ embeds: [embed] });
            }
            
            const question = args.join(' ');
            
            if (question.length > 200) {
                return message.reply('❌ Câu hỏi quá dài! Hãy ngắn gọn hơn (tối đa 200 ký tự).');
            }
            
            const responses = [
                // Tích cực
                '✅ **Chắc chắn rồi!**',
                '✅ **Không nghi ngờ gì nữa!**',
                '✅ **Có, chắc chắn!**',
                '✅ **Bạn có thể tin tưởng điều đó!**',
                '✅ **Theo tôi thì có!**',
                '✅ **Rất có khả năng!**',
                '✅ **Triển vọng tốt đấy!**',
                '✅ **Có!**',
                '✅ **Tất nhiên rồi!**',
                '✅ **Dấu hiệu cho thấy có!**',
                
                // Trung tính
                '🤔 **Hãy hỏi lại sau...**',
                '🤔 **Tốt hơn bạn không nên biết bây giờ.**',
                '🤔 **Không thể dự đoán được.**',
                '🤔 **Tập trung và hỏi lại.**',
                '🤔 **Đừng tin vào điều đó.**',
                '🤔 **Câu trả lời mơ hồ, hãy thử lại.**',
                '🤔 **Hỏi lại sau nhé.**',
                
                // Tiêu cực
                '❌ **Đừng hy vọng vào điều đó.**',
                '❌ **Câu trả lời của tôi là không.**',
                '❌ **Nguồn tin của tôi nói không.**',
                '❌ **Triển vọng không tốt lắm.**',
                '❌ **Rất nghi ngờ.**',
                '❌ **Không!**',
                '❌ **Chắc chắn là không!**',
                
                // Hài hước (dành riêng cho tiếng Việt)
                '😄 **Hỏi mẹ bạn đi!**',
                '😄 **Google biết hơn tôi!**',
                '😄 **Tôi chỉ là quả cầu pha lê thôi mà!**',
                '😄 **Ăn cơm chưa đã?**',
                '😄 **Sao không hỏi Siri?**',
                '🎲 **Tung đồng xu cho chắc!**',
                '🎭 **Phải xem ngày tốt xấu mới biết!**',
                '🌟 **Nhìn các vì sao đã sắp xếp...**',
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            // Màu sắc dựa trên loại phản hồi
            let embedColor = '#9932cc';
            if (randomResponse.includes('✅')) {
                embedColor = '#00ff00'; // Xanh lá cho tích cực
            } else if (randomResponse.includes('❌')) {
                embedColor = '#ff0000'; // Đỏ cho tiêu cực
            } else if (randomResponse.includes('🤔')) {
                embedColor = '#ffaa00'; // Cam cho trung tính
            } else {
                embedColor = '#ff69b4'; // Hồng cho hài hước
            }
            
            // Tạo hiệu ứng "đang suy nghĩ"
            const thinkingMsg = await message.reply('🔮 *Quả cầu pha lê đang suy nghĩ...*');
            
            // Đợi 2 giây để tạo hiệu ứng
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const embed = new EmbedBuilder()
                .setTitle('🔮 QUAÛ CAàU PHA LEA NÓI...')
                .setDescription(`**Câu hỏi của bạn:**\n*"${question}"*\n\n**Câu trả lời:**\n${randomResponse}`)
                .setColor(embedColor)
                .setFooter({ 
                    text: `${message.author.displayName} đã hỏi quả cầu pha lê | Kết quả chỉ mang tính giải trí` 
                })
                .setTimestamp()
                .setThumbnail('https://images.emojiterra.com/google/noto-emoji/unicode-15/color/512px/1f52e.png');
            
            await thinkingMsg.edit({ content: '', embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi 8ball:', error);
            await message.reply('❌ Quả cầu pha lê bị vỡ! Thử lại sau nhé.');
        }
    }
}; 