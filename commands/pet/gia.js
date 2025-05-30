const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPet, updatePet, getUserRin, updateUserRin } = require('../../utils/database');
const { PET_IMAGES } = require('../../utils/constants');

module.exports = {
    name: 'gia',
    description: 'Làm thú cưng già - ngừng sinh sản nhưng nhận lợi ích khác',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const pet = await getPet(userId);
            
            if (!pet) {
                return message.reply('❌ Bạn chưa có thú cưng! Hãy dùng lệnh `,muapet` để mua thú cưng.');
            }

            if (pet.isOld) {
                return message.reply('👴 Thú cưng của bạn đã già rồi!');
            }

            if (pet.breedCount < 3) {
                return message.reply('❌ Thú cưng cần sinh sản ít nhất 3 lần mới có thể làm già! Hiện tại: ' + pet.breedCount + ' lần.');
            }

            const now = new Date();
            const petAge = pet.age || 0; // Tuổi từ database (số lần cho ăn)
            const ownedDays = Math.floor((now - new Date(pet.createdAt)) / (1000 * 60 * 60 * 24)); // Thời gian sở hữu
            
            // Tính toán lợi ích khi làm già
            const basePension = 50; // Lương hưu cơ bản
            const breedBonus = pet.breedCount * 30; // Bonus từ sinh sản
            const ageBonus = Math.floor(petAge / 10) * 10; // Bonus tuổi tác (dựa trên số lần cho ăn)
            const healthBonus = pet.health === 'Bình thường' ? 20 : 0;
            const totalPension = basePension + breedBonus + ageBonus + healthBonus;

            // Thông tin về lợi ích hưu trí
            const pensionInfo = `**🏦 Lương hưu hàng ngày:** ${totalPension} Rin/ngày\n` +
                `**📊 Tính toán:**\n` +
                `• Lương cơ bản: ${basePension} Rin\n` +
                `• Bonus sinh sản: +${breedBonus} Rin (${pet.breedCount} × 30)\n` +
                `• Bonus tuổi tác: +${ageBonus} Rin (${petAge} tuổi)\n` +
                `• Bonus sức khỏe: +${healthBonus} Rin\n\n`;

            const embed = new EmbedBuilder()
                .setTitle('👴 LÀM THÚ CƯNG GIÀ')
                .setDescription(`**${pet.petType}** của ${message.author.displayName}\n\n` +
                    `**📋 Thông tin hiện tại:**\n` +
                    `🎭 Loài: ${pet.petType} (${pet.gender})\n` +
                    `⏰ Tuổi: ${petAge} tuổi (sở hữu ${ownedDays} ngày)\n` +
                    `💚 Sức khỏe: ${pet.health}\n` +
                    `👶 Số lần đẻ: ${pet.breedCount} lần\n` +
                    `💍 Tình trạng: ${pet.married ? 'Đã kết hôn' : 'Độc thân'}\n\n` +
                    pensionInfo +
                    `**🎯 Lợi ích khi già:**\n` +
                    `✅ Nhận lương hưu mỗi ngày (tự động)\n` +
                    `✅ Không cần cho ăn nữa (tự túc)\n` +
                    `✅ Không bao giờ ốm (khỏe mạnh vĩnh viễn)\n` +
                    `✅ Có thể bán với giá cao hơn\n` +
                    `❌ Không thể sinh sản nữa\n` +
                    `❌ Không thể kết hôn/ly dị\n\n` +
                    `⚠️ **Cảnh báo:** Quyết định này không thể hoàn tác!`)
                .setThumbnail(PET_IMAGES[pet.petType] || null)
                .setColor('#DAA520')
                .setFooter({ 
                    text: `Lương hưu ước tính: ${totalPension * 30} Rin/tháng`
                })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`retire_pet_confirm_${userId}`)
                .setLabel('👴 Xác nhận làm già')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`retire_pet_cancel_${userId}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Lỗi gia:', error);
            await message.reply('❌ Có lỗi xảy ra khi làm thú cưng già!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('retire_pet_')) return;

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

                if (pet.isOld) {
                    return interaction.reply({ content: '❌ Thú cưng đã già rồi!', ephemeral: true });
                }

                if (pet.breedCount < 3) {
                    return interaction.reply({ content: '❌ Thú cưng cần sinh sản ít nhất 3 lần!', ephemeral: true });
                }

                const now = new Date();
                const petAge = pet.age || 0; // Tuổi từ database (số lần cho ăn)
                const ownedDays = Math.floor((now - new Date(pet.createdAt)) / (1000 * 60 * 60 * 24)); // Thời gian sở hữu
                
                // Tính lương hưu
                const basePension = 50;
                const breedBonus = pet.breedCount * 30;
                const ageBonus = Math.floor(petAge / 10) * 10;
                const healthBonus = pet.health === 'Bình thường' ? 20 : 0;
                const totalPension = basePension + breedBonus + ageBonus + healthBonus;

                // Cập nhật thú cưng thành già
                await updatePet(userId, {
                    isOld: true,
                    pension: totalPension,
                    health: 'Bình thường', // Già = khỏe mạnh vĩnh viễn
                    retiredAt: now,
                    lastPensionClaim: now
                });

                // Xử lý ly dị nếu đã kết hôn
                let divorceInfo = '';
                if (pet.married && pet.partnerId) {
                    try {
                        await updatePet(pet.partnerId, { 
                            married: false, 
                            partnerId: null,
                            marriedAt: null 
                        });
                        
                        const partnerUser = await interaction.client.users.fetch(pet.partnerId);
                        divorceInfo = `\n💔 ${partnerUser.displayName}, thú cưng của bạn đã trở lại độc thân do đối phương về hưu.`;
                        
                        // Gửi thông báo cho partner
                        try {
                            await partnerUser.send(`👴 **Thông báo về hưu**\n\nThú cưng của ${interaction.user.displayName} đã về hưu. Thú cưng của bạn giờ đã trở lại độc thân. Hy vọng họ có cuộc sống hạnh phúc!`);
                        } catch (dmError) {
                            // Không gửi được DM, bỏ qua
                        }
                    } catch (error) {
                        console.error('Lỗi xử lý divorce khi về hưu:', error);
                    }
                }

                // Tặng lương hưu ngày đầu
                await updateUserRin(userId, totalPension);

                const embed = new EmbedBuilder()
                    .setTitle('🎉 THÚ CƯNG ĐÃ VỀ HƯU!')
                    .setDescription(`**${pet.petType}** đã chính thức về hưu! 👴✨\n\n` +
                        `**🏦 Thông tin hưu trí:**\n` +
                        `• Lương hưu: **${totalPension} Rin/ngày**\n` +
                        `• Lương ngày đầu: **+${totalPension} Rin** (đã nhận)\n` +
                        `• Tình trạng: Khỏe mạnh vĩnh viễn\n` +
                        `• Tự chăm sóc bản thân\n\n` +
                        `**🎯 Lợi ích đã mở khóa:**\n` +
                        `✅ Nhận lương mỗi ngày (dùng \`,petcheck\` để claim)\n` +
                        `✅ Không cần cho ăn hay chữa bệnh\n` +
                        `✅ Giá trị bán cao hơn (~${Math.floor(totalPension * 20)} Rin)\n\n` +
                        `**🌟 Chúc mừng thú cưng của bạn có cuộc sống hưu trí hạnh phúc!**${divorceInfo}`)
                    .setColor('#DAA520')
                    .setFooter({ text: 'Hãy nhớ claim lương hưu mỗi ngày nhé! 💰' })
                    .setTimestamp();

                // Update message để xóa buttons
                await interaction.update({ embeds: [embed], components: [] });

            } catch (error) {
                console.error('Lỗi xác nhận về hưu pet:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi làm thú cưng già!', ephemeral: true });
            }

        } else {
            // Hủy bỏ
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY VỀ HƯU')
                .setDescription('Bạn đã quyết định để thú cưng tiếp tục cuộc sống trẻ trung! 🐾')
                .setColor('#6C757D');

            // Update message để xóa buttons
            await interaction.update({ embeds: [embed], components: [] });
        }
    }
}; 