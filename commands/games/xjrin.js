const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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

// Action View class
class ActionView {
    static create(isHost) {
        const viewButton = new ButtonBuilder()
            .setCustomId('view_cards')
            .setLabel('👀 Xem bài')
            .setStyle(ButtonStyle.Primary);

        const drawButton = new ButtonBuilder()
            .setCustomId('draw_card')
            .setLabel('🃏 Kéo bài')
            .setStyle(ButtonStyle.Success);

        const stopButton = new ButtonBuilder()
            .setCustomId('stop_turn')
            .setLabel('🛑 Dằn bài')
            .setStyle(ButtonStyle.Secondary);

        return new ActionRowBuilder().addComponents(viewButton, drawButton, stopButton);
    }

    static async handleInteraction(interaction, channelId) {
        try {
            // Kiểm tra game tồn tại
            const game = global.games[channelId];
            if (!game) {
                if (!interaction.replied && !interaction.deferred) {
                    return await interaction.reply({ content: '❌ Không tìm thấy game!', flags: 64 });
                }
                return;
            }

            // Kiểm tra game đã bắt đầu
            if (!game.started) {
                if (!interaction.replied && !interaction.deferred) {
                    return await interaction.reply({ content: '❌ Game chưa bắt đầu!', flags: 64 });
                }
                return;
            }

            const currentPlayerId = game.playerOrder[game.currentPlayerIndex];
            
            // Kiểm tra lượt
            if (interaction.user.id !== currentPlayerId) {
                if (!interaction.replied && !interaction.deferred) {
                    return await interaction.reply({ content: '⛔ Chưa tới lượt bạn!', flags: 64 });
                }
                return;
            }
            
            const isHost = currentPlayerId === game.host.id;
            const cards = isHost ? game.hostCards : game.players[currentPlayerId].cards;
            
            if (interaction.customId === 'view_cards') {
                const points = calculatePoints(cards);
                const special = checkSpecialHand(cards);

                let msg = `Bài: ${cards.map(getCardString).join(', ')} (${points} điểm)`;
                if (special) msg += ` - ${special}`;

                const embed = new EmbedBuilder()
                    .setTitle('🃏 Bài của bạn')
                    .setDescription(msg)
                    .setColor('#0099FF');

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [embed], flags: 64 });
                }
            }

            else if (interaction.customId === 'draw_card') {
                if (cards.length >= 5) {
                    if (!interaction.replied && !interaction.deferred) {
                        return await interaction.reply({ content: '❌ Bạn đã đủ 5 lá!', flags: 64 });
                    }
                    return;
                }

                const newCard = game.deck.pop();
                cards.push(newCard);

                const points = calculatePoints(cards);
                const special = checkSpecialHand(cards);

                let msg = `Kéo: **${getCardString(newCard)}**\nBài hiện tại: ${cards.map(getCardString).join(', ')} (${points} điểm)`;
                if (special) msg += ` - **${special}**`;

                const embed = new EmbedBuilder()
                    .setTitle('🃏 Kéo bài')
                    .setDescription(msg)
                    .setColor('#0099FF');

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [embed], flags: 64 });
                }

                // Tự động kết thúc nếu quắc nặng
                if (points >= 28) {
                    setTimeout(async () => {
                        if (isHost) {
                            game.hostDone = true;
                            await endGameFromXjrin(interaction.channel, channelId);
                        } else {
                            game.players[currentPlayerId].done = true;
                            game.currentPlayerIndex++;
                            await startNextTurnFromXjrin(interaction.channel, channelId);
                        }
                    }, 2000);
                }
            }

            else if (interaction.customId === 'stop_turn') {
                if (isHost) {
                    game.hostDone = true;
                    const embed = new EmbedBuilder()
                        .setTitle('🏠 Nhà cái dằn bài!')
                        .setDescription('Đang lật bài và tổng kết kết quả...')
                        .setColor('#0099FF');

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ embeds: [embed] });
                    }
                    
                    setTimeout(async () => {
                        await endGameFromXjrin(interaction.channel, channelId);
                    }, 1500);
                } else {
                    game.players[currentPlayerId].done = true;
                    game.currentPlayerIndex++;

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Dằn bài!')
                        .setDescription('Bạn đã dằn bài thành công!')
                        .setColor('#00FF00');

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ embeds: [embed], flags: 64 });
                    }
                    
                    setTimeout(async () => {
                        await startNextTurnFromXjrin(interaction.channel, channelId);
                    }, 1500);
                }
            }
        } catch (error) {
            console.error('Error in ActionView.handleInteraction:', error);
        }
    }
}

async function startNextTurnFromXjrin(channel, channelId) {
    const game = global.games[channelId];
    if (!game) return;

    if (game.currentPlayerIndex >= game.playerOrder.length) {
        return await endGameFromXjrin(channel, channelId);
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

async function endGameFromXjrin(channel, channelId) {
    // Sử dụng endGame từ xjgo.js
    const xjgoCommand = require('./xjgo');
    if (xjgoCommand.endGame) {
        await xjgoCommand.endGame(channel, channelId);
        return;
    }
    
    // Fallback implementation nếu không có function
    const game = global.games[channelId];
    if (!game) return;

    const { updateUserRin } = require('../../utils/database');
    const { calculatePoints, checkSpecialHand } = require('./xjgo');

    const hostPoints = calculatePoints(game.hostCards);
    const hostSpecial = checkSpecialHand(game.hostCards);

    const embed = new EmbedBuilder()
        .setTitle('🎲 KẾT QUẢ XÌ DÁCH')
        .setColor('#0099FF');

    let hostMsg = `Nhà cái: ${game.hostCards.map(getCardString).join(', ')} (${hostPoints} điểm)`;
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

        // Áp dụng luật mới
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
        } else if (hostSpecial === "Ngũ Linh") {
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
            // Logic điểm thường với luật mới
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

    // Cập nhật tiền cho nhà cái
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

    await channel.send({ embeds: [embed] });
    delete global.games[channelId];
}

module.exports = {
    name: 'xjrin',
    description: 'Rút bài trong game Xì Dách',
    async execute(message, args) {
        try {
            const channelId = message.channel.id;
            const game = global.games[channelId];

            if (!game) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Không có bàn nào!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            if (!game.started) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Chưa bắt đầu trận!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            const currentPlayerId = game.playerOrder[game.currentPlayerIndex];
            if (message.author.id !== currentPlayerId) {
                const embed = new EmbedBuilder()
                    .setTitle('⛔ Lỗi!')
                    .setDescription('Chưa tới lượt bạn!')
                    .setColor('#FF0000');
                return await message.reply({ embeds: [embed] });
            }

            const isHost = currentPlayerId === game.host.id;
            const actionView = ActionView.create(isHost);

            const embed = new EmbedBuilder()
                .setTitle('🎴 Hành động')
                .setDescription(`${message.author} mở giao diện!`)
                .setColor('#0099FF');

            await message.reply({ embeds: [embed], components: [actionView] });

        } catch (error) {
            console.error('Lỗi xjrin:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Export ActionView để có thể sử dụng từ bên ngoài
    ActionView
}; 