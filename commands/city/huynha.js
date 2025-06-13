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
                time: 30000, // 30 giây
                max: 1 // Chỉ xử lý 1 lần
            });

            collector.on('collect', async (interaction) => {
                await this.handleInteraction(interaction);
                collector.stop(); // Dừng collector sau khi xử lý xong
            });

            collector.on('end', async () => {
                try {
                    // Disable buttons sau khi hết thời gian hoặc đã xử lý xong
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
            if (interaction.customId === 'confirm') {
                // Xử lý xác nhận hủy nhà
                const cityUser = await getCityUser(interaction.user.id);
                if (!cityUser || !cityUser.home) {
                    await interaction.reply({
                        content: '❌ Bạn chưa có nhà để hủy!',
                        ephemeral: true
                    });
                    return;
                }

                // Cập nhật thông tin user
                const updateResult = await updateCityUser(interaction.user.id, {
                    home: null,
                    job: null
                });

                console.log('🏠 DEBUG: Kết quả update:', updateResult ? 'thành công' : 'thất bại');

                // Verify lại thông tin sau khi update
                const verifyUser = await getCityUser(interaction.user.id);
                console.log('🏠 DEBUG: Verify user sau khi xóa:', {
                    home: verifyUser?.home,
                    job: verifyUser?.job
                });

                // Cập nhật message với thông báo thành công
                await interaction.update({
                    content: '✅ Đã hủy nhà thành công!',
                    components: []
                });
            } else if (interaction.customId === 'cancel') {
                // Cập nhật message với thông báo hủy
                await interaction.update({
                    content: '❌ Đã hủy thao tác!',
                    components: []
                });
            }
        } catch (error) {
            console.error('Lỗi xử lý hủy nhà:', error);
            // Nếu interaction chưa được xử lý, gửi thông báo lỗi
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Có lỗi xảy ra khi xử lý yêu cầu!',
                    ephemeral: true
                });
            }
        }
    }
}; 