const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCityUser, updateCityUser, getUserRin, updateUserRin } = require('../../utils/database');
const { COLORS } = require('../../utils/constants');

module.exports = {
    name: 'suanha',
    description: 'Sửa chữa nhà để duy trì tình trạng tốt',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);
            const userRin = await getUserRin(userId);

            if (!cityUser.home) {
                return message.reply('❌ Bạn chưa thuê nhà! Dùng `,thuenha` để thuê nhà.');
            }

            const houseInfo = this.getHouseInfo(cityUser.home);
            const now = new Date();
            
            // Tính thời gian sửa chữa cuối
            const lastRepair = cityUser.lastRepair ? new Date(cityUser.lastRepair) : new Date(cityUser.createdAt);
            const daysSinceRepair = Math.floor((now - lastRepair) / (1000 * 60 * 60 * 24));
            const daysUntilNextRepair = Math.max(0, 5 - daysSinceRepair);

            // Kiểm tra xem có cần sửa không
            if (daysSinceRepair < 5) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ NHÀ VẪN TỐT!')
                    .setDescription(`**🏠 ${houseInfo.name}** của bạn vẫn đang trong tình trạng tốt.\n\n` +
                        `**📅 Thông tin:**\n` +
                        `• Sửa chữa cuối: ${lastRepair.toLocaleDateString('vi-VN')}\n` +
                        `• Đã ở: ${daysSinceRepair} ngày\n` +
                        `• Cần sửa sau: ${daysUntilNextRepair} ngày nữa\n\n` +
                        `**💰 Chi phí sửa chữa:** ${houseInfo.dailyRepair > 0 ? houseInfo.dailyRepair.toLocaleString() + ' Rin' : 'Miễn phí'}\n\n` +
                        `**💡 Gợi ý:** Bạn có thể sửa sớm để đảm bảo an toàn!`)
                    .setColor(COLORS.success)
                    .setFooter({ text: 'Nhà cần được sửa chữa ít nhất 5 ngày một lần!' });

                // Thêm button cho phép sửa sớm
                const repairButton = new ButtonBuilder()
                    .setCustomId(`early_repair_${userId}`)
                    .setLabel('🔧 Sửa sớm')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(repairButton);
                
                return message.reply({ embeds: [embed], components: [row] });
            }

            // Kiểm tra tiền
            if (userRin < houseInfo.dailyRepair) {
                return message.reply(`❌ Bạn không đủ tiền để sửa nhà!\n\n` +
                    `**💰 Cần:** ${houseInfo.dailyRepair.toLocaleString()} Rin\n` +
                    `**💰 Có:** ${userRin.toLocaleString()} Rin\n` +
                    `**💰 Thiếu:** ${(houseInfo.dailyRepair - userRin).toLocaleString()} Rin\n\n` +
                    `⚠️ **Cảnh báo:** Nếu không sửa, nhà có thể bị thu hồi!`);
            }

            // Tạo embed xác nhận sửa chữa
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔧 XÁC NHẬN SỬA CHỮA NHÀ')
                .setDescription(`**🏠 Loại nhà:** ${houseInfo.name}\n` +
                    `**📅 Lần sửa cuối:** ${lastRepair.toLocaleDateString('vi-VN')}\n` +
                    `**⏰ Đã ở:** ${daysSinceRepair} ngày\n\n` +
                    `**💰 Chi phí sửa chữa:** ${houseInfo.dailyRepair > 0 ? houseInfo.dailyRepair.toLocaleString() + ' Rin' : 'Miễn phí'}\n` +
                    `**💰 Số dư hiện tại:** ${userRin.toLocaleString()} Rin\n` +
                    `**💰 Số dư sau sửa:** ${(userRin - houseInfo.dailyRepair).toLocaleString()} Rin\n\n` +
                    `**Bạn có muốn sửa chữa nhà không?**`)
                .setColor(daysSinceRepair >= 5 ? COLORS.error : COLORS.warning)
                .setFooter({ text: daysSinceRepair >= 5 ? '⚠️ Bắt buộc sửa để tránh bị thu hồi!' : 'Quyết định trong 30 giây!' })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`repair_confirm_${userId}`)
                .setLabel('🔧 Xác nhận sửa')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`repair_cancel_${userId}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(daysSinceRepair >= 5 ? ButtonStyle.Secondary : ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [confirmEmbed], components: [row] });

        } catch (error) {
            console.error('Lỗi suanha:', error);
            await message.reply('❌ Có lỗi xảy ra khi sửa nhà!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('repair_') && !interaction.customId.startsWith('early_repair_')) return;

        const parts = interaction.customId.split('_');
        const action = parts[1]; // confirm, cancel, hoặc repair (cho early_repair)
        const userId = parts[parts.length - 1];

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ người sở hữu nhà mới có thể thực hiện!', ephemeral: true });
        }

        try {
            const cityUser = await getCityUser(userId);
            const userRin = await getUserRin(userId);
            const houseInfo = this.getHouseInfo(cityUser.home);

            if (action === 'confirm' || action === 'repair') {
                // Kiểm tra tiền một lần nữa
                if (userRin < houseInfo.dailyRepair) {
                    return interaction.reply({ 
                        content: `❌ Bạn không đủ tiền! Cần ${houseInfo.dailyRepair.toLocaleString()} Rin.`, 
                        ephemeral: true 
                    });
                }

                // Thực hiện sửa chữa
                if (houseInfo.dailyRepair > 0) {
                    await updateUserRin(userId, -houseInfo.dailyRepair);
                }
                
                await updateCityUser(userId, { 
                    lastRepair: new Date() 
                });

                const successEmbed = new EmbedBuilder()
                    .setTitle('🎉 SỬA CHỮA THÀNH CÔNG!')
                    .setDescription(`**🏠 ${houseInfo.name}** đã được sửa chữa hoàn tất!\n\n` +
                        `**💰 Chi phí:** ${houseInfo.dailyRepair > 0 ? houseInfo.dailyRepair.toLocaleString() + ' Rin' : 'Miễn phí'}\n` +
                        `**💰 Số dư còn lại:** ${(userRin - houseInfo.dailyRepair).toLocaleString()} Rin\n\n` +
                        `**📅 Nhà sẽ tốt trong 5 ngày tới!**\n` +
                        `**🔧 Lần sửa tiếp theo:** ${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}\n\n` +
                        `**Nhà của bạn giờ như mới! ✨**`)
                    .setColor(COLORS.success)
                    .setFooter({ text: 'Hãy chăm sóc nhà cửa thường xuyên!' })
                    .setTimestamp();

                // Update message để xóa buttons
                await interaction.update({ embeds: [successEmbed], components: [] });

            } else {
                // Hủy bỏ sửa chữa
                const now = new Date();
                const lastRepair = cityUser.lastRepair ? new Date(cityUser.lastRepair) : new Date(cityUser.createdAt);
                const daysSinceRepair = Math.floor((now - lastRepair) / (1000 * 60 * 60 * 24));

                let cancelMessage = '';
                if (daysSinceRepair >= 5) {
                    cancelMessage = '⚠️ **CẢNH BÁO NGHIÊM TRỌNG!**\n\n' +
                        'Bạn đã hủy sửa chữa nhà khi đã quá hạn!\n' +
                        'Nhà có thể bị thu hồi bất cứ lúc nào!\n\n' +
                        '**Hãy sửa ngay lập tức để tránh mất nhà!**';
                } else {
                    cancelMessage = 'Bạn đã quyết định không sửa nhà lúc này.\n\n' +
                        'Có thể sửa bất cứ lúc nào bằng lệnh `,suanha`.';
                }

                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❌ ĐÃ HỦY SỬA NHÀ')
                    .setDescription('Bạn đã quyết định không sửa nhà. Hãy cân nhắc và quay lại sau!')
                    .setColor('#6C757D');

                // Update message để xóa buttons
                await interaction.update({ embeds: [cancelEmbed], components: [] });
            }

        } catch (error) {
            console.error('Lỗi xử lý interaction sửa nhà:', error);
            await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
        }
    },

    // Helper functions
    getHouseInfo(houseType) {
        const houseData = {
            'nhatro': {
                name: 'Nhà Trọ',
                price: 500,
                dailyRepair: 0,
                emoji: '🏠'
            },
            'nhatuong': {
                name: 'Nhà Thường',
                price: 2000,
                dailyRepair: 300,
                emoji: '🏘️'
            },
            'nhalau': {
                name: 'Nhà Lầu',
                repairCost: 1000,
                cooldown: 5 * 24 * 60 * 60 * 1000 // 5 ngày
            },
            'bietthu': {
                name: 'Biệt Thự',
                price: 10000,
                dailyRepair: 1500,
                emoji: '🏰'
            }
        };
        return houseData[houseType] || { name: 'Không rõ', price: 0, dailyRepair: 0, emoji: '❓' };
    }
}; 