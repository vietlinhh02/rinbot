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
                3, // 3 giây cooldown
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

        // Random 3 slot - có bias để thua nhiều hơn thắng
        const slots = [];
        const houseBias = Math.random() < 0.5; // 55% bias về thua

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
            // 45% cơ hội có thể thắng (3 giống nhau)
            const winChance = Math.random();
            if (winChance < 0.45) { // 50% trong 45% = 22.5% tổng thể cho x1 (hoà vốn)
                slots = ['breakeven', 'breakeven', 'breakeven'];
            } else if (winChance < 0.90) { // 35% trong 45% = 15.75% cho x2 
                slots = ['common', 'common', 'common'];
            } else if (winChance < 0.95) { // 10% trong 45% = 4.5% cho x2.5
                slots = ['uncommon', 'uncommon', 'uncommon'];
            } else if (winChance < 0.99) { // 4% trong 45% = 1.8% cho x4
                slots = ['rare', 'rare', 'rare'];
            } else { // 1% trong 45% = 0.45% cho x7 (cực hiếm)
                slots = ['epic', 'epic', 'epic'];
            }
        }

        return slots;
    },

    // Animation slot với hiệu ứng trượt xuống
    async playSlotAnimation(message, amount, finalResult) {
        let display = ['❔', '❔', '❔'];
        
        const initialEmbed = new EmbedBuilder()
            .setTitle('🎰 SLOT MAY MẮN')
            .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
            .setColor('#FFD700')
            .setFooter({ text: 'Đang quay...' });
            
        const sentMsg = await message.reply({ embeds: [initialEmbed] });

        // Phase 1: Tất cả slot lăn cùng lúc
        for (let i = 0; i < 8; i++) {
            display[0] = ANIMATION_SYMBOLS[Math.floor(Math.random() * ANIMATION_SYMBOLS.length)];
            display[1] = ANIMATION_SYMBOLS[Math.floor(Math.random() * ANIMATION_SYMBOLS.length)];
            display[2] = ANIMATION_SYMBOLS[Math.floor(Math.random() * ANIMATION_SYMBOLS.length)];
            
            const animEmbed = new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                .setColor('#FF6B6B')
                .setFooter({ text: `🎰 Đang lăn... ${i+1}/8` });
            
            await sentMsg.edit({ embeds: [animEmbed] });
            await this.sleep(120);
        }

        // Phase 2: Slot 1 dừng
        display[0] = SYMBOLS[finalResult[0]].icon;
        for (let i = 0; i < 4; i++) {
            display[1] = ANIMATION_SYMBOLS[Math.floor(Math.random() * ANIMATION_SYMBOLS.length)];
            display[2] = ANIMATION_SYMBOLS[Math.floor(Math.random() * ANIMATION_SYMBOLS.length)];
            
            const animEmbed = new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                .setColor('#FFB347')
                .setFooter({ text: '🔒 Slot 1 dừng!' });
            
            await sentMsg.edit({ embeds: [animEmbed] });
            
        }

        // Phase 3: Slot 2 dừng
        display[1] = SYMBOLS[finalResult[1]].icon;
        for (let i = 0; i < 5; i++) {
            display[2] = ANIMATION_SYMBOLS[Math.floor(Math.random() * ANIMATION_SYMBOLS.length)];
            
            const animEmbed = new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                .setColor('#FF8C69')
                .setFooter({ text: '🔒 Slot 2 dừng!' });
            
            await sentMsg.edit({ embeds: [animEmbed] });
            
        }

        // Phase 4: Slot 3 dừng (gay cấn)
        display[2] = SYMBOLS[finalResult[2]].icon;
        await sentMsg.edit({ embeds: [
            new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(`| ${display.join(' | ')} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                .setColor('#DC143C')
                .setFooter({ text: '🔒 Tất cả dừng!' })
        ] });
        
        
        // Tính toán kết quả
        await this.showFinalResult(sentMsg, amount, finalResult, display, message.author.id);
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