const lottery = require('./lottery');

module.exports = {
    name: 'lotteryinfo',
    description: 'Xem thông tin vé số miền Bắc gần nhất của bạn',
    async execute(message, args) {
        await lottery.lotteryinfo(message);
    }
}; 