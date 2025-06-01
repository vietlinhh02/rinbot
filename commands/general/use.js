const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Pet = require('../../models/Pet');
const { getPrefix } = require('../../utils/prefixHelper');
const { getPet, updatePet } = require('../../utils/database');

// Định nghĩa items có thể sử dụng
const USABLE_ITEMS = {
    thuoc: {
        name: 'Thuốc',
        emoji: '💊',
        description: 'Chữa bệnh cho thú cưng',
        needsTarget: true,
        action: 'healPet'
    }
};

module.exports = {
    name: 'use',
    description: 'Sử dụng đồ dùng từ inventory',
    async execute(message, args) {
        try {
            const prefix = await getPrefix(message.guild?.id);
            const userId = message.author.id;

            // Kiểm tra có chỉ định item không
            if (!args[0]) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ THIẾU THÔNG TIN')
                    .setDescription('**Cách sử dụng:** `use [item] [@user]`\n\n' +
                        '**💡 Ví dụ:**\n' +
                        `• \`${prefix}use thuoc @user\` - Chữa thú cưng của user\n` +
                        `• \`${prefix}use thuoc\` - Chữa thú cưng của chính mình\n\n` +
                        '**🔧 Items có thể dùng:**\n' +
                        Object.entries(USABLE_ITEMS).map(([key, item]) => 
                            `${item.emoji} **${item.name}** - ${item.description}`
                        ).join('\n'))
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            const itemKey = args[0].toLowerCase();

            // Kiểm tra item có thể sử dụng không
            if (!USABLE_ITEMS[itemKey]) {
                const availableItems = Object.keys(USABLE_ITEMS).join(', ');
                const embed = new EmbedBuilder()
                    .setTitle('❌ ITEM KHÔNG THỂ SỬ DỤNG')
                    .setDescription(`**"${args[0]}"** không thể sử dụng!\n\n` +
                        `**🔧 Items có thể dùng:** ${availableItems}\n\n` +
                        `**💡 Gợi ý:**\n` +
                        `• \`${prefix}inventory\` - Xem túi đồ\n` +
                        `• \`${prefix}use thuoc @user\` - Chữa thú cưng`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            const item = USABLE_ITEMS[itemKey];

            // Lấy thông tin user
            const user = await User.findOne({ userId });
            if (!user || !user.inventory || (user.inventory[itemKey] || 0) <= 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ KHÔNG CÓ ITEM')
                    .setDescription(`Bạn không có **${item.name}** trong túi đồ!\n\n` +
                        `**💡 Cách có được:**\n` +
                        `• \`${prefix}shop\` - Xem cửa hàng\n` +
                        `• \`${prefix}buy ${itemKey}\` - Mua ${item.name}`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Xử lý target user (nếu cần)
            let targetUser = message.author;
            if (item.needsTarget && args[1]) {
                const mention = args[1].replace(/[<@!>]/g, '');
                try {
                    targetUser = await message.client.users.fetch(mention);
                } catch (error) {
                    return await message.reply('❌ Không tìm thấy user được mention!');
                }
            }

            // Thực hiện action theo từng item
            if (item.action === 'healPet') {
                await this.healPet(message, user, targetUser, item);
            }

        } catch (error) {
            console.error('Lỗi use command:', error);
            await message.reply('❌ Có lỗi xảy ra khi sử dụng item!');
        }
    },

    // Action: Chữa thú cưng
    async healPet(message, user, targetUser, item) {
        try {
            // Kiểm tra thú cưng của target
            const targetPet = await getPet(targetUser.id);
            if (!targetPet) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ KHÔNG CÓ THÚ CƯNG')
                    .setDescription(`**${targetUser.displayName}** chưa có thú cưng!\n\n` +
                        `💡 Gợi ý: Dùng lệnh \`muapet\` để mua thú cưng.`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Kiểm tra tình trạng sức khỏe
            if (targetPet.health === 'Bình thường') {
                const embed = new EmbedBuilder()
                    .setTitle('✅ THÚ CƯNG KHỎE MẠNH')
                    .setDescription(`**${targetPet.petType}** của **${targetUser.displayName}** đang có sức khỏe tốt!\n\n` +
                        `🏥 **Tình trạng:** ${targetPet.health}\n` +
                        `💡 **Ghi chú:** Thú cưng không cần chữa trị.`)
                    .setColor('#00FF00');

                return await message.reply({ embeds: [embed] });
            }

            // Thực hiện chữa trị
            await updatePet(targetUser.id, {
                health: 'Bình thường'
            });

            // Trừ item từ inventory
            user.inventory.thuoc -= 1;
            await user.save();

            const successEmbed = new EmbedBuilder()
                .setTitle('💊 CHỮA TRỊ THÀNH CÔNG!')
                .setDescription(`**${message.author.displayName}** đã chữa trị cho thú cưng! 🏥\n\n` +
                    `**🐾 Thông tin chữa trị:**\n` +
                    `• Bệnh nhân: **${targetPet.petType}** của **${targetUser.displayName}**\n` +
                    `• Bác sĩ: **${message.author.displayName}**\n` +
                    `• Thuốc sử dụng: ${item.emoji} **${item.name}**\n` +
                    `• Tình trạng trước: Ốm\n` +
                    `• Tình trạng sau: **Bình thường** ✅\n\n` +
                    `**📦 Inventory:**\n` +
                    `• ${item.name} còn lại: ${user.inventory.thuoc} cái\n\n` +
                    `**🎉 Thú cưng đã được chữa khỏi và có thể:**\n` +
                    `• Ghép cặp sinh sản\n` +
                    `• Hoạt động bình thường\n` +
                    `• Cho ăn để tăng tuổi`)
                .setColor('#00FF00')
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: 'Cảm ơn bạn đã quan tâm đến thú cưng! 🐾' })
                .setTimestamp();

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Lỗi healPet:', error);
            await message.reply('❌ Có lỗi xảy ra khi chữa trị thú cưng!');
        }
    }
}; 