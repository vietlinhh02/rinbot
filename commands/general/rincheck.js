const { getUserRin } = require('../../utils/database');

module.exports = {
    name: 'rincheck',
    description: 'Kiểm tra số Rin hiện có',
    async execute(message, args) {
        try {
            const rin = await getUserRin(message.author.id);
            await message.reply(`${message.author} bạn đang có **${rin.toLocaleString()} Rin**.`);
        } catch (error) {
            console.error('Lỗi rincheck:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 