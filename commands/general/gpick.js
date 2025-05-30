const giveawayHandler = require('./giveaway');

module.exports = {
    name: 'gpick',
    description: 'Chỉ định người thắng giveaway (Admin only)',
    async execute(message, args) {
        await giveawayHandler.executePickWinner(message, args);
    }
}; 