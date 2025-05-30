const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPet, updatePet } = require('../../utils/database');
const { PET_IMAGES } = require('../../utils/constants');

// Lưu trữ các lời mời ghép cặp
const breedingInvitations = new Map();

module.exports = {
    name: 'petchich',
    description: 'Ghép cặp thú cưng với người khác',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const pet = await getPet(userId);
            
            if (!pet) {
                return message.reply('❌ Bạn chưa có thú cưng! Hãy dùng lệnh `,muapet` để mua thú cưng.');
            }

            // Kiểm tra mention user
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Vui lòng tag người bạn muốn ghép cặp thú cưng! Ví dụ: `,petchich @tên_người_dùng`');
            }

            if (targetUser.id === userId) {
                return message.reply('❌ Bạn không thể ghép cặp thú cưng với chính mình!');
            }

            // Kiểm tra thú cưng của người được tag
            const targetPet = await getPet(targetUser.id);
            if (!targetPet) {
                return message.reply(`❌ ${targetUser.displayName} chưa có thú cưng!`);
            }

            // Kiểm tra điều kiện ghép cặp
            if (pet.health !== 'Bình thường') {
                return message.reply('❌ Thú cưng của bạn đang ốm, không thể ghép cặp!');
            }

            if (targetPet.health !== 'Bình thường') {
                return message.reply(`❌ Thú cưng của ${targetUser.displayName} đang ốm, không thể ghép cặp!`);
            }

            if (pet.gender === targetPet.gender) {
                return message.reply('❌ Hai thú cưng cùng giới tính không thể ghép cặp!');
            }

            if (pet.married && pet.partnerId === targetUser.id) {
                // Nếu đã kết hôn với nhau, thử sinh sản
                return await this.tryBreeding(message, pet, targetPet, targetUser);
            }

            if (pet.married) {
                return message.reply('❌ Thú cưng của bạn đã kết hôn rồi!');
            }

            if (targetPet.married) {
                return message.reply(`❌ Thú cưng của ${targetUser.displayName} đã kết hôn rồi!`);
            }

            // Tạo lời mời ghép cặp
            const invitationId = `${userId}_${targetUser.id}_${Date.now()}`;
            breedingInvitations.set(invitationId, {
                sender: message.author,
                target: targetUser,
                pet1: pet,
                pet2: targetPet,
                channelId: message.channel.id,
                expiresAt: Date.now() + 60000 // 1 phút
            });

            const embed = new EmbedBuilder()
                .setTitle('💕 LỜI MỜI GHÉP CẶP THÚ CƯNG')
                .setDescription(`**${message.author.displayName}** muốn ghép cặp thú cưng với **${targetUser.displayName}**!\n\n` +
                    `**🐾 Thông tin hai thú cưng:**\n` +
                    `• **${pet.petType}** (${pet.gender}) - Tuổi: ${pet.age || 0}\n` +
                    `• **${targetPet.petType}** (${targetPet.gender}) - Tuổi: ${targetPet.age || 0}\n\n` +
                    `**💍 Kết quả nếu đồng ý:**\n` +
                    `• Hai thú cưng sẽ kết hôn\n` +
                    `• Có cơ hội sinh con và nhận thưởng\n` +
                    `• Có thể tiếp tục ghép cặp trong tương lai\n\n` +
                    `${targetUser}, bạn có đồng ý không?`)
                .setColor('#FF69B4')
                .setFooter({ text: 'Lời mời sẽ hết hạn sau 60 giây' })
                .setTimestamp();

            const acceptButton = new ButtonBuilder()
                .setCustomId(`breed_accept_${invitationId}`)
                .setLabel('💕 Đồng ý')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId(`breed_reject_${invitationId}`)
                .setLabel('❌ Từ chối')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

            await message.reply({ embeds: [embed], components: [row] });

            // Tự động xóa lời mời sau 1 phút
            setTimeout(() => {
                breedingInvitations.delete(invitationId);
            }, 60000);

        } catch (error) {
            console.error('Lỗi petchich:', error);
            await message.reply('❌ Có lỗi xảy ra khi ghép cặp thú cưng!');
        }
    },

    // Xử lý breeding giữa hai thú đã kết hôn
    async tryBreeding(message, pet1, pet2, targetUser) {
        const now = new Date();
        
        // Kiểm tra cooldown breeding (24 giờ)
        if (pet1.lastBred) {
            const hoursSinceLastBred = (now - new Date(pet1.lastBred)) / (1000 * 60 * 60);
            if (hoursSinceLastBred < 24) {
                const remainingHours = Math.ceil(24 - hoursSinceLastBred);
                return message.reply(`⏰ Thú cưng vẫn đang nghỉ ngơi sau lần sinh sản trước! Hãy quay lại sau **${remainingHours} giờ**.`);
            }
        }

        // Tính tỷ lệ thành công dựa trên tuổi và sức khỏe
        const age1 = pet1.age || 0;
        const age2 = pet2.age || 0;
        const avgAge = (age1 + age2) / 2;
        
        let successRate = 0.3; // Base 30%
        if (avgAge >= 10) successRate += 0.2; // +20% nếu trung bình >= 10 tuổi
        if (avgAge >= 20) successRate += 0.2; // +20% nữa nếu >= 20 tuổi
        if (pet1.health === 'Bình thường' && pet2.health === 'Bình thường') successRate += 0.1; // +10% nếu cả hai khỏe

        const isSuccess = Math.random() < successRate;

        // Cập nhật lastBred cho cả hai thú
        await updatePet(pet1.userId, { lastBred: now });
        await updatePet(targetUser.id, { lastBred: now });

        if (isSuccess) {
            // Sinh sản thành công
            const breedCount1 = pet1.breedCount + 1;
            const breedCount2 = pet2.breedCount + 1;
            
            await updatePet(pet1.userId, { breedCount: breedCount1 });
            await updatePet(targetUser.id, { breedCount: breedCount2 });

            // Thưởng Rin cho cả hai
            const { updateUserRin } = require('../../utils/database');
            const reward = 100 + (breedCount1 * 20); // Base 100 + bonus theo số lần đẻ
            
            await updateUserRin(pet1.userId, reward);
            await updateUserRin(targetUser.id, reward);

            const embed = new EmbedBuilder()
                .setTitle('🎉 SINH SẢN THÀNH CÔNG!')
                .setDescription(`**${pet1.petType}** và **${pet2.petType}** đã sinh con thành công! 👶\n\n` +
                    `**🎁 Phần thưởng:**\n` +
                    `• ${message.author.displayName}: +${reward} Rin\n` +
                    `• ${targetUser.displayName}: +${reward} Rin\n\n` +
                    `**📊 Thống kê:**\n` +
                    `• ${pet1.petType}: ${breedCount1} lần đẻ\n` +
                    `• ${pet2.petType}: ${breedCount2} lần đẻ\n` +
                    `• Tỷ lệ thành công: ${Math.round(successRate * 100)}%\n\n` +
                    `**⏰ Lần tiếp theo:** 24 giờ nữa`)
                .setColor('#00FF00')
                .setFooter({ text: 'Chúc mừng cả hai! Hãy tiếp tục chăm sóc thú cưng! 🐾' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } else {
            // Sinh sản thất bại
            const embed = new EmbedBuilder()
                .setTitle('😔 SINH SẢN THẤT BẠI')
                .setDescription(`**${pet1.petType}** và **${pet2.petType}** đã cố gắng nhưng không thành công...\n\n` +
                    `**📊 Thông tin:**\n` +
                    `• Tỷ lệ thành công: ${Math.round(successRate * 100)}%\n` +
                    `• Kết quả: Thất bại\n` +
                    `• Phần thưởng: 0 Rin\n\n` +
                    `**💡 Tips để tăng tỷ lệ thành công:**\n` +
                    `• Cho ăn đều đặn để tăng tuổi\n` +
                    `• Giữ sức khỏe tốt\n` +
                    `• Thử lại sau 24 giờ\n\n` +
                    `**⏰ Lần tiếp theo:** 24 giờ nữa`)
                .setColor('#FF6B6B')
                .setFooter({ text: 'Đừng nản lòng! Hãy thử lại sau! 🐾' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('breed_')) return;

        const [action, result, invitationId] = interaction.customId.split('_');
        const invitation = breedingInvitations.get(invitationId);

        if (!invitation) {
            return interaction.reply({ content: '❌ Lời mời đã hết hạn!', ephemeral: true });
        }

        if (interaction.user.id !== invitation.target.id) {
            return interaction.reply({ content: '❌ Chỉ người được tag mới có thể phản hồi!', ephemeral: true });
        }

        if (result === 'accept') {
            // Đồng ý ghép cặp - kết hôn
            try {
                await updatePet(invitation.pet1.userId, { 
                    married: true, 
                    partnerId: invitation.target.id,
                    marriedAt: new Date()
                });
                
                await updatePet(invitation.target.id, { 
                    married: true, 
                    partnerId: invitation.pet1.userId,
                    marriedAt: new Date()
                });

                const embed = new EmbedBuilder()
                    .setTitle('💍 KẾT HÔN THÀNH CÔNG!')
                    .setDescription(`**${invitation.pet1.petType}** và **${invitation.pet2.petType}** đã kết hôn! 🎉\n\n` +
                        `**👫 Cặp đôi:**\n` +
                        `• ${invitation.sender.displayName} ↔️ ${invitation.target.displayName}\n\n` +
                        `**🎯 Tính năng mở khóa:**\n` +
                        `• Có thể sinh sản để nhận thưởng\n` +
                        `• Sử dụng lại \`,petchich @partner\` để thử sinh con\n` +
                        `• Mỗi 24 giờ có thể thử 1 lần\n\n` +
                        `**💕 Chúc mừng cả hai!**`)
                    .setColor('#FF69B4')
                    .setFooter({ text: 'Hãy chăm sóc thú cưng thật tốt! 🐾' })
                    .setTimestamp();

                // Update message để xóa buttons
                await interaction.update({ embeds: [embed], components: [] });

            } catch (error) {
                console.error('Lỗi kết hôn pet:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi kết hôn!', ephemeral: true });
            }

        } else {
            // Từ chối ghép cặp
            const embed = new EmbedBuilder()
                .setTitle('💔 ĐÃ TỪ CHỐI')
                .setDescription(`${invitation.target.displayName} đã từ chối lời mời ghép cặp thú cưng.`)
                .setColor('#FF6B6B');

            // Update message để xóa buttons
            await interaction.update({ embeds: [embed], components: [] });
        }

        breedingInvitations.delete(invitationId);
    }
}; 