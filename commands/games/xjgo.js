const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');

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

// Handle join game
async function handleJoin(interaction, channelId) {
    // Đảm bảo channelId là string
    channelId = String(channelId);
    
    const game = global.games[channelId];
    
    if (!game) {
        return await interaction.reply({ 
            content: `❌ Không tìm thấy bàn game! Hãy tạo bàn mới với \`,xjgo\``, 
            flags: 64
        });
    }

    if (game.started) {
        return await interaction.reply({ 
            content: '❌ Game đã bắt đầu, không thể tham gia!', 
            flags: 64 
        });
    }

    if (interaction.user.id in game.players) {
        return await interaction.reply({ 
            content: '❌ Bạn đã tham gia rồi!', 
            flags: 64 
        });
    }

    if (interaction.user.id === game.host.id) {
        return await interaction.reply({ 
            content: '❌ Nhà cái không thể tham gia!', 
            flags: 64 
        });
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

    await interaction.reply({ 
        embeds: [embed], 
        components: [row1, row2], 
        flags: 64 
    });
}

// Handle modal submit
async function handleBetModal(interaction, channelId) {
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
    channelId = String(channelId);
    
    const game = global.games[channelId];
    if (!game) {
        return await interaction.reply({ 
            content: '❌ Không có bàn game nào!', 
            flags: 64 
        });
    }

    if (game.started) {
        return await interaction.reply({ 
            content: '❌ Game đã bắt đầu rồi!', 
            flags: 64 
        });
    }

    if (interaction.user.id !== game.host.id) {
        return await interaction.reply({ 
            content: '⛔ Chỉ nhà cái được bắt đầu!', 
            flags: 64 
        });
    }

    if (Object.keys(game.players).length === 0) {
        return await interaction.reply({ 
            content: '❌ Chưa có ai tham gia! Cần ít nhất 1 người chơi để bắt đầu.', 
            flags: 64 
        });
    }

    // Kiểm tra tối đa 13 người chơi (để không quá đông)
    if (Object.keys(game.players).length > 13) {
        return await interaction.reply({ 
            content: '❌ Quá nhiều người chơi! Tối đa 13 người.', 
            flags: 64 
        });
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

    const embed = new EmbedBuilder()
        .setTitle('🎴 XÌ DÁCH BẮT ĐẦU!')
        .setDescription('Đã chia bài! Gõ `,xjrin` để xem bài và hành động!')
        .setColor('#0099FF');

    await interaction.reply({ embeds: [embed] });

    // Start first turn
    await startNextTurn(interaction.channel, channelId);
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

    const embed = new EmbedBuilder()
        .setTitle('🎲 KẾT QUẢ XÌ DÁCH')
        .setColor('#0099FF');

    let hostMsg = `Nhà cái: ${game.hostCards.join(', ')} (${hostPoints} điểm)`;
    if (hostSpecial) hostMsg += ` - ${hostSpecial}`;
    
    embed.addFields({ name: '🏠 Nhà cái', value: hostMsg, inline: false });

    let totalHostWinnings = 0; // Tổng tiền nhà cái thắng
    let totalHostLosses = 0;   // Tổng tiền nhà cái thua

    for (const [pid, pdata] of Object.entries(game.players)) {
        const playerPoints = calculatePoints(pdata.cards);
        const playerSpecial = checkSpecialHand(pdata.cards);
        const bet = pdata.bet;
        
        let playerMsg = `${pdata.cards.join(', ')} (${playerPoints} điểm)`;
        if (playerSpecial) playerMsg += ` - ${playerSpecial}`;
        
        let outcome = '';
        let playerWinAmount = 0; // Số tiền player nhận được

        // 1. Kiểm tra trường hợp đặc biệt trước
        if (playerSpecial === "Xì Bàn") {
            // Xì Bàn (2 con A) thắng x3 tiền
            playerWinAmount = bet + (bet * 3); // Lấy lại cược + thắng x3
            totalHostLosses += bet * 3;
            outcome = `🎉 Xì Bàn – Thắng +${bet * 3} Rin`;
        } else if (hostSpecial === "Xì Bàn") {
            // Nhà cái có Xì Bàn, player thua
            totalHostWinnings += bet;
            outcome = `❌ Thua Xì Bàn nhà cái – Mất ${bet} Rin`;
        } else if (playerSpecial === "Ngũ Linh") {
            // Ngũ Linh thắng x2 tiền
            if (hostSpecial === "Ngũ Linh") {
                playerWinAmount = bet; // Hòa
                outcome = '🤝 Hòa (cả hai Ngũ Linh)';
            } else {
                playerWinAmount = bet + (bet * 2); // Lấy lại cược + thắng x2
                totalHostLosses += bet * 2;
                outcome = `🎉 Ngũ Linh – Thắng +${bet * 2} Rin`;
            }
        } else if (hostSpecial === "Ngũ Linh" && playerSpecial !== "Ngũ Linh") {
            // Nhà cái Ngũ Linh, player không phải
            totalHostWinnings += bet;
            outcome = `❌ Thua Ngũ Linh nhà cái – Mất ${bet} Rin`;
        } else if (playerSpecial === "Xì Dách") {
            // Player có Xì Dách
            if (hostSpecial === "Xì Dách") {
                // Cả hai đều Xì Dách
                playerWinAmount = bet; // Hòa
                outcome = `🤝 Hòa (cùng Xì Dách)`;
            } else {
                // Player thắng với Xì Dách
                playerWinAmount = bet + (bet * 2); // Lấy lại cược + thắng x2
                totalHostLosses += bet * 2;
                outcome = `🎉 Xì Dách – Thắng +${bet * 2} Rin`;
            }
        } else if (hostSpecial === "Xì Dách") {
            // Nhà cái có Xì Dách, player thường
            totalHostWinnings += bet;
            outcome = `❌ Thua Xì Dách nhà cái – Mất ${bet} Rin`;
        } else {
            // 2. So sánh điểm thường với luật mới
            if (playerPoints >= 28) {
                // Player quắc nặng (≥28) - thua x2
                totalHostWinnings += bet * 2;
                outcome = `💥 Quắc nặng (${playerPoints}) – Mất ${bet * 2} Rin`;
            } else if (playerPoints >= 22 && playerPoints <= 27 && hostPoints >= 22 && hostPoints <= 27) {
                // Cả hai quắc nhẹ (22-27) - hòa
                playerWinAmount = bet; // Lấy lại cược
                outcome = `🤝 Hòa (cả hai quắc nhẹ: ${playerPoints} vs ${hostPoints})`;
            } else if (playerPoints >= 22 && playerPoints <= 27) {
                // Chỉ player quắc nhẹ, nhà cái không quắc
                if (hostPoints > 21) {
                    // Nhà cái cũng quắc
                    playerWinAmount = bet; // Hòa
                    outcome = `🤝 Hòa (player quắc nhẹ ${playerPoints}, nhà cái quắc ${hostPoints})`;
                } else {
                    // Nhà cái không quắc, player quắc nhẹ
                    totalHostWinnings += bet;
                    outcome = `❌ Quắc nhẹ (${playerPoints}) – Mất ${bet} Rin`;
                }
            } else if (hostPoints >= 22 && hostPoints <= 27) {
                // Chỉ nhà cái quắc nhẹ, player không quắc
                if (playerPoints > 21) {
                    // Player cũng quắc
                    playerWinAmount = bet; // Hòa
                    outcome = `🤝 Hòa (nhà cái quắc nhẹ ${hostPoints}, player quắc ${playerPoints})`;
                } else {
                    // Player không quắc, nhà cái quắc nhẹ
                    playerWinAmount = bet + bet; // Lấy lại cược + thắng bằng cược
                    totalHostLosses += bet;
                    outcome = `✅ Nhà cái quắc nhẹ – Thắng +${bet} Rin`;
                }
            } else if (hostPoints >= 28) {
                // Nhà cái quắc nặng, player không quắc nặng
                playerWinAmount = bet + bet; // Lấy lại cược + thắng bằng cược
                totalHostLosses += bet;
                outcome = `✅ Nhà cái quắc nặng – Thắng +${bet} Rin`;
            } else if (playerPoints < 16) {
                // Player chưa đủ tuổi - thua x2
                totalHostWinnings += bet * 2;
                outcome = `👶 Chưa đủ tuổi (${playerPoints}) – Mất ${bet * 2} Rin`;
            } else if (hostPoints < 16) {
                // Nhà cái chưa đủ tuổi
                playerWinAmount = bet + bet; // Lấy lại cược + thắng bằng cược
                totalHostLosses += bet;
                outcome = `✅ Nhà cái chưa đủ tuổi – Thắng +${bet} Rin`;
            } else if (playerPoints > hostPoints) {
                // Player điểm cao hơn (cả hai đều hợp lệ)
                playerWinAmount = bet + bet; // Lấy lại cược + thắng bằng cược
                totalHostLosses += bet;
                outcome = `✅ Thắng điểm (${playerPoints} vs ${hostPoints}) – Thắng +${bet} Rin`;
            } else if (playerPoints < hostPoints) {
                // Player điểm thấp hơn
                totalHostWinnings += bet;
                outcome = `❌ Thua điểm (${playerPoints} vs ${hostPoints}) – Mất ${bet} Rin`;
            } else {
                // Điểm bằng nhau
                playerWinAmount = bet; // Lấy lại cược
                outcome = `🤝 Hòa điểm (${playerPoints})`;
            }
        }

        // Cộng tiền cho player nếu thắng hoặc hòa
        if (playerWinAmount > 0) {
            await updateUserRin(pdata.user.id, playerWinAmount);
        }

        embed.addFields({ 
            name: pdata.user.displayName, 
            value: `${playerMsg}\n${outcome}`, 
            inline: false 
        });
    }

    // Tính toán tiền cho nhà cái (tiền thắng trừ tiền thua)
    const hostNetWinnings = totalHostWinnings - totalHostLosses;
    
    // Cập nhật tiền cho nhà cái
    if (hostNetWinnings > 0) {
        await updateUserRin(game.host.id, hostNetWinnings);
        embed.addFields({ 
            name: '💰 Nhà cái', 
            value: `🎉 Thắng ròng: +${hostNetWinnings} Rin`, 
            inline: false 
        });
    } else if (hostNetWinnings < 0) {
        // Nhà cái thua tiền (không cần trừ vì đã tính toán sẵn)
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

    await channel.send({ embeds: [embed] });
    delete global.games[channelId];
}

// Handle bet button
async function handleBetButton(interaction, channelId) {
    channelId = String(channelId);
    
    const game = global.games[channelId];
    if (!game) {
        return await interaction.update({
            content: '❌ Không tìm thấy game!',
            embeds: [],
            components: []
        });
    }

    // Extract bet amount from customId (bet_channelId_amount)
    const parts = interaction.customId.split('_');
    
    // CustomId format: bet_channelId_amount
    // Tìm phần cuối cùng là amount
    const betAmount = parseInt(parts[parts.length - 1]);

    if (isNaN(betAmount) || betAmount <= 0) {
        return await interaction.update({
            content: '❌ Số tiền không hợp lệ!',
            embeds: [],
            components: []
        });
    }

    const userRin = await getUserRin(interaction.user.id);
    
    if (userRin < betAmount) {
        return await interaction.update({
            content: `❌ Bạn không đủ ${betAmount} Rin! (Hiện có: ${userRin} Rin)`,
            embeds: [],
            components: []
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
        .setDescription(`**${interaction.user.displayName}** đã tham gia với **${betAmount} Rin**!`)
        .setColor('#00FF00');

    await interaction.update({ 
        embeds: [embed], 
        components: [] 
    });
    
    // Update main message
    if (game.gameMessage) {
        await updateGameMessage(game.gameMessage, channelId);
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
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Export functions để sử dụng từ xjrin
    calculatePoints,
    checkSpecialHand,
    startNextTurn,
    endGame
}; 