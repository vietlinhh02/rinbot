const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const AntiSpamManager = require('../../utils/antiSpam');

// 5 loại biểu tượng với tỷ lệ thắng khác nhau
const SYMBOLS = {
    breakeven: { icon: '🥉', multiplier: 1.0, weight: 40 }, // x1 - Hoà vốn (nhiều nhất)
    common: { icon: '🍒', multiplier: 2.0, weight: 35 },    // x2 - Nhiều thứ 2  
    uncommon: { icon: '🍋', multiplier: 2.5, weight: 15 }, // x2.5 
    rare: { icon: '🍉', multiplier: 4.0, weight: 8 },      // x4
    epic: { icon: '💎', multiplier: 7.0, weight: 2 }       // x7 - Cực hiếm
};

// Animation symbols để tạo hiệu ứng lăn
const ANIMATION_SYMBOLS = ['🎰', '🎲', '🔄', '💫', '⚡', '🌟'];

module.exports = {
    name: 'slot',
    description: 'Máy slot 3 giống nhau mới thắng! Cú pháp: slot <số tiền>',
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 3 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'slot', 
                2, // 3 giây cooldown
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
        
        if (amount < 10) {
            return message.reply('❌ Cược tối thiểu 10 Rin!');
        }
        
        const userRin = await getUserRin(userId);
        if (userRin < amount) {
            return message.reply('❌ Bạn không đủ Rin để chơi!');
        }

        // Trừ tiền cược trước
        await updateUserRin(userId, -amount);

        // Tạo kết quả slot với weighted random
        const result = this.generateSlotResult();
        
        // Bắt đầu animation
        await this.playSlotAnimation(message, amount, result);
    },

    // Tạo kết quả slot với weighted probability
    generateSlotResult() {
        // Tạo weighted array
        const weightedArray = [];
        Object.entries(SYMBOLS).forEach(([key, data]) => {
            for (let i = 0; i < data.weight; i++) {
                weightedArray.push(key);
            }
        });

        // Random 3 slot - 20% thua / 80% thắng
        let slots = [];
        const houseBias = Math.random() < 0.20; // 20% bias về thua

        if (houseBias) {
            // Tạo 3 slot khác nhau để thua (house edge)
            const usedKeys = new Set();
            for (let i = 0; i < 3; i++) {
                let key;
                do {
                    key = weightedArray[Math.floor(Math.random() * weightedArray.length)];
                } while (usedKeys.has(key) && usedKeys.size < Object.keys(SYMBOLS).length);
                usedKeys.add(key);
                slots.push(key);
            }
        } else {
            // 80% cơ hội có thể thắng (3 giống nhau)
            const winChance = Math.random();
            if (winChance < 0.50) { // 50% trong 80% = 40% tổng thể cho x1 (hoà vốn)
                slots = ['breakeven', 'breakeven', 'breakeven'];
            } else if (winChance < 0.90) { // 40% trong 80% = 32% cho x2 
                slots = ['common', 'common', 'common'];
            } else if (winChance < 0.965) { // 6.5% trong 80% = 5.2% cho x2.5
                slots = ['uncommon', 'uncommon', 'uncommon'];
            } else if (winChance < 0.995) { // 3% trong 80% = 2.4% cho x4
                slots = ['rare', 'rare', 'rare'];
            } else { // 0.5% trong 80% = 0.4% cho x7 (cực hiếm)
                slots = ['epic', 'epic', 'epic'];
            }
        }

        return slots;
    },

    // Animation slot với hiệu ứng scroll down thật
    async playSlotAnimation(message, amount, finalResult) {
        // Tạo scroll sequence cho mỗi slot
        const getAllSymbols = () => Object.values(SYMBOLS).map(s => s.icon);
        const allSymbols = getAllSymbols();
        
        const sentMsg = await message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(`| ❔ | ❔ | ❔ |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                .setColor('#FFD700')
                .setFooter({ text: 'Đang khởi động...' })
        ] });

        // Phase 1: Tất cả scroll nhanh cùng lúc
        for (let frame = 0; frame < 8; frame++) {
            const display = [
                allSymbols[frame % allSymbols.length],
                allSymbols[(frame + 1) % allSymbols.length], 
                allSymbols[(frame + 2) % allSymbols.length]
            ];
            
            await sentMsg.edit({ embeds: [
                new EmbedBuilder()
                    .setTitle('🎰 SLOT MAY MẮN')
                    .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                    .setColor('#FF6B6B')
                    .setFooter({ text: `🎰 Đang quay...` })
            ] });
            await this.sleep(80);
        }

        // Phase 2: Slot 1 dừng, 2&3 tiếp tục scroll
        const slot1Result = SYMBOLS[finalResult[0]].icon;
        for (let frame = 0; frame < 4; frame++) {
            const display = [
                slot1Result, // Slot 1 đã dừng
                allSymbols[(frame + 3) % allSymbols.length],
                allSymbols[(frame + 4) % allSymbols.length]
            ];
            
            await sentMsg.edit({ embeds: [
                new EmbedBuilder()
                    .setTitle('🎰 SLOT MAY MẮN')
                    .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                    .setColor('#FFB347')
                    .setFooter({ text: '🔒 Slot 1 dừng!' })
            ] });
            await this.sleep(60);
        }

        // Phase 3: Slot 2 dừng, chỉ slot 3 scroll
        const slot2Result = SYMBOLS[finalResult[1]].icon;
        for (let frame = 0; frame < 5; frame++) {
            const display = [
                slot1Result, // Slot 1 đã dừng
                slot2Result, // Slot 2 vừa dừng
                allSymbols[(frame + 5) % allSymbols.length]
            ];
            
            await sentMsg.edit({ embeds: [
                new EmbedBuilder()
                    .setTitle('🎰 SLOT MAY MẮN')
                    .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                    .setColor('#FF8C69')
                    .setFooter({ text: '🔒 Slot 2 dừng!' })
            ] });
            await this.sleep(70);
        }

        // Phase 4: Tất cả dừng
        const finalDisplay = [
            SYMBOLS[finalResult[0]].icon,
            SYMBOLS[finalResult[1]].icon,
            SYMBOLS[finalResult[2]].icon
        ];
        
        await sentMsg.edit({ embeds: [
            new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(`| ${finalDisplay.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                .setColor('#DC143C')
                .setFooter({ text: '🔒 Tất cả dừng!' })
        ] });
        await this.sleep(200);
        
        // Tính toán kết quả
        await this.showFinalResult(sentMsg, amount, finalResult, finalDisplay, message.author.id);
    },

    // Hiển thị kết quả cuối cùng
    async showFinalResult(sentMsg, amount, finalResult, display, userId) {
        const isWin = finalResult[0] === finalResult[1] && finalResult[1] === finalResult[2];
        let desc = `| ${display.join(' | ')} |\n\n`;
        desc += `💸 **Đặt cược:** ${amount.toLocaleString()} Rin\n`;
        
        if (isWin) {
            const symbolKey = finalResult[0];
            const multiplier = SYMBOLS[symbolKey].multiplier;
            const winAmount = Math.floor(amount * multiplier);
            const profit = winAmount - amount;
            
            await updateUserRin(userId, winAmount);
            
            let rarity = '';
            let color = '';
            if (multiplier === 7.0) {
                rarity = '🌟 **HUYỀN THOẠI!**';
                color = '#9D4EDD';
            } else if (multiplier === 4.0) {
                rarity = '💜 **HIẾM!**';
                color = '#8B5CF6';
            } else if (multiplier === 2.5) {
                rarity = '💙 **KHÔNG THƯỜNG!**';
                color = '#3B82F6';
            } else if (multiplier === 2.0) {
                rarity = '💚 **THƯỜNG!**';
                color = '#10B981';
            } else if (multiplier === 1.0) {
                rarity = '🥉 **HOÀ VỐN!**';
                color = '#FFA500';
            }
            
            desc += `\n🎉 ${rarity}\n`;
            desc += `💰 **Nhận được:** ${winAmount.toLocaleString()} Rin\n`;
            if (profit > 0) {
                desc += `📈 **Lời:** +${profit.toLocaleString()} Rin\n`;
            } else if (profit === 0) {
                desc += `⚖️ **Hoà vốn:** 0 Rin\n`;
            }
            desc += `🔥 **Hệ số:** x${multiplier}`;
            
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 THẮNG LỚN!')
                .setDescription(desc)
                .setColor(color);
                
            await sentMsg.edit({ embeds: [resultEmbed] });
        } else {
            desc += `\n😢 **KHÔNG TRÚNG!**\n`;
            desc += `💸 **Mất:** ${amount.toLocaleString()} Rin`;
            
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 CHƯA MAY MẮN!')
                .setDescription(desc)
                .setColor('#EF4444');
                
            await sentMsg.edit({ embeds: [resultEmbed] });
        }
    },

    // Helper function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}; 