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
            // Clean up các lời mời hết hạn
            const now = Date.now();
            for (const [inviteId, invitation] of breedingInvitations.entries()) {
                if (now > invitation.expiresAt) {
                    breedingInvitations.delete(inviteId);
                }
            }

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
                // Kiểm tra xem có đang trong quá trình breeding không (race condition protection)
                const breedingKey = `${userId}_${targetUser.id}`;
                if (global.activeBreeding && global.activeBreeding.has(breedingKey)) {
                    return message.reply('⏰ Đang xử lý yêu cầu sinh sản, vui lòng chờ!');
                }
                
                // Set flag đang breeding
                if (!global.activeBreeding) global.activeBreeding = new Set();
                global.activeBreeding.add(breedingKey);
                
                try {
                // Nếu đã kết hôn với nhau, thử sinh sản
                return await this.tryBreeding(message, pet, targetPet, targetUser);
                } finally {
                    // Luôn cleanup flag sau khi xong
                    global.activeBreeding.delete(breedingKey);
                }
            }

            if (pet.married) {
                return message.reply('❌ Thú cưng của bạn đã kết hôn rồi!');
            }

            if (targetPet.married) {
                return message.reply(`❌ Thú cưng của ${targetUser.displayName} đã kết hôn rồi!`);
            }

            // Tạo lời mời ghép cặp
            const expiresAt = Date.now() + 60000; // 1 phút
            const invitationId = `${userId}_${targetUser.id}_${Date.now()}`;
            
            breedingInvitations.set(invitationId, {
                sender: message.author,
                target: targetUser,
                pet1: pet,
                pet2: targetPet,
                channelId: message.channel.id,
                expiresAt: expiresAt 
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
                    `${targetUser}, bạn có đồng ý không?\n` +
                    `⏰ **Hết hạn vào:** <t:${Math.floor(expiresAt/1000)}:R>`)
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
            const timeoutDuration = expiresAt - Date.now();
            
            setTimeout(() => {
                breedingInvitations.delete(invitationId);
            }, timeoutDuration);

        } catch (error) {
            console.error('Lỗi petchich:', error);
            await message.reply('❌ Có lỗi xảy ra khi ghép cặp thú cưng!');
        }
    },

    // Xử lý breeding giữa hai thú đã kết hôn
    async tryBreeding(message, pet1, pet2, targetUser) {
        const now = new Date();
        
        // Lấy lại data mới nhất từ database để tránh cache stale
        const freshPet1 = await getPet(pet1.userId);
        const freshPet2 = await getPet(targetUser.id);
        
        // Kiểm tra cooldown breeding (24 giờ) cho CẢ HAI thú cưng
        
        if (freshPet1?.lastBred) {
            const hoursSinceLastBred1 = (now - new Date(freshPet1.lastBred)) / (1000 * 60 * 60);
            if (hoursSinceLastBred1 < 24) {
                const remainingHours = Math.ceil(24 - hoursSinceLastBred1);
                return message.reply(`⏰ Thú cưng của ${message.author.displayName} vẫn đang nghỉ ngơi sau lần sinh sản trước! Hãy quay lại sau **${remainingHours} giờ**.`);
            }
        }
        
        if (freshPet2?.lastBred) {
            const hoursSinceLastBred2 = (now - new Date(freshPet2.lastBred)) / (1000 * 60 * 60);
            if (hoursSinceLastBred2 < 24) {
                const remainingHours = Math.ceil(24 - hoursSinceLastBred2);
                return message.reply(`⏰ Thú cưng của ${targetUser.displayName} vẫn đang nghỉ ngơi sau lần sinh sản trước! Hãy quay lại sau **${remainingHours} giờ**.`);
            }
        }

        // Tính tỷ lệ thành công dựa trên tuổi và sức khỏe (sử dụng fresh data)
        const age1 = freshPet1?.age || pet1.age || 0;
        const age2 = freshPet2?.age || pet2.age || 0;
        const avgAge = (age1 + age2) / 2;
        
        let successRate = 0.3; // Base 30%
        if (avgAge >= 10) successRate += 0.2; // +20% nếu trung bình >= 10 tuổi
        if (avgAge >= 20) successRate += 0.2; // +20% nữa nếu >= 20 tuổi
        
        const health1 = freshPet1?.health || pet1.health;
        const health2 = freshPet2?.health || pet2.health;
        if (health1 === 'Bình thường' && health2 === 'Bình thường') successRate += 0.1; // +10% nếu cả hai khỏe

        const isSuccess = Math.random() < successRate;

        // Cập nhật lastBred cho cả hai thú
        try {
        await updatePet(pet1.userId, { lastBred: now });
        await updatePet(targetUser.id, { lastBred: now });
            
            console.log(`✅ Breeding cooldown set: 24h for both pets`);
            
        } catch (error) {
            console.error('❌ Error updating pet lastBred:', error);
            return message.reply('❌ Có lỗi khi cập nhật thông tin thú cưng! Vui lòng thử lại.');
        }

        if (isSuccess) {
            // Sinh sản thành công
            const breedCount1 = (freshPet1?.breedCount || pet1.breedCount || 0) + 1;
            const breedCount2 = (freshPet2?.breedCount || pet2.breedCount || 0) + 1;
            
            await updatePet(pet1.userId, { breedCount: breedCount1 });
            await updatePet(targetUser.id, { breedCount: breedCount2 });

            // Thưởng Rin cho cả hai
            const { updateUserRin } = require('../../utils/database');
            const reward = 100 + (breedCount1 * 20); // Base 100 + bonus theo số lần đẻ
            
            await updateUserRin(pet1.userId, reward);
            await updateUserRin(targetUser.id, reward);

            const embed = new EmbedBuilder()
                .setTitle('🎉 SINH SẢN THÀNH CÔNG!')
                .setDescription(`**${freshPet1?.petType || pet1.petType}** và **${freshPet2?.petType || pet2.petType}** đã sinh con thành công! 👶\n\n` +
                    `**🎁 Phần thưởng:**\n` +
                    `• ${message.author.displayName}: +${reward} Rin\n` +
                    `• ${targetUser.displayName}: +${reward} Rin\n\n` +
                    `**📊 Thống kê:**\n` +
                    `• ${freshPet1?.petType || pet1.petType}: ${breedCount1} lần đẻ\n` +
                    `• ${freshPet2?.petType || pet2.petType}: ${breedCount2} lần đẻ\n` +
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
                .setDescription(`**${freshPet1?.petType || pet1.petType}** và **${freshPet2?.petType || pet2.petType}** đã cố gắng nhưng không thành công...\n\n` +
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

        const parts = interaction.customId.split('_');
        const action = parts[0]; // 'breed'
        const result = parts[1]; // 'accept' hoặc 'reject'
        const invitationId = parts.slice(2).join('_'); // Ghép lại phần còn lại vì có thể có dấu _ trong ID
        
        const invitation = breedingInvitations.get(invitationId);

        if (!invitation) {
            return interaction.reply({ content: '❌ Lời mời đã hết hạn!', flags: 64 });
        }

        // Kiểm tra thời gian hết hạn chính xác
        const currentTime = Date.now();
        
        if (currentTime > invitation.expiresAt) {
            breedingInvitations.delete(invitationId);
            return interaction.reply({ content: '❌ Lời mời đã hết hạn!', flags: 64 });
        }

        if (interaction.user.id !== invitation.target.id) {
            return interaction.reply({ content: '❌ Chỉ người được tag mới có thể phản hồi!', flags: 64 });
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
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi kết hôn!', flags: 64 });
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