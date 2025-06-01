const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const AntiSpamManager = require('../../utils/antiSpam');

const SYMBOLS = ['🍒', '🍋', '🍉', '🍇', '🔔', '⭐'];

module.exports = {
    name: 'slot',
    description: 'Máy slot may mắn, cược Rin. Cú pháp: slot <số tiền>',
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 2 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'slot', 
                2, // 2 giây cooldown
                this.executeSlot,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },

    async executeSlot(message, args) {
        const userId = message.author.id;
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Số Rin phải là số dương!');
        }
        
        const userRin = await getUserRin(userId);
        if (userRin < amount) {
            return message.reply('❌ Bạn không đủ Rin để chơi!');
        }

        // Trừ tiền cược trước khi bắt đầu game (tránh double spend)
        await updateUserRin(userId, -amount);

        // Chuẩn bị kết quả slot
        let slots = ['❔', '❔', '❔'];
        let jackpot = false, twoMatch = false;
        
        // Xác suất 3 giống nhau: 10%
        if (Math.random() < 0.10) {
            const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            slots = [symbol, symbol, symbol];
            jackpot = true;
        } else if (Math.random() < 0.35) { // Xác suất 2 giống nhau: 35%
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
            .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đã cược:** ${amount} Rin`)
            .setColor('#AAAAAA');
        const sentMsg = await message.reply({ embeds: [animEmbed] });
        
        // Lật từng slot
        setTimeout(async () => {
            display[0] = slots[0];
            await sentMsg.edit({ embeds: [
                new EmbedBuilder()
                    .setTitle('🎰 ĐANG QUAY SLOT...')
                    .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đã cược:** ${amount} Rin`)
                    .setColor('#AAAAAA')
            ] });
        }, 500);
        
        setTimeout(async () => {
            display[1] = slots[1];
            await sentMsg.edit({ embeds: [
                new EmbedBuilder()
                    .setTitle('🎰 ĐANG QUAY SLOT...')
                    .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đã cược:** ${amount} Rin`)
                    .setColor('#AAAAAA')
            ] });
        }, 1000);
        
        setTimeout(async () => {
            display[2] = slots[2];
            
            // Tính kết quả - đã trừ tiền cược rồi, chỉ cần cộng tiền thắng
            let winAmount = 0;
            let desc = `| ${display.join(' | ')} |\n\n`;
            
            if (jackpot) {
                winAmount = amount * 5; // Thắng gấp 5 (lời gấp 4)
                desc += `🎉 **JACKPOT!** Trúng 3 biểu tượng!\n💰 **Thắng:** ${winAmount} Rin (lời ${winAmount - amount} Rin)`;
                await updateUserRin(userId, winAmount);
            } else if (twoMatch) {
                winAmount = amount * 2; // Thắng gấp 2 (lời bằng vốn)
                desc += `✨ **Trúng 2 biểu tượng!**\n💰 **Thắng:** ${winAmount} Rin (lời ${winAmount - amount} Rin)`;
                await updateUserRin(userId, winAmount);
            } else {
                desc += `😢 **Không trúng!**\n💸 **Mất:** ${amount} Rin`;
                // Không cộng gì vì đã trừ tiền cược rồi
            }
            
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(desc)
                .setColor(winAmount > 0 ? '#FFD700' : '#FF0000')
                .setFooter({ text: `Tỷ lệ: Jackpot 10% | 2 giống 35% | Thua 55%` });
                
            await sentMsg.edit({ embeds: [resultEmbed] });
        }, 1500);
    }
}; 