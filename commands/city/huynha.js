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
            const filter = i => i.user.id === userId && i.customId.startsWith('cancel_house_');
            const collector = replyMessage.createMessageComponentCollector({ 
                filter,
                time: 30000, // 30 giây
                max: 1 // Chỉ xử lý 1 lần
            });

            collector.on('collect', async (interaction) => {
                console.log(`🔧 DEBUG: Received interaction: ${interaction.customId} from user ${interaction.user.id}`);
                await this.handleInteraction(interaction);
                collector.stop(); // Dừng collector sau khi xử lý xong
            });

            collector.on('end', async (collected) => {
                console.log(`🔧 DEBUG: Collector ended, collected ${collected.size} interactions`);
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
        console.log(`🔧 DEBUG: handleInteraction called with customId: ${interaction.customId}`);
        try {
            if (interaction.customId.startsWith('cancel_house_confirm_')) {
                console.log(`🔧 DEBUG: Processing confirm action`);
                // Xử lý xác nhận hủy nhà
                const userId = interaction.customId.split('_')[3];
                console.log(`🔧 DEBUG: Extracted userId: ${userId}, interaction user: ${interaction.user.id}`);
                
                // Kiểm tra quyền
                if (interaction.user.id !== userId) {
                    console.log(`🔧 DEBUG: Permission denied`);
                    await interaction.reply({
                        content: '❌ Chỉ người thuê mới có thể thực hiện!',
                        ephemeral: true
                    });
                    return;
                }

                const cityUser = await getCityUser(userId);
                console.log(`🔧 DEBUG: CityUser found:`, cityUser?.home);
                if (!cityUser || !cityUser.home) {
                    await interaction.reply({
                        content: '❌ Bạn chưa có nhà để hủy!',
                        ephemeral: true
                    });
                    return;
                }

                const houseInfo = HOUSE_TYPES[cityUser.home];
                const refundAmount = Math.floor(houseInfo.price * 0.5);
                console.log(`🔧 DEBUG: Refund amount: ${refundAmount}`);

                // Hoàn tiền
                await updateUserRin(userId, refundAmount);

                // Cập nhật thông tin user
                const updateResult = await updateCityUser(userId, {
                    home: null,
                    job: null,
                    workProgress: 0,
                    lastWork: null,
                    workStartTime: null,
                    lastRepair: null,
                    dailyMoneySteal: 0
                });

                console.log('🏠 DEBUG: Kết quả update:', updateResult ? 'thành công' : 'thất bại');

                // Verify lại thông tin sau khi update
                const verifyUser = await getCityUser(userId);
                console.log('🏠 DEBUG: Verify user sau khi xóa:', {
                    home: verifyUser?.home,
                    job: verifyUser?.job
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

                // Cập nhật message với thông báo thành công
                console.log(`🔧 DEBUG: Updating interaction with success embed`);
                await interaction.update({
                    embeds: [embed],
                    components: []
                });

            } else if (interaction.customId.startsWith('cancel_house_cancel_')) {
                console.log(`🔧 DEBUG: Processing cancel action`);
                // Xử lý hủy bỏ thao tác
                const userId = interaction.customId.split('_')[3];
                
                // Kiểm tra quyền
                if (interaction.user.id !== userId) {
                    await interaction.reply({
                        content: '❌ Chỉ người thuê mới có thể thực hiện!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('❌ ĐÃ HỦY THAO TÁC')
                    .setDescription('Bạn đã quyết định giữ lại nhà hiện tại. Nhà của bạn vẫn an toàn!')
                    .setColor('#6C757D');

                // Cập nhật message với thông báo hủy
                await interaction.update({
                    embeds: [embed],
                    components: []
                });
            } else {
                console.log(`🔧 DEBUG: Unknown customId: ${interaction.customId}`);
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