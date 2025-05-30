const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { BOARD, CHANCE_CARDS, COMMUNITY_CHEST_CARDS } = require('../../utils/constants');

// Game rooms storage for bot games
const botRooms = new Map();

// Timeout settings
const GAME_TIMEOUT = 10 * 60 * 1000; // 10 phút timeout
const PLAYER_TURN_TIMEOUT = 45 * 1000; // 45 giây cho mỗi lượt

// Bot AI configuration
const BOT_PERSONALITY = {
    name: "💰 RinBot Tycoon",
    avatar: "🤖",
    strategy: "aggressive", // conservative, balanced, aggressive
    initialMoney: 1500,
    buyThreshold: 0.7, // Will buy if money > threshold * price
    riskFactor: 0.8 // Higher = more aggressive
};

// Utility functions
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getRandomCard(cards) {
    return cards[Math.floor(Math.random() * cards.length)];
}

// Bot AI decision making
function botShouldBuyProperty(bot, property) {
    const { money } = bot;
    const { price } = property;
    
    // Basic affordability check
    if (money < price * BOT_PERSONALITY.buyThreshold) return false;
    
    // Strategy-based decisions
    switch (BOT_PERSONALITY.strategy) {
        case 'conservative':
            return money > price * 2 && Math.random() < 0.4;
        case 'balanced':
            return money > price * 1.5 && Math.random() < 0.6;
        case 'aggressive':
            return money > price && Math.random() < 0.8;
        default:
            return Math.random() < 0.5;
    }
}

// Create game board status
function createBoardStatus(channelId) {
    const room = botRooms.get(channelId);
    if (!room) return null;

    let status = '🎲 **CỜ TỶ PHÚ BOT - BẢNG TRẠNG THÁI**\n\n';
    
    // Bot info first
    const botPosition = BOARD[room.bot.position];
    status += `🤖 **${BOT_PERSONALITY.name}**\n`;
    status += `💰 ${room.bot.money} Nene | 📍 ${botPosition.name}\n\n`;
    
    // Players info
    for (const [userId, player] of Object.entries(room.players)) {
        const position = BOARD[player.position];
        status += `👤 **${player.user.displayName}**\n`;
        status += `💰 ${player.money} Nene | 📍 ${position.name}\n\n`;
    }

    return status;
}

// Handle property interaction for bot
async function handleBotProperty(channel, channelId) {
    const room = botRooms.get(channelId);
    const bot = room.bot;
    const position = BOARD[bot.position];

    await new Promise(resolve => setTimeout(resolve, 1500)); // Bot thinking time

    if (position.type === 'land') {
        const owner = room.properties[bot.position];
        
        if (!owner) {
            // Bot decides whether to buy
            if (botShouldBuyProperty(bot, position)) {
                bot.money -= position.price;
                room.properties[bot.position] = 'bot';

                const embed = new EmbedBuilder()
                    .setTitle('🤖 Bot mua đất!')
                    .setDescription(`${BOT_PERSONALITY.name} đã mua **${position.name}** với giá ${position.price} Nene!`)
                    .setColor('#00FF00');

                await channel.send({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('🤖 Bot bỏ qua')
                    .setDescription(`${BOT_PERSONALITY.name} quyết định không mua **${position.name}**.`)
                    .setColor('#FFA500');

                await channel.send({ embeds: [embed] });
            }
        } else if (owner !== 'bot') {
            // Bot pays rent to player
            const rent = position.rent[0];
            bot.money -= rent;
            
            if (owner in room.players) {
                room.players[owner].money += rent;
                
                const embed = new EmbedBuilder()
                    .setTitle('💸 Bot trả tiền thuê!')
                    .setDescription(`${BOT_PERSONALITY.name} trả ${rent} Nene cho ${room.players[owner].user.displayName}`)
                    .setColor('#FF4500');

                await channel.send({ embeds: [embed] });
            }
        }
    } else if (position.type === 'chance') {
        const card = getRandomCard(CHANCE_CARDS);
        await handleBotChanceCard(channel, card, room);
    } else if (position.type === 'community_chest') {
        const card = getRandomCard(COMMUNITY_CHEST_CARDS);
        await handleBotCommunityCard(channel, card, room);
    }
}

// Handle bot chance card
async function handleBotChanceCard(channel, card, room) {
    const bot = room.bot;
    const [description, effect] = card;

    const embed = new EmbedBuilder()
        .setTitle('🎴 Bot rút Thẻ Hên Xui!')
        .setDescription(`${BOT_PERSONALITY.name}: ${description}`)
        .setColor('#FF69B4');

    if (typeof effect === 'number') {
        bot.money += effect;
        embed.addFields({ name: 'Kết quả', value: `${effect > 0 ? '+' : ''}${effect} Nene`, inline: false });
    } else if (effect === 'jail') {
        bot.position = 7; // Jail position
        bot.inJail = true;
        embed.addFields({ name: 'Kết quả', value: 'Bot vào tù!', inline: false });
    } else if (effect === 'extra_turn') {
        room.extraTurn = true;
        embed.addFields({ name: 'Kết quả', value: 'Bot được lượt đi nữa!', inline: false });
    }

    await channel.send({ embeds: [embed] });
}

// Handle bot community card
async function handleBotCommunityCard(channel, card, room) {
    const bot = room.bot;
    const [description, effect] = card;

    const embed = new EmbedBuilder()
        .setTitle('🎁 Bot rút Ô Vận Mệnh!')
        .setDescription(`${BOT_PERSONALITY.name}: ${description}`)
        .setColor('#00FF00');

    if (typeof effect === 'number') {
        bot.money += effect;
        embed.addFields({ name: 'Kết quả', value: `+${effect} Nene`, inline: false });
    }

    await channel.send({ embeds: [embed] });
}

// Bot turn logic
async function playBotTurn(channel, channelId) {
    const room = botRooms.get(channelId);
    
    const embed = new EmbedBuilder()
        .setTitle('🤖 Lượt của Bot!')
        .setDescription(`${BOT_PERSONALITY.name} đang suy nghĩ...`)
        .setColor('#0099FF');

    await channel.send({ embeds: [embed] });
    
    // Bot thinking delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Bot rolls dice
    const dice1 = rollDice();
    const dice2 = rollDice();
    const total = dice1 + dice2;

    const bot = room.bot;
    bot.position = (bot.position + total) % BOARD.length;

    // Pass start bonus
    if (bot.position + total >= BOARD.length) {
        bot.money += 200;
    }

    const rollEmbed = new EmbedBuilder()
        .setTitle('🎲 Bot tung xúc xắc!')
        .setDescription(`${BOT_PERSONALITY.name} tung được: ${dice1} + ${dice2} = ${total}`)
        .addFields({ name: 'Vị trí mới', value: BOARD[bot.position].name, inline: false })
        .setColor('#0099FF');

    await channel.send({ embeds: [rollEmbed] });

    // Handle bot's current position
    await handleBotProperty(channel, channelId);
    
    // Continue to next turn
    setTimeout(() => nextTurn(channel, channelId), 3000);
}

// Handle property interaction for players
async function handleProperty(channel, channelId, playerId) {
    const room = botRooms.get(channelId);
    const player = room.players[playerId];
    const position = BOARD[player.position];

    if (position.type === 'land') {
        const owner = room.properties[player.position];
        
        if (!owner) {
            // Property is available for purchase
            if (player.money >= position.price) {
                const embed = new EmbedBuilder()
                    .setTitle('🏠 Mua đất?')
                    .setDescription(`**${position.name}**\nGiá: ${position.price} Nene\nTiền của bạn: ${player.money} Nene`)
                    .setColor('#0099FF');

                const buyButton = new ButtonBuilder()
                    .setCustomId(`tpbot_buy_property_${playerId}`)
                    .setLabel('💰 Mua')
                    .setStyle(ButtonStyle.Success);

                const skipButton = new ButtonBuilder()
                    .setCustomId(`tpbot_skip_property_${playerId}`)
                    .setLabel('❌ Bỏ qua')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(buyButton, skipButton);
                await channel.send({ embeds: [embed], components: [row] });
                return true; // Wait for user action
            }
        } else if (owner === 'bot') {
            // Pay rent to bot
            const rent = position.rent[0];
            player.money -= rent;
            room.bot.money += rent;

            const embed = new EmbedBuilder()
                .setTitle('💸 Trả tiền thuê cho Bot!')
                .setDescription(`${player.user.displayName} trả ${rent} Nene cho ${BOT_PERSONALITY.name}`)
                .setColor('#FF4500');

            await channel.send({ embeds: [embed] });
        } else if (owner !== playerId) {
            // Pay rent to another player
            const rent = position.rent[0];
            player.money -= rent;
            room.players[owner].money += rent;

            const embed = new EmbedBuilder()
                .setTitle('💸 Trả tiền thuê!')
                .setDescription(`${player.user.displayName} trả ${rent} Nene cho ${room.players[owner].user.displayName}`)
                .setColor('#FF4500');

            await channel.send({ embeds: [embed] });
        }
    } else if (position.type === 'chance') {
        const card = getRandomCard(CHANCE_CARDS);
        // Handle player chance card (similar to bot)
        const [description, effect] = card;
        
        const embed = new EmbedBuilder()
            .setTitle('🎴 Thẻ Hên Xui!')
            .setDescription(description)
            .setColor('#FF69B4');

        if (typeof effect === 'number') {
            player.money += effect;
            embed.addFields({ name: 'Kết quả', value: `${effect > 0 ? '+' : ''}${effect} Nene`, inline: false });
        }

        await channel.send({ embeds: [embed] });
    } else if (position.type === 'community_chest') {
        const card = getRandomCard(COMMUNITY_CHEST_CARDS);
        // Handle player community card
        const [description, effect] = card;
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 Ô Vận Mệnh!')
            .setDescription(description)
            .setColor('#00FF00');

        if (typeof effect === 'number') {
            player.money += effect;
            embed.addFields({ name: 'Kết quả', value: `+${effect} Nene`, inline: false });
        }

        await channel.send({ embeds: [embed] });
    }

    return false; // Continue turn
}

// Next turn (including bot)
async function nextTurn(channel, channelId) {
    const room = botRooms.get(channelId);
    if (!room) return;

    if (!room.extraTurn) {
        room.currentTurn = (room.currentTurn + 1) % room.turnOrder.length;
    }
    room.extraTurn = false;

    const currentTurnId = room.turnOrder[room.currentTurn];

    // Check if it's bot's turn
    if (currentTurnId === 'bot') {
        await playBotTurn(channel, channelId);
        return;
    }

    const currentPlayer = room.players[currentTurnId];

    // Check if game should end
    if (currentPlayer.money <= 0 || room.bot.money <= 0) {
        await endGame(channel, channelId);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎯 Lượt tiếp theo!')
        .setDescription(`Lượt của ${currentPlayer.user.displayName}!\nBấm nút để tung xúc xắc!\n⏰ Bạn có 45 giây để hành động.`)
        .setColor('#0099FF');

    const rollButton = new ButtonBuilder()
        .setCustomId(`tpbot_roll_dice_${currentTurnId}`)
        .setLabel('🎲 Tung xúc xắc')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(rollButton);
    await channel.send({ embeds: [embed], components: [row] });

    // Set timeout cho lượt này
    room.turnTimeout = setTimeout(async () => {
        await timeoutCurrentPlayer(channel, channelId);
    }, PLAYER_TURN_TIMEOUT);

    // Update status
    const statusEmbed = new EmbedBuilder()
        .setDescription(createBoardStatus(channelId))
        .setColor('#FFD700');
    
    if (room.statusMessage) {
        await room.statusMessage.edit({ embeds: [statusEmbed] });
    }
}

// End game with bot
async function endGame(channel, channelId) {
    const room = botRooms.get(channelId);
    if (!room) return;

    // Find winner (player with most money including bot)
    let winner = null;
    let maxMoney = -1;

    // Check bot
    if (room.bot.money > maxMoney) {
        maxMoney = room.bot.money;
        winner = { type: 'bot', ...room.bot };
    }

    // Check players
    for (const [userId, player] of Object.entries(room.players)) {
        if (player.money > maxMoney) {
            maxMoney = player.money;
            winner = { type: 'player', ...player };
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🏆 KẾT THÚC CỜ TỶ PHÚ BOT!')
        .setColor('#FFD700');

    if (winner.type === 'bot') {
        embed.setDescription(`🤖 **${BOT_PERSONALITY.name}** chiến thắng với **${maxMoney} Nene**!\n\nBot đã chứng minh AI thông minh hơn con người! 🧠`);
    } else {
        embed.setDescription(`🎉 **${winner.user.displayName}** chiến thắng với **${maxMoney} Nene**!\n\nBạn đã đánh bại được Bot AI! 🏆`);
        // Give reward to human winner
        await updateUserRin(winner.user.id, 750); // Higher reward for beating bot
        embed.addFields({ name: 'Phần thưởng', value: '+750 Rin cho người thắng Bot!', inline: false });
    }

    // Final rankings including bot
    const allCompetitors = [
        { name: BOT_PERSONALITY.name, money: room.bot.money, type: 'bot' },
        ...Object.values(room.players).map(p => ({ name: p.user.displayName, money: p.money, type: 'player' }))
    ];

    const rankings = allCompetitors
        .sort((a, b) => b.money - a.money)
        .map((comp, index) => {
            const icon = comp.type === 'bot' ? '🤖' : '👤';
            return `${index + 1}. ${icon} ${comp.name}: ${comp.money} Nene`;
        })
        .join('\n');

    embed.addFields({ name: 'Bảng xếp hạng', value: rankings, inline: false });

    await channel.send({ embeds: [embed] });

    // Clear all timeouts
    if (room.gameTimeout) clearTimeout(room.gameTimeout);
    if (room.turnTimeout) clearTimeout(room.turnTimeout);

    botRooms.delete(channelId);
}

// Timeout functions
async function timeoutCurrentPlayer(channel, channelId) {
    const room = botRooms.get(channelId);
    if (!room || !room.started) return;

    const currentTurnId = room.turnOrder[room.currentTurn];
    if (currentTurnId === 'bot') return; // Bot không bị timeout

    const currentPlayer = room.players[currentTurnId];
    if (!currentPlayer) return;

    const embed = new EmbedBuilder()
        .setTitle('⏰ Timeout!')
        .setDescription(`${currentPlayer.user.displayName} đã quá thời gian (45s) và bị bỏ lượt!`)
        .setColor('#FF0000');

    await channel.send({ embeds: [embed] });

    // Clear timeout
    room.turnTimeout = null;

    // Skip to next turn
    setTimeout(() => nextTurn(channel, channelId), 2000);
}

// Timeout toàn game
async function timeoutGame(channel, channelId) {
    const room = botRooms.get(channelId);
    if (!room) return;

    const embed = new EmbedBuilder()
        .setTitle('⏰ GAME TIMEOUT!')
        .setDescription('Game đã quá 10 phút và bị hủy! Tất cả người chơi bị xử thua.\n💰 Phí tham gia (100 Rin) sẽ không được hoàn lại.')
        .setColor('#FF0000');

    let lostAmountText = '';
    for (const [userId, player] of Object.entries(room.players)) {
        lostAmountText += `${player.user.displayName}: -100 Rin\n`;
    }

    if (lostAmountText) {
        embed.addFields({ name: 'Tiền mất do timeout', value: lostAmountText, inline: false });
    }

    await channel.send({ embeds: [embed] });

    // Clear all timeouts
    if (room.turnTimeout) clearTimeout(room.turnTimeout);

    // Xóa room
    botRooms.delete(channelId);
}

module.exports = {
    name: 'tpbot',
    description: 'Chơi Cờ Tỷ Phú với Bot AI',
    timeoutGame,
    
    async execute(message, args) {
        const channelId = message.channel.id;

        if (botRooms.has(channelId)) {
            return message.reply('❌ Đã có phòng Cờ Tỷ Phú Bot trong kênh này!');
        }

        const room = {
            host: message.author,
            players: {},
            bot: {
                position: 0,
                money: BOT_PERSONALITY.initialMoney,
                inJail: false,
                properties: []
            },
            properties: {}, // position -> ownerId or 'bot'
            started: false,
            currentTurn: 0,
            turnOrder: [], // Will include 'bot'
            extraTurn: false,
            statusMessage: null,
            gameTimeout: null,
            turnTimeout: null
        };

        botRooms.set(channelId, room);

        const embed = new EmbedBuilder()
            .setTitle('🤖 CỜ TỶ PHÚ BOT AI')
            .setDescription('**Thách đấu với Bot AI thông minh!**\n\nBot sẽ cạnh tranh trực tiếp với bạn!')
            .addFields(
                { name: '🤖 Đối thủ AI', value: `• **Tên**: ${BOT_PERSONALITY.name}\n• **Chiến thuật**: ${BOT_PERSONALITY.strategy}\n• **Tiền khởi đầu**: ${BOT_PERSONALITY.initialMoney} Nene`, inline: false },
                { name: '🎯 Phí tham gia', value: '100 Rin (Thắng Bot: +750 Rin!)', inline: false }
            )
            .setColor('#FF6B35')
            .setThumbnail('https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif');

        const joinButton = new ButtonBuilder()
            .setCustomId('tpbot_join')
            .setLabel('⚔️ Thách đấu Bot')
            .setStyle(ButtonStyle.Primary);

        const startButton = new ButtonBuilder()
            .setCustomId('tpbot_start')
            .setLabel('🚀 Bắt đầu')
            .setStyle(ButtonStyle.Danger);

        // Không có nút hủy cho game bot
        const row = new ActionRowBuilder().addComponents(joinButton, startButton);
        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction) {
        const channelId = interaction.channel.id;
        const room = botRooms.get(channelId);

        if (!room) {
            return interaction.reply({ content: '❌ Phòng không tồn tại!', ephemeral: true });
        }

        if (interaction.customId === 'tpbot_join') {
            if (room.started) {
                return interaction.reply({ content: '❌ Game đã bắt đầu!', ephemeral: true });
            }

            if (interaction.user.id in room.players) {
                return interaction.reply({ content: '❌ Bạn đã tham gia rồi!', ephemeral: true });
            }

            if (Object.keys(room.players).length >= 4) {
                return interaction.reply({ content: '❌ Tối đa 4 người chơi với Bot!', ephemeral: true });
            }

            const userRin = await getUserRin(interaction.user.id);
            if (userRin < 100) {
                return interaction.reply({ content: '❌ Bạn cần 100 Rin để thách đấu Bot!', ephemeral: true });
            }

            await updateUserRin(interaction.user.id, -100);

            room.players[interaction.user.id] = {
                user: interaction.user,
                money: 1500, // Starting money in Nene
                position: 0,
                inJail: false,
                properties: []
            };

            const embed = new EmbedBuilder()
                .setTitle('✅ Thách đấu thành công!')
                .setDescription(`${interaction.user.displayName} đã tham gia thách đấu với Bot AI!`)
                .setColor('#00FF00');

            await interaction.reply({ embeds: [embed] });

        } else if (interaction.customId === 'tpbot_start') {
            if (room.started) {
                return interaction.reply({ content: '❌ Game đã bắt đầu!', ephemeral: true });
            }

            if (interaction.user.id !== room.host.id) {
                return interaction.reply({ content: '⛔ Chỉ chủ phòng được bắt đầu!', ephemeral: true });
            }

            if (Object.keys(room.players).length === 0) {
                return interaction.reply({ content: '❌ Cần ít nhất 1 người chơi để thách đấu Bot!', ephemeral: true });
            }

            room.started = true;
            room.turnOrder = [...Object.keys(room.players), 'bot']; // Bot plays with players

            // Set game timeout (10 phút)
            room.gameTimeout = setTimeout(async () => {
                await this.timeoutGame(interaction.channel, channelId);
            }, GAME_TIMEOUT);

            const embed = new EmbedBuilder()
                .setTitle('🎲 CỜ TỶ PHÚ BOT BẮT ĐẦU!')
                .setDescription(`Cuộc chiến với ${BOT_PERSONALITY.name} bắt đầu! Mọi người bắt đầu với 1500 Nene!\n⏰ Game sẽ tự động kết thúc sau 10 phút.`)
                .setColor('#FF6B35');

            await interaction.reply({ embeds: [embed] });

            // Start status tracking
            const statusEmbed = new EmbedBuilder()
                .setDescription(createBoardStatus(channelId))
                .setColor('#FFD700');
            
            room.statusMessage = await interaction.followUp({ embeds: [statusEmbed] });

            // Start first turn
            await nextTurn(interaction.channel, channelId);

        } else if (interaction.customId.startsWith('tpbot_roll_dice_')) {
            const playerId = interaction.customId.split('_')[3];
            
            if (!room.started) {
                return interaction.reply({ content: '❌ Game chưa bắt đầu!', ephemeral: true });
            }

            if (interaction.user.id !== playerId) {
                return interaction.reply({ content: '⛔ Không phải lượt của bạn!', ephemeral: true });
            }

            if (room.turnOrder[room.currentTurn] !== playerId) {
                return interaction.reply({ content: '⛔ Chưa đến lượt của bạn!', ephemeral: true });
            }

            // Clear turn timeout
            if (room.turnTimeout) {
                clearTimeout(room.turnTimeout);
                room.turnTimeout = null;
            }

            const dice1 = rollDice();
            const dice2 = rollDice();
            const total = dice1 + dice2;

            const player = room.players[playerId];
            player.position = (player.position + total) % BOARD.length;

            // Pass start bonus
            if (player.position + total >= BOARD.length) {
                player.money += 200;
            }

            const embed = new EmbedBuilder()
                .setTitle('🎲 Kết quả tung xúc xắc!')
                .setDescription(`${interaction.user.displayName} tung được: ${dice1} + ${dice2} = ${total}`)
                .addFields({ name: 'Vị trí mới', value: BOARD[player.position].name, inline: false })
                .setColor('#0099FF');

            await interaction.reply({ embeds: [embed] });

            // Handle current position
            const needsWait = await handleProperty(interaction.channel, channelId, playerId);
            
            if (!needsWait) {
                setTimeout(() => nextTurn(interaction.channel, channelId), 2000);
            }

        } else if (interaction.customId.startsWith('tpbot_buy_property_')) {
            const playerId = interaction.customId.split('_')[3];
            
            if (interaction.user.id !== playerId) {
                return interaction.reply({ content: '⛔ Không phải lượt của bạn!', ephemeral: true });
            }

            // Clear turn timeout
            if (room.turnTimeout) {
                clearTimeout(room.turnTimeout);
                room.turnTimeout = null;
            }

            const player = room.players[playerId];
            const position = BOARD[player.position];

            player.money -= position.price;
            room.properties[player.position] = playerId;

            const embed = new EmbedBuilder()
                .setTitle('🏠 Mua đất thành công!')
                .setDescription(`${interaction.user.displayName} đã mua **${position.name}** với giá ${position.price} Nene!`)
                .setColor('#00FF00');

            await interaction.reply({ embeds: [embed] });
            setTimeout(() => nextTurn(interaction.channel, channelId), 2000);

        } else if (interaction.customId.startsWith('tpbot_skip_property_')) {
            const playerId = interaction.customId.split('_')[3];
            
            if (interaction.user.id !== playerId) {
                return interaction.reply({ content: '⛔ Không phải lượt của bạn!', ephemeral: true });
            }

            // Clear turn timeout
            if (room.turnTimeout) {
                clearTimeout(room.turnTimeout);
                room.turnTimeout = null;
            }

            const embed = new EmbedBuilder()
                .setTitle('❌ Bỏ qua mua đất')
                .setDescription(`${interaction.user.displayName} đã bỏ qua cơ hội mua đất!`)
                .setColor('#FF0000');

            await interaction.reply({ embeds: [embed] });
            setTimeout(() => nextTurn(interaction.channel, channelId), 1000);
        }
    }
}; 