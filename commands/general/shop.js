const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { getPrefix } = require('../../utils/prefixHelper');

// Định nghĩa shop items
const SHOP_ITEMS = {
    thuoc: {
        name: 'Thuốc',
        emoji: '💊',
        price: 100,
        description: 'Chữa bệnh cho thú cưng khi ốm',
        details: '• Hồi phục sức khỏe thú cưng từ "Ốm" về "Bình thường"\n• Cần thiết khi thú cưng bệnh để có thể ghép cặp\n• Sử dụng: `use thuoc @user`',
        category: 'pet'
    },
    balo: {
        name: 'Balo',
        emoji: '🎒', 
        price: 500,
        description: 'Tăng sức chứa túi đồ',
        details: '• Tăng sức chứa inventory +5 slots mỗi cái\n• Sức chứa mặc định: 10 slots\n• Có thể mua nhiều balo để tăng thêm\n• Tự động có hiệu lực khi mua',
        category: 'utility'
    },
    nhankim: {
        name: 'Nhẫn Kim',
        emoji: '💍',
        price: 1000,
        description: 'Nhẫn cưới loại cơ bản',
        details: '• Dùng để kết hôn với người yêu\n• Level tối đa: 10\n• Tăng exp chậm nhất\n• Sử dụng: `marry @user nhankim`',
        category: 'marriage'
    },
    nhanbac: {
        name: 'Nhẫn Bạc',
        emoji: '💎',
        price: 3000,
        description: 'Nhẫn cưới cao cấp',
        details: '• Dùng để kết hôn với người yêu\n• Level tối đa: 20\n• Tăng exp trung bình\n• Sử dụng: `marry @user nhanbac`',
        category: 'marriage'
    },
    nhanvang: {
        name: 'Nhẫn Vàng',
        emoji: '👑',
        price: 10000,
        description: 'Nhẫn cưới siêu VIP',
        details: '• Dùng để kết hôn với người yêu\n• Level tối đa: 50\n• Tăng exp nhanh nhất\n• Sử dụng: `marry @user nhanvang`',
        category: 'marriage'
    }
};

module.exports = {
    name: 'shop',
    description: 'Xem cửa hàng mua đồ',
    async execute(message, args, client) {
        try {
            const prefix = await getPrefix(message.guild?.id);
            const userId = message.author.id;
            
            // Lấy thông tin user để hiển thị số Rin
            const user = await User.findOne({ userId });
            const userRin = user ? user.rin : 0;
            const inventory = user?.inventory || { thuoc: 0, balo: 0 };

            // Tính tổng giá trị inventory
            let inventoryValue = 0;
            Object.entries(inventory).forEach(([itemKey, count]) => {
                if (SHOP_ITEMS[itemKey]) {
                    inventoryValue += count * SHOP_ITEMS[itemKey].price;
                }
            });

            // Tạo danh sách items theo category
            const petItems = Object.entries(SHOP_ITEMS)
                .filter(([key, item]) => item.category === 'pet')
                .map(([key, item]) => {
                    const owned = inventory[key] || 0;
                    const canAfford = userRin >= item.price ? '✅' : '❌';
                    return `${item.emoji} **${item.name}** - ${item.price.toLocaleString()} Rin ${canAfford}\n` +
                           `   📖 ${item.description}\n` +
                           `   📦 Đang có: ${owned} cái\n` +
                           `   💡 Mua: \`${prefix}buy ${key}\``;
                }).join('\n\n');

            const utilityItems = Object.entries(SHOP_ITEMS)
                .filter(([key, item]) => item.category === 'utility')
                .map(([key, item]) => {
                    const owned = inventory[key] || 0;
                    const canAfford = userRin >= item.price ? '✅' : '❌';
                    return `${item.emoji} **${item.name}** - ${item.price.toLocaleString()} Rin ${canAfford}\n` +
                           `   📖 ${item.description}\n` +
                           `   📦 Đang có: ${owned} cái\n` +
                           `   💡 Mua: \`${prefix}buy ${key}\``;
                }).join('\n\n');

            const marriageItems = Object.entries(SHOP_ITEMS)
                .filter(([key, item]) => item.category === 'marriage')
                .map(([key, item]) => {
                    const owned = inventory[key] || 0;
                    const canAfford = userRin >= item.price ? '✅' : '❌';
                    return `${item.emoji} **${item.name}** - ${item.price.toLocaleString()} Rin ${canAfford}\n` +
                           `   📖 ${item.description}\n` +
                           `   📦 Đang có: ${owned} cái\n` +
                           `   💡 Mua: \`${prefix}buy ${key}\``;
                }).join('\n\n');

            const shopEmbed = new EmbedBuilder()
                .setTitle('🏪 CỬA HÀNG RINBOT')
                .setDescription('**Chào mừng đến với cửa hàng!** 🛒\n\n' +
                    `**💰 Số Rin của bạn:** ${userRin.toLocaleString()} Rin\n` +
                    `**💎 Giá trị inventory:** ${inventoryValue.toLocaleString()} Rin\n\n` +
                    '**📋 Cách mua hàng:**\n' +
                    `• \`${prefix}buy [tên item]\` - Mua đồ\n` +
                    `• \`${prefix}inventory\` - Xem túi đồ\n` +
                    `• \`${prefix}use [item] [@user]\` - Sử dụng đồ`)
                .setColor('#E74C3C')
                .setThumbnail(client.user.displayAvatarURL());

            // Thêm pet items
            if (petItems) {
                shopEmbed.addFields({
                    name: '🐾 Đồ dùng thú cưng',
                    value: petItems,
                    inline: false
                });
            }

            // Thêm utility items  
            if (utilityItems) {
                shopEmbed.addFields({
                    name: '⚙️ Đồ dùng tiện ích',
                    value: utilityItems,
                    inline: false
                });
            }

            // Thêm marriage items
            if (marriageItems) {
                shopEmbed.addFields({
                    name: '💒 Nhẫn cưới',
                    value: marriageItems,
                    inline: false
                });
            }

            // Thêm hướng dẫn chi tiết
            shopEmbed.addFields({
                name: '📚 Chi tiết sản phẩm',
                value: Object.entries(SHOP_ITEMS).map(([key, item]) => 
                    `**${item.emoji} ${item.name}:**\n${item.details}`
                ).join('\n\n'),
                inline: false
            });

            // Thêm thông tin kiếm Rin
            shopEmbed.addFields({
                name: '💡 Cách kiếm Rin',
                value: `• \`${prefix}rindaily\` - Nhận 200 Rin mỗi ngày\n` +
                       `• \`${prefix}work\` - Làm việc kiếm 50-150 Rin\n` +
                       `• \`${prefix}baucua\` - Chơi bầu cua may mắn\n` +
                       `• \`${prefix}muacay\` - Đầu tư farm sinh lời\n` +
                       `• \`${prefix}top\` - Xem bảng xếp hạng`,
                inline: false
            });

            shopEmbed.setFooter({ 
                text: 'Cửa hàng 24/7 • Hàng chất lượng cao • Giá cả phải chăng!',
                iconURL: message.client.user.displayAvatarURL()
            });

            await message.reply({ embeds: [shopEmbed] });

        } catch (error) {
            console.error('Lỗi shop command:', error);
            await message.reply('❌ Có lỗi xảy ra khi mở cửa hàng!');
        }
    }
}; 