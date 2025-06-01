const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { decryptApiKey } = require('../../utils/encryption');
const { getPrefix } = require('../../utils/prefixHelper');

module.exports = {
    name: 'boianh',
    description: 'Xem bói từ hình ảnh bản đồ sao, tử vi',
    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const prefix = await getPrefix(message.guild?.id);
            
            // Kiểm tra user có API key chưa
            const user = await User.findOne({ userId });
            if (!user || !user.geminiApiKey) {
                const noKeyEmbed = new EmbedBuilder()
                    .setTitle('🔑 CHƯA CÀI ĐẶT API KEY')
                    .setDescription('Bạn chưa cài đặt Gemini API Key!\n\n' +
                        `Sử dụng lệnh \`${prefix}setgemini\` để cài đặt API Key trước khi xem bói từ hình ảnh.`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [noKeyEmbed] });
            }

            // Kiểm tra có hình ảnh đính kèm không
            if (message.attachments.size === 0) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('📸 XEM BÓI TỪ HÌNH ẢNH')
                    .setDescription('**Hướng dẫn sử dụng:**\n\n' +
                        '1️⃣ Đính kèm hình ảnh bản đồ sao hoặc tử vi\n' +
                        `2️⃣ Gõ lệnh \`${prefix}boianh\` (có thể thêm câu hỏi)\n\n` +
                        '**Các loại hình ảnh hỗ trợ:**\n' +
                        '⭐ Bản đồ sao sinh (Birth Chart)\n' +
                        '🔮 Lá bài Tarot\n' +
                        '🧠 Biểu đồ tử vi\n' +
                        '🌙 Bản đồ chiêm tinh\n' +
                        '📜 Hình ảnh phong thủy\n\n' +
                        '**Ví dụ:**\n' +
                        `• Đính kèm ảnh + \`${prefix}boianh\`\n` +
                        `• Đính kèm ảnh + \`${prefix}boianh Tình yêu của tôi sẽ ra sao?\``)
                    .setColor('#9B59B6')
                    .setThumbnail(client.user.displayAvatarURL())
                    .setFooter({ text: 'Hãy đính kèm hình ảnh và thử lại!' });

                return await message.reply({ embeds: [helpEmbed] });
            }

            // Lấy hình ảnh đầu tiên
            const attachment = message.attachments.first();
            
            // Kiểm tra định dạng file
            const allowedFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
            const fileExtension = attachment.name.split('.').pop().toLowerCase();
            
            if (!allowedFormats.includes(fileExtension)) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Định dạng không hỗ trợ')
                    .setDescription(`Chỉ hỗ trợ các định dạng: ${allowedFormats.join(', ')}\n\n` +
                        'Hãy upload lại hình ảnh với định dạng phù hợp.')
                    .setColor('#FF0000');

                return await message.reply({ embeds: [errorEmbed] });
            }

            // Kiểm tra kích thước file (max 10MB)
            if (attachment.size > 10 * 1024 * 1024) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ File quá lớn')
                    .setDescription('Hình ảnh phải nhỏ hơn 10MB.\n\nHãy nén ảnh và thử lại.')
                    .setColor('#FF0000');

                return await message.reply({ embeds: [errorEmbed] });
            }

            // Lấy câu hỏi từ args (nếu có)
            const customQuestion = args.length > 0 ? args.join(' ') : null;

            // Hiển thị loading
            const loadingDescription = customQuestion 
                ? `**Hình ảnh:** ${attachment.name}\n**Câu hỏi:** ${customQuestion}\n\nĐang phân tích hình ảnh và kết nối với thế giới tâm linh...`
                : `**Hình ảnh:** ${attachment.name}\n\nĐang phân tích hình ảnh và kết nối với thế giới tâm linh...`;
                
            const loadingEmbed = new EmbedBuilder()
                .setTitle('🔍 ĐANG PHÂN TÍCH HÌNH ẢNH...')
                .setDescription(loadingDescription)
                .setColor('#F39C12')
                .setImage(attachment.url);

            const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

            // Gọi Gemini Vision AI
            try {
                // Giải mã API key
                const decryptedApiKey = decryptApiKey(user.geminiApiKey);
                const genAI = new GoogleGenerativeAI(decryptedApiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

                // Tải hình ảnh
                const response = await fetch(attachment.url);
                const buffer = await response.arrayBuffer();
                
                const imageData = {
                    inlineData: {
                        data: Buffer.from(buffer).toString('base64'),
                        mimeType: attachment.contentType
                    }
                };

                // Tạo prompt cho việc đọc hình ảnh
                const basePrompt = `Bạn là một thầy bói chuyên nghiệp và nhà chiêm tinh học có khả năng đọc được các biểu đồ, bản đồ sao, lá bài tarot và hình ảnh phong thủy.

Hãy phân tích hình ảnh này và đưa ra lời bói chi tiết.`;

                const questionPrompt = customQuestion 
                    ? `\n\nCâu hỏi cụ thể: "${customQuestion}"\nHãy tập trung trả lời câu hỏi này dựa trên những gì bạn thấy trong hình.`
                    : '';

                const enhancedPrompt = `${basePrompt}${questionPrompt}

Người cần bói: ${message.author.displayName}
Thời gian: ${new Date().toLocaleString('vi-VN')}
${customQuestion ? `Câu hỏi: ${customQuestion}` : ''}

Yêu cầu phân tích:
- Mô tả những gì bạn thấy trong hình ảnh
- Giải thích ý nghĩa của các biểu tượng, vị trí sao, số liệu
- Đưa ra lời bói về tình yêu, sự nghiệp, tài lộc, sức khỏe
- Sử dụng emoji phù hợp
- Độ dài khoảng 300-400 từ
- Phong cách huyền bí nhưng tích cực
- Kết thúc bằng lời khuyên cụ thể
${customQuestion ? '- Trả lời trực tiếp câu hỏi được đặt ra' : ''}

Trả lời bằng tiếng Việt.`;

                const result = await model.generateContent([enhancedPrompt, imageData]);
                const response_text = await result.response;
                const text = response_text.text();

                // Hiển thị kết quả
                const resultTitle = customQuestion 
                    ? `🔍 BÓI TỪ HÌNH ẢNH - CÂU HỎI`
                    : `🔍 BÓI TỪ HÌNH ẢNH`;
                
                const resultDescription = customQuestion 
                    ? `**❓ Câu hỏi:** ${customQuestion}\n\n${text}`
                    : text;
                
                const resultEmbed = new EmbedBuilder()
                    .setTitle(resultTitle)
                    .setDescription(resultDescription)
                    .setColor('#8E44AD')
                    .setFooter({ 
                        text: `Bói cho ${message.author.displayName} • ${new Date().toLocaleString('vi-VN')}`,
                        iconURL: message.author.displayAvatarURL()
                    })
                    .setThumbnail(attachment.url);

                await loadingMsg.edit({ embeds: [resultEmbed] });

            } catch (apiError) {
                console.error('Gemini Vision API Error:', apiError);
                
                let errorMessage = '❌ Có lỗi xảy ra với Gemini AI!';
                if (apiError.message.includes('API_KEY_INVALID')) {
                    errorMessage = `❌ API Key không hợp lệ! Hãy kiểm tra lại với lệnh \`${prefix}setgemini\``;
                } else if (apiError.message.includes('QUOTA_EXCEEDED')) {
                    errorMessage = '❌ API Key đã hết quota! Hãy đợi hoặc tạo API Key mới.';
                } else if (apiError.message.includes('SAFETY')) {
                    errorMessage = '❌ Hình ảnh bị từ chối do chính sách an toàn. Hãy thử với hình ảnh khác.';
                }

                const errorEmbed = new EmbedBuilder()
                    .setTitle('⚠️ LỖI PHÂN TÍCH HÌNH ẢNH')
                    .setDescription(errorMessage + '\n\nHướng dẫn tạo API Key mới: https://aistudio.google.com/app/apikey')
                    .setColor('#FF0000');

                await loadingMsg.edit({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Lỗi boianh:', error);
            await message.reply('❌ Có lỗi xảy ra khi xem bói từ hình ảnh!');
        }
    }
}; 