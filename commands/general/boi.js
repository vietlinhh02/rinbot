const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { decryptApiKey } = require('../../utils/encryption');
const { getPrefix } = require('../../utils/prefixHelper');

// Các loại bói khác nhau
const BOI_TYPES = {
    'tarot': {
        name: 'Tarot',
        emoji: '🔮',
        prompt: 'Bạn là một thầy bói tarot chuyên nghiệp. Hãy rút một lá bài tarot và giải thích ý nghĩa cho tôi về tình yêu, công việc và tài lộc. Trả lời bằng tiếng Việt, phong cách thân thiện và huyền bí.'
    },
    'tuongso': {
        name: 'Tướng Số',
        emoji: '🧠',
        prompt: 'Bạn là một thầy tướng số am hiểu về nhân tướng học. Hãy phân tích tương lai của tôi dựa trên ngày hôm nay, về vận mệnh, tình duyên và sự nghiệp. Trả lời bằng tiếng Việt, phong cách truyền thống nhưng dễ hiểu.'
    },
    'dongvat': {
        name: 'Bói Con Vật',
        emoji: '🐾',
        prompt: 'Bạn là thầy bói chuyên về linh thú. Hãy chọn một con vật làm biểu tượng cho tôi hôm nay và giải thích ý nghĩa về may mắn, tình yêu và công việc. Trả lời bằng tiếng Việt, phong cách vui vẻ và có tính giải trí.'
    },
    'sao': {
        name: 'Bói Sao',
        emoji: '⭐',
        prompt: 'Bạn là nhà chiêm tinh học. Hãy dự đoán vận sao của tôi hôm nay về tình yêu, công việc, tài lộc và sức khỏe dựa trên vị trí các vì sao. Trả lời bằng tiếng Việt, phong cách bí ẩn và lôi cuốn.'
    },
    'caocap': {
        name: 'Bói Cao Cấp',
        emoji: '✨',
        prompt: 'Bạn là một thầy bói huyền thoại với khả năng nhìn thấu tương lai. Hãy dự đoán chi tiết về vận mệnh của tôi trong tuần tới, bao gồm tình yêu, sự nghiệp, tài lộc, sức khỏe và những điều cần lưu ý. Trả lời bằng tiếng Việt, phong cách chuyên sâu và đầy cảm hứng.'
    }
};

module.exports = {
    name: 'boi',
    description: 'Xem bói bằng AI Gemini',
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const prefix = await getPrefix(message.guild?.id);
            
            // Kiểm tra user có API key chưa
            const user = await User.findOne({ userId });
            if (!user || !user.geminiApiKey) {
                const noKeyEmbed = new EmbedBuilder()
                    .setTitle('🔑 CHƯA CÀI ĐẶT API KEY')
                    .setDescription('Bạn chưa cài đặt Gemini API Key!\n\n' +
                        '**Hướng dẫn lấy API Key MIỄN PHÍ:**\n' +
                        '1️⃣ Truy cập: https://aistudio.google.com/app/apikey\n' +
                        '2️⃣ Đăng nhập Google và tạo API Key\n' +
                        `3️⃣ Sử dụng lệnh: \`${prefix}setgemini\`\n\n` +
                        '**Sau khi cài đặt, sử dụng:**\n' +
                        `• \`${prefix}boi\` - Bói ngẫu nhiên\n` +
                        `• \`${prefix}boi tarot\` - Bói bài Tarot\n` +
                        `• \`${prefix}boi tuongso\` - Tướng số\n` +
                        `• \`${prefix}boi dongvat\` - Bói con vật\n` +
                        `• \`${prefix}boi sao\` - Bói sao\n` +
                        `• \`${prefix}boi caocap\` - Bói cao cấp`)
                    .setColor('#FF6B6B')
                    .setThumbnail('https://i.imgur.com/fX8SdqQ.png');

                return await message.reply({ embeds: [noKeyEmbed] });
            }

            // Xử lý loại bói và câu hỏi
            let selectedType;
            let customQuestion = null;
            
            if (!args[0]) {
                // Chọn ngẫu nhiên nếu không chỉ định
                const types = Object.keys(BOI_TYPES);
                const randomType = types[Math.floor(Math.random() * types.length)];
                selectedType = BOI_TYPES[randomType];
            } else {
                const requestedType = args[0].toLowerCase();
                
                // Kiểm tra nếu là loại bói hợp lệ
                if (BOI_TYPES[requestedType]) {
                    selectedType = BOI_TYPES[requestedType];
                    // Lấy câu hỏi từ args[1] trở đi
                    if (args.length > 1) {
                        customQuestion = args.slice(1).join(' ');
                    }
                } else {
                    // Nếu không phải loại bói, coi toàn bộ args là câu hỏi
                    const types = Object.keys(BOI_TYPES);
                    const randomType = types[Math.floor(Math.random() * types.length)];
                    selectedType = BOI_TYPES[randomType];
                    customQuestion = args.join(' ');
                }
                
                // Hiển thị help nếu user gõ "help"
                if (args[0].toLowerCase() === 'help') {
                    const typesEmbed = new EmbedBuilder()
                        .setTitle('🔮 CÁC LOẠI BÓI CÓ SẴN')
                        .setDescription(Object.entries(BOI_TYPES)
                            .map(([key, type]) => `${type.emoji} **${key}** - ${type.name}`)
                            .join('\n') + '\n\n**Cách sử dụng:**\n' +
                            `• \`${prefix}boi\` - Bói ngẫu nhiên\n` +
                            `• \`${prefix}boi tarot\` - Bói Tarot\n` +
                            `• \`${prefix}boi tarot Tôi có nên chuyển việc?\` - Bói Tarot với câu hỏi\n` +
                            `• \`${prefix}boi Tôi sẽ gặp ai đặc biệt không?\` - Bói ngẫu nhiên với câu hỏi`)
                        .setColor('#9B59B6');

                    return await message.reply({ embeds: [typesEmbed] });
                }
            }

            // Hiển thị loading
            const loadingDescription = customQuestion 
                ? `**Câu hỏi:** ${customQuestion}\n\nThầy bói đang kết nối với thế giới tâm linh...`
                : 'Thầy bói đang kết nối với thế giới tâm linh...';
                
            const loadingEmbed = new EmbedBuilder()
                .setTitle(`${selectedType.emoji} ĐANG XEM BÓI...`)
                .setDescription(loadingDescription)
                .setColor('#F39C12');

            const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

            // Gọi Gemini AI
            try {
                // Giải mã API key trước khi sử dụng
                const decryptedApiKey = decryptApiKey(user.geminiApiKey);
                const genAI = new GoogleGenerativeAI(decryptedApiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

                const basePrompt = customQuestion 
                    ? `${selectedType.prompt}\n\nCâu hỏi cụ thể: "${customQuestion}"\nHãy tập trung trả lời câu hỏi này.`
                    : selectedType.prompt;

                const enhancedPrompt = `${basePrompt}

Người cần bói: ${message.author.displayName}
Thời gian: ${new Date().toLocaleString('vi-VN')}
${customQuestion ? `Câu hỏi: ${customQuestion}` : ''}

Yêu cầu format trả lời:
- Sử dụng emoji phù hợp
- Chia thành các mục rõ ràng
- Độ dài khoảng 200-300 từ
- Phong cách huyền bí nhưng tích cực
- Kết thúc bằng một lời khuyên hay điều cần lưu ý
${customQuestion ? '- Trả lời trực tiếp câu hỏi được đặt ra' : ''}`;

                const result = await model.generateContent(enhancedPrompt);
                const response = await result.response;
                const text = response.text();

                // Hiển thị kết quả
                const resultTitle = customQuestion 
                    ? `${selectedType.emoji} ${selectedType.name.toUpperCase()} - CÂU HỎI`
                    : `${selectedType.emoji} ${selectedType.name.toUpperCase()}`;
                
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
                    .setThumbnail('https://raw.githubusercontent.com/vietlinhh02/test/refs/heads/main/d098bf056c1a3a3f23261606edde04de.png');

                await loadingMsg.edit({ embeds: [resultEmbed] });

            } catch (apiError) {
                console.error('Gemini API Error:', apiError);
                
                let errorMessage = '❌ Có lỗi xảy ra với Gemini AI!';
                if (apiError.message.includes('API_KEY_INVALID')) {
                    errorMessage = `❌ API Key không hợp lệ! Hãy kiểm tra lại với lệnh \`${prefix}setgemini\``;
                } else if (apiError.message.includes('QUOTA_EXCEEDED')) {
                    errorMessage = '❌ API Key đã hết quota! Hãy đợi hoặc tạo API Key mới.';
                }

                const errorEmbed = new EmbedBuilder()
                    .setTitle('⚠️ LỖI API')
                    .setDescription(errorMessage + '\n\nHướng dẫn tạo API Key mới: https://aistudio.google.com/app/apikey')
                    .setColor('#FF0000');

                await loadingMsg.edit({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Lỗi boi:', error);
            await message.reply('❌ Có lỗi xảy ra khi xem bói!');
        }
    }
}; 