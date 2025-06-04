const { EmbedBuilder } = require('discord.js');
const { getCityUser, updateCityUser } = require('../../utils/database');
const FastUtils = require('../../utils/fastUtils');

module.exports = {
    name: 'debuguser',
    description: '[ADMIN] Debug thông tin user và sửa lỗi',
    
    async execute(message, args) {
        // Chỉ admin mới được dùng
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Chỉ admin mới có thể sử dụng lệnh này!');
        }

        if (args.length === 0) {
            return message.reply('❌ Cần cung cấp user ID hoặc mention user!\nSử dụng: `,debuguser @user` hoặc `,debuguser [userId]`');
        }

        let targetUserId;
        
        // Kiểm tra nếu là mention
        if (message.mentions.users.size > 0) {
            targetUserId = message.mentions.users.first().id;
        } else {
            // Kiểm tra nếu là user ID
            targetUserId = args[0];
        }

        try {
            // Lấy thông tin user
            const cityUser = await getCityUser(targetUserId);
            const userRin = await FastUtils.getFastUserRin(targetUserId);

            const embed = new EmbedBuilder()
                .setTitle('🔍 DEBUG USER INFORMATION')
                .setDescription(`**User ID:** ${targetUserId}\n` +
                    `**Rin:** ${userRin}\n\n` +
                    `**🏠 Thông tin nhà:**\n` +
                    `• Home: ${cityUser.home || 'null'}\n` +
                    `• Last Repair: ${cityUser.lastRepair ? new Date(cityUser.lastRepair).toLocaleString('vi-VN') : 'null'}\n\n` +
                    `**💼 Thông tin nghề:**\n` +
                    `• Job: ${cityUser.job || 'null'}\n` +
                    `• Work Progress: ${cityUser.workProgress || 0}\n` +
                    `• Last Work: ${cityUser.lastWork ? new Date(cityUser.lastWork).toLocaleString('vi-VN') : 'null'}\n` +
                    `• Work Start Time: ${cityUser.workStartTime ? new Date(cityUser.workStartTime).toLocaleString('vi-VN') : 'null'}\n\n` +
                    `**🎯 Thông tin khác:**\n` +
                    `• Job Streak: ${cityUser.jobStreak || 0}\n` +
                    `• Daily Voice Minutes: ${cityUser.dailyVoiceMinutes || 0}\n` +
                    `• Daily Money Steal: ${cityUser.dailyMoneySteal || 0}\n` +
                    `• Daily Steal Records: ${JSON.stringify(cityUser.dailyStealRecords || {})}\n` +
                    `• Jailed Until: ${cityUser.jailedUntil ? new Date(cityUser.jailedUntil).toLocaleString('vi-VN') : 'null'}\n` +
                    `• Created At: ${new Date(cityUser.createdAt).toLocaleString('vi-VN')}\n` +
                    `• Updated At: ${new Date(cityUser.updatedAt).toLocaleString('vi-VN')}`)
                .setColor('#FF6B6B')
                .setFooter({ text: 'Admin Debug Tool' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Nếu có args[1] = "fix", thì sửa lỗi
            if (args[1] && args[1].toLowerCase() === 'fix') {
                console.log(`🔧 ADMIN ${message.author.id} đang sửa lỗi cho user ${targetUserId}`);
                
                // Reset hoàn toàn thông tin nhà và nghề
                await updateCityUser(targetUserId, {
                    home: null,
                    job: null,
                    workProgress: 0,
                    lastWork: null,
                    workStartTime: null,
                    lastRepair: null,
                    dailyMoneySteal: 0,
                    dailyStealRecords: {},
                    jailedUntil: null,
                    jailedBy: null,
                    dailyVoiceMinutes: 0
                });

                // Clear cache
                FastUtils.clearUserCache(targetUserId);

                const fixEmbed = new EmbedBuilder()
                    .setTitle('🔧 ĐÃ SỬA LỖI USER')
                    .setDescription(`**User ID:** ${targetUserId}\n\n` +
                        `**✅ Đã reset:**\n` +
                        `• Nhà: null\n` +
                        `• Nghề: null\n` +
                        `• Tiến độ công việc: 0\n` +
                        `• Thời gian làm việc: reset\n` +
                        `• Tù tội: clear\n` +
                        `• Cache: cleared\n\n` +
                        `**🎯 User giờ có thể thuê nhà và chọn nghề mới!**`)
                    .setColor('#00FF00')
                    .setFooter({ text: `Fixed by ${message.author.displayName}` })
                    .setTimestamp();

                await message.reply({ embeds: [fixEmbed] });
            }

        } catch (error) {
            console.error('Lỗi debuguser:', error);
            await message.reply('❌ Có lỗi xảy ra khi debug user!');
        }
    }
}; 