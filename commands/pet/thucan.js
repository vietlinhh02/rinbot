const { EmbedBuilder } = require('discord.js');
const { getPet, updatePet } = require('../../utils/database');
const FastUtils = require('../../utils/fastUtils');
const { PET_IMAGES } = require('../../utils/constants');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'thucan',
    description: 'Cho thú cưng ăn (mỗi 3 giờ, 20 Rin)',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 2 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'thucan', 
                2, // 2 giây cooldown
                this.executeThuCan,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },

    async executeThuCan(message, args) {
        try {
            const userId = message.author.id;
            const pet = await getPet(userId);
            
            if (!pet) {
                return message.reply('❌ Bạn chưa có thú cưng! Hãy dùng lệnh `,muapet` để mua thú cưng.');
            }

            const now = new Date();
            
            // Kiểm tra cooldown 3 giờ
            if (pet.lastFed) {
                const hoursSinceLastFed = (now - new Date(pet.lastFed)) / (1000 * 60 * 60);
                if (hoursSinceLastFed < 3) {
                    const remainingTime = Math.ceil(3 - hoursSinceLastFed);
                    const hours = Math.floor(remainingTime);
                    const minutes = Math.ceil((remainingTime - hours) * 60);
                    
                    return message.reply(`⏰ Thú cưng vẫn còn no! Hãy quay lại sau **${hours > 0 ? hours + 'h ' : ''}${minutes}p**.`);
                }
            }

            // Kiểm tra số Rin
            if (!(await FastUtils.canAfford(userId, 20))) {
                return message.reply('❌ Cần 20 Rin!');
            }

            // Kiểm tra lại pet và tiền trước khi thực hiện (tránh race condition)
            const freshPet = await getPet(userId);
            if (!freshPet) {
                return message.reply('❌ Không tìm thấy thú cưng! (Phát hiện spam)');
            }

            // Kiểm tra lại cooldown
            if (freshPet.lastFed) {
                const hoursSinceLastFed = (now - new Date(freshPet.lastFed)) / (1000 * 60 * 60);
                if (hoursSinceLastFed < 3) {
                    const remainingTime = Math.ceil(3 - hoursSinceLastFed);
                    const hours = Math.floor(remainingTime);
                    const minutes = Math.ceil((remainingTime - hours) * 60);
                    
                    return message.reply(`⏰ Thú cưng vẫn còn no! (Phát hiện spam - còn **${hours > 0 ? hours + 'h ' : ''}${minutes}p**)`);
                }
            }

            // Trừ tiền và cho ăn
            await FastUtils.updateFastUserRin(userId, -20);
            
            // Random các hiệu ứng khi cho ăn
            const feedingResults = [
                { 
                    message: 'rất thích món ăn này! 😋', 
                    effect: 'normal',
                    healthBonus: false
                },
                { 
                    message: 'ăn ngon lành! 😊', 
                    effect: 'normal',
                    healthBonus: false
                },
                { 
                    message: 'no căng bụng! 🤤', 
                    effect: 'normal',
                    healthBonus: false
                },
                { 
                    message: 'ăn xong còn xin thêm! 😍', 
                    effect: 'happy',
                    healthBonus: false
                },
                { 
                    message: 'cảm thấy khỏe khoắn hơn sau bữa ăn! ✨', 
                    effect: 'healing',
                    healthBonus: true
                }
            ];

            const randomResult = feedingResults[Math.floor(Math.random() * feedingResults.length)];
            
            // Cập nhật thông tin pet (dùng freshPet)
            const updateData = {
                lastFed: now,
                age: freshPet.age + 1 // Tăng tuổi khi cho ăn
            };

            // Nếu có hiệu ứng chữa lành và thú đang ốm
            if (randomResult.healthBonus && freshPet.health === 'Ốm') {
                updateData.health = 'Bình thường';
            }

            await updatePet(userId, updateData);

            // Random khả năng thú cưng ốm (5% chance nếu không ăn đúng giờ)
            let healthWarning = '';
            if (!freshPet.lastFed && Math.random() < 0.05) {
                await updatePet(userId, { health: 'Ốm' });
                healthWarning = '\n⚠️ **Thú cưng có vẻ không khỏe! Hãy chăm sóc cẩn thận.**';
            }

            const embed = new EmbedBuilder()
                .setTitle('🍖 CHO ĂN THÀNH CÔNG!')
                .setDescription(`**${freshPet.petType}** của ${message.author.displayName} ${randomResult.message}\n\n` +
                    `**📊 Thông tin:**\n` +
                    `• Chi phí: 20 Rin\n` +
                    `• Tuổi: ${freshPet.age + 1} (tăng +1)\n` +
                    `• Sức khỏe: ${randomResult.healthBonus && freshPet.health === 'Ốm' ? 'Bình thường (đã hồi phục! ✨)' : freshPet.health}\n` +
                    `• Lần tiếp theo: 3 giờ nữa\n\n` +
                    `**💡 Tip:** Cho ăn đều đặn để thú cưng khỏe mạnh và có cơ hội sinh sản!${healthWarning}`)
                .setThumbnail(PET_IMAGES[freshPet.petType] || null)
                .setColor(randomResult.effect === 'healing' ? '#00FF00' : randomResult.effect === 'happy' ? '#FFD700' : '#66CCFF')
                .setFooter({ text: 'Thú cưng của bạn rất hạnh phúc! 🐾' })
                .setTimestamp();

            // Thêm field đặc biệt nếu có hiệu ứng chữa lành
            if (randomResult.healthBonus && freshPet.health === 'Ốm') {
                embed.addFields({
                    name: '✨ Hiệu ứng đặc biệt!',
                    value: 'Món ăn bổ dưỡng đã giúp thú cưng hồi phục sức khỏe!',
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi thucan:', error);
            await message.reply('❌ Có lỗi xảy ra khi cho thú cưng ăn!');
        }
    }
}; 