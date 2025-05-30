const { EmbedBuilder } = require('discord.js');
const Reminder = require('../../models/Reminder');

module.exports = {
    name: 'huynhacnho',
    description: 'Hủy nhắc nhở theo số thứ tự',
    
    async execute(message, args) {
        try {
            if (args.length === 0) {
                return message.reply('❌ **Cách sử dụng:** `,huynhacnho [số thứ tự]`\n\n' +
                    'Dùng `,xemnhacnho` để xem danh sách và số thứ tự của các nhắc nhở.');
            }

            const index = parseInt(args[0]);
            if (isNaN(index) || index < 1) {
                return message.reply('❌ Số thứ tự phải là số nguyên dương! Ví dụ: `,huynhacnho 1`');
            }

            const userId = message.author.id;
            
            // Lấy danh sách nhắc nhở để tìm theo index
            const reminders = await Reminder.find({ 
                userId: userId, 
                isCompleted: false 
            }).sort({ reminderTime: 1 });

            if (reminders.length === 0) {
                return message.reply('📝 Bạn chưa có nhắc nhở nào để hủy!');
            }

            if (index > reminders.length) {
                return message.reply(`❌ Số thứ tự không hợp lệ! Bạn chỉ có ${reminders.length} nhắc nhở. Dùng `,xemnhacnho` để xem danh sách.`);
            }

            const reminderToCancel = reminders[index - 1];
            
            // Cập nhật thành đã hoàn thành (tức là hủy)
            await Reminder.findByIdAndUpdate(reminderToCancel._id, { isCompleted: true });

            // Hiển thị xác nhận
            const embed = new EmbedBuilder()
                .setTitle('🗑️ HỦY NHẮC NHỞ THÀNH CÔNG!')
                .setDescription(`**📝 Nội dung đã hủy:** ${reminderToCancel.message}\n\n` +
                    `**⏰ Thời gian dự kiến:** ${reminderToCancel.reminderTime.toLocaleString('vi-VN', { 
                        timeZone: 'Asia/Ho_Chi_Minh',
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}\n\n` +
                    `**✅ Trạng thái:** Đã hủy\n\n` +
                    `**💡 Mẹo:** Dùng `,xemnhacnho` để xem các nhắc nhở còn lại.`)
                .setColor('#FF6B6B')
                .setFooter({ text: `Hủy thành công nhắc nhở số ${index}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi huynhacnho:', error);
            await message.reply('❌ Có lỗi xảy ra khi hủy nhắc nhở!');
        }
    }
}; 