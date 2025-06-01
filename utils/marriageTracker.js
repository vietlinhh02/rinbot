const User = require('../models/User');

// Định nghĩa thông tin nhẫn
const RING_INFO = {
    nhankim: {
        name: 'Nhẫn Kim',
        emoji: '💍',
        maxLevel: 10,
        expMultiplier: 1,
        levelUpReward: 50
    },
    nhanbac: {
        name: 'Nhẫn Bạc', 
        emoji: '💎',
        maxLevel: 20,
        expMultiplier: 1.5,
        levelUpReward: 100
    },
    nhanvang: {
        name: 'Nhẫn Vàng',
        emoji: '👑',
        maxLevel: 50,
        expMultiplier: 2,
        levelUpReward: 200
    }
};

// Tính exp cần thiết cho level tiếp theo
function getExpRequired(level) {
    return level * 100;
}

// Tính level từ total exp
function getLevelFromExp(totalExp) {
    let level = 1;
    let expUsed = 0;
    
    while (true) {
        const expNeeded = getExpRequired(level);
        if (expUsed + expNeeded > totalExp) break;
        expUsed += expNeeded;
        level++;
    }
    
    return { level, currentExp: totalExp - expUsed, nextExp: getExpRequired(level) };
}

// Map để tracking voice sessions
const voiceSessions = new Map();

// Xử lý khi user chat
async function handleChatExp(message) {
    try {
        const userId = message.author.id;
        const channelId = message.channel.id;
        
        // Lấy thông tin user
        const user = await User.findOne({ userId });
        if (!user || !user.marriage?.isMarried) return;

        // Lấy thông tin partner
        const partner = await User.findOne({ userId: user.marriage.partnerId });
        if (!partner || !partner.marriage?.isMarried) return;

        // Kiểm tra xem partner có đang ở cùng channel không
        const guild = message.guild;
        if (!guild) return;

        const partnerMember = await guild.members.fetch(partner.userId).catch(() => null);
        if (!partnerMember) return;

        // Kiểm tra channel permissions
        const channel = message.channel;
        if (!channel.permissionsFor(partnerMember)?.has('ViewChannel')) return;

        // Tính exp để thêm
        const ringInfo = RING_INFO[user.marriage.ringType];
        const expToAdd = Math.floor(1 * ringInfo.expMultiplier);

        // Lấy level hiện tại
        const currentTotalExp = user.marriage.chatExp + user.marriage.voiceExp;
        const currentLevelData = getLevelFromExp(currentTotalExp);
        const currentLevel = Math.min(currentLevelData.level, ringInfo.maxLevel);

        // Kiểm tra đã max level chưa
        if (currentLevel >= ringInfo.maxLevel) return;

        // Cập nhật exp cho cả hai
        const now = new Date();
        
        user.marriage.chatExp += expToAdd;
        user.marriage.lastChatTogether = now;
        
        partner.marriage.chatExp += expToAdd;
        partner.marriage.lastChatTogether = now;

        // Kiểm tra level up
        const newTotalExp = user.marriage.chatExp + user.marriage.voiceExp;
        const newLevelData = getLevelFromExp(newTotalExp);
        const newLevel = Math.min(newLevelData.level, ringInfo.maxLevel);

        if (newLevel > currentLevel) {
            // Level up! Thưởng Rin cho cả hai
            const levelsGained = newLevel - currentLevel;
            const rinReward = levelsGained * ringInfo.levelUpReward;
            
            user.rin += rinReward;
            partner.rin += rinReward;
            
            user.marriage.ringLevel = newLevel;
            partner.marriage.ringLevel = newLevel;

            // Gửi thông báo level up
            const embed = {
                title: '🎉 NHẪN CƯỚI LEVEL UP!',
                description: `**${message.author.displayName}** và **${partnerMember.displayName}** đã tăng level nhẫn!\n\n` +
                    `${ringInfo.emoji} **${ringInfo.name}**\n` +
                    `📈 **Level:** ${currentLevel} → **${newLevel}**\n` +
                    `💰 **Thưởng:** ${rinReward} Rin cho mỗi người\n` +
                    `💕 **EXP:** ${newTotalExp.toLocaleString()}\n\n` +
                    `**Chúc mừng cặp đôi! Hãy tiếp tục hoạt động cùng nhau! 💖**`,
                color: 0xFF69B4,
                footer: { text: 'Marriage System • Tăng exp bằng cách chat và voice cùng nhau!' },
                timestamp: new Date()
            };

            await message.channel.send({ embeds: [embed] });
        }

        await user.save();
        await partner.save();

    } catch (error) {
        console.error('Lỗi handleChatExp:', error);
    }
}

// Xử lý khi user join/leave voice
async function handleVoiceUpdate(oldState, newState) {
    try {
        const userId = newState.id;
        const guild = newState.guild;
        
        // User join voice
        if (!oldState.channel && newState.channel) {
            await handleVoiceJoin(userId, newState.channel, guild);
        }
        // User leave voice
        else if (oldState.channel && !newState.channel) {
            await handleVoiceLeave(userId, oldState.channel, guild);
        }
        // User switch channel
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            await handleVoiceLeave(userId, oldState.channel, guild);
            await handleVoiceJoin(userId, newState.channel, guild);
        }

    } catch (error) {
        console.error('Lỗi handleVoiceUpdate:', error);
    }
}

async function handleVoiceJoin(userId, channel, guild) {
    try {
        // Lấy thông tin user
        const user = await User.findOne({ userId });
        if (!user || !user.marriage?.isMarried) return;

        // Lấy thông tin partner
        const partner = await User.findOne({ userId: user.marriage.partnerId });
        if (!partner || !partner.marriage?.isMarried) return;

        // Kiểm tra partner có trong cùng voice channel không
        const partnerMember = await guild.members.fetch(partner.userId).catch(() => null);
        if (!partnerMember || !partnerMember.voice.channel || partnerMember.voice.channel.id !== channel.id) {
            return;
        }

        // Bắt đầu voice session
        const sessionKey = `${userId}_${partner.userId}`;
        voiceSessions.set(sessionKey, {
            startTime: new Date(),
            channelId: channel.id,
            userId1: userId,
            userId2: partner.userId
        });

        console.log(`Voice session started: ${sessionKey} in ${channel.name}`);

    } catch (error) {
        console.error('Lỗi handleVoiceJoin:', error);
    }
}

async function handleVoiceLeave(userId, channel, guild) {
    try {
        // Tìm và kết thúc voice session
        for (const [sessionKey, session] of voiceSessions.entries()) {
            if (session.userId1 === userId || session.userId2 === userId) {
                const duration = Math.floor((new Date() - session.startTime) / (1000 * 60)); // phút
                
                if (duration >= 1) { // Ít nhất 1 phút mới tính exp
                    await addVoiceExp(session.userId1, session.userId2, duration, channel, guild);
                }
                
                voiceSessions.delete(sessionKey);
                console.log(`Voice session ended: ${sessionKey}, duration: ${duration} minutes`);
                break;
            }
        }

    } catch (error) {
        console.error('Lỗi handleVoiceLeave:', error);
    }
}

async function addVoiceExp(userId1, userId2, minutes, channel, guild) {
    try {
        const user1 = await User.findOne({ userId: userId1 });
        const user2 = await User.findOne({ userId: userId2 });
        
        if (!user1 || !user2 || !user1.marriage?.isMarried || !user2.marriage?.isMarried) return;
        if (user1.marriage.partnerId !== userId2 || user2.marriage.partnerId !== userId1) return;

        const ringInfo = RING_INFO[user1.marriage.ringType];
        const expToAdd = Math.floor(minutes * 2 * ringInfo.expMultiplier); // 2 exp/phút

        // Lấy level hiện tại
        const currentTotalExp1 = user1.marriage.chatExp + user1.marriage.voiceExp;
        const currentLevelData1 = getLevelFromExp(currentTotalExp1);
        const currentLevel1 = Math.min(currentLevelData1.level, ringInfo.maxLevel);

        // Kiểm tra max level
        if (currentLevel1 >= ringInfo.maxLevel) return;

        // Cập nhật exp
        const now = new Date();
        
        user1.marriage.voiceExp += expToAdd;
        user1.marriage.lastVoiceTogether = now;
        
        user2.marriage.voiceExp += expToAdd;
        user2.marriage.lastVoiceTogether = now;

        // Kiểm tra level up
        const newTotalExp1 = user1.marriage.chatExp + user1.marriage.voiceExp;
        const newLevelData1 = getLevelFromExp(newTotalExp1);
        const newLevel1 = Math.min(newLevelData1.level, ringInfo.maxLevel);

        if (newLevel1 > currentLevel1) {
            // Level up!
            const levelsGained = newLevel1 - currentLevel1;
            const rinReward = levelsGained * ringInfo.levelUpReward;
            
            user1.rin += rinReward;
            user2.rin += rinReward;
            
            user1.marriage.ringLevel = newLevel1;
            user2.marriage.ringLevel = newLevel1;

            // Gửi thông báo qua channel text nếu có
            try {
                const member1 = await guild.members.fetch(userId1);
                const member2 = await guild.members.fetch(userId2);
                
                const embed = {
                    title: '🎉 NHẪN CƯỚI LEVEL UP! (Voice)',
                    description: `**${member1.displayName}** và **${member2.displayName}** đã tăng level nhẫn nhờ voice chat!\n\n` +
                        `${ringInfo.emoji} **${ringInfo.name}**\n` +
                        `📈 **Level:** ${currentLevel1} → **${newLevel1}**\n` +
                        `💰 **Thưởng:** ${rinReward} Rin cho mỗi người\n` +
                        `🔊 **Thời gian voice:** ${minutes} phút\n` +
                        `💕 **EXP:** ${newTotalExp1.toLocaleString()}\n\n` +
                        `**Chúc mừng cặp đôi! Voice chat thật tuyệt! 💖**`,
                    color: 0xFF69B4,
                    footer: { text: 'Marriage System • Voice cùng nhau để tăng exp nhanh!' },
                    timestamp: new Date()
                };

                // Gửi thông báo ở general channel hoặc channel có thể gửi được
                const channels = guild.channels.cache.filter(ch => 
                    ch.type === 0 && ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'EmbedLinks'])
                );
                
                const targetChannel = channels.find(ch => ch.name.includes('general')) || 
                                    channels.find(ch => ch.name.includes('chat')) ||
                                    channels.first();
                
                if (targetChannel) {
                    await targetChannel.send({ embeds: [embed] });
                }

            } catch (error) {
                console.error('Lỗi gửi thông báo voice level up:', error);
            }
        }

        await user1.save();
        await user2.save();

    } catch (error) {
        console.error('Lỗi addVoiceExp:', error);
    }
}

module.exports = {
    handleChatExp,
    handleVoiceUpdate,
    RING_INFO
}; 