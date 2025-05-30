module.exports = {
    name: 'rinpick',
    description: 'Random lựa chọn từ danh sách',
    async execute(message, args) {
        try {
            const choices = args.join(' ').split(',').map(choice => choice.trim()).filter(choice => choice);
            
            if (choices.length < 2) {
                return await message.reply('❌ Cần ít nhất 2 lựa chọn, cách nhau bởi dấu phẩy.');
            }

            const pick = choices[Math.floor(Math.random() * choices.length)];
            await message.reply(`${message.author} tôi chọn: **${pick}**`);
        } catch (error) {
            console.error('Lỗi rinpick:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 