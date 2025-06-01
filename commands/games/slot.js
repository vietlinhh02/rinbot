const { EmbedBuilder } = require('discord.js');
// Đảm bảo rằng các file này tồn tại ở đúng đường dẫn và export các hàm cần thiết
const { getUserRin, updateUserRin } = require('../../utils/database'); // getUserRin(userId) -> Promise<number>, updateUserRin(userId, amount) -> Promise<void>
const AntiSpamManager = require('../../utils/antiSpam'); // AntiSpamManager.executeWithProtection(userId, commandName, cooldownMs, functionToExecute, context, ...args)

// 5 loại biểu tượng với tỷ lệ thắng khác nhau
const SYMBOLS = {
    breakeven: { icon: '🥉', multiplier: 1.0, weight: 40 }, // x1 - Hoà vốn (nhiều nhất)
    common: { icon: '🍒', multiplier: 2.0, weight: 35 },    // x2 - Nhiều thứ 2
    uncommon: { icon: '🍋', multiplier: 2.5, weight: 15 }, // x2.5
    rare: { icon: '🍉', multiplier: 4.0, weight: 8 },      // x4
    epic: { icon: '💎', multiplier: 7.0, weight: 2 }       // x7 - Cực hiếm
};

// Animation symbols để tạo hiệu ứng lăn
const ANIMATION_SYMBOLS = ['🎰', '🎲', '🔄', '💫', '⚡', '🌟', '🍀', '💰']; // Thêm vài icon cho đa dạng

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
                3, // Cooldown 3 giây (3000ms). Nếu AntiSpamManager của bạn dùng đơn vị giây, hãy đổi thành 3.
                this.executeSlot, // Hàm sẽ được thực thi nếu không bị cooldown
                this, // Ngữ cảnh (this) cho hàm executeSlot
                message, // Các tham số tiếp theo sẽ được truyền vào executeSlot
                args
            );
        } catch (error) {
            // AntiSpamManager sẽ throw error nếu người dùng đang trong thời gian cooldown
            // hoặc nếu có lỗi khác từ executeWithProtection
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

        const userRin = await getUserRin(userId);
        if (userRin < amount) {
            return message.reply('❌ Bạn không đủ Rin để chơi!');
        }

        // Trừ tiền cược trước khi quay
        await updateUserRin(userId, -amount);

        // Tạo kết quả slot (mảng các key của SYMBOLS)
        const resultKeys = this.generateSlotResult();

        // Bắt đầu animation và hiển thị kết quả
        await this.playSlotAnimation(message, amount, resultKeys);
    },

    generateSlotResult() {
        // Tạo mảng weighted để chọn LOẠI chiến thắng (nếu người chơi thắng)
        const winningOutcomeArray = [];
        Object.entries(SYMBOLS).forEach(([key, data]) => {
            for (let i = 0; i < data.weight; i++) {
                winningOutcomeArray.push(key);
            }
        });

        let slotResultKeys = []; 
        const houseAdvantageWins = Math.random() < 0.40; 

        if (houseAdvantageWins) {
            // NHÀ CÁI THẮNG (NGƯỜI CHƠI THUA): Tạo 3 slot khác nhau
            const symbolKeysAvailable = Object.keys(SYMBOLS);
            if (symbolKeysAvailable.length < 3) {
                // Trường hợp hiếm: có ít hơn 3 loại biểu tượng được định nghĩa
                // Tạo ngẫu nhiên, có khả năng vẫn ra 3 cái giống nhau (nếu chỉ có 1-2 loại symbol)
                for (let i = 0; i < 3; i++) {
                    slotResultKeys.push(symbolKeysAvailable[Math.floor(Math.random() * symbolKeysAvailable.length)]);
                }
                // Nếu vô tình vẫn thắng và có thể thay đổi, đổi 1 slot cho khác đi để đảm bảo thua
                if (slotResultKeys.length === 3 && slotResultKeys[0] === slotResultKeys[1] && slotResultKeys[1] === slotResultKeys[2] && symbolKeysAvailable.length > 1) {
                    let originalSymbolKey = slotResultKeys[0];
                    let newSymbolKey;
                    do {
                        newSymbolKey = symbolKeysAvailable[Math.floor(Math.random() * symbolKeysAvailable.length)];
                    } while (newSymbolKey === originalSymbolKey);
                    slotResultKeys[Math.floor(Math.random() * 3)] = newSymbolKey; // Thay đổi ngẫu nhiên 1 trong 3 slot
                }
            } else {
                // Đủ biểu tượng để chọn 3 cái khác nhau
                let availableKeysCopy = [...symbolKeysAvailable];
                for (let i = 0; i < 3; i++) {
                    const randomIndex = Math.floor(Math.random() * availableKeysCopy.length);
                    const selectedKey = availableKeysCopy.splice(randomIndex, 1)[0];
                    slotResultKeys.push(selectedKey);
                }
            }
        } else {
            // NGƯỜI CHƠI CÓ CƠ HỘI THẮNG (80%): Tạo 3 slot giống nhau
            // Loại thắng được xác định bởi winningOutcomeArray (dựa trên SYMBOLS.weight)
            const winningSymbolKey = winningOutcomeArray[Math.floor(Math.random() * winningOutcomeArray.length)];
            slotResultKeys = [winningSymbolKey, winningSymbolKey, winningSymbolKey];
        }
        return slotResultKeys;
    },

    async playSlotAnimation(message, amount, finalResultKeys) {
        const animationIcons = [...ANIMATION_SYMBOLS];
        const finalDisplayedIcons = {
            slot1: SYMBOLS[finalResultKeys[0]].icon,
            slot2: SYMBOLS[finalResultKeys[1]].icon,
            slot3: SYMBOLS[finalResultKeys[2]].icon,
        };

        const initialEmbed = new EmbedBuilder()
            .setTitle('🎰 SLOT MAY MẮN')
            .setDescription(`| ❔ | ❔ | ❔ |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
            .setColor('#FFD700') // Gold
            .setFooter({ text: 'Đang khởi động...' });
        const sentMsg = await message.reply({ embeds: [initialEmbed] });

        const updateDelay = 300; // Thời gian chờ giữa các frame (ms), tăng nếu animation giật
        const initialSpinFrames = 5; // Số frame cho lần quay đầu
        const secondSpinFrames = 4;  // Số frame cho lần quay thứ hai
        const thirdSpinFrames = 3;   // Số frame cho lần quay cuối

        // Hàm trợ giúp tạo Embed cho animation
        const createSpinEmbed = (s1, s2, s3, footerText, color) => {
            return new EmbedBuilder()
                .setTitle('🎰 SLOT MAY MẮN')
                .setDescription(`| ${s1} | ${s2} | ${s3} |\n\n💸 **Đặt cược:** ${amount.toLocaleString()} Rin`)
                .setColor(color)
                .setFooter({ text: footerText });
        };

        // Phase 1: Tất cả 3 slot cùng quay
        for (let frame = 0; frame < initialSpinFrames; frame++) {
            const iconsToDisplay = [
                animationIcons[(frame + Math.floor(Math.random() * animationIcons.length)) % animationIcons.length],
                animationIcons[(frame + 1 + Math.floor(Math.random() * animationIcons.length)) % animationIcons.length],
                animationIcons[(frame + 2 + Math.floor(Math.random() * animationIcons.length)) % animationIcons.length]
            ];
            await sentMsg.edit({ embeds: [createSpinEmbed(iconsToDisplay[0], iconsToDisplay[1], iconsToDisplay[2], '🎰 Đang quay...', '#FF6B6B')] }); // Light Red
            await this.sleep(updateDelay);
        }

        // Phase 2: Slot 1 dừng, slot 2 & 3 tiếp tục quay
        for (let frame = 0; frame < secondSpinFrames; frame++) {
            const iconsToDisplay = [
                finalDisplayedIcons.slot1, // Slot 1 dừng
                animationIcons[(frame + initialSpinFrames + Math.floor(Math.random() * animationIcons.length)) % animationIcons.length],
                animationIcons[(frame + initialSpinFrames + 1 + Math.floor(Math.random() * animationIcons.length)) % animationIcons.length]
            ];
            await sentMsg.edit({ embeds: [createSpinEmbed(iconsToDisplay[0], iconsToDisplay[1], iconsToDisplay[2], '🔒 Slot 1 dừng!', '#FFB347')] }); // Orange
            await this.sleep(updateDelay + 50); // Chậm hơn một chút
        }

        // Phase 3: Slot 1 & 2 dừng, slot 3 tiếp tục quay
        for (let frame = 0; frame < thirdSpinFrames; frame++) {
            const iconsToDisplay = [
                finalDisplayedIcons.slot1, // Slot 1 dừng
                finalDisplayedIcons.slot2, // Slot 2 dừng
                animationIcons[(frame + initialSpinFrames + secondSpinFrames + Math.floor(Math.random() * animationIcons.length)) % animationIcons.length]
            ];
            await sentMsg.edit({ embeds: [createSpinEmbed(iconsToDisplay[0], iconsToDisplay[1], iconsToDisplay[2], '🔒 Slot 2 dừng!', '#FF8C69')] }); // Salmon
            await this.sleep(updateDelay + 100); // Chậm hơn nữa
        }

        // Phase 4: Tất cả dừng, hiển thị kết quả cuối cùng trước khi thông báo thắng/thua
        const finalIconsArray = [finalDisplayedIcons.slot1, finalDisplayedIcons.slot2, finalDisplayedIcons.slot3];
        await sentMsg.edit({ embeds: [createSpinEmbed(finalIconsArray[0], finalIconsArray[1], finalIconsArray[2], '🔒 Tất cả dừng!', '#DC143C')] }); // Crimson
        await this.sleep(700); // Chờ một chút để người dùng thấy kết quả cuối

        // Tính toán và hiển thị kết quả thắng/thua
        await this.showFinalResult(sentMsg, amount, finalResultKeys, finalIconsArray, message.author.id);
    },

    async showFinalResult(sentMsg, amount, finalResultKeys, displayedIcons, userId) {
        const isWin = finalResultKeys[0] === finalResultKeys[1] && finalResultKeys[1] === finalResultKeys[2];
        let description = `| ${displayedIcons.join(' | ')} |\n\n`;
        description += `💸 **Đặt cược:** ${amount.toLocaleString()} Rin\n`;

        if (isWin) {
            const symbolKey = finalResultKeys[0]; // Nếu thắng, cả 3 key giống nhau
            const symbolData = SYMBOLS[symbolKey];
            const multiplier = symbolData.multiplier;
            const winAmount = Math.floor(amount * multiplier); // Số tiền thắng (bao gồm cả cược gốc nếu multiplier >= 1)
            const profit = winAmount - amount; // Lợi nhuận ròng

            // Tiền cược đã bị trừ (-amount). Giờ cộng lại số tiền thắng (winAmount).
            // Ví dụ: cược 10, userRin -= 10. Thắng x2 (20), userRin += 20. Tổng cộng userRin += 10.
            // Hoà vốn x1 (10), userRin += 10. Tổng cộng userRin không đổi.
            if (winAmount > 0) { // Chỉ cập nhật nếu có tiền thắng (đề phòng multiplier 0)
                await updateUserRin(userId, winAmount);
            }

            let rarityText = '';
            let embedColor = '#F59E0B'; // Màu mặc định cho hoà vốn

            if (multiplier === 7.0) { rarityText = '🌟 **SIÊU CẤP HUYỀN THOẠI!**'; embedColor = '#9D4EDD'; } // Epic Purple
            else if (multiplier === 4.0) { rarityText = '💜 **HUYỀN THOẠI!**'; embedColor = '#8B5CF6'; }      // Rare Indigo
            else if (multiplier === 2.5) { rarityText = '💙 **SIÊU HIẾM!**'; embedColor = '#3B82F6'; }    // Uncommon Blue
            else if (multiplier === 2.0) { rarityText = '💚 **HIẾM!**'; embedColor = '#10B981'; }       // Common Green
            else if (multiplier === 1.0) { rarityText = '🥉 **HOÀ VỐN!**'; embedColor = '#F59E0B'; }      // Breakeven Amber

            description += `\n🎉 ${rarityText}\n`;
            description += `💰 **Nhận được:** ${winAmount.toLocaleString()} Rin\n`;
            if (profit > 0) {
                description += `📈 **Lời:** +${profit.toLocaleString()} Rin\n`;
            } else if (profit === 0 && multiplier === 1.0) {
                description += `⚖️ **Hoà vốn:** 0 Rin\n`;
            }
            // Không có trường hợp profit < 0 ở đây vì isWin = true và multiplier >= 1.0
            description += `🔥 **Hệ số:** x${multiplier.toFixed(1)}`;

            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 CHÚC MỪNG THẮNG LỚN!')
                .setDescription(description)
                .setColor(embedColor);
            await sentMsg.edit({ embeds: [resultEmbed] });

        } else {
            // Người chơi thua, tiền cược đã được trừ ở executeSlot, không cần làm gì thêm với database
            description += `\n😢 **RẤT TIẾC, BẠN KHÔNG TRÚNG!**\n`;
            description += `💸 **Mất:** ${amount.toLocaleString()} Rin`;

            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 CHÚC BẠN MAY MẮN LẦN SAU!')
                .setDescription(description)
                .setColor('#EF4444'); // Red for loss
            await sentMsg.edit({ embeds: [resultEmbed] });
        }
    },

    // Hàm helper để tạo delay
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};