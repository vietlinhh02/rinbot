const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const { getPrefix } = require('../../utils/prefixHelper');

// Định nghĩa shop items (giống shop.js)
const SHOP_ITEMS = {
    thuoc: {
        name: 'Thuốc',
        emoji: '💊',
        price: 100,
        description: 'Chữa bệnh cho thú cưng khi ốm',
        category: 'pet'
    },
    balo: {
        name: 'Balo',
        emoji: '🎒', 
        price: 500,
        description: 'Tăng sức chứa túi đồ',
        category: 'utility'
    },
    nhankim: {
        name: 'Nhẫn Kim',
        emoji: '💍',
        price: 1000,
        description: 'Nhẫn cưới loại cơ bản',
        category: 'marriage'
    },
    nhanbac: {
        name: 'Nhẫn Bạc',
        emoji: '💎',
        price: 3000,
        description: 'Nhẫn cưới cao cấp',
        category: 'marriage'
    },
    nhanvang: {
        name: 'Nhẫn Vàng',
        emoji: '👑',
        price: 10000,
        description: 'Nhẫn cưới siêu VIP',
        category: 'marriage'
    }
};

module.exports = {
    name: 'buy',
    description: 'Mua đồ từ cửa hàng',
    async execute(message, args) {
        try {
            const prefix = await getPrefix(message.guild?.id);
            const userId = message.author.id;

            // Kiểm tra có chỉ định item không
            if (!args[0]) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ THIẾU THÔNG TIN')
                    .setDescription('**Cách sử dụng:** `buy [tên item] [số lượng]`\n\n' +
                        '**💡 Ví dụ:**\n' +
                        `• \`${prefix}buy thuoc\` - Mua 1 thuốc\n` +
                        `• \`${prefix}buy balo 2\` - Mua 2 balo\n` +
                        `• \`${prefix}buy thuoc 5\` - Mua 5 thuốc\n\n` +
                        '**🛒 Xem cửa hàng:**\n' +
                        `• \`${prefix}shop\` - Xem tất cả sản phẩm`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            const itemKey = args[0].toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            // Kiểm tra item có tồn tại không
            if (!SHOP_ITEMS[itemKey]) {
                const availableItems = Object.keys(SHOP_ITEMS).join(', ');
                const embed = new EmbedBuilder()
                    .setTitle('❌ SẢN PHẨM KHÔNG TỒN TẠI')
                    .setDescription(`**"${args[0]}"** không có trong cửa hàng!\n\n` +
                        `**🛒 Sản phẩm có sẵn:** ${availableItems}\n\n` +
                        `**💡 Gợi ý:**\n` +
                        `• \`${prefix}shop\` - Xem danh sách đầy đủ\n` +
                        `• \`${prefix}buy thuoc\` - Mua thuốc\n` +
                        `• \`${prefix}buy balo\` - Mua balo`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Kiểm tra số lượng hợp lệ
            if (quantity < 1 || quantity > 99) {
                return await message.reply('❌ Số lượng phải từ 1-99!');
            }

            const item = SHOP_ITEMS[itemKey];
            const totalPrice = item.price * quantity;

            // Lấy thông tin user
            const user = await User.findOne({ userId });
            if (!user) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ CHƯA CÓ TÀI KHOẢN')
                    .setDescription('Bạn chưa có tài khoản!\n\n' +
                        `Gõ \`${prefix}rindaily\` để tạo tài khoản và nhận Rin miễn phí.`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Kiểm tra đủ tiền không
            if (user.rin < totalPrice) {
                const embed = new EmbedBuilder()
                    .setTitle('💸 KHÔNG ĐỦ TIỀN')
                    .setDescription(`**Không đủ Rin để mua ${quantity} ${item.name}!**\n\n` +
                        `**💰 Thông tin:**\n` +
                        `• Giá: ${item.price.toLocaleString()} Rin/cái\n` +
                        `• Số lượng: ${quantity} cái\n` +
                        `• Tổng tiền: ${totalPrice.toLocaleString()} Rin\n` +
                        `• Tiền hiện có: ${user.rin.toLocaleString()} Rin\n` +
                        `• Còn thiếu: ${(totalPrice - user.rin).toLocaleString()} Rin\n\n` +
                        '**💡 Cách kiếm Rin:**\n' +
                        `• \`${prefix}rindaily\` - Nhận 200 Rin mỗi ngày\n` +
                        `• \`${prefix}work\` - Làm việc kiếm 50-150 Rin`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Kiểm tra sức chứa inventory
            const inventory = user.inventory || { thuoc: 0, balo: 0, nhankim: 0, nhanbac: 0, nhanvang: 0 };
            const currentItems = Object.values(inventory).reduce((sum, count) => sum + count, 0);
            const baloCount = inventory.balo || 0;
            const baseCapacity = 10;
            const bonusCapacity = baloCount * 5;
            const totalCapacity = baseCapacity + bonusCapacity;

            // Đặc biệt: nếu mua balo thì tăng capacity ngay
            let newCapacity = totalCapacity;
            if (itemKey === 'balo') {
                newCapacity += quantity * 5;
            }

            if (currentItems + quantity > newCapacity) {
                const embed = new EmbedBuilder()
                    .setTitle('📦 TÚI ĐỒ KHÔNG ĐỦ CHỖ')
                    .setDescription(`**Không đủ chỗ để chứa ${quantity} ${item.name}!**\n\n` +
                        `**📊 Thông tin sức chứa:**\n` +
                        `• Đang có: ${currentItems} items\n` +
                        `• Sức chứa hiện tại: ${totalCapacity} slots\n` +
                        `• Sau khi mua: ${currentItems + quantity} items\n` +
                        `• Sức chứa sau mua: ${newCapacity} slots\n\n` +
                        `**💡 Giải pháp:**\n` +
                        `• Mua balo để tăng sức chứa (+5 slots/balo)\n` +
                        `• Hoặc giảm số lượng mua\n` +
                        `• \`${prefix}inventory\` - Xem túi đồ`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Tạo embed xác nhận
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🛒 XÁC NHẬN MUA HÀNG')
                .setDescription(`**${message.author.displayName}** muốn mua:\n\n` +
                    `${item.emoji} **${item.name}** × ${quantity}\n` +
                    `💰 **Giá:** ${item.price.toLocaleString()} Rin/cái\n` +
                    `💸 **Tổng tiền:** ${totalPrice.toLocaleString()} Rin\n` +
                    `💳 **Tiền hiện có:** ${user.rin.toLocaleString()} Rin\n` +
                    `💰 **Tiền sau mua:** ${(user.rin - totalPrice).toLocaleString()} Rin\n\n` +
                    `📦 **Sức chứa:** ${currentItems + quantity}/${newCapacity} slots\n\n` +
                    `**📖 Mô tả:** ${item.description}`)
                .setColor('#3498DB')
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ text: 'Bạn có 30 giây để quyết định!' });

            const confirmButton = new ButtonBuilder()
                .setCustomId(`buy_confirm_${userId}_${itemKey}_${quantity}`)
                .setLabel(`✅ Mua (${totalPrice.toLocaleString()} Rin)`)
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`buy_cancel_${userId}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [confirmEmbed], components: [row] });

        } catch (error) {
            console.error('Lỗi buy command:', error);
            await message.reply('❌ Có lỗi xảy ra khi mua hàng!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('buy_')) return;

        const [action, type, userId, itemKey, quantity] = interaction.customId.split('_');
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ người đặt hàng mới có thể thực hiện!', ephemeral: true });
        }

        if (type === 'cancel') {
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY MUA HÀNG')
                .setDescription('Bạn đã hủy giao dịch. Hãy quay lại mua sắm khi nào có nhu cầu! 🛒')
                .setColor('#6C757D');

            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        if (type === 'confirm') {
            try {
                const item = SHOP_ITEMS[itemKey];
                const qty = parseInt(quantity);
                const totalPrice = item.price * qty;

                // Lấy lại thông tin user để đảm bảo tính chính xác
                const user = await User.findOne({ userId });
                if (!user) {
                    return interaction.reply({ content: '❌ Không tìm thấy tài khoản!', ephemeral: true });
                }

                // Kiểm tra lại tiền
                if (user.rin < totalPrice) {
                    return interaction.reply({ content: '❌ Không đủ tiền!', ephemeral: true });
                }

                // Kiểm tra lại sức chứa
                const inventory = user.inventory || { thuoc: 0, balo: 0, nhankim: 0, nhanbac: 0, nhanvang: 0 };
                const currentItems = Object.values(inventory).reduce((sum, count) => sum + count, 0);
                const baloCount = inventory.balo || 0;
                const capacity = 10 + (baloCount * 5) + (itemKey === 'balo' ? qty * 5 : 0);

                if (currentItems + qty > capacity) {
                    return interaction.reply({ content: '❌ Không đủ chỗ chứa!', ephemeral: true });
                }

                // Thực hiện giao dịch
                user.rin -= totalPrice;
                if (!user.inventory) user.inventory = { thuoc: 0, balo: 0, nhankim: 0, nhanbac: 0, nhanvang: 0 };
                user.inventory[itemKey] = (user.inventory[itemKey] || 0) + qty;
                await user.save();

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ MUA HÀNG THÀNH CÔNG!')
                    .setDescription(`**${interaction.user.displayName}** đã mua thành công!\n\n` +
                        `**🛒 Giao dịch:**\n` +
                        `${item.emoji} **${item.name}** × ${qty}\n` +
                        `💸 Tổng tiền: ${totalPrice.toLocaleString()} Rin\n` +
                        `💰 Tiền còn lại: ${user.rin.toLocaleString()} Rin\n\n` +
                        `**📦 Inventory:**\n` +
                        `• ${item.name}: ${user.inventory[itemKey]} cái\n` +
                        `• Sức chứa: ${currentItems + qty}/${capacity} slots\n\n` +
                        `**🎯 Sử dụng:**\n` +
                        `• \`inventory\` - Xem túi đồ\n` +
                        `• \`use ${itemKey} @user\` - Sử dụng item\n\n` +
                        `**Cảm ơn bạn đã mua sắm! 🛒**`)
                    .setColor('#00FF00')
                    .setFooter({ text: 'Hẹn gặp lại lần sau!' })
                    .setTimestamp();

                await interaction.update({ embeds: [successEmbed], components: [] });

            } catch (error) {
                console.error('Lỗi xác nhận mua hàng:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi mua hàng!', ephemeral: true });
            }
        }
    }
}; 