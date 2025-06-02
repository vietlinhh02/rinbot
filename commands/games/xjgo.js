const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const FastUtils = require('../../utils/fastUtils');
const imageUtils = require('../../utils/imageUtils');
const path = require('path');

// Utility functions cho Xì Dách
function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 12=Q, 13=K, 14=A
    const deck = [];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, value: rank, hidden: false });
        }
    }
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
}

function getCardString(card) {
    const suits = { 'hearts': '♥️', 'diamonds': '♦️', 'clubs': '♣️', 'spades': '♠️' };
    const values = {
        2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
        11: 'J', 12: 'Q', 13: 'K', 14: 'A'
    };
    
    return `${values[card.value]}${suits[card.suit]}`;
}

function calculatePoints(cards) {
    let points = 0;
    let aces = 0;
    
    for (const card of cards) {
        if (card.value >= 11 && card.value <= 13) { // J, Q, K
            points += 10;
        } else if (card.value === 14) { // A
            points += 11;
            aces++;
        } else {
            points += card.value;
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
        const values = cards.map(card => card.value);
        if (values.includes(14) && [10, 11, 12, 13].some(v => values.includes(v))) {
            return "Xì Dách";
        }
        if (values[0] === 14 && values[1] === 14) {
            return "Xì Bàn";
        }
    }
    
    if (cards.length === 5 && calculatePoints(cards) <= 21) {
        return "Ngũ Linh";
    }
    
    return null;
}

// Global interaction tracking để tránh duplicate
const processedInteractions = new Set();

// Game locks để tránh race condition
const gameLocks = new Map();

// Handle join game
async function handleJoin(interaction, channelId) {
    try {
        // Unique interaction ID để track duplicate
        const interactionId = interaction.id;
        
        // Kiểm tra interaction đã được xử lý chưa
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Interaction đã được replied/deferred');
            return;
        }
        
        // Kiểm tra duplicate processing
        if (processedInteractions.has(interactionId)) {
            console.log('⚠️ Interaction đã được xử lý trước đó:', interactionId);
            return;
        }
        
        // Mark as processing
        processedInteractions.add(interactionId);
        
        // Cleanup old interactions (keep only last 100)
        if (processedInteractions.size > 100) {
            const toDelete = Array.from(processedInteractions).slice(0, 50);
            toDelete.forEach(id => processedInteractions.delete(id));
        }
        
        channelId = String(channelId);
        
        // Kiểm tra game lock
        if (gameLocks.has(channelId)) {
            console.log('⚠️ Game đang bị lock, chờ xử lý khác hoàn thành');
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '⏳ Game đang xử lý, vui lòng thử lại sau!', 
                    flags: 64 
                });
            }
            return;
        }
        
        // Lock game
        gameLocks.set(channelId, true);
        
        const game = global.games[channelId];
        
        if (!game) {
            // Unlock game
            gameLocks.delete(channelId);
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: `❌ Không tìm thấy bàn game! Hãy tạo bàn mới với \`,xjgo\``, 
                    flags: 64
                });
            }
            return;
        }

        if (game.started) {
            console.log('⚠️ Game đã bắt đầu, user không thể tham gia:', interaction.user.displayName);
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '❌ Game đã bắt đầu, không thể tham gia!', 
                    flags: 64 
                });
            }
            return;
        }

        if (interaction.user.id in game.players) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '❌ Bạn đã tham gia rồi!', 
                    flags: 64 
                });
            }
            return;
        }

        if (interaction.user.id === game.host.id) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '❌ Nhà cái không thể tham gia!', 
                    flags: 64 
                });
            }
            return;
        }

        // Double check trước khi reply
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Interaction bị xử lý trong quá trình kiểm tra');
            return;
        }

        // Thay thế modal bằng buttons với số tiền preset
        const embed = new EmbedBuilder()
            .setTitle('💰 CHỌN TIỀN CƯỢC')
            .setDescription(`**${interaction.user.displayName}** hãy chọn số tiền muốn cược:\n\n` +
                '**Hoặc gõ:** `,xjbet [số tiền]` để cược số tiền tùy chọn\n' +
                '**Ví dụ:** `,xjbet 150`')
            .setColor('#FFD700');

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bet_${channelId}_50`)
                    .setLabel('50 Rin')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`bet_${channelId}_100`)
                    .setLabel('100 Rin')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`bet_${channelId}_200`)
                    .setLabel('200 Rin')
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bet_${channelId}_500`)
                    .setLabel('500 Rin')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`bet_${channelId}_1000`)
                    .setLabel('1000 Rin')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`bet_cancel`)
                    .setLabel('❌ Hủy')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Final check before reply
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                embeds: [embed], 
                components: [row1, row2], 
                flags: 64 
            });
        }
        
        // Unlock game
        gameLocks.delete(channelId);
        
    } catch (error) {
        console.error('❌ Lỗi trong handleJoin:', error);
        // Unlock game in case of error
        if (channelId) gameLocks.delete(channelId);
        
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: '❌ Có lỗi xảy ra khi tham gia game!', 
                    flags: 64 
                });
            } catch (replyError) {
                console.error('❌ Không thể reply interaction:', replyError);
            }
        }
    }
}

// Handle modal submit
async function handleBetModal(interaction, channelId) {
    // Kiểm tra interaction đã được reply chưa
    if (interaction.replied || interaction.deferred) {
        return;
    }
    
    channelId = String(channelId);
    
    const game = global.games[channelId];
    if (!game) {
        return;
    }

    const betAmount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    
    if (isNaN(betAmount) || betAmount <= 0) {
        return await interaction.reply({ 
            content: '❌ Số Rin không hợp lệ!', 
            flags: 64 
        });
    }

    const userRin = await getUserRin(interaction.user.id);
    
    if (userRin < betAmount) {
        return await interaction.reply({ 
            content: '❌ Bạn không đủ Rin!', 
            flags: 64 
        });
    }

    // Thêm player vào game
    game.players[interaction.user.id] = {
        user: interaction.user,
        bet: betAmount,
        cards: [],
        done: false
    };

    const embed = new EmbedBuilder()
        .setTitle('✅ Tham gia thành công!')
        .setDescription(`${interaction.user.displayName} đã tham gia với ${betAmount} Rin!`)
        .setColor('#00FF00');

    await interaction.reply({ embeds: [embed] });

    // Update main message
    if (game.gameMessage) {
        await updateGameMessage(game.gameMessage, channelId);
    }
}

// Handle start game
async function handleStart(interaction, channelId) {
    try {
        // Unique interaction ID để track duplicate
        const interactionId = interaction.id;
        
        // Kiểm tra interaction đã được xử lý chưa
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Interaction start đã được replied/deferred');
            return;
        }
        
        // Kiểm tra duplicate processing
        if (processedInteractions.has(interactionId)) {
            console.log('⚠️ Interaction start đã được xử lý trước đó:', interactionId);
            return;
        }
        
        // Mark as processing
        processedInteractions.add(interactionId);
        
        channelId = String(channelId);
        
        const game = global.games[channelId];
        if (!game) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '❌ Không có bàn game nào!', 
                    flags: 64 
                });
            }
            return;
        }

        if (game.started) {
            console.log('⚠️ Game đã bắt đầu, không thể start lại:', interaction.user.displayName);
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '❌ Game đã bắt đầu rồi!', 
                    flags: 64 
                });
            }
            return;
        }

        if (interaction.user.id !== game.host.id) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '⛔ Chỉ nhà cái được bắt đầu!', 
                    flags: 64 
                });
            }
            return;
        }

        if (Object.keys(game.players).length === 0) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '❌ Chưa có ai tham gia! Cần ít nhất 1 người chơi để bắt đầu.', 
                    flags: 64 
                });
            }
            return;
        }

        if (Object.keys(game.players).length > 13) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: '❌ Quá nhiều người chơi! Tối đa 13 người.', 
                    flags: 64 
                });
            }
            return;
        }

    // Trừ tiền cược
    for (const [playerId, playerData] of Object.entries(game.players)) {
        await updateUserRin(playerId, -playerData.bet);
    }

    // Deal initial cards
    game.playerOrder = Object.keys(game.players);
    game.playerOrder.push(game.host.id); // Host goes last

    // Deal 2 cards to each player and host
    for (const playerId of game.playerOrder) {
        const cards = [];
        cards.push(game.deck.pop());
        cards.push(game.deck.pop());
        
        if (playerId === game.host.id) {
            game.hostCards = cards;
        } else {
            game.players[playerId].cards = cards;
        }
    }

    game.started = true;
    game.currentPlayerIndex = 0;

        // Defer reply để tránh conflict với animation
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply();
        }

        // Tạo animation chia bài
        await showDealingAnimation(interaction, channelId);

        // Start first turn
        await startNextTurn(interaction.channel, channelId);
        
    } catch (error) {
        console.error('❌ Lỗi trong handleStart:', error);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: '❌ Có lỗi xảy ra khi bắt đầu game!', 
                    flags: 64 
                });
            } catch (replyError) {
                console.error('❌ Không thể reply interaction:', replyError);
            }
        }
    }
}

// Update game message
async function updateGameMessage(message, channelId) {
    const game = global.games[channelId];
    if (!game) return;

    const playersList = Object.values(game.players)
        .map(p => `• ${p.user.displayName} (${p.bet} Rin)`)
        .join('\n') || 'Chưa có ai tham gia';

    const playerCount = Object.keys(game.players).length;

    const embed = new EmbedBuilder()
        .setTitle('🃏 XÌ DÁCH ĐANG MỞ')
        .setDescription('**🏠 Nhà cái:** ' + game.host.displayName + '\n\n' +
            '**📋 Luật chơi mới:**\n' +
            '• Nhà cái cũng được chia bài và chơi như người chơi\n' +
            '• Nhà cái mở bài cuối cùng để so sánh điểm\n' +
            '• **Quắc 22-27:** Hòa nếu cả hai cùng quắc\n' +
            '• **Quắc ≥28:** Thua x2 tiền\n' +
            '• **<16 điểm:** Chưa đủ tuổi, thua x2 tiền\n' +
            '• **Xì Bàn:** 2 con A (x3 tiền)\n' +
            '• **Xì Dách:** A + 10/J/Q/K (x2 tiền)\n' +
            '• **Ngũ Linh:** 5 lá ≤21 điểm (x2 tiền)\n\n' +
            `**👥 Người chơi:** ${playerCount}/13\n` +
            '💡 *Bấm nút để tham gia!*')
        .addFields(
            { name: 'Nhà cái', value: game.host.toString(), inline: false },
            { name: 'Người chơi', value: playersList, inline: false }
        )
        .setColor('#0099FF');

    const joinButton = new ButtonBuilder()
        .setCustomId('xj_join')
        .setLabel('🎟️ Tham gia cược')
        .setStyle(ButtonStyle.Success);

    const startButton = new ButtonBuilder()
        .setCustomId('xj_start')
        .setLabel('🚀 Bắt đầu')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(joinButton, startButton);

    await message.edit({ embeds: [embed], components: [row] });
}

// Show dealing animation
async function showDealingAnimation(interaction, channelId) {
    const game = global.games[channelId];
    if (!game) return;

    const tempFiles = [];
    
    try {
        // Chuẩn bị data cho animation với validation
        const dealerHand = game.hostCards || [];
        const playerHands = Object.values(game.players).map(p => ({
            name: p.user.displayName,
            hand: p.cards || []
        }));

        // Validate card data
        const validateCard = (card) => {
            return card && 
                   typeof card.suit === 'string' && 
                   typeof card.value === 'number' &&
                   ['hearts', 'diamonds', 'clubs', 'spades'].includes(card.suit) &&
                   card.value >= 2 && card.value <= 14;
        };

        // Check dealer hand
        const validDealerHand = dealerHand.filter(validateCard);
        if (validDealerHand.length !== dealerHand.length) {
            console.log('⚠️ Có card không hợp lệ trong dealer hand:', dealerHand);
            throw new Error('Invalid dealer cards');
        }

        // Check player hands
        for (const playerHand of playerHands) {
            const validCards = playerHand.hand.filter(validateCard);
            if (validCards.length !== playerHand.hand.length) {
                console.log('⚠️ Có card không hợp lệ trong player hand:', playerHand.hand);
                throw new Error('Invalid player cards');
            }
        }

        // Tạo GIF animation
        const gifPath = path.join(__dirname, `../../temp/xidach_deal_${Date.now()}.gif`);
        tempFiles.push(gifPath);
        
        // Tạo temp directory nếu chưa có
        const tempDir = path.dirname(gifPath);
        require('fs').mkdirSync(tempDir, { recursive: true });
        
        await imageUtils.createBlackjackGIF(validDealerHand, playerHands, gifPath);
        
        const attachment = new AttachmentBuilder(gifPath, { name: 'xidach_deal.gif' });
        
        const embed = new EmbedBuilder()
            .setTitle('🎴 XÌ DÁCH BẮT ĐẦU!')
            .setDescription('🃏 **Đang chia bài cho tất cả người chơi...**\n\n' +
                `👥 **Số người chơi:** ${Object.keys(game.players).length}\n` +
                `🏠 **Nhà cái:** ${game.host.displayName}\n\n` +
                '⏰ Gõ `,xjrin` để xem bài và hành động!')
            .setColor('#0099FF')
            .setImage('attachment://xidach_deal.gif')
            .setFooter({ text: 'Tất cả đã được chia 2 lá bài!' });

        if (interaction.deferred) {
            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment]
            });
        } else {
            await interaction.reply({ 
                embeds: [embed], 
                files: [attachment]
            });
        }

        // Cleanup temp files sau 10 giây
        setTimeout(() => {
            imageUtils.cleanupTempFiles(tempFiles);
        }, 10000);

    } catch (error) {
        console.error('Lỗi tạo animation chia bài:', error);
        // Fallback về text display
        const embed = new EmbedBuilder()
            .setTitle('🎴 XÌ DÁCH BẮT ĐẦU!')
            .setDescription('🃏 **Đã chia bài cho tất cả người chơi!**\n\n' +
                `👥 **Số người chơi:** ${Object.keys(game.players).length}\n` +
                `🏠 **Nhà cái:** ${game.host.displayName}\n\n` +
                '⏰ Gõ `,xjrin` để xem bài và hành động!')
            .setColor('#0099FF')
            .setFooter({ text: 'Tất cả đã được chia 2 lá bài!' });

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
}

// Start next turn
async function startNextTurn(channel, channelId) {
    const game = global.games[channelId];
    if (!game) return;

    if (game.currentPlayerIndex >= game.playerOrder.length) {
        return await endGame(channel, channelId);
    }

    const currentPlayerId = game.playerOrder[game.currentPlayerIndex];
    const isHost = currentPlayerId === game.host.id;
    const currentPlayer = isHost ? game.host : game.players[currentPlayerId].user;

    const embed = new EmbedBuilder()
        .setTitle(isHost ? '🏠 Lượt nhà cái!' : '🎯 Lượt của bạn!')
        .setDescription(`${currentPlayer}, gõ \`,xjrin\` để xem bài và hành động!`)
        .setColor('#0099FF');

    await channel.send({ embeds: [embed] });
}

// End game
async function endGame(channel, channelId) {
    const game = global.games[channelId];
    if (!game) return;

    const hostPoints = calculatePoints(game.hostCards);
    const hostSpecial = checkSpecialHand(game.hostCards);

    const tempFiles = [];
    
    try {
        // Chuẩn bị data cho hình ảnh kết quả với validation
        const dealerHand = game.hostCards || [];
        const playerHands = Object.values(game.players).map(p => ({
            name: p.user.displayName,
            hand: p.cards || []
        }));

        // Validate card data (same validation as animation)
        const validateCard = (card) => {
            return card && 
                   typeof card.suit === 'string' && 
                   typeof card.value === 'number' &&
                   ['hearts', 'diamonds', 'clubs', 'spades'].includes(card.suit) &&
                   card.value >= 2 && card.value <= 14;
        };

        const validDealerHand = dealerHand.filter(validateCard);
        const validPlayerHands = playerHands.map(p => ({
            name: p.name,
            hand: p.hand.filter(validateCard)
        }));

        // Tạo hình ảnh static cho kết quả
        const imagePath = path.join(__dirname, `../../temp/xidach_result_${Date.now()}.png`);
        tempFiles.push(imagePath);
        
        // Tạo temp directory nếu chưa có
        const tempDir = path.dirname(imagePath);
        require('fs').mkdirSync(tempDir, { recursive: true });
        
        await imageUtils.createBlackjackTable(validDealerHand, validPlayerHands, imagePath);
        
        const attachment = new AttachmentBuilder(imagePath, { name: 'xidach_result.png' });
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 KẾT QUẢ XÌ DÁCH')
            .setColor('#0099FF')
            .setImage('attachment://xidach_result.png');

        let hostMsg = `${game.hostCards.map(getCardString).join(', ')} (${hostPoints} điểm)`;
        if (hostSpecial) hostMsg += ` - ${hostSpecial}`;
        
        embed.addFields({ name: '🏠 Nhà cái', value: hostMsg, inline: false });

        let totalHostWinnings = 0; 
        let totalHostLosses = 0;   

        for (const [pid, pdata] of Object.entries(game.players)) {
            const playerPoints = calculatePoints(pdata.cards);
            const playerSpecial = checkSpecialHand(pdata.cards);
            const bet = pdata.bet;
            
            let playerMsg = `${pdata.cards.map(getCardString).join(', ')} (${playerPoints} điểm)`;
            if (playerSpecial) playerMsg += ` - ${playerSpecial}`;
            
            let outcome = '';
            let playerWinAmount = 0;

            // Game logic
            if (playerSpecial === "Xì Bàn") {
                playerWinAmount = bet + (bet * 3);
                totalHostLosses += bet * 3;
                outcome = `🎉 Xì Bàn – Thắng +${bet * 3} Rin`;
            } else if (hostSpecial === "Xì Bàn") {
                totalHostWinnings += bet;
                outcome = `❌ Thua Xì Bàn nhà cái – Mất ${bet} Rin`;
            } else if (playerSpecial === "Ngũ Linh") {
                if (hostSpecial === "Ngũ Linh") {
                    playerWinAmount = bet;
                    outcome = '🤝 Hòa (cả hai Ngũ Linh)';
                } else {
                    playerWinAmount = bet + (bet * 2);
                    totalHostLosses += bet * 2;
                    outcome = `🎉 Ngũ Linh – Thắng +${bet * 2} Rin`;
                }
            } else if (hostSpecial === "Ngũ Linh" && playerSpecial !== "Ngũ Linh") {
                totalHostWinnings += bet;
                outcome = `❌ Thua Ngũ Linh nhà cái – Mất ${bet} Rin`;
            } else if (playerSpecial === "Xì Dách") {
                if (hostSpecial === "Xì Dách") {
                    playerWinAmount = bet;
                    outcome = `🤝 Hòa (cùng Xì Dách)`;
                } else {
                    playerWinAmount = bet + (bet * 2);
                    totalHostLosses += bet * 2;
                    outcome = `🎉 Xì Dách – Thắng +${bet * 2} Rin`;
                }
            } else if (hostSpecial === "Xì Dách") {
                totalHostWinnings += bet;
                outcome = `❌ Thua Xì Dách nhà cái – Mất ${bet} Rin`;
            } else {
                // So sánh điểm thường
                if (playerPoints >= 28) {
                    totalHostWinnings += bet * 2;
                    outcome = `💥 Quắc nặng (${playerPoints}) – Mất ${bet * 2} Rin`;
                } else if (playerPoints >= 22 && playerPoints <= 27 && hostPoints >= 22 && hostPoints <= 27) {
                    playerWinAmount = bet;
                    outcome = `🤝 Hòa (cả hai quắc nhẹ: ${playerPoints} vs ${hostPoints})`;
                } else if (playerPoints >= 22 && playerPoints <= 27) {
                    if (hostPoints > 21) {
                        playerWinAmount = bet;
                        outcome = `🤝 Hòa (player quắc nhẹ ${playerPoints}, nhà cái quắc ${hostPoints})`;
                    } else {
                        totalHostWinnings += bet;
                        outcome = `❌ Quắc nhẹ (${playerPoints}) – Mất ${bet} Rin`;
                    }
                } else if (hostPoints >= 22 && hostPoints <= 27) {
                    if (playerPoints > 21) {
                        playerWinAmount = bet;
                        outcome = `🤝 Hòa (nhà cái quắc nhẹ ${hostPoints}, player quắc ${playerPoints})`;
                    } else {
                        playerWinAmount = bet + bet;
                        totalHostLosses += bet;
                        outcome = `✅ Nhà cái quắc nhẹ – Thắng +${bet} Rin`;
                    }
                } else if (hostPoints >= 28) {
                    playerWinAmount = bet + bet;
                    totalHostLosses += bet;
                    outcome = `✅ Nhà cái quắc nặng – Thắng +${bet} Rin`;
                } else if (playerPoints < 16) {
                    totalHostWinnings += bet * 2;
                    outcome = `👶 Chưa đủ tuổi (${playerPoints}) – Mất ${bet * 2} Rin`;
                } else if (hostPoints < 16) {
                    playerWinAmount = bet + bet;
                    totalHostLosses += bet;
                    outcome = `✅ Nhà cái chưa đủ tuổi – Thắng +${bet} Rin`;
                } else if (playerPoints > hostPoints) {
                    playerWinAmount = bet + bet;
                    totalHostLosses += bet;
                    outcome = `✅ Thắng điểm (${playerPoints} vs ${hostPoints}) – Thắng +${bet} Rin`;
                } else if (playerPoints < hostPoints) {
                    totalHostWinnings += bet;
                    outcome = `❌ Thua điểm (${playerPoints} vs ${hostPoints}) – Mất ${bet} Rin`;
                } else {
                    playerWinAmount = bet;
                    outcome = `🤝 Hòa điểm (${playerPoints})`;
                }
            }

            if (playerWinAmount > 0) {
                await updateUserRin(pdata.user.id, playerWinAmount);
            }

            embed.addFields({ 
                name: pdata.user.displayName, 
                value: `${playerMsg}\n${outcome}`, 
                inline: false 
            });
        }

        // Tính toán tiền cho nhà cái
        const hostNetWinnings = totalHostWinnings - totalHostLosses;
        
        if (hostNetWinnings > 0) {
            await updateUserRin(game.host.id, hostNetWinnings);
            embed.addFields({ 
                name: '💰 Nhà cái', 
                value: `🎉 Thắng ròng: +${hostNetWinnings} Rin`, 
                inline: false 
            });
        } else if (hostNetWinnings < 0) {
            embed.addFields({ 
                name: '💰 Nhà cái', 
                value: `💸 Thua ròng: ${hostNetWinnings} Rin`, 
                inline: false 
            });
        } else {
            embed.addFields({ 
                name: '💰 Nhà cái', 
                value: `🤝 Hòa vốn: 0 Rin`, 
                inline: false 
            });
        }

        await channel.send({ 
            embeds: [embed], 
            files: [attachment]
        });

        // Cleanup temp files sau 10 giây
        setTimeout(() => {
            imageUtils.cleanupTempFiles(tempFiles);
        }, 10000);

    } catch (error) {
        console.error('Lỗi tạo hình ảnh kết quả:', error);
        // Fallback về text display
        const embed = new EmbedBuilder()
            .setTitle('🎲 KẾT QUẢ XÌ DÁCH')
            .setColor('#0099FF');

        let hostMsg = `Nhà cái: ${game.hostCards.map(getCardString).join(', ')} (${hostPoints} điểm)`;
        if (hostSpecial) hostMsg += ` - ${hostSpecial}`;
        
        embed.addFields({ name: '🏠 Nhà cái', value: hostMsg, inline: false });

        // Thêm logic game tương tự như trên cho fallback...
        await channel.send({ embeds: [embed] });
    }
    
    delete global.games[channelId];
}

// Handle bet button
async function handleBetButton(interaction, channelId) {
    try {
        // Unique interaction ID để track duplicate
        const interactionId = interaction.id;
        
        // Kiểm tra interaction đã được xử lý chưa
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Interaction bet button đã được replied/deferred');
            return;
        }
        
        // Kiểm tra duplicate processing
        if (processedInteractions.has(interactionId)) {
            console.log('⚠️ Interaction bet button đã được xử lý trước đó:', interactionId);
            return;
        }
        
        // Mark as processing
        processedInteractions.add(interactionId);
        
        channelId = String(channelId);
        
        const game = global.games[channelId];
        if (!game) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.update({
                    content: '❌ Không tìm thấy game!',
                    embeds: [],
                    components: []
                });
            }
            return;
        }

        const parts = interaction.customId.split('_');
        const betAmount = parseInt(parts[parts.length - 1]);

        if (isNaN(betAmount) || betAmount <= 0) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.update({
                    content: '❌ Số tiền không hợp lệ!',
                    embeds: [],
                    components: []
                });
            }
            return;
        }

        const userRin = await getUserRin(interaction.user.id);
        
        if (userRin < betAmount) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.update({
                    content: `❌ Bạn không đủ ${betAmount} Rin! (Hiện có: ${userRin} Rin)`,
                    embeds: [],
                    components: []
                });
            }
            return;
        }

        // Thêm player vào game
        game.players[interaction.user.id] = {
            user: interaction.user,
            bet: betAmount,
            cards: [],
            done: false
        };

        const embed = new EmbedBuilder()
            .setTitle('✅ Tham gia thành công!')
            .setDescription(`**${interaction.user.displayName}** đã tham gia với **${betAmount} Rin**!`)
            .setColor('#00FF00');

        if (!interaction.replied && !interaction.deferred) {
            await interaction.update({ 
                embeds: [embed], 
                components: [] 
            });
        }
        
        // Update main message
        if (game.gameMessage) {
            await updateGameMessage(game.gameMessage, channelId);
        }
        
    } catch (error) {
        console.error('❌ Lỗi trong handleBetButton:', error);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.update({ 
                    content: '❌ Có lỗi xảy ra khi đặt cược!', 
                    embeds: [], 
                    components: [] 
                });
            } catch (updateError) {
                console.error('❌ Không thể update interaction:', updateError);
            }
        }
    }
}

module.exports = {
    name: 'xjgo',
    description: 'Mở bàn Xì Dách',
    
    // Export handler functions
    handleJoin,
    handleStart, 
    handleBetModal,
    handleBetButton,
    updateGameMessage,
    
    async execute(message, args) {
        try {
            const channelId = String(message.channel.id);
            
            if (global.games[channelId]) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Đã có bàn game trong kênh này!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            global.games[channelId] = {
                host: message.author,
                players: {},
                deck: createDeck(),
                started: false,
                currentPlayerIndex: 0,
                playerOrder: [],
                hostCards: [],
                hostDone: false
            };

            const embed = new EmbedBuilder()
                .setTitle('🃏 XÌ DÁCH ĐANG MỞ')
                .setDescription('**🏠 Nhà cái:** ' + message.author.displayName + '\n\n' +
                    '**📋 Luật chơi mới:**\n' +
                    '• Nhà cái cũng được chia bài và chơi như người chơi\n' +
                    '• Nhà cái mở bài cuối cùng để so sánh điểm\n' +
                    '• **Quắc 22-27:** Hòa nếu cả hai cùng quắc\n' +
                    '• **Quắc ≥28:** Thua x2 tiền\n' +
                    '• **<16 điểm:** Chưa đủ tuổi, thua x2 tiền\n' +
                    '• **Xì Bàn:** 2 con A (x3 tiền)\n' +
                    '• **Xì Dách:** A + 10/J/Q/K (x2 tiền)\n' +
                    '• **Ngũ Linh:** 5 lá ≤21 điểm (x2 tiền)\n\n' +
                    '**👥 Người chơi:** 0/13\n' +
                    '💡 *Bấm nút để tham gia!*')
                .addFields({ name: 'Nhà cái', value: message.author.toString(), inline: false })
                .setColor('#0099FF');

            const joinButton = new ButtonBuilder()
                .setCustomId('xj_join')
                .setLabel('🎟️ Tham gia cược')
                .setStyle(ButtonStyle.Success);

            const startButton = new ButtonBuilder()
                .setCustomId('xj_start')
                .setLabel('🚀 Bắt đầu')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(joinButton, startButton);

            const gameMessage = await message.reply({ embeds: [embed], components: [row] });

            // Lưu reference đến message để update sau
            global.games[channelId].gameMessage = gameMessage;

        } catch (error) {
            console.error('❌ Lỗi xjgo:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi tạo bàn game!')
                .setColor('#FF0000');
            return await message.reply({ embeds: [embed] });
        }
    }
}; 