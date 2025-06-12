const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { validateBetAmount } = require('../../utils/betModal');

// Lưu trữ games và lịch sử
const games = new Map();
let globalHistory = []; // Lịch sử toàn bộ server
const MAX_HISTORY = 50; // Lưu tối đa 50 phiên
const BETTING_TIME = 60000; // 60 giây để cược

// Load history từ file khi khởi động
try {
    const fs = require('fs');
    if (fs.existsSync('./data/taixiu_history.json')) {
        const data = fs.readFileSync('./data/taixiu_history.json', 'utf8');
        globalHistory = JSON.parse(data);
        console.log(`📊 [TAIXIU] Loaded ${globalHistory.length} history records`);
    } else {
        console.log('📊 [TAIXIU] No history file found, starting fresh');
    }
} catch (error) {
    console.error('❌ [TAIXIU] Lỗi load history:', error);
    globalHistory = [];
}

// Phiên game counter - bắt đầu từ phiên cuối cùng + 1
let gameSession = globalHistory.length > 0 ? Math.max(...globalHistory.map(h => h.session)) + 1 : 1;

// Helper function để lấy session tiếp theo
function getNextSession() {
    return gameSession++;
}

// Modal để nhập tiền cược
class BetModal extends ModalBuilder {
    constructor(betType) {
        super();
        this.setCustomId(`taixiu_bet_modal_${betType}`)
            .setTitle(`Cược ${betType.toUpperCase()} - Tài Xỉu`);

        const betInput = new TextInputBuilder()
            .setCustomId('bet_amount')
            .setLabel('Số Rin bạn muốn cược:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Nhập số Rin (VD: 100, 50%, all)')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(betInput);
        this.addComponents(row);
    }
}

// Tạo view buttons cho cược
function createBetViews() {
    const taiButton = new ButtonBuilder()
        .setCustomId('bet_tai')
        .setLabel('🔺 CƯỢC TÀI (11-17)')
        .setStyle(ButtonStyle.Success);

    const xiuButton = new ButtonBuilder()
        .setCustomId('bet_xiu')
        .setLabel('🔻 CƯỢC XỈU (4-10)')
        .setStyle(ButtonStyle.Primary);

    const historyButton = new ButtonBuilder()
        .setCustomId('view_history')
        .setLabel('📊 Xem Phiên Đồ')
        .setStyle(ButtonStyle.Secondary);

    const startButton = new ButtonBuilder()
        .setCustomId('start_taixiu')
        .setLabel('🎲 BẮT ĐẦU QUAY')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_taixiu')
        .setLabel('❌ Hủy phiên')
        .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(taiButton, xiuButton, historyButton);
    const row2 = new ActionRowBuilder().addComponents(startButton, cancelButton);

    return [row1, row2];
}

// Tạo cầu từ lịch sử
function createCauDisplay(history, maxLength = 20) {
    if (history.length === 0) return "Chưa có lịch sử";
    
    const recent = history.slice(-maxLength);
    const cauString = recent.map(h => h.result === 'tai' ? 'T' : 'X').join('-');
    
    // Đếm cầu hiện tại
    const lastResult = recent[recent.length - 1]?.result;
    let currentStreak = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
        if (recent[i].result === lastResult) {
            currentStreak++;
        } else {
            break;
        }
    }
    
    return {
        cauString,
        currentStreak,
        lastResult: lastResult === 'tai' ? 'Tài' : 'Xỉu'
    };
}

// Tạo phiên đồ
function createPhanDoDisplay(history, maxPhien = 15) {
    if (history.length === 0) return "Chưa có dữ liệu phiên đồ";
    
    const recent = history.slice(-maxPhien);
    let phanDo = "```\n";
    phanDo += "PHIÊN | ĐIỂM | KQ  | XÚC XẮC\n";
    phanDo += "------|------|-----|----------\n";
    
    recent.forEach(h => {
        const phien = h.session.toString().padStart(4, '0');
        const diem = h.total.toString().padStart(2, ' ');
        const kq = h.result === 'tai' ? 'TÀI' : 'XỈU';
        const xucxac = h.dice.join('-');
        phanDo += `#${phien} |  ${diem}  | ${kq} | ${xucxac}\n`;
    });
    
    phanDo += "```";
    return phanDo;
}

module.exports = {
    name: 'taixiu',
    description: 'Game Tài Xỉu - 3 xúc xắc, tổng 4-10 là Xỉu, 11-17 là Tài',

    async execute(message, args) {
        const channelId = message.channel.id;
        
        // Kiểm tra đã có phiên nào chưa
        if (games.has(channelId)) {
            return message.reply('❌ Đã có phiên Tài Xỉu trong kênh này!');
        }

        // CHECK ÂM TIỀN - Không cho phép nhà cái âm tiền
        const hostRin = await getUserRin(message.author.id);
        if (hostRin < 0) {
            return message.reply(`❌ **Không thể làm nhà cái Tài Xỉu!**\n\n` +
                `**Lý do:** Bạn đang âm tiền (${hostRin} Rin)\n\n` +
                `💡 **Hướng dẫn:** Kiếm tiền để có số dư dương trước khi làm nhà cái!`);
        }

        // Tạo phiên game mới
        const currentSession = gameSession++;
        games.set(channelId, {
            session: currentSession,
            host: message.author,
            bets: new Map(), // userId -> {type: 'tai'/'xiu', amount: number}
            started: false,
            participants: new Set(),
            messageId: null
        });

        console.log(`🎲 [TAIXIU] Session #${currentSession} started by ${message.author.tag} in channel ${channelId}`);

        // Tạo display cầu
        const cauDisplay = createCauDisplay(globalHistory);
        
        const embed = new EmbedBuilder()
            .setTitle(`🎲 TÀI XỈU - PHIÊN #${currentSession.toString().padStart(4, '0')}`)
            .setDescription(`**🏠 Nhà cái:** ${message.author.displayName}\n\n` +
                `**📊 Cầu hiện tại:**\n` +
                `${cauDisplay.cauString || 'Chưa có lịch sử'}\n` +
                `${cauDisplay.currentStreak ? `*Cầu ${cauDisplay.lastResult}: ${cauDisplay.currentStreak} phiên*` : ''}\n\n` +
                `**🎯 Cách chơi:**\n` +
                `• Tài: Tổng 3 xúc xắc từ 11-17 điểm\n` +
                `• Xỉu: Tổng 3 xúc xắc từ 4-10 điểm\n` +
                `• Tỷ lệ thắng: 1:1 (cược 100 thắng 200)\n\n` +
                `**👥 Người cược:** 0 | **💰 Tổng tiền:** 0 Rin`)
            .setColor('#FFD700')
            .setThumbnail('https://img.icons8.com/emoji/96/000000/game-die.png')
            .setFooter({ text: 'Chọn Tài hoặc Xỉu để đặt cược!' });

        const views = createBetViews();
        const gameMessage = await message.reply({ 
            embeds: [embed], 
            components: views 
        });

        // Lưu message ID
        games.get(channelId).messageId = gameMessage.id;
    },

    // Cập nhật embed game
    async updateGameEmbed(interaction, game) {
        try {
            let taiPlayers = [];
            let xiuPlayers = [];
            let totalAmount = 0;
            let totalPlayers = 0;

            for (const [userId, bet] of game.bets) {
                const user = await interaction.client.users.fetch(userId);
                
                if (Array.isArray(bet)) {
                    // Người này cược nhiều cửa
                    for (const singleBet of bet) {
                        const playerInfo = `• **${user.displayName}**: ${singleBet.amount.toLocaleString()} Rin`;
                        
                        if (singleBet.type === 'tai') {
                            taiPlayers.push(playerInfo);
                        } else {
                            xiuPlayers.push(playerInfo);
                        }
                        
                        totalAmount += singleBet.amount;
                    }
                    totalPlayers++;
                } else {
                    // Cược đơn
                    const playerInfo = `• **${user.displayName}**: ${bet.amount.toLocaleString()} Rin`;
                    
                    if (bet.type === 'tai') {
                        taiPlayers.push(playerInfo);
                    } else {
                        xiuPlayers.push(playerInfo);
                    }
                    
                    totalAmount += bet.amount;
                    totalPlayers++;
                }
            }

            const cauDisplay = createCauDisplay(globalHistory);
            
            const embed = new EmbedBuilder()
                .setTitle(`🎲 TÀI XỈU - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription(`**🏠 Nhà cái:** ${game.host.displayName}\n\n` +
                    `**📊 Cầu hiện tại:**\n` +
                    `${cauDisplay.cauString || 'Chưa có lịch sử'}\n` +
                    `${cauDisplay.currentStreak ? `*Cầu ${cauDisplay.lastResult}: ${cauDisplay.currentStreak} phiên*` : ''}\n\n` +
                    `**👥 Người cược:** ${totalPlayers} | **💰 Tổng tiền:** ${totalAmount.toLocaleString()} Rin`)
                .addFields(
                    { 
                        name: '🔺 CƯỢC TÀI (11-17)', 
                        value: taiPlayers.length > 0 ? taiPlayers.join('\n') : '*Chưa có ai cược*', 
                        inline: true 
                    },
                    { 
                        name: '🔻 CƯỢC XỈU (4-10)', 
                        value: xiuPlayers.length > 0 ? xiuPlayers.join('\n') : '*Chưa có ai cược*', 
                        inline: true 
                    }
                )
                .setColor(totalPlayers > 0 ? '#00FF00' : '#FFD700')
                .setThumbnail('https://img.icons8.com/emoji/96/000000/game-die.png')
                .setFooter({ text: totalPlayers > 0 ? 'Nhà cái bấm "🎲 BẮT ĐẦU QUAY" để mở kết quả!' : 'Chọn Tài hoặc Xỉu để đặt cược!' });

            const views = createBetViews();

            // Edit message game gốc
            if (game.messageId) {
                try {
                    const gameMessage = await interaction.channel.messages.fetch(game.messageId);
                    await gameMessage.edit({ embeds: [embed], components: views });
                } catch (error) {
                    console.error('Không thể edit message game:', error);
                    // Nếu không edit được, thử edit reply interaction
                    try {
                        await interaction.editReply({ embeds: [embed], components: views });
                    } catch (editError) {
                        console.error('Không thể edit reply:', editError);
                    }
                }
            } else {
                // Fallback: edit reply nếu không có messageId
                try {
                    await interaction.editReply({ embeds: [embed], components: views });
                } catch (editError) {
                    console.error('Không thể edit reply fallback:', editError);
                }
            }
        } catch (error) {
            console.error('Lỗi update game embed:', error);
        }
    },

    // Xử lý interactions
    async handleInteraction(interaction) {
        try {
            // Kiểm tra interaction đã được reply chưa
            if (interaction.replied || interaction.deferred) {
                console.log('⚠️ [TAIXIU] Interaction đã được xử lý:', interaction.customId);
                return;
            }

            // Xử lý nút bắt đầu nhanh (không cần game hiện tại)
            if (interaction.customId === 'taixiu_quick_start') {
                try {
                    // Kiểm tra xem đã có game trong channel này chưa
                    if (games.has(interaction.channel.id)) {
                        await interaction.reply({
                            content: '❌ Đã có phiên Tài Xỉu đang diễn ra trong channel này!',
                            flags: 64
                        });
                        return;
                    }

                    // Kiểm tra tiền của người tạo phiên
                    const hostData = await getUserRin(interaction.user.id);
                    if (hostData.rin < 1000) {
                        await interaction.reply({
                            content: '❌ Bạn cần ít nhất **1,000 Rin** để làm nhà cái!',
                            flags: 64
                        });
                        return;
                    }

                    // Defer reply trước để tránh timeout
                    await interaction.deferReply();

                    // Tạo game mới tự động
                    const newGame = {
                        host: interaction.user,
                        bets: new Map(),
                        participants: new Set(),
                        channel: interaction.channel,
                        session: getNextSession(),
                        startTime: Date.now(),
                        timeLeft: BETTING_TIME,
                        started: false
                    };

                    games.set(interaction.channel.id, newGame);

                    // Tạo display cầu 
                    const cauDisplay = createCauDisplay(globalHistory);
                    const phanDoDisplay = createPhanDoDisplay(globalHistory);

                    const embed = new EmbedBuilder()
                        .setTitle(`🎲 TÀI XỈU - PHIÊN #${newGame.session.toString().padStart(4, '0')}`)
                        .setDescription(`🎯 **Nhà cái:** ${interaction.user.displayName}\n` +
                                      `⏰ **Thời gian cược:** ${BETTING_TIME / 1000}s\n` +
                                      `💰 **Tỷ lệ:** 1:1 (ăn bao nhiêu thắng bấy nhiêu)\n\n` +
                                      `🔥 **TÀI:** 11-17 điểm\n` +
                                      `❄️ **XỈU:** 4-10 điểm\n\n` +
                                      `📊 **Cầu hiện tại:** \`${cauDisplay.cauString || 'Chưa có lịch sử'}\`\n` +
                                      `📈 **Phiên đồ:** \`Đã sẵn sàng\`\n\n` +
                                      `⚡ **Phiên được tạo nhanh! Chọn cửa và đặt cược ngay!**\n\n` +
                                      `👥 **Người cược:** 0 | **💰 Tổng tiền:** 0 Rin`)
                        .setColor('#FFD700')
                        .setThumbnail('https://img.icons8.com/emoji/96/000000/game-die.png')
                        .setFooter({ text: `🚀 Phiên bắt đầu nhanh bởi ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp();

                    const betViews = createBetViews();
                    
                    const gameMessage = await interaction.editReply({
                        embeds: [embed],
                        components: betViews
                    });

                    // Lưu message ID cho game
                    newGame.messageId = gameMessage.id;

                    // Bắt đầu countdown
                    this.startCountdown(interaction, newGame);
                    return;
                    
                } catch (error) {
                    console.error('Lỗi quick start tài xỉu:', error);
                    try {
                        await interaction.reply({
                            content: '❌ Có lỗi khi tạo phiên mới! Vui lòng thử lại.',
                            flags: 64
                        });
                    } catch (replyError) {
                        console.error('Không thể reply error:', replyError);
                    }
                    return;
                }
            }

            const channelId = interaction.channel.id;
            const game = games.get(channelId);
            
            if (!game) {
                return interaction.reply({ content: '❌ Không có phiên Tài Xỉu nào!', flags: 64 });
            }

        // Xử lý modal submit
        if (interaction.isModalSubmit() && interaction.customId.startsWith('taixiu_bet_modal_')) {
            const betType = interaction.customId.split('_')[3]; // tai hoặc xiu
            const amountInput = interaction.fields.getTextInputValue('bet_amount');

            // Validate số tiền
            const validation = await validateBetAmount(amountInput, interaction.user.id, {
                minBet: 10,
                maxBet: null
            });

            if (!validation.valid) {
                return interaction.reply({ content: validation.error, flags: 64 });
            }

            const amount = validation.amount;

            // Lưu cược - Hỗ trợ cược cả 2 cửa
            const userId = interaction.user.id;
            
            // Kiểm tra xem user đã có bet chưa
            let existingBet = game.bets.get(userId);
            
            if (existingBet) {
                // Nếu đã cược, kiểm tra xem có cược cùng cửa không
                if (Array.isArray(existingBet)) {
                    // Đã cược nhiều lần
                    const sameBetType = existingBet.find(bet => bet.type === betType);
                    if (sameBetType) {
                        // Cộng thêm vào cửa đã cược
                        sameBetType.amount += amount;
                        await interaction.reply({ 
                            content: `✅ Đã cộng thêm **${amount.toLocaleString()} Rin** vào cửa **${betType.toUpperCase()}**!\nTổng cược ${betType.toUpperCase()}: **${sameBetType.amount.toLocaleString()} Rin**`, 
                            flags: 64 
                        });
                    } else {
                        // Cược cửa mới
                        existingBet.push({
                            type: betType,
                            amount: amount,
                            user: interaction.user
                        });
                        await interaction.reply({ 
                            content: `✅ Đã cược thêm **${betType.toUpperCase()}** với **${amount.toLocaleString()} Rin**!\nBạn đã cược cả 2 cửa. Tiền sẽ được trừ khi nhà cái bắt đầu quay.`, 
                            flags: 64 
                        });
                    }
                } else {
                    // Chỉ có 1 bet, chuyển thành array
                    if (existingBet.type === betType) {
                        // Cùng cửa, cộng dồn
                        existingBet.amount += amount;
                        await interaction.reply({ 
                            content: `✅ Đã cộng thêm **${amount.toLocaleString()} Rin** vào cửa **${betType.toUpperCase()}**!\nTổng cược ${betType.toUpperCase()}: **${existingBet.amount.toLocaleString()} Rin**`, 
                            flags: 64 
                        });
                    } else {
                        // Khác cửa, tạo array
                        game.bets.set(userId, [
                            existingBet,
                            {
                                type: betType,
                                amount: amount,
                                user: interaction.user
                            }
                        ]);
                        await interaction.reply({ 
                            content: `✅ Đã cược thêm **${betType.toUpperCase()}** với **${amount.toLocaleString()} Rin**!\nBạn đã cược cả 2 cửa. Tiền sẽ được trừ khi nhà cái bắt đầu quay.`, 
                            flags: 64 
                        });
                    }
                }
            } else {
                // Lần đầu cược
                game.bets.set(userId, {
                    type: betType,
                    amount: amount,
                    user: interaction.user
                });
                game.participants.add(userId);
                
                await interaction.reply({ 
                    content: `✅ Đã cược **${betType.toUpperCase()}** với **${amount.toLocaleString()} Rin**!\nTiền sẽ được trừ khi nhà cái bắt đầu quay.`, 
                    flags: 64 
                });
            }

            // Cập nhật embed chính
            await this.updateGameEmbed(interaction, game);
            return;
        }

        // Xử lý button clicks
        if (interaction.customId === 'bet_tai' || interaction.customId === 'bet_xiu') {
            // Kiểm tra nhà cái không được cược
            if (interaction.user.id === game.host.id) {
                return interaction.reply({ content: '❌ Nhà cái không được đặt cược!', flags: 64 });
            }

            if (game.started) {
                return interaction.reply({ content: '❌ Phiên đã bắt đầu, không thể cược!', flags: 64 });
            }

            const betType = interaction.customId.split('_')[1]; // tai hoặc xiu
            const modal = new BetModal(betType);
            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'view_history') {
            const phanDo = createPhanDoDisplay(globalHistory);
            const cauDisplay = createCauDisplay(globalHistory, 30);
            
            const embed = new EmbedBuilder()
                .setTitle('📊 PHIÊN ĐỒ TÀI XỈU')
                .setDescription(`**📈 Cầu gần đây (30 phiên):**\n${cauDisplay.cauString}\n\n` +
                    `**📋 Phiên đồ chi tiết:**\n${phanDo}\n\n` +
                    `**📊 Thống kê:**\n` +
                    `• Tổng phiên: ${globalHistory.length}\n` +
                    `• Cầu hiện tại: ${cauDisplay.currentStreak ? `${cauDisplay.lastResult} ${cauDisplay.currentStreak} phiên` : 'Chưa có'}`)
                .setColor('#0099FF')
                .setFooter({ text: 'Dữ liệu cập nhật theo thời gian thực' });

            await interaction.reply({ embeds: [embed], flags: 64 });
            return;
        }

        if (interaction.customId === 'start_taixiu') {
            // Chỉ nhà cái mới được bắt đầu quay
            if (interaction.user.id !== game.host.id) {
                return interaction.reply({ content: '❌ Chỉ nhà cái mới có thể bắt đầu quay!', flags: 64 });
            }

            // Kiểm tra phiên đã bắt đầu chưa
            if (game.started) {
                return interaction.reply({ content: '❌ Phiên đã bắt đầu rồi!', flags: 64 });
            }

            // Kiểm tra có người cược không
            if (game.bets.size === 0) {
                return interaction.reply({ content: '❌ Phải có ít nhất 1 người cược mới được quay!', flags: 64 });
            }

            // Đánh dấu phiên đã bắt đầu
            game.started = true;

            // Trừ tiền người cược
            for (const [userId, bet] of game.bets) {
                if (Array.isArray(bet)) {
                    for (const singleBet of bet) {
                        await updateUserRin(userId, -singleBet.amount);
                    }
                } else {
                    await updateUserRin(userId, -bet.amount);
                }
            }

            // Thực hiện quay xúc xắc
            await this.executeGame(interaction, game);
            return;
        }

        if (interaction.customId === 'cancel_taixiu') {
            if (interaction.user.id !== game.host.id && !interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '⛔ Chỉ nhà cái hoặc admin được hủy!', flags: 64 });
            }

            let cancelMessage = '❌ Phiên Tài Xỉu đã bị hủy!';

            // Chỉ hoàn tiền nếu đã bắt đầu (đã trừ tiền) - Hỗ trợ multi-bet
            if (game.started) {
                for (const [userId, bet] of game.bets) {
                    if (Array.isArray(bet)) {
                        // Hoàn tiền cho multi-bet
                        for (const singleBet of bet) {
                            await updateUserRin(userId, singleBet.amount);
                        }
                    } else {
                        // Hoàn tiền cho single bet
                        await updateUserRin(userId, bet.amount);
                    }
                }
                cancelMessage = '❌ Phiên Tài Xỉu đã bị hủy! Đã hoàn tiền cho tất cả người chơi.';
            } else {
                cancelMessage = '❌ Phiên Tài Xỉu đã bị hủy! (Chưa trừ tiền nên không cần hoàn)';
            }

            games.delete(channelId);

            const embed = new EmbedBuilder()
                .setTitle('❌ PHIÊN ĐÃ BỊ HỦY')
                .setDescription(cancelMessage)
                .setColor('#FF0000');

            await interaction.reply({ embeds: [embed] });
        }
        
        } catch (error) {
            console.error('Lỗi taixiu handleInteraction:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ content: '❌ Có lỗi xảy ra!', flags: 64 });
                } catch (replyError) {
                    console.error('Không thể reply interaction:', replyError);
                }
            }
        }
    },

    // Thực thi game - quay xúc xắc và tính kết quả
    async executeGame(interaction, game) {
        try {
            // HIỆU ỨNG XÚC XẮC HỒI HỘP

            // Bước 1: Bắt đầu quay
            const startEmbed = new EmbedBuilder()
                .setTitle(`🎲 BẮTĐẦU QUAY - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription('🎯 **Chuẩn bị quay xúc xắc...**\n\n' +
                              '🎲 ⚪ ⚪ ⚪\n' +
                              '⏳ Đang lắc bát...')
                .setColor('#FF6B6B');

            await interaction.editReply({ embeds: [startEmbed], components: [] });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Bước 2: Đang quay 
            const shakingEmbed = new EmbedBuilder()
                .setTitle(`🎲 ĐANG QUAY XÚC XẮC - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription('🎯 **Xúc xắc đang lăn...**\n\n' +
                              '🎲 ⚡ ⚡ ⚡\n' +
                              '💫 Đang chờ kết quả...')
                .setColor('#FFA500');

            await interaction.editReply({ embeds: [shakingEmbed] });
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Tính bias dựa trên tổng tiền cược và xu hướng người chơi - Hỗ trợ multi-bet
            let totalBetAmount = 0;
            let taiPlayers = 0;
            let xiuPlayers = 0;
            
            for (const [userId, bet] of game.bets) {
                if (Array.isArray(bet)) {
                    // Người này cược nhiều cửa
                    for (const singleBet of bet) {
                        totalBetAmount += singleBet.amount;
                        if (singleBet.type === 'tai') taiPlayers++;
                        else xiuPlayers++;
                    }
                } else {
                    // Cược đơn
                    totalBetAmount += bet.amount;
                    if (bet.type === 'tai') taiPlayers++;
                    else xiuPlayers++;
                }
            }

            // RIGGED DICE LOGIC - Bias về nhà cái
            function weightedDiceRoll(weights = [1, 1, 1, 1, 1, 1]) {
                const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                const random = Math.random() * totalWeight;
                let cumulative = 0;
                
                for (let i = 0; i < weights.length; i++) {
                    cumulative += weights[i];
                    if (random <= cumulative) {
                        return i + 1;
                    }
                }
                return 6; // fallback
            }

            // Kiểm tra rigged settings
            const riggedSettings = global.taixiuRiggedSettings || { enabled: true, riggedMode: 'smart' };
            
            // Tính bias weights dựa trên tình huống
            let biasWeights = [1, 1, 1, 1, 1, 1]; // Default fair
            
            if (riggedSettings.enabled) {
                if (riggedSettings.riggedMode === 'aggressive') {
                    // AGGRESSIVE MODE: Luôn bias mạnh về nhà cái
                    if (taiPlayers > xiuPlayers) {
                        // Nhiều người cược Tài -> bias mạnh về Xỉu
                        biasWeights = [1.8, 1.6, 1.4, 0.7, 0.5, 0.3];
                    } else if (xiuPlayers > taiPlayers) {
                        // Nhiều người cược Xỉu -> bias mạnh về Tài  
                        biasWeights = [0.3, 0.5, 0.7, 1.4, 1.6, 1.8];
                    } else {
                        // Cân bằng -> bias về phía ít người hơn hoặc random
                        const randomBias = Math.random() > 0.5;
                        biasWeights = randomBias ? [1.6, 1.4, 1.2, 0.8, 0.6, 0.4] : [0.4, 0.6, 0.8, 1.2, 1.4, 1.6];
                    }
                } else {
                    // SMART MODE: Bias thông minh dựa trên tình huống
                    
                    // Bias 1: Nếu tiền cược lớn (>5000), bias mạnh về nhà cái
                    if (totalBetAmount > 5000) {
                        if (taiPlayers > xiuPlayers) {
                            // Nhiều người cược Tài -> bias về Xỉu (số thấp)
                            biasWeights = [1.4, 1.3, 1.2, 0.9, 0.8, 0.7];
                        } else if (xiuPlayers > taiPlayers) {
                            // Nhiều người cược Xỉu -> bias về Tài (số cao)
                            biasWeights = [0.7, 0.8, 0.9, 1.2, 1.3, 1.4];
                        }
                    }
                    // Bias 2: Nếu tiền cược trung bình (1000-5000), bias nhẹ
                    else if (totalBetAmount > 1000) {
                        if (taiPlayers > xiuPlayers) {
                            biasWeights = [1.2, 1.1, 1.1, 0.95, 0.9, 0.85];
                        } else if (xiuPlayers > taiPlayers) {
                            biasWeights = [0.85, 0.9, 0.95, 1.1, 1.1, 1.2];
                        }
                    }
                    
                    // Bias 3: Nếu có cầu dài (>3 phiên), break cầu để nhà cái thắng
                    const recentHistory = globalHistory.slice(-5);
                    if (recentHistory.length >= 3) {
                        const lastResult = recentHistory[recentHistory.length - 1]?.result;
                        let streak = 0;
                        for (let i = recentHistory.length - 1; i >= 0; i--) {
                            if (recentHistory[i].result === lastResult) streak++;
                            else break;
                        }
                        
                        if (streak >= 3) {
                            // Cầu dài -> bias về kết quả ngược lại
                            if (lastResult === 'tai') {
                                biasWeights = [1.5, 1.4, 1.3, 0.8, 0.7, 0.6]; // Force Xỉu
                            } else {
                                biasWeights = [0.6, 0.7, 0.8, 1.3, 1.4, 1.5]; // Force Tài
                            }
                        }
                    }
                }
            }

            // Quay 3 xúc xắc với bias
            const dice1 = weightedDiceRoll(biasWeights);
            const dice2 = weightedDiceRoll(biasWeights);
            const dice3 = weightedDiceRoll(biasWeights);
            const total = dice1 + dice2 + dice3;
            const result = total >= 11 ? 'tai' : 'xiu';

            // HIỆU ỨNG HIỂN THỊ XÚC XẮC ĐẸP
            function getDiceImageUrl(number) {
                // Sử dụng static dice images đẹp - GitHub hosted
                const diceUrls = {
                    1: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Game%20die/3D/game_die_3d.png',
                    2: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Game%20die/3D/game_die_3d.png', 
                    3: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Game%20die/3D/game_die_3d.png',
                    4: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Game%20die/3D/game_die_3d.png',
                    5: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Game%20die/3D/game_die_3d.png',
                    6: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Game%20die/3D/game_die_3d.png'
                };
                return diceUrls[number];
            }

            function getDiceEmoji(number) {
                // Emoji xúc xắc thực tế
                const diceEmojis = {
                    1: '⚀',
                    2: '⚁', 
                    3: '⚂',
                    4: '⚃',
                    5: '⚄',
                    6: '⚅'
                };
                return diceEmojis[number] || '🎲';
            }

            function getDiceVisual(number) {
                // Tạo visual dice với art ASCII
                const diceVisuals = {
                    1: '┌─────┐\n│  ●  │\n│     │\n│     │\n└─────┘',
                    2: '┌─────┐\n│ ●   │\n│     │\n│   ● │\n└─────┘',
                    3: '┌─────┐\n│ ●   │\n│  ●  │\n│   ● │\n└─────┘',
                    4: '┌─────┐\n│ ● ● │\n│     │\n│ ● ● │\n└─────┘',
                    5: '┌─────┐\n│ ● ● │\n│  ●  │\n│ ● ● │\n└─────┘',
                    6: '┌─────┐\n│ ● ● │\n│ ● ● │\n│ ● ● │\n└─────┘'
                };
                return diceVisuals[number] || '🎲';
            }

            // Bước 3: Hiển thị từng xúc xắc một cách hồi hộp
            const dice1Url = getDiceImageUrl(dice1);
            const dice2Url = getDiceImageUrl(dice2);
            const dice3Url = getDiceImageUrl(dice3);

            // Hiển thị xúc xắc đầu tiên
            const reveal1Embed = new EmbedBuilder()
                .setTitle(`🎲 XÚC XẮC THỨ NHẤT - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription(`🎯 **Xúc xắc đầu tiên đã dừng lại:**\n\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `🎲 **XÚC XẮC 1:**\n` +
                              `${getDiceEmoji(dice1)} **SỐ ${dice1}**\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                              `⚪ **Xúc xắc 2:** Đang quay...\n` +
                              `⚪ **Xúc xắc 3:** Đang quay...\n\n` +
                              `⏳ **Còn 2 viên xúc xắc nữa!**`)
                .addFields({
                    name: '🎯 Kết quả hiện tại',
                    value: `${getDiceEmoji(dice1)} **${dice1}** + ? + ? = ?`,
                    inline: false
                })
                .setColor('#4ECDC4')
                .setThumbnail('https://cdn.discordapp.com/emojis/🎲.png');
            
            await interaction.editReply({ embeds: [reveal1Embed] });
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Hiển thị xúc xắc thứ hai  
            const reveal2Embed = new EmbedBuilder()
                .setTitle(`🎲 XÚC XẮC THỨ HAI - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription(`🎯 **Xúc xắc thứ hai đã dừng lại:**\n\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `🎲 **XÚC XẮC 1:** ${getDiceEmoji(dice1)} **${dice1}**\n` +
                              `🎲 **XÚC XẮC 2:** ${getDiceEmoji(dice2)} **${dice2}**\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                              `⚪ **Xúc xắc 3:** Đang quay...\n\n` +
                              `⏳ **Còn 1 viên xúc xắc quyết định!**`)
                .addFields({
                    name: '🎯 Kết quả hiện tại',
                    value: `${getDiceEmoji(dice1)} **${dice1}** + ${getDiceEmoji(dice2)} **${dice2}** + ? = **${dice1 + dice2} + ?**`,
                    inline: false
                })
                .setColor('#45B7D1')
                .setThumbnail('https://cdn.discordapp.com/emojis/🎲.png');
            
            await interaction.editReply({ embeds: [reveal2Embed] });
            await new Promise(resolve => setTimeout(resolve, 1800));

            // Hiển thị xúc xắc cuối và kết quả drama
            const suspenseEmbed = new EmbedBuilder()
                .setTitle(`🎲 XÚC XẮC CUỐI CÙNG - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription(`🎯 **Xúc xắc cuối cùng đã dừng lại:**\n\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `🎲 **XÚC XẮC 1:** ${getDiceEmoji(dice1)} **${dice1}**\n` +
                              `🎲 **XÚC XẮC 2:** ${getDiceEmoji(dice2)} **${dice2}**\n` +
                              `🎲 **XÚC XẮC 3:** ${getDiceEmoji(dice3)} **${dice3}**\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                              `🔥 **TỔNG CỘNG: ${total} ĐIỂM**\n\n` +
                              `⏳ **Đang tính toán kết quả...**`)
                .addFields({
                    name: '🎯 Kết quả cuối cùng',
                    value: `${getDiceEmoji(dice1)} **${dice1}** + ${getDiceEmoji(dice2)} **${dice2}** + ${getDiceEmoji(dice3)} **${dice3}** = **${total} ĐIỂM**`,
                    inline: false
                })
                .setColor('#9B59B6')
                .setThumbnail('https://cdn.discordapp.com/emojis/🎲.png');
            
            await interaction.editReply({ embeds: [suspenseEmbed] });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Log rigged info for admin (optional)
            if (riggedSettings.logRigged && riggedSettings.enabled) {
                const biasDescription = riggedSettings.riggedMode === 'aggressive' ? 'AGGRESSIVE' : 'SMART';
                console.log(`🎲 [RIGGED-${biasDescription}] Session ${game.session}: ${dice1}-${dice2}-${dice3}=${total} (${result.toUpperCase()}) | Bet: ${totalBetAmount} | T:${taiPlayers} X:${xiuPlayers} | Bias: [${biasWeights.map(w => w.toFixed(1)).join(',')}]`);
            } else if (!riggedSettings.enabled) {
                console.log(`🎲 [FAIR] Session ${game.session}: ${dice1}-${dice2}-${dice3}=${total} (${result.toUpperCase()}) | Pure Random`);
            }

            // Lưu vào lịch sử
            const historyEntry = {
                session: game.session,
                dice: [dice1, dice2, dice3],
                total: total,
                result: result,
                timestamp: new Date()
            };

            globalHistory.push(historyEntry);
            if (globalHistory.length > MAX_HISTORY) {
                globalHistory.shift(); // Xóa phiên cũ nhất
            }

            // Lưu vào file để persistent
            try {
                const fs = require('fs');
                const path = require('path');
                const dataDir = './data';
                
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }
                
                fs.writeFileSync('./data/taixiu_history.json', JSON.stringify(globalHistory, null, 2));
            } catch (error) {
                console.error('Lỗi lưu history tài xỉu:', error);
            }

            // Tính kết quả cho từng người chơi - Hỗ trợ multi-bet
            let totalHostWinnings = 0;
            let resultText = '';

            for (const [userId, bet] of game.bets) {
                if (Array.isArray(bet)) {
                    // Người này cược nhiều cửa
                    let userTotalWin = 0;
                    let userTotalLoss = 0;
                    let userResults = [];
                    
                    for (const singleBet of bet) {
                        const isWin = singleBet.type === result;
                        
                        if (isWin) {
                            // Thắng: Hoàn tiền + tiền thưởng (1:1)
                            const winAmount = singleBet.amount * 2;
                            await updateUserRin(userId, winAmount);
                            totalHostWinnings -= singleBet.amount; // Nhà cái mất tiền
                            userTotalWin += singleBet.amount;
                            userResults.push(`✅ ${singleBet.type.toUpperCase()}: +${singleBet.amount.toLocaleString()}`);
                        } else {
                            // Thua: Nhà cái ăn tiền
                            totalHostWinnings += singleBet.amount;
                            userTotalLoss += singleBet.amount;
                            userResults.push(`❌ ${singleBet.type.toUpperCase()}: -${singleBet.amount.toLocaleString()}`);
                        }
                    }
                    
                    const netResult = userTotalWin - userTotalLoss;
                    const netIcon = netResult >= 0 ? '✅' : '❌';
                    const netSign = netResult >= 0 ? '+' : '';
                    
                    resultText += `${netIcon} **${bet[0].user.displayName}**: ${userResults.join(', ')} | **Net: ${netSign}${netResult.toLocaleString()} Rin**\n`;
                } else {
                    // Cược đơn
                    const user = bet.user;
                    const isWin = bet.type === result;
                    
                    if (isWin) {
                        // Thắng: Hoàn tiền + tiền thưởng (1:1)
                        const winAmount = bet.amount * 2;
                        await updateUserRin(userId, winAmount);
                        totalHostWinnings -= bet.amount; // Nhà cái mất tiền
                        resultText += `✅ **${user.displayName}**: Thắng ${bet.type.toUpperCase()} +${bet.amount.toLocaleString()} Rin\n`;
                    } else {
                        // Thua: Nhà cái ăn tiền
                        totalHostWinnings += bet.amount;
                        resultText += `❌ **${user.displayName}**: Thua ${bet.type.toUpperCase()} -${bet.amount.toLocaleString()} Rin\n`;
                    }
                }
            }

            // Cập nhật tiền cho nhà cái
            if (totalHostWinnings !== 0) {
                await updateUserRin(game.host.id, totalHostWinnings);
            }

            // HIỆU ỨNG KẾT QUẢ DRAMATIC
            
            // Bước 4: Công bố kết quả với drama
            const resultColor = result === 'tai' ? '#FF4444' : '#4444FF';
            const resultIcon = result === 'tai' ? '🔺' : '🔻';
            const resultText_drama = result === 'tai' ? 'TÀI' : 'XỈU';

            const dramaBuildupEmbed = new EmbedBuilder()
                .setTitle(`🎯 CÔNG BỐ KẾT QUẢ - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription(`🎲 **BA XÚC XẮC ĐÃ HOÀN THÀNH:**\n\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `🎲 **XÚC XẮC 1:** ${getDiceEmoji(dice1)} **${dice1}**\n` +
                              `🎲 **XÚC XẮC 2:** ${getDiceEmoji(dice2)} **${dice2}**\n` +
                              `🎲 **XÚC XẮC 3:** ${getDiceEmoji(dice3)} **${dice3}**\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                              `🧮 **TỔNG CỘNG: ${total} ĐIỂM**\n\n` +
                              `${total >= 11 ? '🔺' : '🔻'} **KẾT QUẢ: ${resultText_drama}**\n\n` +
                              `💥 ${result === 'tai' ? '🔥 TÀI THẮNG! 🔥' : '❄️ XỈU THẮNG! ❄️'}`)
                .addFields(
                    { 
                        name: '🎯 Chi tiết tính điểm', 
                        value: `${getDiceEmoji(dice1)} **${dice1}** + ${getDiceEmoji(dice2)} **${dice2}** + ${getDiceEmoji(dice3)} **${dice3}** = **${total} ĐIỂM**`, 
                        inline: false 
                    }
                )
                .setColor(resultColor)
                .setThumbnail('https://cdn.discordapp.com/emojis/🎲.png');
            
            await interaction.editReply({ embeds: [dramaBuildupEmbed] });
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Bước 5: Hiển thị kết quả chi tiết
            const finalResultEmbed = new EmbedBuilder()
                .setTitle(`🏆 BẢNG KẾT QUẢ PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription(
                    `🎲 **CHI TIẾT 3 XÚC XẮC:**\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🎲 **XÚC XẮC 1:** ${getDiceEmoji(dice1)} **${dice1}**\n` +
                    `🎲 **XÚC XẮC 2:** ${getDiceEmoji(dice2)} **${dice2}**\n` +
                    `🎲 **XÚC XẮC 3:** ${getDiceEmoji(dice3)} **${dice3}**\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🧮 **TỔNG ĐIỂM:** ${total} điểm\n` +
                    `🏆 **KẾT QUẢ:** ${resultIcon} **${resultText_drama}**\n\n` +
                    `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃            **📊 CHI TIẾT NGƯỜI CHƠI**           ┃\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n` +
                    `${resultText}\n` +
                    `💎 **Nhà cái ${game.host.displayName}:** ${totalHostWinnings >= 0 ? `+${totalHostWinnings.toLocaleString()}` : totalHostWinnings.toLocaleString()} Rin\n\n` +
                    `🎯 **Cầu mới:** \`${createCauDisplay(globalHistory).cauString}\``
                )
                .addFields(
                    { 
                        name: '🎲 Kết quả chi tiết', 
                        value: `${getDiceEmoji(dice1)} **${dice1}** + ${getDiceEmoji(dice2)} **${dice2}** + ${getDiceEmoji(dice3)} **${dice3}** = **${total}**`, 
                        inline: false 
                    },
                    {
                        name: '🎯 Kết luận',
                        value: `${result === 'tai' ? '🔥 **TÀI THẮNG**' : '❄️ **XỈU THẮNG**'} (${total >= 11 ? '≥11' : '≤10'} điểm)`,
                        inline: false
                    }
                )
                .setColor(resultColor)
                .setThumbnail('https://cdn.discordapp.com/emojis/🎲.png')
                .setFooter({ 
                    text: `Phiên hoàn thành | Chơi tiếp với ,taixiu`, 
                    iconURL: game.host.displayAvatarURL() 
                })
                .setTimestamp();

            // Thêm nút bắt đầu nhanh
            const quickStartButton = new ButtonBuilder()
                .setCustomId('taixiu_quick_start')
                .setLabel('🎲 Bắt đầu phiên mới')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🚀');

            const quickStartRow = new ActionRowBuilder()
                .addComponents(quickStartButton);

            await interaction.editReply({ 
                embeds: [finalResultEmbed], 
                components: [quickStartRow] 
            });

            // Xóa game
            games.delete(interaction.channel.id);
            console.log(`🎲 [TAIXIU] Session #${game.session} completed and cleaned up`);

        } catch (error) {
            console.error('Lỗi execute game tài xỉu:', error);
            await interaction.editReply({ 
                content: '❌ Có lỗi xảy ra khi thực hiện game!', 
                embeds: [], 
                components: [] 
            });
        }
    },

    // Bắt đầu countdown cho phiên mới
    async startCountdown(interaction, game) {
        try {
            const countdownStart = Date.now();
            
            // Countdown timer
            const countdownInterval = setInterval(async () => {
                try {
                    const elapsed = Date.now() - countdownStart;
                    const timeLeft = Math.max(0, Math.ceil((BETTING_TIME - elapsed) / 1000));
                    
                    if (timeLeft <= 0 || game.started) {
                        clearInterval(countdownInterval);
                        
                        if (!game.started) {
                            // Hết thời gian cược, tự động bắt đầu nếu có người cược
                            if (game.bets.size > 0) {
                                game.started = true;
                                
                                // Trừ tiền người cược
                                for (const [userId, bet] of game.bets) {
                                    if (Array.isArray(bet)) {
                                        for (const singleBet of bet) {
                                            await updateUserRin(userId, -singleBet.amount);
                                        }
                                    } else {
                                        await updateUserRin(userId, -bet.amount);
                                    }
                                }
                                
                                await this.executeGame(interaction, game);
                            } else {
                                // Không có ai cược, hủy phiên
                                games.delete(interaction.channel.id);
                                
                                const timeoutEmbed = new EmbedBuilder()
                                    .setTitle('⏰ PHIÊN ĐÃ HẾT THỜI GIAN')
                                    .setDescription('❌ Không có ai đặt cược, phiên đã bị hủy!')
                                    .setColor('#FF0000');
                                
                                try {
                                    await interaction.editReply({ 
                                        embeds: [timeoutEmbed], 
                                        components: [] 
                                    });
                                } catch (editError) {
                                    console.error('Không thể edit reply timeout:', editError);
                                    // Fallback: gửi message mới
                                    await interaction.followUp({ 
                                        embeds: [timeoutEmbed], 
                                        components: [] 
                                    });
                                }
                            }
                        }
                        return;
                    }
                    
                    // Cập nhật game embed với thời gian (chỉ nếu interaction vẫn còn hợp lệ)
                    try {
                        await this.updateGameEmbed(interaction, game);
                    } catch (updateError) {
                        console.log('⚠️ [TAIXIU] Interaction expired, stopping countdown updates');
                        clearInterval(countdownInterval);
                    }
                    
                } catch (error) {
                    console.error('Lỗi countdown tài xỉu:', error);
                    clearInterval(countdownInterval);
                }
            }, 5000); // Cập nhật mỗi 5 giây
            
        } catch (error) {
            console.error('Lỗi startCountdown tài xỉu:', error);
        }
    }
}; 
