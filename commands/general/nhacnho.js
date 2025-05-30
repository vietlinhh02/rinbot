const { EmbedBuilder } = require('discord.js');
const Reminder = require('../../models/Reminder');

module.exports = {
    name: 'nhacnho',
    description: 'Đặt lời nhắc cho thời gian cụ thể',
    
    async execute(message, args) {
        try {
            if (args.length < 2) {
                return message.reply('❌ **Cách sử dụng:**\n' +
                    '`,nhacnho 17h dậy đi học` - Nhắc hôm nay lúc 17h\n' +
                    '`,nhacnho 25/12 20h30 sinh nhật bạn` - Nhắc ngày 25/12 lúc 20h30\n' +
                    '`,nhacnho 2h30 ngủ đi` - Nhắc sáng mai lúc 2h30\n\n' +
                    '**Định dạng thời gian:** `7h`, `13h30`, `22h45`\n' +
                    '**Định dạng ngày:** `25/12`, `1/1`, `15/3`');
            }

            const timeInput = args[0];
            const reminderText = args.slice(1).join(' ');

            if (!reminderText.trim()) {
                return message.reply('❌ Vui lòng nhập nội dung nhắc nhở!');
            }

            // Parse thời gian
            const reminderTime = this.parseTime(timeInput);
            if (!reminderTime) {
                return message.reply('❌ **Định dạng thời gian không hợp lệ!**\n\n' +
                    '**Ví dụ đúng:**\n' +
                    '• `7h` - 7 giờ sáng\n' +
                    '• `13h30` - 1 giờ 30 chiều\n' +
                    '• `22h45` - 10 giờ 45 tối\n' +
                    '• `25/12 20h` - 25/12 lúc 8h tối\n' +
                    '• `1/1 0h30` - 1/1 lúc 0h30');
            }

            // Kiểm tra thời gian phải ở tương lai
            const now = new Date();
            if (reminderTime <= now) {
                return message.reply('❌ Thời gian nhắc nhở phải ở tương lai! Hiện tại là: ' + 
                    now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
            }

            // Kiểm tra không quá 30 ngày
            const maxTime = new Date();
            maxTime.setDate(maxTime.getDate() + 30);
            if (reminderTime > maxTime) {
                return message.reply('❌ Không thể đặt nhắc nhở quá 30 ngày!');
            }

            // Lưu vào database
            const reminder = new Reminder({
                userId: message.author.id,
                guildId: message.guild.id,
                message: reminderText,
                reminderTime: reminderTime
            });

            await reminder.save();

            // Hiển thị xác nhận
            const embed = new EmbedBuilder()
                .setTitle('⏰ ĐẶT NHẮC NHỞ THÀNH CÔNG!')
                .setDescription(`**📝 Nội dung:** ${reminderText}\n\n` +
                    `**⏰ Thời gian:** ${reminderTime.toLocaleString('vi-VN', { 
                        timeZone: 'Asia/Ho_Chi_Minh',
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}\n\n` +
                    `**👤 Người nhận:** ${message.author.displayName}\n` +
                    `**📧 Gửi qua:** Tin nhắn riêng (DM)\n\n` +
                    `**💡 Lưu ý:** Bot sẽ gửi tin nhắn riêng cho bạn khi tới giờ!`)
                .setColor('#00FF00')
                .setFooter({ text: `ID: ${reminder._id}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi nhacnho:', error);
            await message.reply('❌ Có lỗi xảy ra khi đặt nhắc nhở!');
        }
    },

    // Parse thời gian từ input
    parseTime(input) {
        try {
            const now = new Date();
            
            // Kiểm tra có ngày không (dd/mm format)
            const dateMatch = input.match(/^(\d{1,2})\/(\d{1,2})\s+(.+)$/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1; // JavaScript month starts from 0
                const timeStr = dateMatch[3];
                
                // Parse time part
                const timeMatch = timeStr.match(/^(\d{1,2})h(\d{0,2})$/);
                if (!timeMatch) return null;
                
                const hour = parseInt(timeMatch[1]);
                const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                
                if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
                if (day < 1 || day > 31 || month < 0 || month > 11) return null;
                
                const targetDate = new Date();
                targetDate.setFullYear(now.getFullYear(), month, day);
                targetDate.setHours(hour, minute, 0, 0);
                
                // Nếu ngày đã qua trong năm nay, chuyển sang năm sau
                if (targetDate < now) {
                    targetDate.setFullYear(targetDate.getFullYear() + 1);
                }
                
                return targetDate;
            }
            
            // Chỉ có giờ (format: 7h, 13h30, 22h45)
            const timeMatch = input.match(/^(\d{1,2})h(\d{0,2})$/);
            if (!timeMatch) return null;
            
            const hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
            
            const targetTime = new Date();
            targetTime.setHours(hour, minute, 0, 0);
            
            // Nếu giờ đã qua hôm nay, chuyển sang ngày mai
            if (targetTime <= now) {
                targetTime.setDate(targetTime.getDate() + 1);
            }
            
            return targetTime;
            
        } catch (error) {
            console.error('Lỗi parse time:', error);
            return null;
        }
    }
}; 