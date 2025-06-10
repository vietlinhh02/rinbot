const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { validateBetAmount } = require('../../utils/betModal');

// Lưu trữ games và lịch sử
const games = new Map();
let globalHistory = []; // Lịch sử toàn bộ server
const MAX_HISTORY = 50; // Lưu tối đa 50 phiên

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

    const row1 = new ActionRowBuilder().addComponents(taiButton, xiuButton, historyButton);

    const startButton = new ButtonBuilder()
        .setCustomId('start_taixiu')
        .setLabel('🎲 BẮT ĐẦU QUAY (Chỉ nhà cái)')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_taixiu')
        .setLabel('❌ Hủy phiên')
        .setStyle(ButtonStyle.Secondary);

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
                const playerInfo = `• **${user.displayName}**: ${bet.amount.toLocaleString()} Rin`;
                
                if (bet.type === 'tai') {
                    taiPlayers.push(playerInfo);
                } else {
                    xiuPlayers.push(playerInfo);
                }
                
                totalAmount += bet.amount;
                totalPlayers++;
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
                .setFooter({ text: 'Nhà cái bấm "BẮT ĐẦU QUAY" để mở kết quả!' });

            const views = createBetViews();

            // Edit message game gốc
            if (game.messageId) {
                try {
                    const gameMessage = await interaction.channel.messages.fetch(game.messageId);
                    await gameMessage.edit({ embeds: [embed], components: views });
                } catch (error) {
                    console.error('Không thể edit message game:', error);
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

            // Lưu cược (chưa trừ tiền)
            game.bets.set(interaction.user.id, {
                type: betType,
                amount: amount,
                user: interaction.user
            });
            game.participants.add(interaction.user.id);

            await interaction.reply({ 
                content: `✅ Đã cược **${betType.toUpperCase()}** với **${amount.toLocaleString()} Rin**!\nTiền sẽ được trừ khi nhà cái bắt đầu quay.`, 
                flags: 64 
            });

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
            if (interaction.user.id !== game.host.id) {
                return interaction.reply({ content: '⛔ Chỉ nhà cái được bắt đầu!', flags: 64 });
            }

            if (game.started) {
                return interaction.reply({ content: '❌ Phiên đã bắt đầu rồi!', flags: 64 });
            }

            if (game.participants.size === 0) {
                return interaction.reply({ content: '❌ Chưa có ai cược! Cần ít nhất 1 người đặt cược.', flags: 64 });
            }

            // Bắt đầu game
            game.started = true;

            // Trừ tiền tất cả người cược
            for (const [userId, bet] of game.bets) {
                await updateUserRin(userId, -bet.amount);
            }

            await interaction.deferUpdate();
            await this.executeGame(interaction, game);
            return;
        }

        if (interaction.customId === 'cancel_taixiu') {
            if (interaction.user.id !== game.host.id && !interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '⛔ Chỉ nhà cái hoặc admin được hủy!', flags: 64 });
            }

            let cancelMessage = '❌ Phiên Tài Xỉu đã bị hủy!';

            // Chỉ hoàn tiền nếu đã bắt đầu (đã trừ tiền)
            if (game.started) {
                for (const [userId, bet] of game.bets) {
                    await updateUserRin(userId, bet.amount);
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
            // Animation quay xúc xắc
            const loadingEmbed = new EmbedBuilder()
                .setTitle(`🎲 ĐANG QUAY XÚC XẮC - PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription('🎲🎲🎲 Đang lắc xúc xắc...')
                .setColor('#FFA500');

            await interaction.editReply({ embeds: [loadingEmbed], components: [] });

            // Delay cho animation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Tính bias dựa trên tổng tiền cược và xu hướng người chơi
            let totalBetAmount = 0;
            let taiPlayers = 0;
            let xiuPlayers = 0;
            
            for (const [userId, bet] of game.bets) {
                totalBetAmount += bet.amount;
                if (bet.type === 'tai') taiPlayers++;
                else xiuPlayers++;
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

            // Tính kết quả cho từng người chơi
            let totalHostWinnings = 0;
            let resultText = '';

            for (const [userId, bet] of game.bets) {
                const user = bet.user;
                const isWin = bet.type === result;
                
                if (isWin) {
                    // Thắng: Hoàn tiền + tiền thưởng (1:1)
                    const winAmount = bet.amount * 2;
                    await updateUserRin(userId, winAmount);
                    totalHostWinnings -= bet.amount; // Nhà cái mất tiền
                    resultText += `✅ **${user.displayName}**: Thắng +${bet.amount.toLocaleString()} Rin\n`;
                } else {
                    // Thua: Nhà cái ăn tiền
                    totalHostWinnings += bet.amount;
                    resultText += `❌ **${user.displayName}**: Thua -${bet.amount.toLocaleString()} Rin\n`;
                }
            }

            // Cập nhật tiền cho nhà cái
            if (totalHostWinnings !== 0) {
                await updateUserRin(game.host.id, totalHostWinnings);
            }

            // Hiển thị kết quả
            const resultEmbed = new EmbedBuilder()
                .setTitle(`🎲 KẾT QUẢ PHIÊN #${game.session.toString().padStart(4, '0')}`)
                .setDescription(`**🎯 Xúc xắc:** ${dice1} - ${dice2} - ${dice3}\n` +
                    `**📊 Tổng điểm:** ${total}\n` +
                    `**🏆 Kết quả:** ${result === 'tai' ? '🔺 TÀI' : '🔻 XỈU'}\n\n` +
                    `**👥 Chi tiết người chơi:**\n${resultText}\n` +
                    `**💰 Nhà cái:** ${totalHostWinnings >= 0 ? `+${totalHostWinnings.toLocaleString()}` : totalHostWinnings.toLocaleString()} Rin`)
                .setColor(result === 'tai' ? '#FF4444' : '#4444FF')
                .setFooter({ text: `Cầu mới: ${createCauDisplay(globalHistory).cauString}` });

            await interaction.editReply({ embeds: [resultEmbed] });

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
    }
}; 