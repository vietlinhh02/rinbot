const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPet, deletePet, getUserRin, updateUserRin, updatePet } = require('../../utils/database');
const { PET_IMAGES } = require('../../utils/constants');

module.exports = {
    name: 'banpet',
    description: 'Bán thú cưng đã sinh sản',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const pet = await getPet(userId);
            
            if (!pet) {
                return message.reply('❌ Bạn chưa có thú cưng! Hãy dùng lệnh `,muapet` để mua thú cưng.');
            }

            if (pet.breedCount === 0) {
                return message.reply('❌ Thú cưng chưa từng sinh sản, không thể bán! Hãy cho thú cưng ghép cặp trước.');
            }

            const now = new Date();
            
            // Sử dụng tuổi từ database (được tăng mỗi lần cho ăn)
            const petAge = pet.age || 0;
            
            // Tính thời gian sở hữu (ngày) - để tham khảo
            const ownedDays = Math.floor((now - new Date(pet.createdAt)) / (1000 * 60 * 60 * 24));
            
            // Tính giá bán dựa trên nhiều yếu tố
            const baseValue = 100; // Giá mua ban đầu
            const breedValue = pet.breedCount * 75; // 75 Rin mỗi lần đẻ
            const ageValue = Math.floor(petAge / 5) * 15; // 15 Rin mỗi 5 tuổi
            const healthMultiplier = pet.health === 'Bình thường' ? 1.2 : 0.8; // Bonus/penalty sức khỏe
            const marriageBonus = pet.married ? 50 : 0; // Bonus nếu đã kết hôn
            
            const totalValue = Math.floor((baseValue + breedValue + ageValue + marriageBonus) * healthMultiplier);
            const profit = totalValue - baseValue; // Lợi nhuận so với giá mua

            // Thông tin chi tiết về giá
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
                .setTitle('💰 BÁN THÚ CƯNG')
                .setDescription(`**${pet.petType}** của ${message.author.displayName}\n\n` +
                    `**📋 Thông tin thú cưng:**\n` +
                    `🎭 Loài: ${pet.petType} (${pet.gender})\n` +
                    `⏰ Tuổi: ${petAge} tuổi (${ownedDays} ngày sở hữu)\n` +
                    `💚 Sức khỏe: ${pet.health}\n` +
                    `👶 Số lần đẻ: ${pet.breedCount} lần\n` +
                    `${partnerInfo}\n` +
                    `**💸 Tính toán giá bán:**\n` +
                    `• Giá gốc: ${baseValue} Rin\n` +
                    `• Sinh sản: +${breedValue} Rin (${pet.breedCount} × 75)\n` +
                    `• Tuổi tác: +${ageValue} Rin (${petAge} tuổi)\n` +
                    `• Kết hôn: +${marriageBonus} Rin\n` +
                    `• Hệ số sức khỏe: ×${healthMultiplier}\n` +
                    `• **Tổng giá:** ${totalValue} Rin\n` +
                    `• **Lợi nhuận:** ${profit > 0 ? '+' : ''}${profit} Rin\n\n` +
                    `⚠️ **Cảnh báo:** Bán thú cưng sẽ xóa vĩnh viễn và không thể hoàn tác!`)
                .setThumbnail(PET_IMAGES[pet.petType] || null)
                .setColor(profit > 0 ? '#00FF00' : profit === 0 ? '#FFD700' : '#FF6B6B')
                .setFooter({ 
                    text: profit > 0 ? 
                        '💰 Bạn sẽ có lãi! Quyết định thôi!' : 
                        profit === 0 ? 
                        '⚖️ Hòa vốn - không lãi không lỗ' :
                        '📉 Sẽ bị lỗ! Cân nhắc kỹ!'
                })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`sell_pet_confirm_${userId}`)
                .setLabel(`💰 Bán với ${totalValue} Rin`)
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`sell_pet_cancel_${userId}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Lỗi banpet:', error);
            await message.reply('❌ Có lỗi xảy ra khi bán thú cưng!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('sell_pet_')) return;

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

                if (pet.breedCount === 0) {
                    return interaction.reply({ content: '❌ Thú cưng chưa từng sinh sản!', ephemeral: true });
                }

                // Tính lại giá để đảm bảo chính xác
                const now = new Date();
                const petAge = pet.age || 0;
                const ownedDays = Math.floor((now - new Date(pet.createdAt)) / (1000 * 60 * 60 * 24));
                const baseValue = 100;
                const breedValue = pet.breedCount * 75;
                const ageValue = Math.floor(petAge / 5) * 15;
                const healthMultiplier = pet.health === 'Bình thường' ? 1.2 : 0.8;
                const marriageBonus = pet.married ? 50 : 0;
                const totalValue = Math.floor((baseValue + breedValue + ageValue + marriageBonus) * healthMultiplier);

                // Thêm tiền cho người chơi
                await updateUserRin(userId, totalValue);

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
                            await partnerUser.send(`💔 **Thông báo ly dị**\n\nThú cưng của ${interaction.user.displayName} đã được bán. Thú cưng của bạn giờ đã trở lại độc thân và có thể tìm kiếm tình yêu mới!`);
                        } catch (dmError) {
                            // Không gửi được DM, bỏ qua
                        }
                    } catch (error) {
                        console.error('Lỗi xử lý divorce:', error);
                    }
                }

                // Xóa thú cưng
                await deletePet(userId);

                const embed = new EmbedBuilder()
                    .setTitle('✅ BÁN THÚ CƯNG THÀNH CÔNG!')
                    .setDescription(`**${pet.petType}** đã được bán thành công! 💰\n\n` +
                        `**💵 Kết quả giao dịch:**\n` +
                        `• Số tiền nhận được: **${totalValue} Rin**\n` +
                        `• Thú cưng: ${pet.petType} (${pet.breedCount} lần đẻ)\n` +
                        `• Thời gian sở hữu: ${ownedDays} ngày\n\n` +
                        `**🎯 Bước tiếp theo:**\n` +
                        `• Dùng \`,muapet\` để mua thú cưng mới\n` +
                        `• Hoặc tận hưởng số Rin vừa kiếm được!\n\n` +
                        `**Cảm ơn bạn đã chăm sóc thú cưng! 🐾**${divorceInfo}`)
                    .setColor('#00FF00')
                    .setFooter({ text: 'Hẹn gặp lại trong lần mua thú cưng tiếp theo!' })
                    .setTimestamp();

                // Update message để xóa buttons
                await interaction.update({ embeds: [embed], components: [] });

            } catch (error) {
                console.error('Lỗi xác nhận bán pet:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi bán thú cưng!', ephemeral: true });
            }

        } else {
            // Hủy bỏ
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY BÁN THÚ CƯNG')
                .setDescription('Bạn đã quyết định giữ lại thú cưng. Hãy tiếp tục chăm sóc nhé! 🐾')
                .setColor('#6C757D');

            // Update message để xóa buttons
            await interaction.update({ embeds: [embed], components: [] });
        }
    }
}; 