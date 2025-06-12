const { EmbedBuilder } = require('discord.js');
const { updateUserRin, getUserRin } = require('../../utils/database');
const config = require('../../config/config');

module.exports = {
    name: 'setrin',
    description: 'Chỉ owner dùng: Set Rin cho user bất kỳ. Cú pháp: setrin <@user|userId> <số tiền>',
    async execute(message, args) {
        // Chỉ cho owner dùng
        if (!config.isOwner(message.author.id)) {
            return message.reply('⛔ Lệnh này chỉ dành cho owner bot!');
        }

        if (args.length < 2) {
            return message.reply('❌ Cú pháp: `setrin <@user|userId> <số tiền>`\n\n**Ví dụ:**\n• `setrin @user 1000` - Set 1000 Rin cho user\n• `setrin 123456789 5000` - Set 5000 Rin cho user ID');
        }

        // Lấy userId
        let userId = args[0].replace(/<@!?|>/g, '');
        if (!/^[0-9]+$/.test(userId)) {
            return message.reply('❌ User không hợp lệ! Hãy mention user hoặc dùng ID hợp lệ.');
        }

        const amount = parseInt(args[1]);
        if (isNaN(amount)) {
            return message.reply('❌ Số Rin phải là số nguyên!\n\n**Ví dụ:** `setrin @user 1000`');
        }

        if (amount < 0) {
            return message.reply('❌ Số Rin không thể âm! Dùng `addrin @user -1000` để trừ tiền.');
        }

        try {
            // Lấy số Rin hiện tại của user
            const currentRin = await getUserRin(userId);
            
            // Tính toán số tiền cần thay đổi để đạt được số Rin mong muốn
            const difference = amount - currentRin;
            
            // Cập nhật Rin
            await updateUserRin(userId, difference);

            // Thử lấy thông tin user để hiển thị tên
            let displayName = `<@${userId}>`;
            try {
                const user = await message.client.users.fetch(userId);
                displayName = user.displayName || user.username;
            } catch (error) {
                // Giữ nguyên mention nếu không lấy được tên
            }

            const embed = new EmbedBuilder()
                .setTitle('💰 ĐÃ SET RIN')
                .setDescription(`**${displayName}** đã được set **${amount.toLocaleString()} Rin**!`)
                .addFields(
                    { name: '📊 Thông tin chi tiết:', value: `• **Trước:** ${currentRin.toLocaleString()} Rin\n• **Sau:** ${amount.toLocaleString()} Rin\n• **Thay đổi:** ${difference >= 0 ? '+' : ''}${difference.toLocaleString()} Rin`, inline: false },
                    { name: '👨‍💼 Thực hiện bởi:', value: message.author.displayName, inline: true },
                    { name: '⏰ Thời gian:', value: new Date().toLocaleString('vi-VN'), inline: true }
                )
                .setColor('#FFD700')
                .setFooter({ text: 'RinBot Admin Tools - SetRin Command' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Log cho admin
            console.log(`🔧 [ADMIN] ${message.author.tag} (${message.author.id}) set ${amount} Rin cho user ${userId} (${displayName})`);

        } catch (error) {
            console.error('Lỗi setrin:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ LỖI HỆ THỐNG')
                .setDescription('Có lỗi xảy ra khi set Rin cho user!\n\n**Chi tiết lỗi đã được ghi log.**')
                .setColor('#FF0000')
                .setFooter({ text: 'Vui lòng thử lại hoặc liên hệ dev' });

            await message.reply({ embeds: [errorEmbed] });
        }
    }
}; 