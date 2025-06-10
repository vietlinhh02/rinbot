const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'taixiuhelp',
    aliases: ['txhelp', 'huongdantx'],
    description: 'Hướng dẫn chi tiết cách chơi Tài Xỉu',

    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setTitle('🎲 HƯỚNG DẪN TÀI XỈU')
            .setDescription('**Game Tài Xỉu Casino - Dự đoán kết quả 3 xúc xắc**')
            .addFields(
                {
                    name: '🎯 Luật chơi cơ bản',
                    value: `• **Tài (T):** Tổng 3 xúc xắc từ **11-17 điểm**\n` +
                           `• **Xỉu (X):** Tổng 3 xúc xắc từ **4-10 điểm**\n` +
                           `• **Tỷ lệ thắng:** 1:1 (cược 100 thắng 200)\n` +
                           `• **Điểm không thể có:** 3 và 18`,
                    inline: false
                },
                {
                    name: '🎮 Cách chơi',
                    value: `**1.** Nhà cái gõ \`,taixiu\` để mở phiên\n` +
                           `**2.** Người chơi bấm nút **Tài** hoặc **Xỉu**\n` +
                           `**3.** Nhập số Rin muốn cược (hỗ trợ %, all, k, m)\n` +
                           `**4.** Nhà cái bấm **BẮT ĐẦU QUAY** để mở kết quả\n` +
                           `**5.** Bot sẽ tự động tính và trả thưởng`,
                    inline: false
                },
                {
                    name: '💰 Cách nhập tiền cược',
                    value: `• **Số nguyên:** \`100\`, \`500\`, \`1000\`\n` +
                           `• **Ký hiệu:** \`1k\` = 1000, \`2.5k\` = 2500\n` +
                           `• **Phần trăm:** \`50%\` = nửa số dư\n` +
                           `• **All-in:** \`all\`, \`max\`, \`tất cả\`\n` +
                           `• **Nửa số dư:** \`half\`, \`nửa\``,
                    inline: true
                },
                {
                    name: '📊 Cầu và phiên đồ',
                    value: `• **Cầu:** Chuỗi kết quả liên tiếp\n` +
                           `• **T-T-T:** Cầu Tài 3 phiên\n` +
                           `• **X-X-X-X:** Cầu Xỉu 4 phiên\n` +
                           `• Bấm **📊 Xem Phiên Đồ** để xem lịch sử\n` +
                           `• Gõ \`,taixiustats\` để xem thống kê`,
                    inline: true
                },
                {
                    name: '⚠️ Lưu ý quan trọng',
                    value: `• **Nhà cái không được cược** vào phiên của mình\n` +
                           `• **Nhà cái âm tiền** không thể mở phiên\n` +
                           `• Tiền chỉ trừ khi nhà cái bắt đầu quay\n` +
                           `• **Hủy phiên trước khi quay:** Không mất tiền\n` +
                           `• **Hủy phiên sau khi quay:** Hoàn tiền 100%`,
                    inline: false
                },
                {
                    name: '🎲 Ví dụ thực tế',
                    value: `**Kết quả:** 🎲 3 - 🎲 4 - 🎲 6 = **13 điểm**\n` +
                           `**➡️ Tài thắng (11-17)** ✅\n` +
                           `**➡️ Xỉu thua (4-10)** ❌\n\n` +
                           `**Nếu cược 1000 Rin vào Tài:**\n` +
                           `• Thắng: +1000 Rin (nhận về 2000)\n` +
                           `• Thua: -1000 Rin (mất tiền cược)`,
                    inline: false
                }
            )
            .setColor('#FFD700')
            .setThumbnail('https://img.icons8.com/emoji/96/000000/game-die.png')
            .setFooter({ text: '🎰 Chơi có trách nhiệm | May mắn sẽ đến!' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}; 