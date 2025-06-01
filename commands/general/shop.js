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

            // Tạo danh sách items theo category (gọn gàng hơn)
            const petItems = Object.entries(SHOP_ITEMS)
                .filter(([key, item]) => item.category === 'pet')
                .map(([key, item]) => {
                    const owned = inventory[key] || 0;
                    const canAfford = userRin >= item.price ? '✅' : '❌';
                    return `${item.emoji} **${item.name}** ${canAfford}\n` +
                           `💰 ${item.price.toLocaleString()} Rin\n` +
                           `📦 Có: ${owned} cái\n` +
                           `💡 \`${prefix}buy ${key}\``;
                }).join('\n\n');

            const utilityItems = Object.entries(SHOP_ITEMS)
                .filter(([key, item]) => item.category === 'utility')
                .map(([key, item]) => {
                    const owned = inventory[key] || 0;
                    const canAfford = userRin >= item.price ? '✅' : '❌';
                    return `${item.emoji} **${item.name}** ${canAfford}\n` +
                           `💰 ${item.price.toLocaleString()} Rin\n` +
                           `📦 Có: ${owned} cái\n` +
                           `💡 \`${prefix}buy ${key}\``;
                }).join('\n\n');

            const marriageItems = Object.entries(SHOP_ITEMS)
                .filter(([key, item]) => item.category === 'marriage')
                .map(([key, item]) => {
                    const owned = inventory[key] || 0;
                    const canAfford = userRin >= item.price ? '✅' : '❌';
                    return `${item.emoji} **${item.name}** ${canAfford}\n` +
                           `💰 ${item.price.toLocaleString()} Rin\n` +
                           `📦 Có: ${owned} cái\n` +
                           `💡 \`${prefix}buy ${key}\``;
                }).join('\n\n');

            const shopEmbed = new EmbedBuilder()
                .setTitle('🏪 CỬA HÀNG RINBOT')
                .setDescription(`**💰 Số Rin:** ${userRin.toLocaleString()} Rin | **💎 Giá trị túi đồ:** ${inventoryValue.toLocaleString()} Rin`)
                .addFields(
                    {
                        name: '🐾 Đồ dùng thú cưng',
                        value: petItems || 'Không có sản phẩm',
                        inline: true
                    },
                    {
                        name: '⚙️ Đồ dùng tiện ích',
                        value: utilityItems || 'Không có sản phẩm',
                        inline: true
                    },
                    {
                        name: '💒 Nhẫn cưới',
                        value: marriageItems || 'Không có sản phẩm',
                        inline: true
                    }
                )
                .setColor('#E74C3C')
                .setThumbnail(client.user.displayAvatarURL());

            // Thêm hướng dẫn sử dụng
            shopEmbed.addFields(
                {
                    name: '📋 Hướng dẫn mua hàng',
                    value: `• \`${prefix}buy [tên]\` - Mua đồ\n` +
                           `• \`${prefix}inventory\` - Xem túi đồ\n` +
                           `• \`${prefix}use [item] [@user]\` - Sử dụng`,
                    inline: true
                },
                {
                    name: '💡 Cách kiếm Rin',
                    value: `• \`${prefix}rindaily\` - 200 Rin/ngày\n` +
                           `• \`${prefix}work\` - 50-150 Rin\n` +
                           `• \`${prefix}baucua\` - Chơi may mắn\n` +
                           `• \`${prefix}muacay\` - Đầu tư farm`,
                    inline: true
                },
                {
                    name: '📚 Chi tiết sản phẩm',
                    value: `**💊 Thuốc:** Chữa bệnh thú cưng\n` +
                           `**🎒 Balo:** +5 slots túi đồ\n` +
                           `**💍 Nhẫn Kim:** Max lv10, exp x1\n` +
                           `**💎 Nhẫn Bạc:** Max lv20, exp x1.5\n` +
                           `**👑 Nhẫn Vàng:** Max lv50, exp x2`,
                    inline: true
                }
            )

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