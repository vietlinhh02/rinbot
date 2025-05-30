const { getUserRin, updateUserRin } = require('../../utils/database');

module.exports = {
    name: 'grin',
    description: 'Gửi Rin cho người khác',
    async execute(message, args) {
        try {
            const member = message.mentions.members.first();
            const amount = parseInt(args[1]);

            if (!member) {
                return await message.reply('❌ Bạn cần mention người nhận!');
            }

            if (!amount || amount <= 0) {
                return await message.reply('❌ Số Rin phải lớn hơn 0!');
            }

            const senderRin = await getUserRin(message.author.id);
            if (senderRin < amount) {
                return await message.reply('❌ Bạn không đủ Rin!');
            }

            await updateUserRin(message.author.id, -amount);
            await updateUserRin(member.id, amount);

            await message.reply(`💸 ${message.author} đã gửi **${amount} Rin** cho ${member}!`);
        } catch (error) {
            console.error('Lỗi grin:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 