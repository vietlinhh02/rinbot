const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Reminder = require('../../models/Reminder');

module.exports = {
    name: 'xemnhacnho',
    description: 'Xem danh sách nhắc nhở của bạn',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            
            // Lấy danh sách nhắc nhở chưa hoàn thành
            const reminders = await Reminder.find({ 
                userId: userId, 
                isCompleted: false 
            }).sort({ reminderTime: 1 }).limit(10);

            if (reminders.length === 0) {
                return message.reply('📝 Bạn chưa có nhắc nhở nào! Dùng `,nhacnho [thời gian] [nội dung]` để tạo nhắc nhở mới.');
            }

            let reminderList = '';
            reminders.forEach((reminder, index) => {
                const timeStr = reminder.reminderTime.toLocaleString('vi-VN', { 
                    timeZone: 'Asia/Ho_Chi_Minh',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const truncatedMessage = reminder.message.length > 50 
                    ? reminder.message.substring(0, 50) + '...' 
                    : reminder.message;
                
                reminderList += `**${index + 1}.** ${timeStr} - ${truncatedMessage}\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('📋 DANH SÁCH NHẮC NHỞ')
                .setDescription(`### 👤 Của: ${message.author.displayName}\n**📊 Tổng cộng:** ${reminders.length} lời nhắc\n`)
                .addFields(
                    {
                        name: '📝 Các nhắc nhở sắp tới',
                        value: reminderList || 'Không có nhắc nhở nào.',
                        inline: false
                    },
                    {
                        name: '💡 Hướng dẫn sử dụng',
                        value: '• `,huynhacnho [số]` - Hủy nhắc nhở\n• `,nhacnho [thời gian] [nội dung]` - Tạo mới\n• Bấm 🔄 để làm mới danh sách',
                        inline: false
                    }
                )
                .setColor('#0099FF')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1827/1827422.png')
                .setFooter({ 
                    text: 'Hiển thị tối đa 10 nhắc nhở gần nhất',
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Tạo button để refresh hoặc clear all
            const refreshButton = new ButtonBuilder()
                .setCustomId(`refresh_reminders_${userId}`)
                .setLabel('🔄 Làm mới')
                .setStyle(ButtonStyle.Secondary);

            const clearButton = new ButtonBuilder()
                .setCustomId(`clear_reminders_${userId}`)
                .setLabel('🗑️ Xóa tất cả')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(refreshButton, clearButton);

            await message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Lỗi xemnhacnho:', error);
            await message.reply('❌ Có lỗi xảy ra khi xem nhắc nhở!');
        }
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('refresh_reminders_') && !interaction.customId.startsWith('clear_reminders_')) return;

        const userId = interaction.customId.split('_')[2];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ chủ sở hữu mới có thể thực hiện!', ephemeral: true });
        }

        if (interaction.customId.startsWith('refresh_reminders_')) {
            // Refresh danh sách
            try {
                const reminders = await Reminder.find({ 
                    userId: userId, 
                    isCompleted: false 
                }).sort({ reminderTime: 1 }).limit(10);

                if (reminders.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('📝 DANH SÁCH NHẮC NHỞ')
                        .setDescription('Bạn chưa có nhắc nhở nào! Dùng `,nhacnho [thời gian] [nội dung]` để tạo nhắc nhở mới.')
                        .setColor('#6C757D');

                    return await interaction.update({ embeds: [embed], components: [] });
                }

                let reminderList = '';
                reminders.forEach((reminder, index) => {
                    const timeStr = reminder.reminderTime.toLocaleString('vi-VN', { 
                        timeZone: 'Asia/Ho_Chi_Minh',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const truncatedMessage = reminder.message.length > 50 
                        ? reminder.message.substring(0, 50) + '...' 
                        : reminder.message;
                    
                    reminderList += `**${index + 1}.** ${timeStr} - ${truncatedMessage}\n`;
                });

                const refreshEmbed = new EmbedBuilder()
                    .setTitle('�� DANH SÁCH NHẮC NHỞ (Đã làm mới)')
                    .setDescription(`### 👤 Của: ${interaction.user.displayName}\n**📊 Tổng cộng:** ${reminders.length} lời nhắc\n`)
                    .addFields(
                        {
                            name: '📝 Các nhắc nhở sắp tới',
                            value: reminderList || 'Không có nhắc nhở nào.',
                            inline: false
                        },
                        {
                            name: '💡 Hướng dẫn sử dụng',
                            value: '• `,huynhacnho [số]` - Hủy nhắc nhở\n• `,nhacnho [thời gian] [nội dung]` - Tạo mới\n• Bấm 🔄 để làm mới danh sách',
                            inline: false
                        },
                        {
                            name: '🔄 Trạng thái',
                            value: `Đã làm mới lúc ${new Date().toLocaleString('vi-VN', {
                                timeZone: 'Asia/Ho_Chi_Minh',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}`,
                            inline: false
                        }
                    )
                    .setColor('#32CD32')
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1827/1827422.png')
                    .setFooter({ 
                        text: 'Hiển thị tối đa 10 nhắc nhở gần nhất',
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                await interaction.update({ embeds: [refreshEmbed], components: [] });

            } catch (error) {
                console.error('Lỗi refresh reminders:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
            }

        } else if (interaction.customId.startsWith('clear_reminders_')) {
            // Xóa tất cả nhắc nhở
            try {
                const result = await Reminder.updateMany(
                    { userId: userId, isCompleted: false },
                    { isCompleted: true }
                );

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ ĐÃ XÓA TẤT CẢ NHẮC NHỞ')
                    .setDescription(`**✅ Hoàn thành!** Đã xóa ${result.modifiedCount} lời nhắc.\n\n` +
                        'Bạn có thể tạo nhắc nhở mới bằng `,nhacnho [thời gian] [nội dung]`.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });

            } catch (error) {
                console.error('Lỗi clear reminders:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
            }
        }
    }
}; 