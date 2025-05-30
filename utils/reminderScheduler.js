const { EmbedBuilder } = require('discord.js');
const Reminder = require('../models/Reminder');

class ReminderScheduler {
    constructor(client) {
        this.client = client;
        this.isRunning = false;
    }

    // Bắt đầu scheduler
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🔔 Reminder Scheduler đã khởi động');
        
        // Kiểm tra mỗi 30 giây
        this.interval = setInterval(() => {
            this.checkReminders();
        }, 30 * 1000);
        
        // Kiểm tra ngay lập tức khi start
        this.checkReminders();
    }

    // Dừng scheduler
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('🔔 Reminder Scheduler đã dừng');
    }

    // Kiểm tra và gửi nhắc nhở
    async checkReminders() {
        try {
            const now = new Date();
            
            // Tìm các nhắc nhở đã đến hạn (trong vòng 1 phút gần đây để tránh miss)
            const dueReminders = await Reminder.find({
                reminderTime: { 
                    $lte: now,
                    $gte: new Date(now.getTime() - 60 * 1000) // 1 phút trước
                },
                isCompleted: false
            });

            if (dueReminders.length === 0) return;

            console.log(`🔔 Tìm thấy ${dueReminders.length} nhắc nhở cần gửi`);

            for (const reminder of dueReminders) {
                await this.sendReminder(reminder);
            }

        } catch (error) {
            console.error('Lỗi kiểm tra reminders:', error);
        }
    }

    // Gửi nhắc nhở cho user
    async sendReminder(reminder) {
        try {
            const user = await this.client.users.fetch(reminder.userId);
            if (!user) {
                console.log(`Không tìm thấy user ${reminder.userId} cho reminder ${reminder._id}`);
                await this.markReminderCompleted(reminder._id);
                return;
            }

            // Tạo embed nhắc nhở đẹp
            const embed = new EmbedBuilder()
                .setTitle('🔔 NHẮC NHỞ!')
                .setDescription(`### 📋 ${reminder.message}`)
                .addFields(
                    {
                        name: '⏰ Thời gian đặt nhắc',
                        value: `${reminder.reminderTime.toLocaleString('vi-VN', { 
                            timeZone: 'Asia/Ho_Chi_Minh',
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}`,
                        inline: false
                    },
                    {
                        name: '📅 Được tạo lúc',
                        value: `${reminder.createdAt.toLocaleString('vi-VN', { 
                            timeZone: 'Asia/Ho_Chi_Minh',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}`,
                        inline: true
                    },
                    {
                        name: '⚡ Gửi lúc',
                        value: `${new Date().toLocaleString('vi-VN', { 
                            timeZone: 'Asia/Ho_Chi_Minh',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}`,
                        inline: true
                    }
                )
                .setColor('#FFD700')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1827/1827422.png')
                .setFooter({ 
                    text: `🤖 RinBot Reminder • ID: ${reminder._id.toString().slice(-8)}`,
                    iconURL: this.client.user.displayAvatarURL() 
                })
                .setTimestamp();

            // Gửi DM
            await user.send({ embeds: [embed] });
            console.log(`✅ Đã gửi nhắc nhở cho ${user.displayName}: "${reminder.message}"`);

            // Đánh dấu đã hoàn thành
            await this.markReminderCompleted(reminder._id);

        } catch (error) {
            if (error.code === 50007) {
                // Cannot send messages to this user (DM disabled)
                console.log(`❌ Không thể gửi DM cho user ${reminder.userId} (DM disabled)`);
                
                // Thử gửi trong channel gốc
                try {
                    await this.sendReminderInChannel(reminder);
                } catch (channelError) {
                    console.error('Lỗi gửi trong channel:', channelError);
                }
                
                await this.markReminderCompleted(reminder._id);
            } else {
                console.error(`Lỗi gửi reminder ${reminder._id}:`, error);
                
                // Nếu có lỗi khác, thử lại sau bằng cách không mark completed
                // Nhưng tránh spam bằng cách check thời gian
                const timeSinceReminder = Date.now() - reminder.reminderTime.getTime();
                if (timeSinceReminder > 5 * 60 * 1000) { // Quá 5 phút thì bỏ qua
                    await this.markReminderCompleted(reminder._id);
                }
            }
        }
    }

    // Gửi nhắc nhở trong channel nếu không gửi được DM
    async sendReminderInChannel(reminder) {
        try {
            const guild = this.client.guilds.cache.get(reminder.guildId);
            if (!guild) return;

            // Tìm channel phù hợp (general, chat, hoặc channel đầu tiên có thể gửi tin nhắn)
            let channel = guild.channels.cache.find(ch => 
                ch.isTextBased() && 
                (ch.name.includes('general') || ch.name.includes('chat') || ch.name.includes('bot'))
            );

            if (!channel) {
                channel = guild.channels.cache.find(ch => ch.isTextBased());
            }

            if (!channel) return;

            const user = await this.client.users.fetch(reminder.userId);
            
            const embed = new EmbedBuilder()
                .setTitle('🔔 NHẮC NHỞ!')
                .setDescription(`### 📋 ${reminder.message}\n\n${user} **đây là lời nhắc của bạn!**`)
                .addFields(
                    {
                        name: '⏰ Thời gian nhắc',
                        value: `${reminder.reminderTime.toLocaleString('vi-VN', { 
                            timeZone: 'Asia/Ho_Chi_Minh',
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}`,
                        inline: true
                    },
                    {
                        name: '📍 Lý do gửi tại đây',
                        value: 'Không thể gửi tin nhắn riêng\n*(DM bị tắt)*',
                        inline: true
                    }
                )
                .setColor('#FFA500')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1827/1827422.png')
                .setFooter({ 
                    text: '💡 Để nhận DM, hãy bật "Allow direct messages from server members"',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            console.log(`📢 Đã gửi nhắc nhở trong channel ${channel.name} cho ${user.displayName}`);

        } catch (error) {
            console.error('Lỗi gửi reminder trong channel:', error);
        }
    }

    // Đánh dấu reminder đã hoàn thành
    async markReminderCompleted(reminderId) {
        try {
            await Reminder.findByIdAndUpdate(reminderId, { 
                isCompleted: true 
            });
        } catch (error) {
            console.error('Lỗi mark reminder completed:', error);
        }
    }

    // Lấy thống kê
    async getStats() {
        try {
            const total = await Reminder.countDocuments({});
            const active = await Reminder.countDocuments({ isCompleted: false });
            const completed = await Reminder.countDocuments({ isCompleted: true });
            
            return { total, active, completed };
        } catch (error) {
            console.error('Lỗi get stats:', error);
            return { total: 0, active: 0, completed: 0 };
        }
    }
}

module.exports = ReminderScheduler; 