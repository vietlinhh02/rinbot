const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { getPrefix } = require('../../utils/prefixHelper');

// Định nghĩa thông tin nhẫn (giống marry.js)
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
    return level * 100; // Level 1 cần 100 exp, level 2 cần 200 exp, etc.
}

// Tính cấp độ từ total exp
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

module.exports = {
    name: 'marriage',
    description: 'Xem thông tin hôn nhân của bạn',
    async execute(message, args) {
        try {
            const prefix = await getPrefix(message.guild?.id);
            const userId = message.author.id;

            // Lấy target user (nếu có)
            let targetUserId = userId;
            let targetUser = message.author;

            if (args[0]) {
                const mention = args[0].replace(/[<@!>]/g, '');
                try {
                    targetUser = await message.client.users.fetch(mention);
                    targetUserId = targetUser.id;
                } catch (error) {
                    return await message.reply('❌ Không tìm thấy user được mention!');
                }
            }

            // Lấy thông tin user
            const user = await User.findOne({ userId: targetUserId });
            if (!user) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ CHƯA CÓ TÀI KHOẢN')
                    .setDescription(`${targetUser.displayName} chưa có tài khoản!`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Kiểm tra trạng thái hôn nhân
            if (!user.marriage || !user.marriage.isMarried) {
                const embed = new EmbedBuilder()
                    .setTitle('💔 CHƯA KẾT HÔN')
                    .setDescription(`**${targetUser.displayName}** chưa kết hôn!\n\n` +
                        `**💡 Hướng dẫn kết hôn:**\n` +
                        `1. Mua nhẫn ở \`${prefix}shop\`\n` +
                        `2. Cầu hôn: \`${prefix}marry @user [loại nhẫn]\`\n` +
                        `3. Đợi người ấy đồng ý\n\n` +
                        `**💍 Loại nhẫn:**\n` +
                        `💍 Nhẫn Kim - 1,000 Rin\n` +
                        `💎 Nhẫn Bạc - 3,000 Rin\n` +
                        `👑 Nhẫn Vàng - 10,000 Rin`)
                    .setColor('#95A5A6')
                    .setThumbnail(targetUser.displayAvatarURL());

                return await message.reply({ embeds: [embed] });
            }

            // Lấy thông tin partner
            let partner;
            try {
                partner = await message.client.users.fetch(user.marriage.partnerId);
            } catch (error) {
                partner = { displayName: 'Unknown User', id: user.marriage.partnerId };
            }

            const marriage = user.marriage;
            const ringInfo = RING_INFO[marriage.ringType];
            
            // Tính level từ exp
            const totalExp = marriage.chatExp + marriage.voiceExp;
            const levelData = getLevelFromExp(totalExp);
            const currentLevel = Math.min(levelData.level, ringInfo.maxLevel);
            const isMaxLevel = currentLevel >= ringInfo.maxLevel;

            // Tính thời gian kết hôn
            const marriedDays = Math.floor((new Date() - new Date(marriage.marriedAt)) / (1000 * 60 * 60 * 24));
            
            // Tính progress bar
            const progressWidth = 20;
            let progress = 0;
            if (!isMaxLevel) {
                progress = Math.floor((levelData.currentExp / levelData.nextExp) * progressWidth);
            } else {
                progress = progressWidth;
            }
            const progressBar = '█'.repeat(progress) + '░'.repeat(progressWidth - progress);

            // Tính stats hoạt động
            const lastChatDays = marriage.lastChatTogether ? 
                Math.floor((new Date() - new Date(marriage.lastChatTogether)) / (1000 * 60 * 60 * 24)) : null;
            const lastVoiceDays = marriage.lastVoiceTogether ? 
                Math.floor((new Date() - new Date(marriage.lastVoiceTogether)) / (1000 * 60 * 60 * 24)) : null;

            const marriageEmbed = new EmbedBuilder()
                .setTitle('💒 THÔNG TIN HÔN NHÂN')
                .setDescription(`**${targetUser.displayName}** ${targetUserId === userId ? '(Bạn)' : ''}`)
                .addFields(
                    {
                        name: '💕 Thông tin cơ bản',
                        value: `💖 **Vợ/Chồng:** ${partner.displayName}\n` +
                               `${ringInfo.emoji} **Nhẫn:** ${ringInfo.name}\n` +
                               `📅 **Ngày cưới:** ${new Date(marriage.marriedAt).toLocaleDateString('vi-VN')}\n` +
                               `⏰ **Đã cưới:** ${marriedDays} ngày`,
                        inline: true
                    },
                    {
                        name: '📊 Level & EXP',
                        value: `💖 **Level:** ${currentLevel}/${ringInfo.maxLevel} ${isMaxLevel ? '🌟' : ''}\n` +
                               `📈 **EXP:** ${isMaxLevel ? 'MAX' : `${levelData.currentExp}/${levelData.nextExp}`}\n` +
                               `✨ **Tổng EXP:** ${totalExp.toLocaleString()}\n` +
                               `🎁 **Thưởng/level:** ${ringInfo.levelUpReward} Rin`,
                        inline: true
                    },
                    {
                        name: '🎯 Chi tiết EXP',
                        value: `💬 **Chat:** ${marriage.chatExp.toLocaleString()}\n` +
                               `🔊 **Voice:** ${marriage.voiceExp.toLocaleString()}\n` +
                               `⚡ **Tốc độ:** ×${ringInfo.expMultiplier}`,
                        inline: true
                    },
                    {
                        name: '📊 Tiến trình Level',
                        value: `${progressBar} ${isMaxLevel ? '100%' : Math.floor((levelData.currentExp / levelData.nextExp) * 100) + '%'}`,
                        inline: false
                    },
                    {
                        name: '📅 Hoạt động gần đây',
                        value: `💬 **Chat cuối:** ${lastChatDays !== null ? (lastChatDays === 0 ? 'Hôm nay' : `${lastChatDays} ngày trước`) : 'Chưa có'}\n` +
                               `🔊 **Voice cuối:** ${lastVoiceDays !== null ? (lastVoiceDays === 0 ? 'Hôm nay' : `${lastVoiceDays} ngày trước`) : 'Chưa có'}`,
                        inline: false
                    }
                )
                .setColor('#FF69B4')
                .setThumbnail(targetUser.displayAvatarURL());

            // Thêm tips nếu chưa max level
            if (!isMaxLevel) {
                marriageEmbed.addFields({
                    name: '💡 Cách tăng EXP',
                    value: `• **Chat cùng nhau:** +1 EXP/tin nhắn (×${ringInfo.expMultiplier})\n` +
                           `• **Voice cùng nhau:** +2 EXP/phút (×${ringInfo.expMultiplier})\n` +
                           `• **Tips:** Hoạt động nhiều trong cùng channel để tăng nhanh!`,
                    inline: false
                });
            } else {
                marriageEmbed.addFields({
                    name: '🌟 LEVEL TỐI ĐA',
                    value: `Chúc mừng! Bạn đã đạt level tối đa với ${ringInfo.name}!\n` +
                           `Hãy tiếp tục duy trì mối quan hệ tốt đẹp! 💕`,
                    inline: false
                });
            }

            marriageEmbed.setFooter({ 
                text: `💡 Dùng ${prefix}divorce để ly hôn • ${prefix}marriage @user để xem của người khác`,
                iconURL: message.client.user.displayAvatarURL()
            });

            await message.reply({ embeds: [marriageEmbed] });

        } catch (error) {
            console.error('Lỗi marriage command:', error);
            await message.reply('❌ Có lỗi xảy ra khi xem thông tin hôn nhân!');
        }
    }
}; 