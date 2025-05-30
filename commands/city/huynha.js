const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCityUser, updateCityUser, getUserRin, updateUserRin } = require('../../utils/database');
const { HOUSE_IMAGES } = require('../../utils/constants');

// Thông tin các loại nhà để hiển thị thông tin nhà hiện tại
const HOUSE_TYPES = {
    'nhatro': {
        name: 'Nhà Trọ',
        price: 500,
        emoji: '🏠'
    },
    'nhatuong': {
        name: 'Nhà Thường',
        price: 2000,
        emoji: '🏘️'
    },
    'nhalau': {
        name: 'Nhà Lầu',
        price: 5000,
        emoji: '🏛️'
    },
    'bietthu': {
        name: 'Biệt Thự',
        price: 8000,
        emoji: '🏰'
    }
};

module.exports = {
    name: 'huynha',
    description: 'Hủy thuê nhà hiện tại và nhận lại 50% tiền',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);

            // Kiểm tra có nhà không
            if (!cityUser.home) {
                return message.reply('❌ Bạn chưa thuê nhà nào để hủy!');
            }

            const houseInfo = HOUSE_TYPES[cityUser.home];
            if (!houseInfo) {
                return message.reply('❌ Lỗi: Không tìm thấy thông tin nhà!');
            }

            const refundAmount = Math.floor(houseInfo.price * 0.5); // Hoàn 50%

            // Xác nhận hủy nhà
            const embed = new EmbedBuilder()
                .setTitle(`🏠 HỦY THUÊ ${houseInfo.name.toUpperCase()}`)
                .setDescription(`**Xác nhận hủy thuê ${houseInfo.name}?**\n\n` +
                    `**💰 Tiền thuê ban đầu:** ${houseInfo.price} Rin\n` +
                    `**💵 Tiền hoàn lại (50%):** ${refundAmount} Rin\n\n` +
                    `⚠️ **Cảnh báo:**\n` +
                    `• Bạn sẽ mất toàn bộ nghề nghiệp\n` +
                    `• Mất các lợi ích của nhà\n` +
                    `• Phải thuê nhà mới để làm việc tiếp\n\n` +
                    `**Bạn có chắc chắn muốn hủy thuê nhà?**`)
                .setColor('#FF6B6B')
                .setThumbnail(HOUSE_IMAGES[cityUser.home] || null)
                .setFooter({ text: 'Quyết định trong 30 giây!' })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`cancel_house_confirm_${userId}`)
                .setLabel(`🗑️ Hủy nhà (nhận ${refundAmount} Rin)`)
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel_house_cancel_${userId}`)
                .setLabel('❌ Giữ lại nhà')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            const replyMessage = await message.reply({ embeds: [embed], components: [row] });

            // Tạo collector để xử lý button interactions
            const collector = replyMessage.createMessageComponentCollector({ 
                time: 30000 // 30 giây
            });

            collector.on('collect', async (interaction) => {
                await this.handleInteraction(interaction);
            });

            collector.on('end', async () => {
                try {
                    // Disable buttons sau khi hết thời gian
                    const disabledRow = new ActionRowBuilder().addComponents(
                        confirmButton.setDisabled(true),
                        cancelButton.setDisabled(true)
                    );
                    await replyMessage.edit({ components: [disabledRow] });
                } catch (error) {
                    console.error('Lỗi khi disable buttons:', error);
                }
            });

        } catch (error) {
            console.error('Lỗi huynha:', error);
            await message.reply('❌ Có lỗi xảy ra khi hủy thuê nhà!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        try {
            if (!interaction.customId.startsWith('cancel_house_')) return;

            const parts = interaction.customId.split('_');
            const result = parts[2]; // confirm hoặc cancel
            const userId = parts[3];
            
            if (interaction.user.id !== userId) {
                return await interaction.reply({ content: '❌ Chỉ người thuê mới có thể thực hiện!', ephemeral: true });
            }

            if (result === 'confirm') {
                const cityUser = await getCityUser(userId);

                if (!cityUser.home) {
                    return await interaction.reply({ content: '❌ Bạn không có nhà để hủy!', ephemeral: true });
                }

                const houseInfo = HOUSE_TYPES[cityUser.home];
                if (!houseInfo) {
                    return await interaction.reply({ content: '❌ Lỗi: Không tìm thấy thông tin nhà!', ephemeral: true });
                }

                const refundAmount = Math.floor(houseInfo.price * 0.5);

                // Hoàn tiền và xóa nhà, nghề
                await updateUserRin(userId, refundAmount);
                await updateCityUser(userId, {
                    home: null,
                    job: null,
                    workProgress: 0,
                    lastWork: null,
                    workStartTime: null,
                    lastRepair: null,
                    dailyMoneySteal: {}
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ HỦY THUÊ NHÀ THÀNH CÔNG!')
                    .setDescription(`**${houseInfo.name}** đã được hủy thành công! 🏠\n\n` +
                        `**💵 Tiền hoàn lại:** ${refundAmount} Rin\n\n` +
                        `**📋 Tình trạng hiện tại:**\n` +
                        `• Nhà: Không có\n` +
                        `• Nghề: Không có\n\n` +
                        `**🎯 Bước tiếp theo:**\n` +
                        `• Dùng \`,thuenha\` để thuê nhà mới\n` +
                        `• Sau đó dùng \`,dangkynghe\` để chọn nghề`)
                    .setColor('#00FF00')
                    .setThumbnail(HOUSE_IMAGES[cityUser.home] || null)
                    .setFooter({ text: 'Cảm ơn bạn đã sử dụng dịch vụ thuê nhà!' })
                    .setTimestamp();

                // Update message để xóa buttons
                await interaction.update({ embeds: [embed], components: [] });

            } else {
                // Hủy bỏ hủy nhà
                const embed = new EmbedBuilder()
                    .setTitle('❌ ĐÃ HỦY THAO TÁC')
                    .setDescription('Bạn đã quyết định giữ lại nhà hiện tại. Nhà của bạn vẫn an toàn!')
                    .setColor('#6C757D');

                // Update message để xóa buttons
                await interaction.update({ embeds: [embed], components: [] });
            }
        } catch (error) {
            console.error('Lỗi xử lý interaction huynha:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
                }
            } catch (replyError) {
                console.error('Lỗi khi reply interaction:', replyError);
            }
        }
    }
}; 