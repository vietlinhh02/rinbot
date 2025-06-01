const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const { getPrefix } = require('../../utils/prefixHelper');

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

module.exports = {
    name: 'marry',
    description: 'Kết hôn với ai đó bằng nhẫn',
    async execute(message, args) {
        try {
            const prefix = await getPrefix(message.guild?.id);
            const userId = message.author.id;

            // Kiểm tra arguments
            if (!args[0] || !args[1]) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ THIẾU THÔNG TIN')
                    .setDescription('**Cách sử dụng:** `marry @user [loại nhẫn]`\n\n' +
                        '**💡 Ví dụ:**\n' +
                        `• \`${prefix}marry @user nhankim\` - Cầu hôn với nhẫn kim\n` +
                        `• \`${prefix}marry @user nhanbac\` - Cầu hôn với nhẫn bạc\n` +
                        `• \`${prefix}marry @user nhanvang\` - Cầu hôn với nhẫn vàng\n\n` +
                        '**💍 Loại nhẫn:**\n' +
                        `💍 **Nhẫn Kim** - Max level 10, tăng exp chậm\n` +
                        `💎 **Nhẫn Bạc** - Max level 20, tăng exp trung bình\n` +
                        `👑 **Nhẫn Vàng** - Max level 50, tăng exp nhanh\n\n` +
                        `**🛒 Mua nhẫn:** \`${prefix}shop\``)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [embed] });
            }

            // Lấy target user
            const mention = args[0].replace(/[<@!>]/g, '');
            let targetUser;
            try {
                targetUser = await message.client.users.fetch(mention);
            } catch (error) {
                return await message.reply('❌ Không tìm thấy user được mention!');
            }

            if (targetUser.id === userId) {
                return await message.reply('❌ Bạn không thể kết hôn với chính mình!');
            }

            if (targetUser.bot) {
                return await message.reply('❌ Bạn không thể kết hôn với bot!');
            }

            const ringType = args[1].toLowerCase();
            if (!RING_INFO[ringType]) {
                return await message.reply('❌ Loại nhẫn không hợp lệ! Chỉ có: nhankim, nhanbac, nhanvang');
            }

            // Lấy thông tin users
            const proposer = await User.findOne({ userId });
            const target = await User.findOne({ userId: targetUser.id });

            if (!proposer) {
                return await message.reply('❌ Bạn chưa có tài khoản! Gõ `rindaily` để tạo tài khoản.');
            }

            if (!target) {
                return await message.reply('❌ Người được cầu hôn chưa có tài khoản!');
            }

            // Kiểm tra trạng thái hôn nhân
            if (proposer.marriage?.isMarried) {
                return await message.reply('❌ Bạn đã kết hôn rồi! Hãy ly hôn trước khi kết hôn lại.');
            }

            if (target.marriage?.isMarried) {
                return await message.reply(`❌ ${targetUser.displayName} đã kết hôn rồi!`);
            }

            // Kiểm tra có nhẫn không
            if (!proposer.inventory || (proposer.inventory[ringType] || 0) < 1) {
                const ringName = RING_INFO[ringType].name;
                return await message.reply(`❌ Bạn không có ${ringName}! Hãy mua ở \`${prefix}shop\` trước.`);
            }

            const ringInfo = RING_INFO[ringType];

            // Tạo proposal embed
            const proposalEmbed = new EmbedBuilder()
                .setTitle('💒 LỜI CẦU HÔN')
                .setDescription(`**${message.author.displayName}** đang cầu hôn **${targetUser.displayName}**! 💕\n\n` +
                    `**💍 Nhẫn cưới:**\n` +
                    `${ringInfo.emoji} **${ringInfo.name}**\n` +
                    `• Level tối đa: ${ringInfo.maxLevel}\n` +
                    `• Tốc độ tăng exp: ×${ringInfo.expMultiplier}\n` +
                    `• Thưởng mỗi level: ${ringInfo.levelUpReward} Rin\n\n` +
                    `**💕 Cách tăng level nhẫn:**\n` +
                    `• Chat cùng nhau trong cùng channel\n` +
                    `• Ngồi voice cùng nhau\n` +
                    `• Càng nhiều hoạt động càng tăng exp nhanh\n\n` +
                    `**${targetUser.displayName}, bạn có đồng ý kết hôn không? 💖**`)
                .setColor('#FF69B4')
                .setThumbnail('https://raw.githubusercontent.com/vietlinhh02/test/refs/heads/main/d098bf056c1a3a3f23261606edde04de.png')
                .setFooter({ text: 'Bạn có 60 giây để trả lời!' })
                .setTimestamp();

            const acceptButton = new ButtonBuilder()
                .setCustomId(`marry_accept_${userId}_${targetUser.id}_${ringType}`)
                .setLabel('💖 Đồng ý')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId(`marry_reject_${userId}_${targetUser.id}`)
                .setLabel('💔 Từ chối')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

            await message.reply({ embeds: [proposalEmbed], components: [row] });

        } catch (error) {
            console.error('Lỗi marry command:', error);
            await message.reply('❌ Có lỗi xảy ra khi cầu hôn!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('marry_')) return;

        const [action, result, proposerId, targetId, ringType] = interaction.customId.split('_');
        
        // Chỉ target mới có thể trả lời
        if (interaction.user.id !== targetId) {
            return interaction.reply({ content: '❌ Chỉ người được cầu hôn mới có thể trả lời!', ephemeral: true });
        }

        if (result === 'reject') {
            const embed = new EmbedBuilder()
                .setTitle('💔 ĐÃ TỪ CHỐI')
                .setDescription(`**${interaction.user.displayName}** đã từ chối lời cầu hôn.\n\n` +
                    `Đừng buồn, còn nhiều cơ hội khác! 💪`)
                .setColor('#FF6B6B');

            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        if (result === 'accept') {
            try {
                // Lấy lại thông tin users
                const proposer = await User.findOne({ userId: proposerId });
                const target = await User.findOne({ userId: targetId });

                if (!proposer || !target) {
                    return interaction.reply({ content: '❌ Không tìm thấy thông tin user!', ephemeral: true });
                }

                // Kiểm tra lại trạng thái
                if (proposer.marriage?.isMarried || target.marriage?.isMarried) {
                    return interaction.reply({ content: '❌ Một trong hai đã kết hôn!', ephemeral: true });
                }

                // Kiểm tra lại nhẫn
                if (!proposer.inventory || (proposer.inventory[ringType] || 0) < 1) {
                    return interaction.reply({ content: '❌ Người cầu hôn không còn nhẫn!', ephemeral: true });
                }

                // Thực hiện kết hôn
                const marriageDate = new Date();
                const ringInfo = RING_INFO[ringType];

                // Cập nhật thông tin marriage cho cả hai
                proposer.marriage = {
                    isMarried: true,
                    partnerId: targetId,
                    marriedAt: marriageDate,
                    ringType: ringType,
                    ringLevel: 1,
                    chatExp: 0,
                    voiceExp: 0,
                    lastChatTogether: null,
                    lastVoiceTogether: null
                };

                target.marriage = {
                    isMarried: true,
                    partnerId: proposerId,
                    marriedAt: marriageDate,
                    ringType: ringType,
                    ringLevel: 1,
                    chatExp: 0,
                    voiceExp: 0,
                    lastChatTogether: null,
                    lastVoiceTogether: null
                };

                // Trừ nhẫn từ inventory
                proposer.inventory[ringType] -= 1;

                await proposer.save();
                await target.save();

                const successEmbed = new EmbedBuilder()
                    .setTitle('🎉 CHÚC MỪNG ĐÍNH HÔN!')
                    .setDescription(`**${interaction.user.displayName}** đã đồng ý kết hôn với **<@${proposerId}>**! 💍\n\n` +
                        `**💒 Thông tin hôn nhân:**\n` +
                        `${ringInfo.emoji} **Nhẫn:** ${ringInfo.name}\n` +
                        `💖 **Level hiện tại:** 1/${ringInfo.maxLevel}\n` +
                        `📅 **Ngày cưới:** ${marriageDate.toLocaleDateString('vi-VN')}\n` +
                        `📊 **Exp:** 0/100\n\n` +
                        `**🎯 Cách tăng level nhẫn:**\n` +
                        `• Chat cùng nhau: +1 exp/tin nhắn\n` +
                        `• Voice cùng nhau: +2 exp/phút\n` +
                        `• Mỗi level tăng: +${ringInfo.levelUpReward} Rin cho cả hai\n\n` +
                        `**💡 Lệnh hữu ích:**\n` +
                        `• \`marriage\` - Xem thông tin hôn nhân\n` +
                        `• \`divorce\` - Ly hôn (nếu cần)\n\n` +
                        `**Chúc hai bạn hạnh phúc! 💕**`)
                    .setColor('#00FF00')
                    .setThumbnail('https://raw.githubusercontent.com/vietlinhh02/test/refs/heads/main/d098bf056c1a3a3f23261606edde04de.png')
                    .setFooter({ text: 'Hãy chat và voice cùng nhau để tăng level nhẫn!' })
                    .setTimestamp();

                await interaction.update({ embeds: [successEmbed], components: [] });

            } catch (error) {
                console.error('Lỗi kết hôn:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi kết hôn!', ephemeral: true });
            }
        }
    }
}; 