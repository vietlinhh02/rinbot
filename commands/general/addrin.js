const { EmbedBuilder } = require('discord.js');
const { updateUserRin } = require('../../utils/database');
const config = require('../../config/config');

module.exports = {
    name: 'addrin',
    description: 'Chỉ owner dùng: Cộng Rin cho user bất kỳ. Cú pháp: addrin <@user|userId> <số tiền>',
    async execute(message, args) {
        // Chỉ cho owner dùng - hỗ trợ nhiều owner
        if (!config.isOwner(message.author.id)) {
            return message.reply('⛔ Lệnh này chỉ dành cho owner bot!');
        }
        if (args.length < 2) {
            return message.reply('❌ Cú pháp: addrin <@user|userId> <số tiền>');
        }
        // Lấy userId
        let userId = args[0].replace(/<@!?|>/g, '');
        if (!/^[0-9]+$/.test(userId)) {
            return message.reply('❌ User không hợp lệ!');
        }
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount === 0) {
            return message.reply('❌ Số Rin phải là số khác 0!');
        }
        await updateUserRin(userId, amount);
        const embed = new EmbedBuilder()
            .setTitle('💸 ĐÃ CỘNG RIN')
            .setDescription(`Đã cộng **${amount} Rin** cho <@${userId}>!`)
            .setColor('#FFD700');
        await message.reply({ embeds: [embed] });
    }
}; 