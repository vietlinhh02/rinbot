const FastUtils = require('../../utils/fastUtils');

module.exports = {
    name: 'rincheck',
    description: 'Kiểm tra số Rin hiện có',
    async execute(message, args) {
        try {
            const rin = await FastUtils.getFastUserRin(message.author.id);
            await message.reply(`${message.author} có **${FastUtils.fastFormat(rin)} Rin**.`);
        } catch (error) {
            console.error('Lỗi rincheck:', error);
            await message.reply('❌ Lỗi!');
        }
    }
}; 