const FastUtils = require('../../utils/fastUtils');

module.exports = {
    name: 'grin',
    description: 'Gửi Rin cho người khác',
    async execute(message, args) {
        try {
            const member = message.mentions.members.first();
            const amount = parseInt(args[1]);

            if (!member) {
                return await message.reply('❌ Mention người nhận!');
            }

            if (!amount || amount <= 0) {
                return await message.reply('❌ Số dương!');
            }

            if (!(await FastUtils.canAfford(message.author.id, amount))) {
                return await message.reply('❌ Không đủ Rin!');
            }

            await FastUtils.updateFastUserRin(message.author.id, -amount);
            await FastUtils.updateFastUserRin(member.id, amount);

            await message.reply(`💸 ${message.author} gửi **${FastUtils.fastFormat(amount)} Rin** cho ${member}!`);
        } catch (error) {
            console.error('Lỗi grin:', error);
            await message.reply('❌ Lỗi!');
        }
    }
}; 