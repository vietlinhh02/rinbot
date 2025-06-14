const { EmbedBuilder } = require('discord.js');
const { updateUserRin, getUserRin } = require('../../utils/database');
const config = require('../../config/config');

module.exports = {
    name: 'setrin',
    description: 'Chỉ owner dùng: Set Rin cho một hoặc nhiều user. Cú pháp: setrin <@user1> <@user2> ... <số tiền>',
    async execute(message, args) {
        // Chỉ cho owner dùng
        if (!config.isOwner(message.author.id)) {
            return message.reply('⛔ Lệnh này chỉ dành cho owner bot!');
        }

        if (args.length < 2) {
            return message.reply('❌ Cú pháp: `setrin <@user1> [user2] [user3] ... <số tiền>`\n\n**Ví dụ:**\n• `setrin @user 1000` - Set 1000 Rin cho 1 user\n• `setrin @user1 @user2 @user3 5000` - Set 5000 Rin cho 3 user\n• `setrin 123456789 987654321 2000` - Set 2000 Rin cho 2 user bằng ID');
        }

        // Số tiền sẽ là argument cuối cùng
        const amount = parseInt(args[args.length - 1]);
        if (isNaN(amount)) {
            return message.reply('❌ Số Rin phải là số nguyên!\n\n**Ví dụ:** `setrin @user1 @user2 1000`');
        }

        if (amount < 0) {
            return message.reply('❌ Số Rin không thể âm! Dùng `addrin` để trừ tiền.');
        }

        // Lấy danh sách user (tất cả args trừ cái cuối là số tiền)
        const userArgs = args.slice(0, -1);
        const userIds = [];
        
        // Validate và extract user IDs
        for (let userArg of userArgs) {
            let userId = userArg.replace(/<@!?|>/g, '');
            if (!/^[0-9]+$/.test(userId)) {
                return message.reply(`❌ User không hợp lệ: \`${userArg}\`! Hãy mention user hoặc dùng ID hợp lệ.`);
            }
            userIds.push(userId);
        }

        // Loại bỏ duplicate user IDs
        const uniqueUserIds = [...new Set(userIds)];

        if (uniqueUserIds.length === 0) {
            return message.reply('❌ Không có user nào hợp lệ để set Rin!');
        }

        try {
            const results = [];
            let successCount = 0;
            let errorCount = 0;

            // Xử lý từng user
            for (let userId of uniqueUserIds) {
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

                    results.push({
                        success: true,
                        userId,
                        displayName,
                        currentRin,
                        newRin: amount,
                        difference
                    });
                    successCount++;

                } catch (error) {
                    console.error(`Lỗi khi set Rin cho user ${userId}:`, error);
                    results.push({
                        success: false,
                        userId,
                        error: error.message
                    });
                    errorCount++;
                }
            }

            // Tạo embed kết quả
            const embed = new EmbedBuilder()
                .setTitle('💰 KẾT QUẢ SET RIN')
                .setColor(errorCount === 0 ? '#00FF00' : (successCount === 0 ? '#FF0000' : '#FFA500'))
                .setFooter({ text: 'RinBot Admin Tools - SetRin Command' })
                .setTimestamp();

            let description = `**Đã set ${amount.toLocaleString()} Rin**\n\n`;
            
            if (successCount > 0) {
                description += `✅ **Thành công:** ${successCount}/${uniqueUserIds.length} user\n`;
            }
            if (errorCount > 0) {
                description += `❌ **Thất bại:** ${errorCount}/${uniqueUserIds.length} user\n`;
            }

            embed.setDescription(description);

            // Thêm chi tiết cho từng user thành công
            if (successCount > 0) {
                let successDetails = '';
                results.filter(r => r.success).forEach(result => {
                    const changeText = result.difference >= 0 ? `+${result.difference.toLocaleString()}` : result.difference.toLocaleString();
                    successDetails += `• **${result.displayName}**: ${result.currentRin.toLocaleString()} → ${result.newRin.toLocaleString()} (${changeText})\n`;
                });
                
                if (successDetails.length > 1024) {
                    successDetails = successDetails.substring(0, 1000) + '...\n*(Quá nhiều để hiển thị)*';
                }
                
                embed.addFields({
                    name: '✅ Thành công:',
                    value: successDetails,
                    inline: false
                });
            }

            // Thêm chi tiết cho user thất bại
            if (errorCount > 0) {
                let errorDetails = '';
                results.filter(r => !r.success).forEach(result => {
                    errorDetails += `• <@${result.userId}>: ${result.error}\n`;
                });
                
                if (errorDetails.length > 1024) {
                    errorDetails = errorDetails.substring(0, 1000) + '...\n*(Quá nhiều để hiển thị)*';
                }
                
                embed.addFields({
                    name: '❌ Thất bại:',
                    value: errorDetails,
                    inline: false
                });
            }

            embed.addFields(
                { name: '👨‍💼 Thực hiện bởi:', value: message.author.displayName, inline: true },
                { name: '⏰ Thời gian:', value: new Date().toLocaleString('vi-VN'), inline: true }
            );

            await message.reply({ embeds: [embed] });

            // Log cho admin
            console.log(`🔧 [ADMIN] ${message.author.tag} (${message.author.id}) set ${amount} Rin cho ${successCount}/${uniqueUserIds.length} user(s)`);

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