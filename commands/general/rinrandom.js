module.exports = {
    name: 'rinrandom',
    description: 'Random số trong khoảng',
    async execute(message, args) {
        try {
            const min = parseInt(args[0]);
            const max = parseInt(args[1]);

            if (!min || !max) {
                return await message.reply('❗ Bạn cần nhập 2 số nguyên, ví dụ: `,rinrandom 1 100`');
            }

            if (min > max) {
                return await message.reply('⚠️ Số nhỏ phải bé hơn hoặc bằng số lớn!');
            }

            const number = Math.floor(Math.random() * (max - min + 1)) + min;
            await message.reply(`${message.author} số bạn random ra là: **${number}**`);
        } catch (error) {
            console.error('Lỗi rinrandom:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 