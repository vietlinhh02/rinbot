const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');

const SYMBOLS = ['🍒', '🍋', '🍉', '🍇', '🔔', '⭐'];

module.exports = {
    name: 'slot',
    description: 'Máy slot may mắn, cược Rin. Cú pháp: slot <số tiền>',
    async execute(message, args) {
        const userId = message.author.id;
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Số Rin phải là số dương!');
        }
        const userRin = await getUserRin(userId);
        if (userRin < amount) {
            return message.reply('❌ Bạn không đủ Rin để chơi!');
        }
        // Chuẩn bị kết quả slot
        let slots = ['❔', '❔', '❔'];
        let jackpot = false, twoMatch = false;
        // Xác suất 3 giống nhau: 15%
        if (Math.random() < 0.20) {
            const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            slots = [symbol, symbol, symbol];
            jackpot = true;
        } else if (Math.random() < 0.45) { // Xác suất 2 giống nhau: 35%
            const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const other = SYMBOLS.filter(s => s !== symbol)[Math.floor(Math.random() * (SYMBOLS.length-1))];
            // Random vị trí 2 giống nhau
            const idx = Math.floor(Math.random() * 3);
            if (idx === 0) slots = [symbol, symbol, other];
            else if (idx === 1) slots = [symbol, other, symbol];
            else slots = [other, symbol, symbol];
            twoMatch = true;
        } else {
            // 3 biểu tượng khác nhau
            let arr = SYMBOLS.slice();
            for (let i = 0; i < 3; i++) {
                const pick = arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
                slots[i] = pick;
            }
        }
        // Gửi hiệu ứng quay slot lần lượt
        let display = ['❔', '❔', '❔'];
        const animEmbed = new EmbedBuilder()
            .setTitle('🎰 ĐANG QUAY SLOT...')
            .setDescription(`| ${display.join(' | ')} |`)
            .setColor('#AAAAAA');
        const sentMsg = await message.reply({ embeds: [animEmbed] });
        // Lật từng slot
        setTimeout(async () => {
            display[0] = slots[0];
            await sentMsg.edit({ embeds: [
                new EmbedBuilder()
                    .setTitle('🎰 ĐANG QUAY SLOT...')
                    .setDescription(`| ${display.join(' | ')} |`)
                    .setColor('#AAAAAA')
            ] });
        }, 500);
        setTimeout(async () => {
            display[1] = slots[1];
            await sentMsg.edit({ embeds: [
                new EmbedBuilder()
                    .setTitle('🎰 ĐANG QUAY SLOT...')
                    .setDescription(`| ${display.join(' | ')} |`)
                    .setColor('#AAAAAA')
            ] });
        }, 1000);
        setTimeout(async () => {
            display[2] = slots[2];
            // Tính kết quả
            let reward = 0;
            let desc = `| ${display.join(' | ')} |\n`;
            if (jackpot) {
                reward = amount * 5;
                desc += `🎉 **JACKPOT!** Trúng 3 biểu tượng, nhận ${reward} Rin!`;
            } else if (twoMatch) {
                reward = amount * 2;
                desc += `✨ Trúng 2 biểu tượng, nhận ${reward} Rin!`;
            } else {
                reward = 0;
                desc += `😢 Không trúng, mất ${amount} Rin!`;
            }
            if (reward > 0) {
                await updateUserRin(userId, reward);
            } else {
                await updateUserRin(userId, -amount);
            }
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(desc)
                .setColor(reward > 0 ? '#FFD700' : '#FF0000');
            await sentMsg.edit({ embeds: [resultEmbed] });
        }, 1500);
    }
}; 