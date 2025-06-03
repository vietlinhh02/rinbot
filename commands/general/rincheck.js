const { EmbedBuilder } = require('discord.js');
const { getUserRin } = require('../../utils/database');
const { autoDeleteMessage, DELETE_DELAYS } = require('../../utils/messageUtils');

module.exports = {
    name: 'rincheck',
    description: 'Kiểm tra số Rin hiện tại',
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const currentRin = await getUserRin(userId);
            
            const embed = new EmbedBuilder()
                .setTitle('💰 SỐ DƯ RIN')
                .setDescription(`**${message.author.displayName}** hiện có: **${currentRin.toLocaleString()} Rin** 💎`)
                .setColor('#FFD700')
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ text: `Tin nhắn này sẽ tự động ẩn sau ${DELETE_DELAYS.INFO/1000} giây` })
                .setTimestamp();

            const replyMessage = await message.reply({ embeds: [embed] });
            
            // Tự động xóa sau 30 giây để tránh spam
            autoDeleteMessage(replyMessage, DELETE_DELAYS.INFO, 'Rin check cleanup');

        } catch (error) {
            console.error('Lỗi rincheck:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi')
                .setDescription('Không thể kiểm tra số Rin. Vui lòng thử lại!')
                .setColor('#FF0000')
                .setFooter({ text: `Tin nhắn này sẽ tự động ẩn sau ${DELETE_DELAYS.ERROR/1000} giây` });

            const errorMessage = await message.reply({ embeds: [errorEmbed] });
            autoDeleteMessage(errorMessage, DELETE_DELAYS.ERROR, 'Rin check error cleanup');
        }
    }
}; 