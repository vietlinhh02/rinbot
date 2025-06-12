const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');

// Lưu trữ các ván game bot
const botGames = new Map();

// Timeout settings
const GAME_TIMEOUT = 5 * 60 * 1000; // 5 phút timeout
const PLAYER_TURN_TIMEOUT = 30 * 1000; // 30 giây cho mỗi lượt

// Utility functions cho Xì Dách
function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(rank + suit);
        }
    }
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
}

function calculatePoints(cards) {
    let points = 0;
    let aces = 0;
    
    for (const card of cards) {
        const rank = card.slice(0, -1);
        if (['J', 'Q', 'K'].includes(rank)) {
            points += 10;
        } else if (rank === 'A') {
            points += 11;
            aces++;
        } else {
            points += parseInt(rank);
        }
    }
    
    // Adjust for aces
    while (points > 21 && aces > 0) {
        points -= 10;
        aces--;
    }
    
    return points;
}

function checkSpecialHand(cards) {
    if (cards.length === 2) {
        const ranks = cards.map(card => card.slice(0, -1));
        if (ranks.includes('A') && ['10', 'J', 'Q', 'K'].some(r => ranks.includes(r))) {
            return "Xì Dách";
        }
        if (ranks[0] === 'A' && ranks[1] === 'A') {
            return "Xì Bàn";
        }
    }
    
    if (cards.length === 5 && calculatePoints(cards) <= 21) {
        return "Ngũ Linh";
    }
    
    return null;
}

// Bot AI strategy
function botShouldDrawCard(cards) {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
        return true; // Bot cần ít nhất 2 lá
    }
    
    const points = calculatePoints(cards);
    const aceCount = cards.filter(card => card && card.slice(0, -1) === 'A').length;
    
    // Basic bot strategy
    if (points < 12) return true;
    if (points >= 17) return false;
    if (points >= 13 && points <= 16) {
        // Soft hand strategy
        if (aceCount > 0 && points <= 17) return true;
        return Math.random() < 0.3; // 30% chance to hit
    }
    
    return false;
}

// Modal để nhập số tiền cược
class BetModal extends ModalBuilder {
    constructor() {
        super();
        this.setCustomId('xjbot_bet_modal')
            .setTitle('Cược Xì Dách với Bot');

        const betInput = new TextInputBuilder()
            .setCustomId('bet_amount')
            .setLabel('Số Rin bạn muốn cược:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Nhập số Rin...')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(betInput);
        this.addComponents(firstActionRow);
    }
}

module.exports = {
    name: 'xjbot',
    description: 'Chơi Xì Dách với Bot AI',
    
    async execute(message, args) {
        const channelId = message.channel.id;
        
        if (botGames.has(channelId)) {
            return message.reply('❌ Đã có ván Xì Dách Bot trong kênh này!');
        }

        // CHECK ÂM TIỀN - Bot AI chấp nhận mọi người chơi nhưng nhà cái âm tiền không được làm game với người khác
        // Ở đây ai cũng có thể chơi với Bot nên không cần check

        botGames.set(channelId, {
            players: new Map(), // userId -> {bet, cards, status}
            deck: createDeck(),
            botCards: [],
            status: 'betting', // betting, playing, finished
            timeouts: new Map(), // userId -> timeoutId
            gameTimeout: null,
            gameMessage: null, // Tin nhắn chung cho game
            gameEnded: false
        });

        const embed = new EmbedBuilder()
            .setTitle('🃏 Xì Dách với Bot AI')
            .setDescription('**🤖 Nhà cái:** RinBot AI - *Sẵn sàng thách đấu!*\n\n' +
                '**Luật chơi:**\n' +
                '• Mục tiêu: Gần 21 điểm nhất\n' +
                '• Xì Dách (A+10/J/Q/K): x2 tiền\n' +
                '• Ngũ Linh (5 lá ≤21): x3 tiền\n' +
                '• Quắc (>21): Mất tiền cược\n\n' +
                '⏰ **Timeout:** Game 5 phút, mỗi lượt 30 giây')
            .setColor('#0099FF')
            .setFooter({ text: 'Bấm nút để tham gia!' });

        const joinButton = new ButtonBuilder()
            .setCustomId('xjbot_join')
            .setLabel('🎯 Thách đấu Bot')
            .setStyle(ButtonStyle.Primary);

        const startButton = new ButtonBuilder()
            .setCustomId('xjbot_start')
            .setLabel('🚀 Bắt đầu')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(joinButton, startButton);

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction) {
        const channelId = interaction.channel.id;
        const game = botGames.get(channelId);

        if (!game) {
            return interaction.reply({ content: '❌ Không có game nào!', ephemeral: true });
        }

        if (interaction.customId === 'xjbot_join') {
            if (game.status !== 'betting') {
                return interaction.reply({ content: '❌ Game đã bắt đầu!', ephemeral: true });
            }

            const modal = new BetModal();
            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'xjbot_bet_modal') {
            const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));

            if (isNaN(amount) || amount <= 0) {
                return interaction.reply({ content: '❌ Số Rin không hợp lệ!', ephemeral: true });
            }

            const userRin = await getUserRin(interaction.user.id);
            if (userRin < amount) {
                return interaction.reply({ content: '❌ Bạn không đủ Rin!', ephemeral: true });
            }

            if (game.players.has(interaction.user.id)) {
                return interaction.reply({ content: '❌ Bạn đã tham gia rồi!', ephemeral: true });
            }

            // Trừ tiền ngay
            await updateUserRin(interaction.user.id, -amount);

            game.players.set(interaction.user.id, {
                user: interaction.user,
                bet: amount,
                cards: [],
                status: 'playing' // playing, stand, busted
            });

            await interaction.reply({ content: `✅ ${interaction.user.displayName} đã cược ${amount} Rin!`, ephemeral: true });
        }

        if (interaction.customId === 'xjbot_start') {
            if (game.status !== 'betting') {
                return interaction.reply({ content: '❌ Game đã bắt đầu!', ephemeral: true });
            }

            if (game.players.size === 0) {
                return interaction.reply({ content: '❌ Chưa có ai tham gia!', ephemeral: true });
            }

            await this.startGame(interaction, channelId);
        }

        if (interaction.customId === 'xjbot_hit') {
            await this.handleHit(interaction, channelId);
        }

        if (interaction.customId === 'xjbot_stand') {
            await this.handleStand(interaction, channelId);
        }
    },

    async startGame(interaction, channelId) {
        const game = botGames.get(channelId);
        game.status = 'playing';

        // Set game timeout (5 phút)
        game.gameTimeout = setTimeout(async () => {
            await this.timeoutGame(interaction.channel, channelId);
        }, GAME_TIMEOUT);

        // Deal initial cards
        for (const [userId, playerData] of game.players) {
            playerData.cards = [game.deck.pop(), game.deck.pop()];
        }
        
        // Bot gets 2 cards
        game.botCards = [game.deck.pop(), game.deck.pop()];

        await interaction.deferUpdate();
        
        // Tạo tin nhắn game chung và cập nhật liên tục
        await this.updateGameDisplay(interaction.channel, channelId);
    },

    // HÀM CHÍNH: Cập nhật hiển thị game trong 1 tin nhắn duy nhất
    async updateGameDisplay(channel, channelId) {
        const game = botGames.get(channelId);
        if (!game || game.gameEnded) return; // Prevent update after game ended
        
        // Ensure botCards exists
        if (!game.botCards) {
            game.botCards = [];
        }
        
        const hasActivePlayers = Array.from(game.players.values()).some(p => p.status === 'playing');
        
        const botPoints = calculatePoints(game.botCards);
        const botSpecial = checkSpecialHand(game.botCards);
        
        // Tạo display cho tất cả players
        let playersDisplay = '';
        
        for (const [userId, player] of game.players) {
            const points = calculatePoints(player.cards);
            const special = checkSpecialHand(player.cards);
            
            let statusIcon = '';
            if (player.status === 'playing') {
                statusIcon = '🔥';
            } else if (player.status === 'stand') {
                statusIcon = '✋';
            } else if (player.status === 'busted') {
                statusIcon = '💥';
            }
            
            playersDisplay += `${statusIcon} **${player.user.displayName}** (${player.bet} Rin)\n`;
            playersDisplay += `   🃏 ${player.cards.join(' ')} *(${points}${special ? ` - ${special}` : ''})*\n\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🃏 XÌ DÁCH BOT ĐANG DIỄN RA')
            .setDescription(
                `🤖 **Bot (Dealer):**\n` +
                `🃏 ${game.status === 'playing' ? `${game.botCards[0]} [???]` : `${game.botCards.join(' ')} *(${botPoints}${botSpecial ? ` - ${botSpecial}` : ''})*`}\n\n` +
                `👥 **Người chơi:**\n${playersDisplay}`
            )
            .setColor(hasActivePlayers ? '#0099FF' : '#00FF00')
            .setFooter({ text: hasActivePlayers ? '⏰ 30 giây mỗi lượt' : 'Game hoàn thành!' });

        const components = [];
        if (hasActivePlayers) {
            const hitButton = new ButtonBuilder()
                .setCustomId('xjbot_hit')
                .setLabel('🃏 Rút bài')
                .setStyle(ButtonStyle.Primary);

            const standButton = new ButtonBuilder()
                .setCustomId('xjbot_stand')
                .setLabel('✋ Dừng')
                .setStyle(ButtonStyle.Secondary);

            components.push(new ActionRowBuilder().addComponents(hitButton, standButton));
        }

        if (game.gameMessage) {
            // Update existing message
            await game.gameMessage.edit({ embeds: [embed], components });
        } else {
            // Create new message
            game.gameMessage = await channel.send({ embeds: [embed], components });
        }

        // Set timeouts cho players đang chơi
        for (const [userId, player] of game.players) {
            if (player.status === 'playing' && !game.timeouts.has(userId)) {
                const timeout = setTimeout(async () => {
                    await this.timeoutPlayer(channel, channelId, userId);
                }, PLAYER_TURN_TIMEOUT);
                game.timeouts.set(userId, timeout);
            }
        }

        // Check if game should end
        if (!hasActivePlayers && !game.gameEnded) {
            await this.endGame(channel, channelId);
        }
    },

    async handleHit(interaction, channelId) {
        const game = botGames.get(channelId);
        const player = game.players.get(interaction.user.id);

        if (!player || player.status !== 'playing') {
            return interaction.reply({ content: '❌ Không phải lượt của bạn!', ephemeral: true });
        }

        // Clear timeout cho player này
        if (game.timeouts.has(interaction.user.id)) {
            clearTimeout(game.timeouts.get(interaction.user.id));
            game.timeouts.delete(interaction.user.id);
        }

        player.cards.push(game.deck.pop());
        
        // Check auto bust/stand
        const points = calculatePoints(player.cards);
        const special = checkSpecialHand(player.cards);
        
        if (points > 21) {
            player.status = 'busted';
        } else if (special || player.cards.length >= 5) {
            player.status = 'stand';
        }

        await interaction.deferUpdate();
        await this.updateGameDisplay(interaction.channel, channelId);
    },

    async handleStand(interaction, channelId) {
        const game = botGames.get(channelId);
        const player = game.players.get(interaction.user.id);

        if (!player || player.status !== 'playing') {
            return interaction.reply({ content: '❌ Không phải lượt của bạn!', ephemeral: true });
        }

        // Clear timeout cho player này
        if (game.timeouts.has(interaction.user.id)) {
            clearTimeout(game.timeouts.get(interaction.user.id));
            game.timeouts.delete(interaction.user.id);
        }

        player.status = 'stand';
        await interaction.deferUpdate();
        await this.updateGameDisplay(interaction.channel, channelId);
    },

    async endGame(channel, channelId) {
        try {
            const game = botGames.get(channelId);
            if (!game || game.gameEnded) return; // Prevent infinite loop
            
            // Mark game as ended to prevent multiple calls
            game.gameEnded = true;
            
            // Ensure botCards exists
            if (!game.botCards) {
                game.botCards = [];
            }
            
            // Bot play nếu cần (với safety check để tránh vòng lặp vô hạn)
            let drawCount = 0;
            const maxDraws = 10; // Giới hạn số lần rút để tránh vòng lặp vô hạn
            
            while (drawCount < maxDraws && botShouldDrawCard(game.botCards) && game.deck && game.deck.length > 0) {
                game.botCards.push(game.deck.pop());
                drawCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Show results trước khi cleanup
            await this.showResults(channel, channelId);
            
            // Cleanup
            if (game.gameTimeout) clearTimeout(game.gameTimeout);
            for (const timeout of game.timeouts.values()) {
                clearTimeout(timeout);
            }
            
            botGames.delete(channelId);
        } catch (error) {
            console.error('Error in endGame:', error);
            // Force cleanup even if error
            try {
                const game = botGames.get(channelId);
                if (game) {
                    if (game.gameTimeout) clearTimeout(game.gameTimeout);
                    for (const timeout of game.timeouts.values()) {
                        clearTimeout(timeout);
                    }
                    botGames.delete(channelId);
                }
            } catch (cleanupError) {
                console.error('Error in cleanup:', cleanupError);
            }
        }
    },

    async showResults(channel, channelId) {
        try {
            const game = botGames.get(channelId);
            if (!game) return;
            
            // Ensure botCards exists
            if (!game.botCards) {
                game.botCards = [];
            }
            
            const botPoints = calculatePoints(game.botCards);
            const botSpecial = checkSpecialHand(game.botCards);

            let resultsText = `🤖 **Bot:** ${game.botCards.join(' ') || 'Không có bài'} *(${botPoints}${botSpecial ? ` - ${botSpecial}` : ''}${botPoints > 21 ? ' - QUẮC' : ''})*\n\n`;

            for (const [userId, player] of game.players) {
                const points = calculatePoints(player.cards);
                const special = checkSpecialHand(player.cards);
                const bet = player.bet;
                
                let outcome = '';
                let reward = 0;

                // Tính kết quả
                if (points > 21) {
                    reward = 0;
                    outcome = `💥 QUẮC - Mất ${bet} Rin`;
                } else if (special === "Xì Dách" && botSpecial !== "Xì Dách") {
                    reward = bet * 3;
                    outcome = `🎉 XÌ DÁCH - Thắng +${bet * 2} Rin`;
                } else if (special === "Ngũ Linh") {
                    reward = bet * 4;
                    outcome = `✨ NGŨ LINH - Thắng +${bet * 3} Rin`;
                } else if (botPoints > 21) {
                    reward = bet * 2;
                    outcome = `✅ Bot QUẮC - Thắng +${bet} Rin`;
                } else if (points > botPoints) {
                    reward = bet * 2;
                    outcome = `🏆 THẮNG - +${bet} Rin`;
                } else if (points === botPoints) {
                    reward = bet;
                    outcome = `🤝 HÒA - Hoàn ${bet} Rin`;
                } else {
                    reward = 0;
                    outcome = `❌ THUA - Mất ${bet} Rin`;
                }

                await updateUserRin(userId, reward);
                resultsText += `**${player.user.displayName}:** ${player.cards.join(' ')} *(${points}${special ? ` - ${special}` : ''})*\n${outcome}\n\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 KẾT QUẢ XÌ DÁCH BOT')
                .setDescription(resultsText)
                .setColor('#FFD700')
                .setFooter({ text: 'Cảm ơn bạn đã chơi!' });

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in showResults:', error);
            try {
                await channel.send('❌ Có lỗi xảy ra khi hiển thị kết quả!');
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    },

    // Timeout player (30 giây không hành động)
    async timeoutPlayer(channel, channelId, userId) {
        const game = botGames.get(channelId);
        if (!game) return;

        const player = game.players.get(userId);
        if (!player || player.status !== 'playing') return;

        player.status = 'stand';
        game.timeouts.delete(userId);

        await this.updateGameDisplay(channel, channelId);
    },

    // Timeout toàn game (5 phút)
    async timeoutGame(channel, channelId) {
        const game = botGames.get(channelId);
        if (!game) return;

        const embed = new EmbedBuilder()
            .setTitle('⏰ GAME TIMEOUT!')
            .setDescription('Game đã quá 5 phút và bị hủy! Tất cả người chơi bị xử thua.')
            .setColor('#FF0000');

        await channel.send({ embeds: [embed] });

        // Clear all timeouts
        for (const timeout of game.timeouts.values()) {
            clearTimeout(timeout);
        }

        botGames.delete(channelId);
    }
}; 