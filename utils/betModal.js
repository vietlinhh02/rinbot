const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getUserRin } = require('./database');

/**
 * Tạo modal nhập tiền cược với UI cải thiện
 * @param {string} customId - ID của modal
 * @param {string} title - Tiêu đề modal
 * @param {object} options - Tùy chọn bổ sung
 */
function createBetModal(customId, title = 'Nhập số Rin cược', options = {}) {
    const {
        placeholder = 'VD: 100, 500, 1000...',
        minValue = 1,
        maxValue = null,
        label = 'Số Rin bạn muốn cược:',
        suggestions = true
    } = options;

    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    // Tạo suggestions nếu được bật
    let suggestionText = '';
    if (suggestions) {
        suggestionText = '\n💡 Gợi ý: 50, 100, 200, 500, 1000, 2000';
    }

    const betInput = new TextInputBuilder()
        .setCustomId('bet_amount')
        .setLabel(label)
        .setPlaceholder(placeholder + suggestionText)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10);

    const firstActionRow = new ActionRowBuilder().addComponents(betInput);
    modal.addComponents(firstActionRow);

    return modal;
}

/**
 * Xử lý và validate số tiền từ modal
 * @param {string} input - Input từ modal
 * @param {string} userId - ID người dùng
 * @param {object} options - Tùy chọn validation
 */
async function validateBetAmount(input, userId, options = {}) {
    const {
        minBet = 1,
        maxBet = null,
        allowPercentage = true,
        roundToNearest = 1
    } = options;

    let betAmount;
    let isPercentage = false;

    // Xử lý input
    const cleanInput = input.trim().toLowerCase();
    
    // Kiểm tra phần trăm (50%, all, max, etc.)
    if (allowPercentage) {
        if (cleanInput === 'all' || cleanInput === 'max' || cleanInput === 'tất cả') {
            const userRin = await getUserRin(userId);
            betAmount = userRin;
            isPercentage = true;
        } else if (cleanInput === 'half' || cleanInput === 'nửa' || cleanInput === '50%') {
            const userRin = await getUserRin(userId);
            betAmount = Math.floor(userRin / 2);
            isPercentage = true;
        } else if (cleanInput.endsWith('%')) {
            const percentage = parseInt(cleanInput.slice(0, -1));
            if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
                const userRin = await getUserRin(userId);
                betAmount = Math.floor(userRin * percentage / 100);
                isPercentage = true;
            }
        }
    }

    // Xử lý số thông thường
    if (!isPercentage) {
        // Xử lý ký hiệu k, m (1k = 1000, 1m = 1000000)
        if (cleanInput.endsWith('k')) {
            betAmount = parseFloat(cleanInput.slice(0, -1)) * 1000;
        } else if (cleanInput.endsWith('m')) {
            betAmount = parseFloat(cleanInput.slice(0, -1)) * 1000000;
        } else {
            betAmount = parseInt(cleanInput);
        }
    }

    // Validation cơ bản
    if (isNaN(betAmount) || betAmount <= 0) {
        return {
            valid: false,
            error: '❌ **Số Rin không hợp lệ!**\n\n💡 **Cách nhập hợp lệ:**\n• Số nguyên: `100`, `500`, `1000`\n• Ký hiệu: `1k` (1000), `2.5k` (2500)\n• Phần trăm: `50%`, `all`, `half`'
        };
    }

    // Làm tròn nếu cần
    betAmount = Math.floor(betAmount / roundToNearest) * roundToNearest;

    // Kiểm tra min/max
    if (betAmount < minBet) {
        return {
            valid: false,
            error: `❌ **Số tiền quá thấp!**\nTối thiểu: **${minBet.toLocaleString()} Rin**`
        };
    }

    if (maxBet && betAmount > maxBet) {
        return {
            valid: false,
            error: `❌ **Số tiền quá cao!**\nTối đa: **${maxBet.toLocaleString()} Rin**`
        };
    }

    // Kiểm tra số dư
    const userRin = await getUserRin(userId);
    if (userRin < betAmount) {
        return {
            valid: false,
            error: `❌ **Không đủ tiền!**\n\n💰 **Số dư:** ${userRin.toLocaleString()} Rin\n💸 **Cần:** ${betAmount.toLocaleString()} Rin\n📉 **Thiếu:** ${(betAmount - userRin).toLocaleString()} Rin\n\n💡 Hãy thử số tiền thấp hơn hoặc kiếm thêm Rin!`
        };
    }

    return {
        valid: true,
        amount: betAmount,
        originalInput: input,
        isPercentage: isPercentage,
        userBalance: userRin
    };
}

/**
 * Tạo embed thông báo lỗi đẹp mắt
 * @param {string} title - Tiêu đề lỗi
 * @param {string} error - Nội dung lỗi
 * @param {object} suggestions - Gợi ý bổ sung
 */
function createErrorEmbed(title, error, suggestions = {}) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(error)
        .setColor('#FF6B6B')
        .setTimestamp();

    if (suggestions.examples) {
        embed.addFields({
            name: '✨ Ví dụ hợp lệ:',
            value: suggestions.examples.join('\n'),
            inline: false
        });
    }

    if (suggestions.tips) {
        embed.addFields({
            name: '💡 Mẹo hay:',
            value: suggestions.tips.join('\n'),
            inline: false
        });
    }

    return embed;
}

/**
 * Tạo embed xác nhận cược
 * @param {object} betData - Dữ liệu cược đã validate
 * @param {object} gameInfo - Thông tin game
 */
function createBetConfirmEmbed(betData, gameInfo = {}) {
    const { amount, originalInput, isPercentage, userBalance } = betData;
    const { gameName = 'Game', action = 'tham gia' } = gameInfo;

    let inputInfo = '';
    if (isPercentage) {
        const percentage = Math.round((amount / userBalance) * 100);
        inputInfo = `📊 **Bạn đã chọn:** ${percentage}% số dư (${originalInput})`;
    } else {
        inputInfo = `💰 **Số tiền cược:** ${amount.toLocaleString()} Rin`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`✅ ${action.toUpperCase()} THÀNH CÔNG!`)
        .setDescription(`🎮 **${gameName}**\n\n${inputInfo}\n\n` +
            `💳 **Số dư trước:** ${userBalance.toLocaleString()} Rin\n` +
            `💸 **Số dư sau:** ${(userBalance - amount).toLocaleString()} Rin\n\n` +
            `🎯 **Chúc bạn may mắn!**`)
        .setColor('#00FF00')
        .setFooter({ text: 'Hãy chơi có trách nhiệm!' })
        .setTimestamp();

    return embed;
}

/**
 * Utility function để xử lý toàn bộ flow nhập tiền
 * @param {object} interaction - Discord interaction
 * @param {object} validation - Tùy chọn validation
 * @param {object} gameInfo - Thông tin game
 */
async function handleBetInput(interaction, validation = {}, gameInfo = {}) {
    const betInput = interaction.fields.getTextInputValue('bet_amount');
    const userId = interaction.user.id;

    // Validate số tiền
    const result = await validateBetAmount(betInput, userId, validation);

    if (!result.valid) {
        const errorEmbed = createErrorEmbed(
            '💸 Lỗi nhập tiền cược',
            result.error,
            {
                examples: [
                    '• `100` - Cược 100 Rin',
                    '• `1k` - Cược 1,000 Rin',
                    '• `50%` - Cược 50% số dư',
                    '• `all` - Cược tất cả'
                ],
                tips: [
                    '• Dùng `k` cho nghìn (1k = 1000)',
                    '• Dùng phần trăm để cược theo tỷ lệ',
                    '• `all` hoặc `max` để cược hết',
                    '• `half` để cược 50% số dư'
                ]
            }
        );

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Tạo embed xác nhận
    const confirmEmbed = createBetConfirmEmbed(result, gameInfo);

    return {
        success: true,
        amount: result.amount,
        embed: confirmEmbed,
        data: result
    };
}

module.exports = {
    createBetModal,
    validateBetAmount,
    createErrorEmbed,
    createBetConfirmEmbed,
    handleBetInput
}; 