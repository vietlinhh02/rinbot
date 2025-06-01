const { EmbedBuilder } = require('discord.js');
const { getPrefix } = require('../../utils/prefixHelper');

module.exports = {
    name: 'boihelp',
    description: 'Hướng dẫn sử dụng tính năng bói AI',
    async execute(message, args) {
        const prefix = await getPrefix(message.guild?.id);
        
        const embed = new EmbedBuilder()
            .setTitle('🔮 HƯỚNG DẪN XEM BÓI AI')
            .setDescription('**Tính năng xem bói bằng Gemini AI**')
            .setColor('#9B59B6')
            .setThumbnail('https://raw.githubusercontent.com/vietlinhh02/test/refs/heads/main/d098bf056c1a3a3f23261606edde04de.png');

        // Bước cài đặt
        embed.addFields({
            name: '🔑 Bước 1: Cài đặt API Key (Bảo mật)',
            value: 
                '**Lấy API Key MIỄN PHÍ:**\n' +
                '1️⃣ Truy cập: https://aistudio.google.com/app/apikey\n' +
                '2️⃣ Đăng nhập bằng tài khoản Google\n' +
                '3️⃣ Nhấn "Create API Key"\n' +
                `4️⃣ Gõ \`${prefix}setgemini\` và bấm nút "🔑 Nhập API Key"\n` +
                '5️⃣ Dán API Key vào modal bảo mật',
            inline: false
        });

        // Các loại bói
        embed.addFields({
            name: '🎭 Bước 2: Các loại bói',
            value: 
                '**📝 Bói văn bản:**\n' +
                '🔮 **tarot** - Bói bài Tarot\n' +
                '🧠 **tuongso** - Tướng số học\n' +
                '🐾 **dongvat** - Bói con vật\n' +
                '⭐ **sao** - Bói sao (chiêm tinh)\n' +
                '✨ **caocap** - Bói cao cấp (chi tiết)\n\n' +
                '**📸 Bói từ hình ảnh:**\n' +
                '🔍 **boianh** - Đọc bản đồ sao, tử vi, tarot từ ảnh',
            inline: false
        });

        // Lưu ý
        embed.addFields({
            name: '🛡️ Bảo mật & Lưu ý',
            value: 
                '• API Key **hoàn toàn MIỄN PHÍ**\n' +
                '• **Mã hóa AES-256** trước khi lưu database\n' +
                '• Modal bảo mật - chỉ bạn thấy được\n' +
                '• Không chia sẻ API Key cho người khác\n' +
                `• \`${prefix}geminiinfo\` - Xem trạng thái API Key\n` +
                '• Kết quả bói chỉ mang tính giải trí',
            inline: false
        });

        // Ví dụ
        embed.addFields({
            name: '📝 Ví dụ sử dụng',
            value: 
                '**Cài đặt API Key (Bảo mật):**\n' +
                `\`${prefix}setgemini\` → Bấm nút → Nhập vào modal\n\n` +
                '**Bói văn bản:**\n' +
                `\`${prefix}boi\` ← Bói ngẫu nhiên\n` +
                `\`${prefix}boi tarot\` ← Bói Tarot\n` +
                `\`${prefix}boi Tôi có nên chuyển việc?\` ← Bói với câu hỏi\n` +
                `\`${prefix}boi sao Tình yêu sẽ ra sao?\` ← Bói sao với câu hỏi\n\n` +
                '**Bói từ hình ảnh:**\n' +
                `Đính kèm ảnh + \`${prefix}boianh\` ← Đọc hình ảnh\n` +
                `Đính kèm ảnh + \`${prefix}boianh Sự nghiệp?\` ← Hỏi cụ thể\n\n` +
                '**Kiểm tra:**\n' +
                `\`${prefix}geminiinfo\` ← Xem trạng thái API Key`,
            inline: false
        });

        embed.setFooter({ 
            text: 'AI Bói - Chỉ mang tính giải trí 🎭',
            iconURL: message.client.user.displayAvatarURL()
        });

        await message.reply({ embeds: [embed] });
    }
}; 