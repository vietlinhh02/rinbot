const lottery = require('./lottery');

module.exports = {
    name: 'lotterycheck',
    description: 'Xem danh sách người đã mua vé số miền Bắc hôm nay',
    async execute(message, args) {
        await lottery.lotterycheck(message);
    }
}; 