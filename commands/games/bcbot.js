const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { BAU_CUA_ANIMALS, BAU_CUA_EMOJIS } = require('../../utils/constants');

// Lưu trữ các ván game đang diễn ra (bot làm nhà cái)
const botGames = new Map();

// Timeout settings
const GAME_TIMEOUT = 3 * 60 * 1000; // 3 phút timeout

// Modal để nhập số tiền cược
class BetModal extends ModalBuilder {
    constructor(animal) {
        super();
        this.setCustomId(`bot_bet_modal_${animal}`)
            .setTitle(`Cược vào ${animal}`);

        const betInput = new TextInputBuilder()
            .setCustomId('bet_amount')
            .setLabel(`Số Rin cược cho ${animal}:`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Nhập số Rin...')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(betInput);
        this.addComponents(firstActionRow);
    }
}

// View với các nút cược (chia thành 2 rows)
function createBetViews() {
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();
    
    BAU_CUA_ANIMALS.forEach((animal, index) => {
        const button = new ButtonBuilder()
            .setCustomId(`bot_bet_${animal}`)
            .setLabel(`${BAU_CUA_EMOJIS[animal]} ${animal.charAt(0).toUpperCase() + animal.slice(1)}`)
            .setStyle(ButtonStyle.Primary);
        
        if (index < 3) {
            row1.addComponents(button);
        } else {
            row2.addComponents(button);
        }
    });
    
    return [row1, row2];
}

// View với nút xác nhận
class ControlView extends ActionRowBuilder {
    constructor() {
        super();
        this.addComponents(
            new ButtonBuilder()
                .setCustomId('bot_confirm_bet')
                .setLabel('✅ Xác nhận & Quay')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('bot_auto_play')
                .setLabel('🤖 Tự động (30s)')
                .setStyle(ButtonStyle.Danger)
        );
    }
}

module.exports = {
    name: 'bcbot',
    description: 'Bắt đầu ván Bầu Cua với bot làm nhà cái',
    async execute(message, args) {
        const channelId = message.channel.id;
        
        // Kiểm tra xem đã có ván nào chưa
        if (botGames.has(channelId)) {
            return message.reply('❌ Đã có ván Bầu Cua (Bot) trong kênh này!');
        }

        // Tạo ván game mới với bot làm nhà cái
        botGames.set(channelId, {
            initiator: message.author,
            bets: new Map(), // userId -> {animal: amount}
            participants: new Set(),
            autoPlay: false,
            autoTimer: null,
            gameTimeout: null,
            gameMessage: null // Tin nhắn chính của game
        });

        // Set game timeout (3 phút)
        const game = botGames.get(channelId);
        game.gameTimeout = setTimeout(async () => {
            await timeoutGame(message.channel, channelId);
        }, GAME_TIMEOUT);

        await this.updateGameDisplay(message.channel, channelId, true);
    },

    // Cập nhật hiển thị game trong 1 tin nhắn
    async updateGameDisplay(channel, channelId, isNew = false) {
        const game = botGames.get(channelId);
        if (!game) return;

        // Tạo danh sách cược hiện tại
        let betsDisplay = '';
        if (game.participants.size === 0) {
            betsDisplay = '*Chưa có ai cược...*';
        } else {
            for (const userId of game.participants) {
                const user = await channel.client.users.fetch(userId);
                const userBets = game.bets.get(userId);
                
                if (userBets && Object.keys(userBets).length > 0) {
                    const betList = Object.entries(userBets)
                        .map(([animal, amount]) => `${BAU_CUA_EMOJIS[animal]}${amount}`)
                        .join(' ');
                    betsDisplay += `**${user.displayName}:** ${betList}\n`;
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🎰 BẦU CUA BOT')
            .setDescription('**🤖 Nhà cái:** RinBot\n\n' +
                '**📋 Luật chơi:**\n' +
                '• Chọn con vật để cược\n' +
                '• Trúng 1 con: x1 | 2 con: x2 | 3 con: x4\n' +
                '• Không trúng: tiền cược trả cho bot\n\n' +
                `**📊 Cược hiện tại:**\n${betsDisplay}`)
            .setColor(game.autoPlay ? '#FF4500' : '#0099FF')
            .setFooter({ 
                text: game.autoPlay ? 
                    '🤖 Tự động - sẽ quay trong 30s' : 
                    '⏰ Game timeout sau 3 phút'
            });

        const betViews = createBetViews();
        const controlView = new ControlView();

        const components = game.autoPlay ? [] : [...betViews, controlView];

        if (game.gameMessage && !isNew) {
            await game.gameMessage.edit({ embeds: [embed], components });
        } else {
            game.gameMessage = await channel.send({ embeds: [embed], components });
        }
    },

    // Xử lý interactions
    async handleInteraction(interaction) {
        const channelId = interaction.channel.id;
        const game = botGames.get(channelId);
        
        if (!game) {
            return interaction.reply({ content: '❌ Không có ván game nào!', ephemeral: true });
        }

        // Xử lý modal submit
        if (interaction.isModalSubmit() && interaction.customId.startsWith('bot_bet_modal_')) {
            const animal = interaction.customId.split('_')[3];
            const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));

            if (isNaN(amount) || amount <= 0) {
                return interaction.reply({ content: '❌ Số Rin không hợp lệ!', ephemeral: true });
            }

            const userRin = await getUserRin(interaction.user.id);
            if (userRin < amount) {
                return interaction.reply({ content: '❌ Bạn không đủ Rin!', ephemeral: true });
            }

            // Lưu cược
            if (!game.bets.has(interaction.user.id)) {
                game.bets.set(interaction.user.id, {});
            }
            
            const userBets = game.bets.get(interaction.user.id);
            userBets[animal] = (userBets[animal] || 0) + amount;
            game.participants.add(interaction.user.id);

            await interaction.reply({ 
                content: `✅ Đã cược **${amount} Rin** vào **${animal}**!`, 
                ephemeral: true 
            });

            // Cập nhật hiển thị game
            await this.updateGameDisplay(interaction.channel, channelId);
            return;
        }

        // Xử lý button clicks
        if (interaction.customId.startsWith('bot_bet_')) {
            if (game.autoPlay) {
                return interaction.reply({ content: '❌ Game đang ở chế độ tự động, không thể cược!', ephemeral: true });
            }

            const animal = interaction.customId.split('_')[2];
            const modal = new BetModal(animal);
            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'bot_confirm_bet') {
            if (game.autoPlay) {
                return interaction.reply({ content: '❌ Game đang ở chế độ tự động!', ephemeral: true });
            }

            if (game.participants.size === 0) {
                return interaction.reply({ content: '❌ Chưa có ai cược!', ephemeral: true });
            }

            // Xác nhận và trừ tiền tất cả người chơi
            for (const [userId, userBets] of game.bets) {
                const totalBet = Object.values(userBets).reduce((sum, amount) => sum + amount, 0);
                if (totalBet > 0) {
                    await updateUserRin(userId, -totalBet);
                }
            }

            await interaction.deferUpdate();
            await this.executeGame(interaction.channel, channelId);
            return;
        }

        if (interaction.customId === 'bot_auto_play') {
            if (game.autoPlay) {
                return interaction.reply({ content: '❌ Chế độ tự động đã được bật!', ephemeral: true });
            }

            if (game.participants.size === 0) {
                return interaction.reply({ content: '❌ Chưa có ai cược!', ephemeral: true });
            }

            game.autoPlay = true;
            await interaction.deferUpdate();
            
            // Cập nhật hiển thị
            await this.updateGameDisplay(interaction.channel, channelId);

            // Timer 30 giây
            game.autoTimer = setTimeout(async () => {
                // Xác nhận và trừ tiền tất cả người chơi
                for (const [userId, userBets] of game.bets) {
                    const totalBet = Object.values(userBets).reduce((sum, amount) => sum + amount, 0);
                    if (totalBet > 0) {
                        await updateUserRin(userId, -totalBet);
                    }
                }
                await this.executeGame(interaction.channel, channelId);
            }, 30000);

            return;
        }
    },

    // Thực thi game (quay kết quả)
    async executeGame(channel, channelId) {
        const game = botGames.get(channelId);
        if (!game || game.participants.size === 0) return;

        // Clear timers
        if (game.autoTimer) clearTimeout(game.autoTimer);
        if (game.gameTimeout) clearTimeout(game.gameTimeout);

        // Hiệu ứng quay từng xúc xắc
        let tempResults = [];
        const spinningMsg = await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🎲 ĐANG QUAY BẦU CUA...')
                    .setDescription('Đang mở kết quả...')
                    .setColor('#FFD700')
            ]
        });
        for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 700));
            const rand = BAU_CUA_ANIMALS[Math.floor(Math.random() * BAU_CUA_ANIMALS.length)];
            tempResults.push(rand);
            await spinningMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🎲 ĐANG QUAY BẦU CUA...')
                        .setDescription(`Đã mở: ${tempResults.map(r => `${BAU_CUA_EMOJIS[r]} ${r}`).join(' | ')}${' | ❓'.repeat(3 - tempResults.length)}`)
                        .setColor('#FFD700')
                ]
            });
        }
        // Kết quả thật
        const results = tempResults;

        let resultText = `🎲 **Kết quả:** ${results.map(r => `${BAU_CUA_EMOJIS[r]} ${r}`).join(' | ')}\n\n`;

        let botNetWinnings = 0; // Tổng tiền bot thắng/thua

        // Xử lý từng người chơi
        for (const [userId, userBets] of game.bets) {
            const user = await channel.client.users.fetch(userId);
            let totalWin = 0;
            let totalLoss = 0;
            const betResults = [];

            for (const [animal, amount] of Object.entries(userBets)) {
                const count = results.filter(r => r === animal).length;
                let winAmount = 0;
                let multiplier = 0;
                if (count === 1) {
                    multiplier = 1;
                    winAmount = amount * multiplier;
                    totalWin += winAmount;
                    botNetWinnings -= winAmount; // Bot mất tiền khi người chơi thắng
                    betResults.push(`${BAU_CUA_EMOJIS[animal]} +${winAmount}`);
                } else if (count === 2) {
                    multiplier = 2;
                    winAmount = amount * multiplier;
                    totalWin += winAmount;
                    botNetWinnings -= winAmount; // Bot mất tiền khi người chơi thắng
                    betResults.push(`${BAU_CUA_EMOJIS[animal]} +${winAmount}`);
                } else if (count === 3) {
                    multiplier = 4;
                    winAmount = amount * multiplier;
                    totalWin += winAmount;
                    botNetWinnings -= winAmount; // Bot mất tiền khi người chơi thắng
                    betResults.push(`${BAU_CUA_EMOJIS[animal]} +${winAmount}`);
                } else {
                    totalLoss += amount;
                    botNetWinnings += amount; // Bot nhận tiền khi người chơi thua
                    betResults.push(`${BAU_CUA_EMOJIS[animal]} -${amount}`);
                }
            }

            // Cộng tiền thắng cho người chơi (lấy lại tiền cược + tiền thắng)
            if (totalWin > 0) {
                await updateUserRin(userId, totalWin);
            }

            const netResult = totalWin - totalLoss;
            const resultIcon = netResult > 0 ? '🏆' : netResult === 0 ? '🤝' : '💸';
            resultText += `${resultIcon} **${user.displayName}:** ${netResult >= 0 ? '+' : ''}${netResult} (${betResults.join(' ')})\n`;
        }

        // Cập nhật tiền cho bot (nếu có thay đổi)
        if (botNetWinnings !== 0) {
            await updateUserRin('bot', botNetWinnings);
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle('🎰 KẾT QUẢ BẦU CUA BOT')
            .setDescription(resultText)
            .setColor('#FFD700')
            .setFooter({ text: 'Cảm ơn bạn đã chơi!' });

        await channel.send({ embeds: [resultEmbed] });

        // Xóa game
        botGames.delete(channelId);
    }
}

// Timeout toàn game (3 phút)
async function timeoutGame(channel, channelId) {
    const game = botGames.get(channelId);
    if (!game) return;

    const embed = new EmbedBuilder()
        .setTitle('⏰ GAME TIMEOUT!')
        .setDescription('Game đã quá 3 phút và bị hủy!')
        .setColor('#FF0000');

    await channel.send({ embeds: [embed] });

    // Clear all timers
    if (game.autoTimer) clearTimeout(game.autoTimer);

    // Xóa game
    botGames.delete(channelId);
} 