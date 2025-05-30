const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPet, deletePet, getUserRin, updateUserRin, updatePet } = require('../../utils/database');
const { PET_IMAGES } = require('../../utils/constants');

module.exports = {
    name: 'huypet',
    description: 'Hủy thú cưng và nhận bồi thường',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const pet = await getPet(userId);
            
            if (!pet) {
                return message.reply('❌ Bạn chưa có thú cưng! Hãy dùng lệnh `,muapet` để mua thú cưng.');
            }

            const now = new Date();
            
            // Tính tuổi và thời gian sở hữu
            const petAge = pet.age || 0;
            const ownedDays = Math.floor((now - new Date(pet.createdAt)) / (1000 * 60 * 60 * 24));
            
            // Tính bồi thường dựa trên nhiều yếu tố
            const baseCompensation = 60; // Bồi thường cơ bản
            const ageCompensation = Math.floor(petAge / 3) * 10; // 10 Rin mỗi 3 tuổi
            const breedCompensation = pet.breedCount * 30; // 30 Rin mỗi lần đẻ
            const healthBonus = pet.health === 'Bình thường' ? 20 : 0; // Bonus sức khỏe tốt
            const marriageBonus = pet.married ? 25 : 0; // Bonus nếu đã kết hôn
            const timeBonus = Math.min(ownedDays * 2, 50); // 2 Rin/ngày, tối đa 50 Rin
            
            const totalCompensation = baseCompensation + ageCompensation + breedCompensation + healthBonus + marriageBonus + timeBonus;

            // Thông tin về người phối ngẫu
            let partnerInfo = '';
            if (pet.married && pet.partnerId) {
                try {
                    const partnerUser = await message.client.users.fetch(pet.partnerId);
                    partnerInfo = `💍 **Người phối ngẫu:** ${partnerUser.displayName}\n`;
                } catch (error) {
                    partnerInfo = '💍 **Người phối ngẫu:** (Không xác định)\n';
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔄 HỦY THÚ CƯNG')
                .setDescription(`**${pet.petType}** của ${message.author.displayName}\n\n` +
                    `**📋 Thông tin thú cưng:**\n` +
                    `🎭 Loài: ${pet.petType} (${pet.gender})\n` +
                    `⏰ Tuổi: ${petAge} tuổi (${ownedDays} ngày sở hữu)\n` +
                    `💚 Sức khỏe: ${pet.health}\n` +
                    `👶 Số lần đẻ: ${pet.breedCount} lần\n` +
                    `${partnerInfo}\n` +
                    `**💰 Tính toán bồi thường:**\n` +
                    `• Bồi thường cơ bản: ${baseCompensation} Rin\n` +
                    `• Tuổi tác: +${ageCompensation} Rin (${petAge} tuổi)\n` +
                    `• Sinh sản: +${breedCompensation} Rin (${pet.breedCount} lần)\n` +
                    `• Sức khỏe tốt: +${healthBonus} Rin\n` +
                    `• Kết hôn: +${marriageBonus} Rin\n` +
                    `• Thời gian chăm sóc: +${timeBonus} Rin\n` +
                    `• **Tổng bồi thường:** ${totalCompensation} Rin\n\n` +
                    `⚠️ **Cảnh báo:** Hủy thú cưng sẽ xóa vĩnh viễn và không thể hoàn tác!\n` +
                    `💡 **Lưu ý:** Đây là bồi thường thấp hơn bán pet, nhưng áp dụng cho cả pet chưa sinh sản.`)
                .setThumbnail(PET_IMAGES[pet.petType] || null)
                .setColor('#FF9900')
                .setFooter({ text: 'Hủy pet = bồi thường thấp hơn, bán pet = giá trị cao hơn' })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`cancel_pet_confirm_${userId}`)
                .setLabel(`🔄 Hủy và nhận ${totalCompensation} Rin`)
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel_pet_cancel_${userId}`)
                .setLabel('❌ Giữ lại pet')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Lỗi huypet:', error);
            await message.reply('❌ Có lỗi xảy ra khi hủy thú cưng!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('cancel_pet_')) return;

        const [action, pet, result, userId] = interaction.customId.split('_');
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ chủ thú cưng mới có thể thực hiện!', ephemeral: true });
        }

        if (result === 'confirm') {
            try {
                const pet = await getPet(userId);
                if (!pet) {
                    return interaction.reply({ content: '❌ Không tìm thấy thú cưng!', ephemeral: true });
                }

                // Tính lại bồi thường để đảm bảo chính xác
                const now = new Date();
                const petAge = pet.age || 0;
                const ownedDays = Math.floor((now - new Date(pet.createdAt)) / (1000 * 60 * 60 * 24));
                const baseCompensation = 60;
                const ageCompensation = Math.floor(petAge / 3) * 10;
                const breedCompensation = pet.breedCount * 30;
                const healthBonus = pet.health === 'Bình thường' ? 20 : 0;
                const marriageBonus = pet.married ? 25 : 0;
                const timeBonus = Math.min(ownedDays * 2, 50);
                const totalCompensation = baseCompensation + ageCompensation + breedCompensation + healthBonus + marriageBonus + timeBonus;

                // Thêm tiền bồi thường cho người chơi
                await updateUserRin(userId, totalCompensation);

                // Xử lý divorce nếu thú cưng đã kết hôn
                let divorceInfo = '';
                if (pet.married && pet.partnerId) {
                    try {
                        // Cập nhật partner thành độc thân
                        await updatePet(pet.partnerId, { 
                            married: false, 
                            partnerId: null,
                            marriedAt: null 
                        });
                        
                        const partnerUser = await interaction.client.users.fetch(pet.partnerId);
                        divorceInfo = `\n💔 ${partnerUser.displayName}, thú cưng của bạn đã trở lại độc thân.`;
                        
                        // Gửi thông báo cho partner
                        try {
                            await partnerUser.send(`💔 **Thông báo ly dị**\n\nThú cưng của ${interaction.user.displayName} đã bị hủy. Thú cưng của bạn giờ đã trở lại độc thân và có thể tìm kiếm tình yêu mới!`);
                        } catch (dmError) {
                            // Không gửi được DM, bỏ qua
                        }
                    } catch (error) {
                        console.error('Lỗi xử lý divorce:', error);
                    }
                }

                // Xóa thú cưng khỏi database
                await deletePet(userId);

                const embed = new EmbedBuilder()
                    .setTitle('✅ ĐÃ HỦY THÚ CƯNG THÀNH CÔNG!')
                    .setDescription(`**${pet.petType}** đã được hủy và bồi thường! 💰\n\n` +
                        `**💵 Kết quả bồi thường:**\n` +
                        `• Số tiền nhận được: **${totalCompensation} Rin**\n` +
                        `• Thú cưng: ${pet.petType} (${pet.breedCount} lần đẻ)\n` +
                        `• Thời gian chăm sóc: ${ownedDays} ngày\n\n` +
                        `**🎯 Bước tiếp theo:**\n` +
                        `• Dùng \`,muapet\` để mua thú cưng mới\n` +
                        `• Hoặc tiết kiệm Rin để mua pet tốt hơn!\n\n` +
                        `**Cảm ơn bạn đã trải nghiệm hệ thống pet! 🐾**${divorceInfo}`)
                    .setColor('#00FF00')
                    .setFooter({ text: 'Hẹn gặp lại trong lần nuôi pet tiếp theo!' })
                    .setTimestamp();

                // Update message để xóa buttons
                await interaction.update({ embeds: [embed], components: [] });

            } catch (error) {
                console.error('Lỗi xác nhận hủy pet:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi hủy thú cưng!', ephemeral: true });
            }

        } else {
            // Hủy bỏ
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY THAO TÁC')
                .setDescription('Bạn đã quyết định giữ lại thú cưng. Hãy tiếp tục chăm sóc nhé! 🐾')
                .setColor('#6C757D');

            // Update message để xóa buttons
            await interaction.update({ embeds: [embed], components: [] });
        }
    }
}; 