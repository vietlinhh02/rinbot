const { EmbedBuilder } = require('discord.js');
const { BAU_CUA_ANIMALS, BAU_CUA_EMOJIS } = require('../../utils/constants');

module.exports = {
    name: 'baucuahelp',
    description: 'Hướng dẫn game Bầu Cua',
    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setTitle('🎰 HƯỚNG DẪN GAME BẦU CUA')
            .setColor('#FFD700')
            .setThumbnail('https://i.pinimg.com/originals/37/27/af/3727afbe6ca619733cba6c07a6c4fcd7.gif');

        // Giới thiệu
        embed.addFields({
            name: '📋 Giới thiệu',
            value: 'Bầu Cua là trò chơi dân gian truyền thống Việt Nam, sử dung 3 xúc xắc với 6 mặt tương ứng 6 con vật.',
            inline: false
        });

        // Các con vật
        const animals = BAU_CUA_ANIMALS.map(animal => 
            `${BAU_CUA_EMOJIS[animal]} **${animal.charAt(0).toUpperCase() + animal.slice(1)}**`
        ).join('\n');

        embed.addFields({
            name: '🐾 Các con vật',
            value: animals,
            inline: false
        });

        // Cách chơi
        embed.addFields({
            name: '🎮 Cách chơi',
            value: 
                '1️⃣ Chủ trò gõ `,bcgo` để mở ván\n' +
                '2️⃣ Người chơi bấm nút con vật để đặt cược\n' +
                '3️⃣ Nhập số Rin cược trong popup\n' +
                '4️⃣ Bấm "✅ Xác nhận cược" để xác nhận\n' +
                '5️⃣ Chủ trò bấm "🎲 Bắt đầu quay" để quay kết quả',
            inline: false
        });

        // Luật thắng thua
        embed.addFields({
            name: '💰 Luật thắng thua',
            value: 
                '🎯 **Trúng 1 con**: Thắng x1 tiền cược\n' +
                '🎯 **Trúng 2 con**: Thắng x2 tiền cược\n' +
                '🎯 **Trúng 3 con**: Thắng x4 tiền cược\n' +
                '❌ **Không trúng**: Mất tiền cược',
            inline: false
        });

        // Ví dụ
        embed.addFields({
            name: '📝 Ví dụ',
            value: 
                'Bạn cược 100 Rin vào **Bầu** 🍐\n' +
                'Kết quả: 🍐 🦀 🍐 (2 con Bầu)\n' +
                '→ Thắng: 100 x 2 = **200 Rin**',
            inline: false
        });

        // Lệnh
        embed.addFields({
            name: '⌨️ Các lệnh',
            value: 
                '`,bcgo` - Mở ván Bầu Cua (Chủ trò)\n' +
                '`,baucuahelp` - Xem hướng dẫn này',
            inline: false
        });

        // Lưu ý
        embed.addFields({
            name: '⚠️ Lưu ý quan trọng',
            value: 
                '• **Chủ trò không chơi**, chỉ quay kết quả\n' +
                '• Có thể cược nhiều con vật cùng lúc\n' +
                '• Phải xác nhận cược trước khi quay\n' +
                '• Game tự động tính toán và trả thưởng\n' +
                '• Chỉ chủ trò hoặc admin mới hủy được ván',
            inline: false
        });

        embed.setFooter({ text: 'Chúc bạn may mắn! 🍀' });

        await message.reply({ embeds: [embed] });
    }
}; 