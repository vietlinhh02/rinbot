const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { BOARD, CHANCE_CARDS, COMMUNITY_CHEST_CARDS } = require('../../utils/constants');

// Game rooms storage
const rooms = new Map();

// Utility functions
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getRandomCard(cards) {
    return cards[Math.floor(Math.random() * cards.length)];
}

// Create game board status
function createBoardStatus(channelId) {
    const room = rooms.get(channelId);
    if (!room) return null;

    let status = '🎲 **CỜ TỶ PHÚ - BẢNG TRẠNG THÁI**\n\n';
    
    // Players info
    for (const [userId, player] of Object.entries(room.players)) {
        const position = BOARD[player.position];
        status += `👤 **${player.user.displayName}**\n`;
        status += `💰 ${player.money} Nene | 📍 ${position.name}\n\n`;
    }

    return status;
}

// Handle property interaction
async function handleProperty(channel, channelId, playerId) {
    const room = rooms.get(channelId);
    const player = room.players[playerId];
    const position = BOARD[player.position];

    if (position.type === 'land') {
        // Check if property is owned
        const owner = room.properties[player.position];
        
        if (!owner) {
            // Property is available for purchase
            if (player.money >= position.price) {
                const embed = new EmbedBuilder()
                    .setTitle('🏠 Mua đất?')
                    .setDescription(`**${position.name}**\nGiá: ${position.price} Nene\nTiền của bạn: ${player.money} Nene`)
                    .setColor('#0099FF');

                const buyButton = new ButtonBuilder()
                    .setCustomId(`buy_property_${playerId}`)
                    .setLabel('💰 Mua')
                    .setStyle(ButtonStyle.Success);

                const skipButton = new ButtonBuilder()
                    .setCustomId(`skip_property_${playerId}`)
                    .setLabel('❌ Bỏ qua')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(buyButton, skipButton);
                await channel.send({ embeds: [embed], components: [row] });
                return true; // Wait for user action
            }
        } else if (owner !== playerId) {
            // Pay rent
            const rent = position.rent[0]; // Base rent
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
        await handleChanceCard(channel, playerId, card);
    } else if (position.type === 'community_chest') {
        const card = getRandomCard(COMMUNITY_CHEST_CARDS);
        await handleCommunityCard(channel, playerId, card);
    }

    return false; // Continue turn
}

// Handle chance card
async function handleChanceCard(channel, playerId, card) {
    const room = rooms.get(channel.id);
    const player = room.players[playerId];
    const [description, effect] = card;

    const embed = new EmbedBuilder()
        .setTitle('🎴 Thẻ Hên Xui!')
        .setDescription(description)
        .setColor('#FF69B4');

    if (typeof effect === 'number') {
        player.money += effect;
        embed.addFields({ name: 'Kết quả', value: `${effect > 0 ? '+' : ''}${effect} Nene`, inline: false });
    } else if (effect === 'jail') {
        player.position = 7; // Jail position
        player.inJail = true;
        embed.addFields({ name: 'Kết quả', value: 'Vào tù!', inline: false });
    } else if (effect === 'extra_turn') {
        room.extraTurn = true;
        embed.addFields({ name: 'Kết quả', value: 'Được lượt đi nữa!', inline: false });
    }

    await channel.send({ embeds: [embed] });
}

// Handle community card
async function handleCommunityCard(channel, playerId, card) {
    const room = rooms.get(channel.id);
    const player = room.players[playerId];
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

// Next turn
async function nextTurn(channel, channelId) {
    const room = rooms.get(channelId);
    if (!room) return;

    if (!room.extraTurn) {
        room.currentTurn = (room.currentTurn + 1) % room.turnOrder.length;
    }
    room.extraTurn = false;

    const currentPlayerId = room.turnOrder[room.currentTurn];
    const currentPlayer = room.players[currentPlayerId];

    // Check if game should end (someone bankrupt or time limit)
    if (currentPlayer.money <= 0) {
        await endGame(channel, channelId);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎯 Lượt tiếp theo!')
        .setDescription(`Lượt của ${currentPlayer.user.displayName}!\nBấm nút để tung xúc xắc!`)
        .setColor('#0099FF');

    const rollButton = new ButtonBuilder()
        .setCustomId(`roll_dice_${currentPlayerId}`)
        .setLabel('🎲 Tung xúc xắc')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(rollButton);
    await channel.send({ embeds: [embed], components: [row] });

    // Update status
    const statusEmbed = new EmbedBuilder()
        .setDescription(createBoardStatus(channelId))
        .setColor('#FFD700');
    
    if (room.statusMessage) {
        await room.statusMessage.edit({ embeds: [statusEmbed] });
    }
}

// End game
async function endGame(channel, channelId) {
    const room = rooms.get(channelId);
    if (!room) return;

    // Find winner (player with most money)
    let winner = null;
    let maxMoney = -1;

    for (const [userId, player] of Object.entries(room.players)) {
        if (player.money > maxMoney) {
            maxMoney = player.money;
            winner = player;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🏆 KẾT THÚC CỜ TỶ PHÚ!')
        .setColor('#FFD700');

    if (winner) {
        embed.setDescription(`🎉 **${winner.user.displayName}** chiến thắng với **${maxMoney} Nene**!`);
        
        // Give Rin reward for winner (optional)
        const rinReward = 500; // 500 Rin reward
        await updateUserRin(winner.user.id, rinReward);
        embed.addFields({ name: 'Phần thưởng', value: `+${rinReward} Rin cho người thắng!`, inline: false });
    }

    // Final rankings
    const rankings = Object.values(room.players)
        .sort((a, b) => b.money - a.money)
        .map((player, index) => `${index + 1}. ${player.user.displayName}: ${player.money} Nene`)
        .join('\n');

    embed.addFields({ name: 'Bảng xếp hạng', value: rankings, inline: false });

    await channel.send({ embeds: [embed] });
    rooms.delete(channelId);
}

module.exports = {
    name: 'typhu',
    description: 'Mở phòng Cờ Tỷ Phú',
    
    async execute(message, args) {
        const channelId = message.channel.id;

        if (rooms.has(channelId)) {
            return message.reply('❌ Đã có phòng Cờ Tỷ Phú trong kênh này!');
        }

        const room = {
            host: message.author,
            players: {},
            properties: {}, // position -> ownerId
            started: false,
            currentTurn: 0,
            turnOrder: [],
            extraTurn: false,
            statusMessage: null
        };

        rooms.set(channelId, room);

        const embed = new EmbedBuilder()
            .setTitle('🎲 CỜ TỶ PHÚ ĐANG MỞ!')
            .setDescription('Bấm để tham gia game!\n\n' +
                '💰 **Phí tham gia:** 100 Rin\n' +
                '💎 **Tiền khởi đầu:** 2000 Nene (trong game)\n' +
                '🏆 **Phần thưởng:** 500 Rin cho người thắng!\n\n' +
                '⚠️ **Lưu ý:** Nene chỉ dùng trong game, hết tiền = thua!')
            .addFields({ name: 'Chủ phòng', value: message.author.toString(), inline: false })
            .setColor('#0099FF');

        const joinButton = new ButtonBuilder()
            .setCustomId('tp_join')
            .setLabel('🎟️ Tham gia')
            .setStyle(ButtonStyle.Success);

        const startButton = new ButtonBuilder()
            .setCustomId('tp_start')
            .setLabel('🚀 Bắt đầu')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(joinButton, startButton);
        const gameMessage = await message.reply({ embeds: [embed], components: [row] });

        // Collector for interactions
        const collector = gameMessage.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async (interaction) => {
            await this.handleInteraction(interaction);
        });

        collector.on('end', () => {
            if (rooms.has(channelId) && !rooms.get(channelId).started) {
                rooms.delete(channelId);
            }
        });
    },

    async handleInteraction(interaction) {
        const channelId = interaction.channel.id;
        const room = rooms.get(channelId);

        if (!room) {
            try {
                await interaction.reply({ content: '❌ Phòng không tồn tại!', ephemeral: true });
            } catch {}
            return;
        }

        if (interaction.customId === 'tp_join') {
            if (room.started) {
                try {
                    await interaction.reply({ content: '❌ Game đã bắt đầu, không thể tham gia!', ephemeral: true });
                } catch {}
                return;
            }

            if (interaction.user.id in room.players) {
                try {
                    await interaction.reply({ content: '❌ Bạn đã tham gia rồi!', ephemeral: true });
                } catch {}
                return;
            }

            // Kiểm tra tối đa 8 người chơi
            if (Object.keys(room.players).length >= 8) {
                try {
                    await interaction.reply({ content: '❌ Phòng đã đầy! Tối đa 8 người chơi.', ephemeral: true });
                } catch {}
                return;
            }

            // Chỉ cần kiểm tra Rin để tham gia
            const userRin = await getUserRin(interaction.user.id);
            if (userRin < 100) {
                try {
                    await interaction.reply({ content: '❌ Bạn cần 100 Rin để tham gia!', ephemeral: true });
                } catch {}
                return;
            }

            // Trừ phí tham gia (Rin)
            await updateUserRin(interaction.user.id, -100);

            room.players[interaction.user.id] = {
                user: interaction.user,
                money: 2000, // Bắt đầu với 2000 Nene trong game
                position: 0,
                inJail: false,
                properties: []
            };

            const embed = new EmbedBuilder()
                .setTitle('✅ Tham gia thành công!')
                .setDescription(`${interaction.user.displayName} đã tham gia game!\n\n` +
                    `💰 **Phí tham gia:** -100 Rin\n` +
                    `💎 **Tiền khởi đầu:** 2000 Nene (trong game)`)
                .setColor('#00FF00');

            try {
                await interaction.reply({ embeds: [embed] });
            } catch {}
            return;

        } else if (interaction.customId === 'tp_start') {
            if (room.started) {
                try {
                    await interaction.reply({ content: '❌ Game đã bắt đầu rồi!', ephemeral: true });
                } catch {}
                return;
            }

            if (interaction.user.id !== room.host.id) {
                try {
                    await interaction.reply({ content: '⛔ Chỉ chủ phòng được bắt đầu!', ephemeral: true });
                } catch {}
                return;
            }

            if (Object.keys(room.players).length < 2) {
                try {
                    await interaction.reply({ content: '❌ Cần ít nhất 2 người chơi để bắt đầu!', ephemeral: true });
                } catch {}
                return;
            }

            room.started = true;
            room.turnOrder = Object.keys(room.players);

            const embed = new EmbedBuilder()
                .setTitle('🎲 CỜ TỶ PHÚ BẮT ĐẦU!')
                .setDescription('Game đã khởi động! Mọi người bắt đầu với 2000 Nene!\n\n' +
                    '🏆 **Người thắng sẽ nhận 500 Rin!**\n' +
                    '💸 **Hết Nene = Thua cuộc!**')
                .setColor('#0099FF');

            try {
                await interaction.reply({ embeds: [embed] });
            } catch {}

            // Start status tracking
            const statusEmbed = new EmbedBuilder()
                .setDescription(createBoardStatus(channelId))
                .setColor('#FFD700');
            try {
                room.statusMessage = await interaction.followUp({ embeds: [statusEmbed] });
            } catch {}

            // Start first turn
            await nextTurn(interaction.channel, channelId);
            return;

        } else if (interaction.customId.startsWith('roll_dice_')) {
            const playerId = interaction.customId.split('_')[2];
            if (!room.started) {
                try {
                    await interaction.reply({ content: '❌ Game chưa bắt đầu!', ephemeral: true });
                } catch {}
                return;
            }
            if (interaction.user.id !== playerId) {
                try {
                    await interaction.reply({ content: '⛔ Không phải lượt của bạn!', ephemeral: true });
                } catch {}
                return;
            }
            if (room.turnOrder[room.currentTurn] !== playerId) {
                try {
                    await interaction.reply({ content: '⛔ Chưa đến lượt của bạn!', ephemeral: true });
                } catch {}
                return;
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
                .addFields(
                    { name: 'Vị trí mới', value: BOARD[player.position].name, inline: false }
                )
                .setColor('#0099FF');
            try {
                await interaction.reply({ embeds: [embed] });
            } catch {}
            // Handle current position
            const needsWait = await handleProperty(interaction.channel, channelId, playerId);
            if (!needsWait) {
                setTimeout(() => nextTurn(interaction.channel, channelId), 2000);
            }
            return;
        } else if (interaction.customId.startsWith('buy_property_')) {
            const playerId = interaction.customId.split('_')[2];
            if (interaction.user.id !== playerId) {
                try {
                    await interaction.reply({ content: '⛔ Không phải lượt của bạn!', ephemeral: true });
                } catch {}
                return;
            }
            const player = room.players[playerId];
            const position = BOARD[player.position];
            player.money -= position.price;
            room.properties[player.position] = playerId;
            const embed = new EmbedBuilder()
                .setTitle('🏠 Mua đất thành công!')
                .setDescription(`${interaction.user.displayName} đã mua **${position.name}** với giá ${position.price} Nene!`)
                .setColor('#00FF00');
            try {
                await interaction.reply({ embeds: [embed] });
            } catch {}
            setTimeout(() => nextTurn(interaction.channel, channelId), 2000);
            return;
        } else if (interaction.customId.startsWith('skip_property_')) {
            const playerId = interaction.customId.split('_')[2];
            if (interaction.user.id !== playerId) {
                try {
                    await interaction.reply({ content: '⛔ Không phải lượt của bạn!', ephemeral: true });
                } catch {}
                return;
            }
            const embed = new EmbedBuilder()
                .setTitle('❌ Bỏ qua mua đất')
                .setDescription(`${interaction.user.displayName} đã bỏ qua cơ hội mua đất!`)
                .setColor('#FF0000');
            try {
                await interaction.reply({ embeds: [embed] });
            } catch {}
            setTimeout(() => nextTurn(interaction.channel, channelId), 1000);
            return;
        }
    }
};