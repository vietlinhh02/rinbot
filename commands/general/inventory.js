const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { getPrefix } = require('../../utils/prefixHelper');

// Định nghĩa các item và thông tin
const ITEMS = {
    thuoc: {
        name: 'Thuốc',
        emoji: '💊',
        description: 'Chữa bệnh cho thú cưng',
        price: 100,
        usage: 'Dùng lệnh `use thuoc @user` để chữa thú cưng'
    },
    balo: {
        name: 'Balo',
        emoji: '🎒',
        description: 'Tăng khả năng mang theo đồ',
        price: 500,
        usage: 'Tự động tăng không gian inventory'
    },
    nhankim: {
        name: 'Nhẫn Kim',
        emoji: '💍',
        description: 'Nhẫn cưới loại cơ bản',
        price: 1000,
        usage: 'Dùng lệnh `marry @user nhankim` để kết hôn'
    },
    nhanbac: {
        name: 'Nhẫn Bạc',
        emoji: '💎',
        description: 'Nhẫn cưới cao cấp',
        price: 3000,
        usage: 'Dùng lệnh `marry @user nhanbac` để kết hôn'
    },
    nhanvang: {
        name: 'Nhẫn Vàng',
        emoji: '👑',
        description: 'Nhẫn cưới siêu VIP',
        price: 10000,
        usage: 'Dùng lệnh `marry @user nhanvang` để kết hôn'
    }
};

module.exports = {
    name: 'inventory',
    description: 'Xem túi đồ của bạn',
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const prefix = await getPrefix(message.guild?.id);
            
            // Lấy thông tin user và inventory
            const user = await User.findOne({ userId });
            if (!user) {
                const newUserEmbed = new EmbedBuilder()
                    .setTitle('👜 TÚI ĐỒ TRỐNG')
                    .setDescription('Bạn chưa có tài khoản!\n\n' +
                        `Gõ \`${prefix}rindaily\` để tạo tài khoản và nhận Rin miễn phí.`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [newUserEmbed] });
            }

            const inventory = user.inventory || { thuoc: 0, balo: 0, nhankim: 0, nhanbac: 0, nhanvang: 0 };
            
            // Kiểm tra nếu inventory trống
            const totalItems = Object.values(inventory).reduce((sum, count) => sum + count, 0);
            
            if (totalItems === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setTitle('👜 TÚI ĐỒ TRỐNG')
                    .setDescription(`**${message.author.displayName}** chưa có đồ dùng nào!\n\n` +
                        '**🛒 Mua sắm:**\n' +
                        `• \`${prefix}shop\` - Xem cửa hàng\n` +
                        `• \`${prefix}buy thuoc\` - Mua thuốc (100 Rin)\n` +
                        `• \`${prefix}buy balo\` - Mua balo (500 Rin)\n\n` +
                        '**💡 Cách kiếm Rin:**\n' +
                        `• \`${prefix}rindaily\` - Nhận 200 Rin mỗi ngày\n` +
                        `• \`${prefix}work\` - Làm việc kiếm tiền`)
                    .setColor('#95A5A6')
                    .setThumbnail('https://raw.githubusercontent.com/vietlinhh02/test/refs/heads/main/d098bf056c1a3a3f23261606edde04de.png')
                    .setFooter({ text: 'Hãy mua sắm để có đồ dùng hữu ích!' });

                return await message.reply({ embeds: [emptyEmbed] });
            }

            // Hiển thị inventory
            let itemsList = '';
            let totalValue = 0;
            
            for (const [itemKey, itemData] of Object.entries(ITEMS)) {
                const count = inventory[itemKey] || 0;
                if (count > 0) {
                    const value = count * itemData.price;
                    totalValue += value;
                    
                    itemsList += `${itemData.emoji} **${itemData.name}** × ${count}\n`;
                    itemsList += `   💰 Giá trị: ${value.toLocaleString()} Rin\n`;
                    itemsList += `   📖 ${itemData.description}\n`;
                    itemsList += `   🎯 ${itemData.usage}\n\n`;
                }
            }

            // Tính bonus capacity từ balo
            const baloCount = inventory.balo || 0;
            const baseCapacity = 10;
            const bonusCapacity = baloCount * 5;
            const totalCapacity = baseCapacity + bonusCapacity;

            const inventoryEmbed = new EmbedBuilder()
                .setTitle('👜 TÚI ĐỒ CỦA BẠN')
                .setDescription(`**Chủ nhân:** ${message.author.displayName}\n` +
                    `**💰 Số Rin hiện tại:** ${user.rin.toLocaleString()} Rin\n\n` +
                    `**📦 Đồ đang sở hữu:**\n${itemsList}` +
                    `**📊 Thống kê:**\n` +
                    `• 📦 Tổng số items: ${totalItems}\n` +
                    `• 💎 Tổng giá trị: ${totalValue.toLocaleString()} Rin\n` +
                    `• 🎒 Sức chứa: ${totalItems}/${totalCapacity} (${baloCount > 0 ? `${baseCapacity}+${bonusCapacity}` : baseCapacity})\n\n` +
                    `**💡 Hướng dẫn sử dụng:**\n` +
                    `• \`${prefix}use thuoc @user\` - Dùng thuốc chữa thú cưng\n` +
                    `• \`${prefix}shop\` - Mua thêm đồ dùng\n` +
                    `• \`${prefix}top\` - Xem bảng xếp hạng`)
                .setColor('#3498DB')
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ 
                    text: `💡 Balo tăng sức chứa +5 slots mỗi cái • Capacity: ${totalCapacity} slots`,
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Thêm warning nếu gần hết chỗ
            if (totalItems >= totalCapacity * 0.8) {
                inventoryEmbed.addFields({
                    name: '⚠️ Cảnh báo',
                    value: `Túi đồ sắp đầy! Hãy mua thêm balo để tăng sức chứa.`,
                    inline: false
                });
            }

            await message.reply({ embeds: [inventoryEmbed] });

        } catch (error) {
            console.error('Lỗi inventory command:', error);
            await message.reply('❌ Có lỗi xảy ra khi xem túi đồ!');
        }
    }
}; 