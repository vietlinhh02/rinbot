const { EmbedBuilder } = require('discord.js');
const { getPet } = require('../../utils/database');
const { PET_IMAGES } = require('../../utils/constants');

module.exports = {
    name: 'petcheck',
    description: 'Kiểm tra thông tin thú cưng của bạn',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const pet = await getPet(userId);
            
            if (!pet) {
                return message.reply('❌ Bạn chưa có thú cưng! Hãy dùng lệnh `,muapet` để mua thú cưng.');
            }

            const now = new Date();
            
            // Sử dụng tuổi từ database (được tăng mỗi lần cho ăn)
            const petAge = pet.age || 0;
            
            // Tính thời gian tồn tại (ngày) - chỉ để tham khảo
            const existDays = Math.floor((now - new Date(pet.createdAt)) / (1000 * 60 * 60 * 24));
            
            // Kiểm tra tình trạng đói
            let hungerStatus = '😋 Chưa đói';
            if (pet.lastFed) {
                const hoursSinceLastFed = (now - new Date(pet.lastFed)) / (1000 * 60 * 60);
                if (hoursSinceLastFed >= 3) {
                    hungerStatus = '😴 Đói rồi! Cần cho ăn';
                } else {
                    const remainingHours = Math.ceil(3 - hoursSinceLastFed);
                    hungerStatus = `😊 No (${remainingHours}h nữa đói)`;
                }
            } else {
                hungerStatus = '🆕 Chưa cho ăn lần nào';
            }

            // Thông tin hôn nhân
            let marriageInfo = '💔 Độc thân';
            if (pet.married && pet.partnerId) {
                try {
                    const partnerUser = await message.client.users.fetch(pet.partnerId);
                    const marriedDays = Math.floor((now - new Date(pet.marriedAt)) / (1000 * 60 * 60 * 24));
                    marriageInfo = `💍 Đã cưới ${partnerUser.displayName} (${marriedDays} ngày)`;
                } catch (error) {
                    marriageInfo = '💍 Đã cưới (người phối ngẫu không rõ)';
                }
            }

            // Tính giá trị thú cưng (dựa trên số lần đẻ và tuổi)
            const baseValue = 100;
            const breedValue = pet.breedCount * 50;
            const ageValue = Math.floor(petAge / 10) * 10;
            const totalValue = baseValue + breedValue + ageValue;

            const embed = new EmbedBuilder()
                .setTitle(`🐾 ${pet.petType} của ${message.author.displayName}`)
                .setDescription(`**📋 Thông tin chi tiết thú cưng**\n\n` +
                    `**🎭 Cơ bản:**\n` +
                    `• Loài: ${pet.petType}\n` +
                    `• Giới tính: ${pet.gender}\n` +
                    `• Tuổi: ${petAge} ngày\n` +
                    `• Sức khỏe: ${pet.health}\n\n` +
                    `**🍖 Chăm sóc:**\n` +
                    `• Tình trạng: ${hungerStatus}\n` +
                    `• Lần cho ăn cuối: ${pet.lastFed ? new Date(pet.lastFed).toLocaleString('vi-VN') : 'Chưa bao giờ'}\n\n` +
                    `**👶 Sinh sản:**\n` +
                    `• Số lần đẻ: ${pet.breedCount} lần\n` +
                    `• ${marriageInfo}\n\n` +
                    `**💰 Giá trị:**\n` +
                    `• Giá bán hiện tại: ~${totalValue} Rin\n` +
                    `• Bonus từ sinh sản: +${breedValue} Rin`)
                .addFields(
                    { 
                        name: '🎯 Hoạt động có thể làm', 
                        value: `• \`thucan\` - Cho ăn (3h/lần, 20 Rin)\n` +
                               `• \`thuoc\` - Chữa bệnh nếu ốm (50 Rin)\n` +
                               `• \`petchich @user\` - Ghép cặp thú\n` +
                               `• \`banpet\` - Bán thú (nếu đã đẻ)\n` +
                               `• \`gia\` - Làm thú già, không đẻ nữa`, 
                        inline: false 
                    }
                )
                .setThumbnail(PET_IMAGES[pet.petType] || null)
                .setColor(pet.health === 'Bình thường' ? '#00FF00' : pet.health === 'Ốm' ? '#FF6B6B' : '#FFD700')
                .setFooter({ 
                    text: pet.health === 'Ốm' ? 
                        '⚠️ Thú cưng đang ốm! Hãy chữa trị ngay!' : 
                        'Hãy chăm sóc thú cưng thường xuyên!'
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi petcheck:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra thú cưng!');
        }
    }
}; 