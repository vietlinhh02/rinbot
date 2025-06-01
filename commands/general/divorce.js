const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const { getPrefix } = require('../../utils/prefixHelper');

// Định nghĩa thông tin nhẫn (để tính refund)
const RING_INFO = {
    nhankim: {
        name: 'Nhẫn Kim',
        emoji: '💍',
        price: 1000,
        refundRate: 0.3 // Hoàn 30% giá trị
    },
    nhanbac: {
        name: 'Nhẫn Bạc', 
        emoji: '💎',
        price: 3000,
        refundRate: 0.3
    },
    nhanvang: {
        name: 'Nhẫn Vàng',
        emoji: '👑',
        price: 10000,
        refundRate: 0.3
    }
};

module.exports = {
    name: 'divorce',
    description: 'Ly hôn với vợ/chồng',
    async execute(message, args) {
        try {
            const prefix = await getPrefix(message.guild?.id);
            const userId = message.author.id;

            // Lấy thông tin user
            const user = await User.findOne({ userId });
            if (!user) {
                return await message.reply('❌ Bạn chưa có tài khoản!');
            }

            // Kiểm tra trạng thái hôn nhân
            if (!user.marriage || !user.marriage.isMarried) {
                const embed = new EmbedBuilder()
                    .setTitle('💔 CHƯA KẾT HÔN')
                    .setDescription('Bạn chưa kết hôn nên không thể ly hôn!\n\n' +
                        `**💡 Muốn kết hôn?**\n` +
                        `• Mua nhẫn ở \`${prefix}shop\`\n` +
                        `• Dùng \`${prefix}marry @user [nhẫn]\` để cầu hôn`)
                    .setColor('#95A5A6');

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
            
            // Tính thời gian kết hôn
            const marriedDays = Math.floor((new Date() - new Date(marriage.marriedAt)) / (1000 * 60 * 60 * 24));
            const totalExp = marriage.chatExp + marriage.voiceExp;
            
            // Tính tiền hoàn trả
            const refundAmount = Math.floor(ringInfo.price * ringInfo.refundRate);

            // Tạo divorce confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setTitle('💔 XÁC NHẬN LY HÔN')
                .setDescription(`**${message.author.displayName}** muốn ly hôn với **${partner.displayName}**\n\n` +
                    `**💒 Thông tin hôn nhân hiện tại:**\n` +
                    `${ringInfo.emoji} **Nhẫn:** ${ringInfo.name}\n` +
                    `💖 **Level:** ${marriage.ringLevel}\n` +
                    `📅 **Ngày cưới:** ${new Date(marriage.marriedAt).toLocaleDateString('vi-VN')}\n` +
                    `⏰ **Đã cưới:** ${marriedDays} ngày\n` +
                    `✨ **Tổng EXP:** ${totalExp.toLocaleString()}\n\n` +
                    `**💸 Khi ly hôn:**\n` +
                    `• Mất tất cả thông tin hôn nhân\n` +
                    `• Mất tất cả EXP đã tích lũy\n` +
                    `• Được hoàn ${refundAmount.toLocaleString()} Rin (${Math.round(ringInfo.refundRate * 100)}% giá nhẫn)\n` +
                    `• Có thể kết hôn lại với người khác\n\n` +
                    `⚠️ **Cảnh báo:** Ly hôn sẽ xóa vĩnh viễn mọi tiến trình!`)
                .setColor('#FF6B6B')
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ text: 'Hãy suy nghĩ kỹ trước khi quyết định!' });

            const confirmButton = new ButtonBuilder()
                .setCustomId(`divorce_confirm_${userId}`)
                .setLabel('💔 Xác nhận ly hôn')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`divorce_cancel_${userId}`)
                .setLabel('❤️ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [confirmEmbed], components: [row] });

        } catch (error) {
            console.error('Lỗi divorce command:', error);
            await message.reply('❌ Có lỗi xảy ra khi xử lý ly hôn!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('divorce_')) return;

        const [action, result, userId] = interaction.customId.split('_');
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ người yêu cầu ly hôn mới có thể thực hiện!', ephemeral: true });
        }

        if (result === 'cancel') {
            const embed = new EmbedBuilder()
                .setTitle('❤️ ĐÃ HỦY LY HÔN')
                .setDescription('Bạn đã quyết định không ly hôn.\n\n' +
                    'Hãy trân trọng mối quan hệ và tiếp tục xây dựng hạnh phúc! 💕\n\n' +
                    '**💡 Tips để có hôn nhân hạnh phúc:**\n' +
                    '• Chat nhiều với nhau để tăng EXP\n' +
                    '• Voice cùng nhau để tăng EXP nhanh hơn\n' +
                    '• Sử dụng `marriage` để theo dõi tiến trình')
                .setColor('#00FF00');

            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        if (result === 'confirm') {
            try {
                // Lấy lại thông tin user
                const user = await User.findOne({ userId });
                if (!user || !user.marriage?.isMarried) {
                    return interaction.reply({ content: '❌ Bạn không còn trong tình trạng kết hôn!', ephemeral: true });
                }

                // Lấy thông tin partner
                const partner = await User.findOne({ userId: user.marriage.partnerId });
                
                const marriage = user.marriage;
                const ringInfo = RING_INFO[marriage.ringType];
                const refundAmount = Math.floor(ringInfo.price * ringInfo.refundRate);
                const marriedDays = Math.floor((new Date() - new Date(marriage.marriedAt)) / (1000 * 60 * 60 * 24));
                const totalExp = marriage.chatExp + marriage.voiceExp;

                // Lấy thông tin partner để hiển thị
                let partnerName = 'Unknown User';
                try {
                    const partnerUser = await interaction.client.users.fetch(user.marriage.partnerId);
                    partnerName = partnerUser.displayName;
                } catch {}

                // Reset marriage cho user hiện tại
                user.marriage = {
                    isMarried: false,
                    partnerId: null,
                    marriedAt: null,
                    ringType: null,
                    ringLevel: 0,
                    chatExp: 0,
                    voiceExp: 0,
                    lastChatTogether: null,
                    lastVoiceTogether: null
                };

                // Hoàn tiền
                user.rin += refundAmount;

                // Reset marriage cho partner (nếu có)
                if (partner) {
                    partner.marriage = {
                        isMarried: false,
                        partnerId: null,
                        marriedAt: null,
                        ringType: null,
                        ringLevel: 0,
                        chatExp: 0,
                        voiceExp: 0,
                        lastChatTogether: null,
                        lastVoiceTogether: null
                    };
                    await partner.save();
                }

                await user.save();

                const successEmbed = new EmbedBuilder()
                    .setTitle('💔 LY HÔN THÀNH CÔNG')
                    .setDescription(`**${interaction.user.displayName}** đã ly hôn với **${partnerName}**\n\n` +
                        `**📊 Tóm tắt cuộc hôn nhân:**\n` +
                        `${ringInfo.emoji} **Nhẫn:** ${ringInfo.name}\n` +
                        `💖 **Level đạt được:** ${marriage.ringLevel}\n` +
                        `⏰ **Thời gian:** ${marriedDays} ngày\n` +
                        `✨ **Tổng EXP:** ${totalExp.toLocaleString()}\n\n` +
                        `**💰 Kết quả ly hôn:**\n` +
                        `• Được hoàn: **${refundAmount.toLocaleString()} Rin**\n` +
                        `• Tiền hiện có: **${user.rin.toLocaleString()} Rin**\n` +
                        `• Trạng thái: **Độc thân**\n\n` +
                        `**🆓 Bạn có thể:**\n` +
                        `• Mua nhẫn mới để cầu hôn người khác\n` +
                        `• Tận hưởng cuộc sống độc thân\n` +
                        `• Kiếm thêm Rin để mua nhẫn tốt hơn\n\n` +
                        `**Chúc bạn tìm được hạnh phúc mới! 🌟**`)
                    .setColor('#FF6B6B')
                    .setFooter({ text: 'Hệ thống marriage • Hẹn gặp lại!' })
                    .setTimestamp();

                await interaction.update({ embeds: [successEmbed], components: [] });

            } catch (error) {
                console.error('Lỗi xác nhận ly hôn:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi ly hôn!', ephemeral: true });
            }
        }
    }
}; 