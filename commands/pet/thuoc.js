const { EmbedBuilder } = require('discord.js');
const { getPet, updatePet, getUserRin, updateUserRin } = require('../../utils/database');
const { PET_IMAGES } = require('../../utils/constants');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'thuoc',
    description: 'Chữa bệnh cho thú cưng (50 Rin)',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 2 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'thuoc', 
                2, // 2 giây cooldown
                this.executeThuoc,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },

    async executeThuoc(message, args) {
        try {
            const userId = message.author.id;
            const pet = await getPet(userId);
            
            if (!pet) {
                return message.reply('❌ Bạn chưa có thú cưng! Hãy dùng lệnh `,muapet` để mua thú cưng.');
            }

            if (pet.health === 'Bình thường') {
                return message.reply('😊 Thú cưng của bạn rất khỏe mạnh, không cần chữa trị!');
            }

            // Kiểm tra số Rin
            const userRin = await getUserRin(userId);
            if (userRin < 50) {
                return message.reply('❌ Bạn cần 50 Rin để mua thuốc chữa bệnh cho thú cưng!');
            }

            // Kiểm tra lại pet và tiền trước khi thực hiện (tránh race condition)
            const freshPet = await getPet(userId);
            if (!freshPet) {
                return message.reply('❌ Không tìm thấy thú cưng! (Phát hiện spam)');
            }

            if (freshPet.health === 'Bình thường') {
                return message.reply('😊 Thú cưng đã khỏe rồi! (Phát hiện spam)');
            }

            // Trừ tiền và chữa bệnh
            await updateUserRin(userId, -50);
            
            // Random hiệu quả của thuốc
            const treatmentResults = [
                {
                    success: true,
                    message: 'Thuốc có hiệu quả tuyệt vời! Thú cưng đã khỏe lại hoàn toàn! 🎉',
                    color: '#00FF00',
                    emoji: '✨'
                },
                {
                    success: true,
                    message: 'Sau khi uống thuốc, thú cưng cảm thấy tốt hơn nhiều! 😊',
                    color: '#00FF00',
                    emoji: '💊'
                },
                {
                    success: true,
                    message: 'Thuốc đã phát huy tác dụng, thú cưng trở lại khỏe mạnh! 🌟',
                    color: '#00FF00',
                    emoji: '🏥'
                }
            ];

            // 95% tỷ lệ thành công
            const isSuccess = Math.random() < 0.95;
            
            if (isSuccess) {
                // Chữa thành công
                await updatePet(userId, { 
                    health: 'Bình thường',
                    lastTreated: new Date()
                });

                const randomResult = treatmentResults[Math.floor(Math.random() * treatmentResults.length)];

                const embed = new EmbedBuilder()
                    .setTitle('🏥 CHỮA BỆNH THÀNH CÔNG!')
                    .setDescription(`**${freshPet.petType}** của ${message.author.displayName}\n\n${randomResult.message}\n\n` +
                        `**📊 Thông tin chữa trị:**\n` +
                        `• Chi phí: 50 Rin\n` +
                        `• Tình trạng cũ: ${freshPet.health}\n` +
                        `• Tình trạng mới: Bình thường\n` +
                        `• Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n` +
                        `**💡 Lời khuyên:** Hãy cho ăn đều đặn để thú cưng không bị ốm nữa!`)
                    .setThumbnail(PET_IMAGES[freshPet.petType] || null)
                    .setColor(randomResult.color)
                    .setFooter({ text: 'Thú cưng đã hoàn toàn khỏe mạnh! 🐾' })
                    .setTimestamp();

                // Thêm bonus nếu chữa trị thành công hoàn hảo
                if (Math.random() < 0.1) { // 10% chance
                    embed.addFields({
                        name: '🎁 Bonus đặc biệt!',
                        value: 'Thú cưng rất biết ơn và có vẻ vui vẻ hơn! Cơ hội sinh sản tăng lên!',
                        inline: false
                    });
                }

            } else {
                // Chữa thất bại (5% chance)
                const embed = new EmbedBuilder()
                    .setTitle('😟 CHỮA BỆNH THẤT BẠI')
                    .setDescription(`**${freshPet.petType}** của ${message.author.displayName}\n\n` +
                        `Thuốc không có hiệu quả như mong đợi... Thú cưng vẫn còn ốm.\n\n` +
                        `**📊 Thông tin:**\n` +
                        `• Chi phí: 50 Rin (đã mất)\n` +
                        `• Tình trạng: Vẫn ${freshPet.health}\n` +
                        `• Khuyến nghị: Thử lại sau hoặc chăm sóc tốt hơn\n\n` +
                        `**💡 Tip:** Đôi khi thuốc không hiệu quả 100%. Hãy thử lại!`)
                    .setThumbnail(PET_IMAGES[freshPet.petType] || null)
                    .setColor('#FF6B6B')
                    .setFooter({ text: 'Đừng nản lòng! Hãy thử lại sau. 🐾' })
                    .setTimestamp();
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi thuoc:', error);
            await message.reply('❌ Có lỗi xảy ra khi chữa bệnh cho thú cưng!');
        }
    }
}; 