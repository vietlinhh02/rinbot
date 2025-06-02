const { EmbedBuilder } = require('discord.js');
const FastUtils = require('../../utils/fastUtils');
const AntiSpamManager = require('../../utils/antiSpam');

const SYMBOLS = {
    breakeven: { icon: '🥉', multiplier: 1.0, weight: 40 },
    common: { icon: '🍒', multiplier: 2.0, weight: 35 },
    uncommon: { icon: '🍋', multiplier: 2.5, weight: 15 },
    rare: { icon: '🍉', multiplier: 4.0, weight: 8 },
    epic: { icon: '💎', multiplier: 7.0, weight: 2 }
};

const ANIMATION_SYMBOLS = ['🎰', '🎲', '🔄', '💫', '⚡', '🌟', '🍀', '💰'];

// Cache lưu thông tin slot plays của user
const userSlotCache = new Map();

module.exports = {
    name: 'slot',
    description: 'Máy slot 3 giống nhau mới thắng! Cú pháp: slot <số tiền>',
    async execute(message, args) {
        const userId = message.author.id;
        try {
            await AntiSpamManager.executeWithProtection(
                userId,
                'slot',
                1,
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
            return message.reply('❌ Số Rin cược phải là một số dương!');
        }
        if (amount < 10) {
            return message.reply('❌ Cược tối thiểu 10 Rin!');
        }
        if (!(await FastUtils.canAfford(userId, amount))) {
            return message.reply('❌ Không đủ Rin!');
        }

        // Trừ tiền cược
        await FastUtils.updateFastUserRin(userId, -amount);

        // Lấy thông tin slot plays từ cache
        let userData = userSlotCache.get(userId) || { slot_plays: 0, last_slot_play: null };
        let { slot_plays, last_slot_play } = userData;

        // Kiểm tra thời gian nghỉ (reset sau 24h)
        const now = Date.now();
        const resetThreshold = 24 * 60 * 60 * 1000; // 24 giờ
        if (!last_slot_play || now - last_slot_play > resetThreshold) {
            slot_plays = 0; // Reset số lần quay nếu nghỉ quá 24h
        }
        
        slot_plays += 1;
        
        // Cập nhật cache
        userSlotCache.set(userId, {
            slot_plays,
            last_slot_play: now
        });

        // Tính xác suất nhà cái thắng dựa trên số lần chơi
        let houseWinChance = 0.5;
        if (slot_plays <= 3) houseWinChance = 0.2;         // 5 lần đầu: 40% thua
        else if (slot_plays <= 10) houseWinChance = 0.4;   // 6-10: 50% thua  
        else if (slot_plays <= 20) houseWinChance = 0.55;  // 11-20: 55% thua
        else if (slot_plays <= 50) houseWinChance = 0.6;   // 21-50: 60% thua
        else houseWinChance = 0.7;                         // 50+: 70% thua

        console.log(`🎰 User ${message.author.displayName} - Lần chơi: ${slot_plays}, Tỷ lệ thua: ${houseWinChance * 100}%`);

        // Tạo kết quả với xác suất động
        const resultKeys = this.generateSlotResult(houseWinChance);
        await this.playSlotAnimation(message, amount, resultKeys);
    },
    generateSlotResult(houseWinChance) {
        const winningOutcomeArray = [];
        Object.entries(SYMBOLS).forEach(([key, data]) => {
            for (let i = 0; i < data.weight; i++) {
                winningOutcomeArray.push(key);
            }
        });

        let slotResultKeys = [];
        const houseAdvantageWins = Math.random() < houseWinChance;

        if (houseAdvantageWins) {
            const symbolKeysAvailable = Object.keys(SYMBOLS);
            if (symbolKeysAvailable.length < 3) {
                for (let i = 0; i < 3; i++) {
                    slotResultKeys.push(symbolKeysAvailable[Math.floor(Math.random() * symbolKeysAvailable.length)]);
                }
                if (slotResultKeys[0] === slotResultKeys[1] && slotResultKeys[1] === slotResultKeys[2] && symbolKeysAvailable.length > 1) {
                    let originalSymbolKey = slotResultKeys[0];
                    let newSymbolKey;
                    do {
                        newSymbolKey = symbolKeysAvailable[Math.floor(Math.random() * symbolKeysAvailable.length)];
                    } while (newSymbolKey === originalSymbolKey);
                    slotResultKeys[Math.floor(Math.random() * 3)] = newSymbolKey;
                }
            } else {
                let availableKeysCopy = [...symbolKeysAvailable];
                for (let i = 0; i < 3; i++) {
                    const randomIndex = Math.floor(Math.random() * availableKeysCopy.length);
                    const selectedKey = availableKeysCopy.splice(randomIndex, 1)[0];
                    slotResultKeys.push(selectedKey);
                }
            }
        } else {
            const winningSymbolKey = winningOutcomeArray[Math.floor(Math.random() * winningOutcomeArray.length)];
            slotResultKeys = [winningSymbolKey, winningSymbolKey, winningSymbolKey];
        }
        return slotResultKeys;
    },
    async playSlotAnimation(message, amount, finalResultKeys) {
        const finalSymbols = [
            SYMBOLS[finalResultKeys[0]].icon,
            SYMBOLS[finalResultKeys[1]].icon,
            SYMBOLS[finalResultKeys[2]].icon
        ];
        const animationFrames = this.createSimpleAnimation(finalSymbols);
        await this.showAnimationFrame(message, amount, finalResultKeys, animationFrames, 0);
    },
    createSimpleAnimation(finalSymbols) {
        const symbols = Object.values(SYMBOLS).map(s => s.icon);
        const extraSymbols = ['🎰', '🎲', '🔄', '💫', '⚡', '🌟', '🍀', '💰'];
        const allSymbols = [...symbols, ...extraSymbols];
        const frames = [];

        for (let i = 0; i < 20; i++) {
            const frame = [];
            for (let j = 0; j < 3; j++) {
                if (i < 16) {
                    frame.push(allSymbols[Math.floor(Math.random() * allSymbols.length)]);
                } else if (i < 18) {
                    if (Math.random() < 0.5) {
                        frame.push(finalSymbols[j]);
                    } else {
                        frame.push(symbols[Math.floor(Math.random() * symbols.length)]);
                    }
                } else {
                    frame.push(finalSymbols[j]);
                }
            }
            frames.push(frame);
        }
        frames.push(finalSymbols);
        return frames;
    },
    async showAnimationFrame(message, amount, finalResultKeys, animationFrames, frameIndex) {
        const frame = animationFrames[frameIndex];
        const isLastFrame = frameIndex === animationFrames.length - 1;
        const embed = new EmbedBuilder()
            .setTitle('🎰 SLOT MAY MẮN')
            .setDescription(`| ${frame[0]} | ${frame[1]} | ${frame[2]} |\n💸 **Cược:** ${FastUtils.fastFormat(amount)} Rin\n` + `${isLastFrame ? '' : '🔄 Đang quay...'}`)
            .setColor(isLastFrame ? '#DC143C' : '#FFD700')
            .setFooter({ text: isLastFrame ? '⭐ Kết quả!' : `Đang quay... ${frameIndex + 1}/${animationFrames.length}` });

        let sentMsg;
        if (frameIndex === 0) {
            sentMsg = await message.reply({ embeds: [embed] });
        } else {
            sentMsg = message.sentMsg;
            await sentMsg.edit({ embeds: [embed] });
        }

        if (frameIndex === 0) message.sentMsg = sentMsg;

        if (!isLastFrame) {
            let delay;
            if (frameIndex < 8) delay = 80;
            else if (frameIndex < 12) delay = 100;
            else if (frameIndex < 16) delay = 150;
            else if (frameIndex < 19) delay = 250;
            else delay = 400;

            setTimeout(() => {
                this.showAnimationFrame(message, amount, finalResultKeys, animationFrames, frameIndex + 1);
            }, delay);
        } else {
            setTimeout(async () => {
                const finalIconsArray = [
                    SYMBOLS[finalResultKeys[0]].icon,
                    SYMBOLS[finalResultKeys[1]].icon,
                    SYMBOLS[finalResultKeys[2]].icon
                ];
                await this.showFinalResult(sentMsg, amount, finalResultKeys, finalIconsArray, message.author.id);
            }, 800);
        }
    },
    async showFinalResult(sentMsg, amount, finalResultKeys, displayedIcons, userId) {
        const isWin = finalResultKeys[0] === finalResultKeys[1] && finalResultKeys[1] === finalResultKeys[2];
        let description = `| ${displayedIcons.join(' | ')} |\n`;
        description += `💸 **Cược:** ${FastUtils.fastFormat(amount)} Rin\n`;

        if (isWin) {
            const symbolKey = finalResultKeys[0];
            const symbolData = SYMBOLS[symbolKey];
            const multiplier = symbolData.multiplier;
            const winAmount = Math.floor(amount * multiplier);
            const profit = winAmount - amount;

            if (winAmount > 0) {
                await FastUtils.updateFastUserRin(userId, winAmount);
            }

            let rarityText = '';
            let embedColor = '#F59E0B';
            if (multiplier === 7.0) { rarityText = '🌟 **SIÊU CẤP HUYỀN THOẠI!**'; embedColor = '#9D4EDD'; }
            else if (multiplier === 4.0) { rarityText = '💜 **HUYỀN THOẠI!**'; embedColor = '#8B5CF6'; }
            else if (multiplier === 2.5) { rarityText = '💙 **SIÊU HIẾM!**'; embedColor = '#3B82F6'; }
            else if (multiplier === 2.0) { rarityText = '💚 **HIẾM!**'; embedColor = '#10B981'; }
            else if (multiplier === 1.0) { rarityText = '🥉 **HOÀ VỐN!**'; embedColor = '#F59E0B'; }

            description += `\n🎉 ${rarityText}\n`;
            description += `💰 **Nhận:** ${FastUtils.fastFormat(winAmount)} Rin\n`;
            if (profit > 0) {
                description += `📈 **Lời:** +${FastUtils.fastFormat(profit)} Rin\n`;
            } else if (profit === 0) {
                description += `⚖️ **Hoà vốn**\n`;
            }
            description += `🔥 **x${multiplier.toFixed(1)}**`;

            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 THẮNG!')
                .setDescription(description)
                .setColor(embedColor);
            await sentMsg.edit({ embeds: [resultEmbed] });
        } else {
            description += `\n😢 **THUA!**\n`;
            description += `💸 **Mất:** ${FastUtils.fastFormat(amount)} Rin`;
            await sentMsg.edit({ embeds: [new EmbedBuilder()
                .setTitle('🎰 THUA!')
                .setDescription(description)
                .setColor('#EF4444')] });
        }
    },
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};