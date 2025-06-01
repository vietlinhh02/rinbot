const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { BAU_CUA_ANIMALS, BAU_CUA_EMOJIS } = require('../../utils/constants');

// Lưu trữ các ván game đang diễn ra
const games = new Map();

// Modal để nhập số tiền cược
class BetModal extends ModalBuilder {
    constructor(animal) {
        super();
        this.setCustomId(`bet_modal_${animal}`)
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
            .setCustomId(`bet_${animal}`)
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

// View với nút xác nhận và bắt đầu
class ControlView extends ActionRowBuilder {
    constructor() {
        super();
        this.addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_bet')
                .setLabel('✅ Xác nhận cược')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('start_game')
                .setLabel('🎲 Bắt đầu quay (Chỉ quản trò)')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_game')
                .setLabel('❌ Hủy ván')
                .setStyle(ButtonStyle.Secondary)
        );
    }
}

module.exports = {
    name: 'bcgo',
    description: 'Bắt đầu ván Bầu Cua',

    // Cập nhật embed game để hiển thị người cược
    async updateGameEmbed(interaction, game) {
        try {
            // Tạo danh sách người đã xác nhận cược
            let playerList = '';
            let totalPlayers = 0;
            let totalAmount = 0;

            for (const [userId, userBets] of game.bets) {
                const betTotal = Object.values(userBets).reduce((sum, amount) => sum + amount, 0);
                if (betTotal > 0) {
                    const user = await interaction.client.users.fetch(userId);
                    const betDetails = Object.entries(userBets)
                        .map(([animal, amount]) => `${BAU_CUA_EMOJIS[animal]}${amount}`)
                        .join(' ');
                    playerList += `• **${user.displayName}**: ${betDetails} (${betTotal} Rin)\n`;
                    totalPlayers++;
                    totalAmount += betTotal;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🎰 BẦU CUA ĐANG MỞ')
                .setDescription(`**Quản trò:** ${game.host.displayName}\n\n${totalPlayers > 0 ? `**Người đã cược (${totalPlayers}):**\n${playerList}\n**Tổng số tiền:** ${totalAmount.toLocaleString()} Rin\n\n` : ''}Bấm vào các nút để đặt cược!`)
                .addFields(
                    { name: '📋 Luật chơi:', value: 
                        '• Chọn con vật để cược\n' +
                        '• Quản trò sẽ quay 3 xúc xắc\n' +
                        '• Trúng 1 con: x1 tiền cược\n' +
                        '• Trúng 2 con: x2 tiền cược\n' +
                        '• Trúng 3 con: x4 tiền cược\n' +
                        '• Không trúng: tiền cược trả cho chủ xòng'
                    }
                )
                .setColor(totalPlayers > 0 ? '#00FF00' : '#FFD700')
                .setThumbnail('https://i.pinimg.com/originals/37/27/af/3727afbe6ca619733cba6c07a6c4fcd7.gif');

            const betViews = createBetViews();
            const controlView = new ControlView();

            // Edit message game gốc nếu có messageId
            if (game.messageId) {
                try {
                    const gameMessage = await interaction.channel.messages.fetch(game.messageId);
                    await gameMessage.edit({ embeds: [embed], components: [...betViews, controlView] });
                } catch (error) {
                    console.error('Không thể edit message game:', error);
                }
            }
        } catch (error) {
            console.error('Lỗi update game embed:', error);
        }
    },
    async execute(message, args) {
        const channelId = message.channel.id;
        
        // Kiểm tra xem đã có ván nào chưa
        if (games.has(channelId)) {
            return message.reply('❌ Đã có ván Bầu Cua trong kênh này!');
        }

        // Tạo ván game mới
        games.set(channelId, {
            host: message.author,
            bets: new Map(), // userId -> {animal: amount}
            started: false,
            participants: new Set(),
            messageId: null // Lưu ID message game để edit sau
        });

        const embed = new EmbedBuilder()
            .setTitle('🎰 BẦU CUA ĐANG MỞ')
            .setDescription(`**Quản trò:** ${message.author.displayName}\n\nBấm vào các nút để đặt cược!`)
            .addFields(
                { name: '📋 Luật chơi:', value: 
                    '• Chọn con vật để cược\n' +
                    '• Quản trò sẽ quay 3 xúc xắc\n' +
                    '• Trúng 1 con: x1 tiền cược\n' +
                    '• Trúng 2 con: x2 tiền cược\n' +
                    '• Trúng 3 con: x4 tiền cược\n' +
                    '• Không trúng: tiền cược trả cho chủ xòng'
                }
            )
            .setColor('#FFD700')
            .setThumbnail('https://i.pinimg.com/originals/37/27/af/3727afbe6ca619733cba6c07a6c4fcd7.gif');

        const betViews = createBetViews();
        const controlView = new ControlView();

        const gameMessage = await message.reply({ 
            embeds: [embed], 
            components: [...betViews, controlView] 
        });

        // Lưu message ID để edit sau
        games.get(channelId).messageId = gameMessage.id;
    },

    // Xử lý interactions
    async handleInteraction(interaction) {
        const channelId = interaction.channel.id;
        const game = games.get(channelId);
        
        if (!game) {
            return interaction.reply({ content: '❌ Không có ván game nào!', ephemeral: true });
        }

        // Xử lý modal submit
        if (interaction.isModalSubmit() && interaction.customId.startsWith('bet_modal_')) {
            const animal = interaction.customId.split('_')[2];
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
            return;
        }

        // Xử lý button clicks
        if (interaction.customId.startsWith('bet_')) {
            // Kiểm tra quản trò không được cược
            if (interaction.user.id === game.host.id) {
                return interaction.reply({ content: '❌ Quản trò không được đặt cược!', ephemeral: true });
            }

            if (game.started) {
                return interaction.reply({ content: '❌ Game đã bắt đầu, không thể cược!', ephemeral: true });
            }

            const animal = interaction.customId.split('_')[1];
            const modal = new BetModal(animal);
            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'confirm_bet') {
            // Kiểm tra quản trò không được cược
            if (interaction.user.id === game.host.id) {
                return interaction.reply({ content: '❌ Quản trò không được đặt cược!', ephemeral: true });
            }

            if (game.started) {
                return interaction.reply({ content: '❌ Game đã bắt đầu, không thể xác nhận cược!', ephemeral: true });
            }

            const userBets = game.bets.get(interaction.user.id);
            if (!userBets || Object.keys(userBets).length === 0) {
                return interaction.reply({ content: '❌ Bạn chưa đặt cược!', ephemeral: true });
            }

            // Tính tổng tiền cược
            const totalBet = Object.values(userBets).reduce((sum, amount) => sum + amount, 0);
            const userRin = await getUserRin(interaction.user.id);
            
            if (userRin < totalBet) {
                return interaction.reply({ content: '❌ Bạn không đủ Rin để xác nhận!', ephemeral: true });
            }

            // Trừ tiền
            await updateUserRin(interaction.user.id, -totalBet);

            // Tạo embed hiển thị cược
            const betDisplay = Object.entries(userBets)
                .map(([animal, amount]) => `• **${animal}**: ${amount} Rin`)
                .join('\n');

            const confirmEmbed = new EmbedBuilder()
                .setTitle(`✅ ${interaction.user.displayName} đã xác nhận cược`)
                .setDescription(betDisplay)
                .setColor('#00FF00');

            await interaction.reply({ embeds: [confirmEmbed] });

            // Cập nhật embed chính để hiển thị danh sách người cược
            await module.exports.updateGameEmbed(interaction, game);
            return;
        }

        if (interaction.customId === 'start_game') {
            if (interaction.user.id !== game.host.id) {
                return interaction.reply({ content: '⛔ Chỉ quản trò được bắt đầu!', ephemeral: true });
            }

            if (game.started) {
                return interaction.reply({ content: '❌ Game đã bắt đầu rồi!', ephemeral: true });
            }

            if (game.participants.size === 0) {
                return interaction.reply({ content: '❌ Chưa có ai cược! Cần ít nhất 1 người đặt cược để bắt đầu.', ephemeral: true });
            }

            // Kiểm tra tất cả người cược đã xác nhận chưa
            let confirmedBets = 0;
            for (const [userId, userBets] of game.bets) {
                const totalBet = Object.values(userBets).reduce((sum, amount) => sum + amount, 0);
                if (totalBet > 0) confirmedBets++;
            }

            if (confirmedBets === 0) {
                return interaction.reply({ content: '❌ Chưa có ai xác nhận cược! Hãy bấm "✅ Xác nhận cược" trước.', ephemeral: true });
            }

            game.started = true;

            // Hiệu ứng quay từng xúc xắc (fix triệt để lỗi InteractionAlreadyReplied)
            let tempResults = [];
            // Gửi lần đầu (reply)
            const firstEmbed = new EmbedBuilder()
                .setTitle('🎲 ĐANG QUAY BẦU CUA...')
                .setDescription('Đang mở kết quả...')
                .setColor('#FFD700');
            await interaction.reply({ embeds: [firstEmbed] });
            // Lật từng xúc xắc
            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 1200));
                const rand = BAU_CUA_ANIMALS[Math.floor(Math.random() * BAU_CUA_ANIMALS.length)];
                tempResults.push(rand);
                const embed = new EmbedBuilder()
                    .setTitle('🎲 ĐANG QUAY BẦU CUA...')
                    .setDescription(`Đã mở: ${tempResults.map(r => `${BAU_CUA_EMOJIS[r]} ${r}`).join(' | ')}${' | ❓'.repeat(3 - tempResults.length)}`)
                    .setColor('#FFD700');
                await interaction.editReply({ embeds: [embed] });
            }
            // Kết quả thật
            const results = tempResults;

            // Tính kết quả
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎲 KẾT QUẢ BẦU CUA')
                .setDescription(`**Kết quả:** ${results.map(r => `${BAU_CUA_EMOJIS[r]} ${r}`).join(' | ')}`)
                .setColor('#FF4500');

            let resultText = '';

            let hostNetWinnings = 0; // Tổng tiền nhà cái thắng/thua

            // Xử lý từng người chơi
            for (const [userId, userBets] of game.bets) {
                const user = await interaction.client.users.fetch(userId);
                let totalWin = 0;
                let totalLoss = 0;
                const betResults = [];

                for (const [animal, amount] of Object.entries(userBets)) {
                    const count = results.filter(r => r === animal).length;
                    let winAmount = 0;
                    let multiplier = 0;
                    if (count === 1) {
                        multiplier = 1;
                        winAmount = amount + (amount * multiplier); // Hoàn lại tiền cược + tiền thưởng
                        totalWin += winAmount;
                        hostNetWinnings -= winAmount; // Nhà cái mất tiền khi người chơi thắng
                        betResults.push(`${BAU_CUA_EMOJIS[animal]} ${animal}: +${winAmount} Rin (${amount} gốc + ${amount * multiplier} thưởng)`);
                    } else if (count === 2) {
                        multiplier = 2;
                        winAmount = amount + (amount * multiplier); // Hoàn lại tiền cược + tiền thưởng  
                        totalWin += winAmount;
                        hostNetWinnings -= winAmount; // Nhà cái mất tiền khi người chơi thắng
                        betResults.push(`${BAU_CUA_EMOJIS[animal]} ${animal}: +${winAmount} Rin (${amount} gốc + ${amount * multiplier} thưởng)`);
                    } else if (count === 3) {
                        multiplier = 4;
                        winAmount = amount + (amount * multiplier); // Hoàn lại tiền cược + tiền thưởng
                        totalWin += winAmount;
                        hostNetWinnings -= winAmount; // Nhà cái mất tiền khi người chơi thắng
                        betResults.push(`${BAU_CUA_EMOJIS[animal]} ${animal}: +${winAmount} Rin (${amount} gốc + ${amount * multiplier} thưởng)`);
                    } else {
                        totalLoss += amount;
                        hostNetWinnings += amount; // Nhà cái nhận tiền khi người chơi thua
                        betResults.push(`${BAU_CUA_EMOJIS[animal]} ${animal}: -${amount} Rin`);
                    }
                }

                // Cộng tiền thắng cho người chơi (hoàn lại tiền cược + tiền thưởng)
                if (totalWin > 0) {
                    await updateUserRin(userId, totalWin); // Cộng tổng tiền nhận được
                }

                const netResult = totalWin - totalLoss;
                resultText += `\n**${user.displayName}**: ${netResult >= 0 ? '+' : ''}${netResult} Rin\n`;
                resultText += betResults.join('\n') + '\n';
            }

            // Cập nhật tiền cho nhà cái
            if (hostNetWinnings !== 0) {
                await updateUserRin(game.host.id, hostNetWinnings);
            }

            resultEmbed.setDescription(resultEmbed.data.description + '\n\n' + resultText);

            await interaction.editReply({ embeds: [resultEmbed] });

            // Xóa game
            games.delete(channelId);
            return;
        }

        if (interaction.customId === 'cancel_game') {
            if (interaction.user.id !== game.host.id && !interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '⛔ Chỉ quản trò hoặc admin được hủy!', ephemeral: true });
            }

            // Hoàn tiền cho tất cả người chơi
            for (const [userId, userBets] of game.bets) {
                const totalRefund = Object.values(userBets).reduce((sum, amount) => sum + amount, 0);
                if (totalRefund > 0) {
                    await updateUserRin(userId, totalRefund);
                }
            }

            games.delete(channelId);

            const cancelEmbed = new EmbedBuilder()
                .setTitle('❌ Ván Bầu Cua đã bị hủy')
                .setDescription('Đã hoàn tiền cho tất cả người chơi!')
                .setColor('#FF0000');

            await interaction.reply({ embeds: [cancelEmbed] });
        }
    }
}; 