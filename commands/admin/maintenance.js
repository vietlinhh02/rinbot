const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

// Global maintenance state
global.maintenanceMode = {
    enabled: false,
    reason: null,
    startTime: null,
    enabledBy: null
};

module.exports = {
    name: 'maintenance',
    description: 'Bật/tắt chế độ bảo trì bot (chỉ owner)',
    
    async execute(message, args) {
        // Kiểm tra quyền owner
        if (!config.isOwner(message.author.id)) {
            const noPermEmbed = new EmbedBuilder()
                .setTitle('🔒 QUYỀN TRUY CẬP BỊ TỪ CHỐI')
                .setDescription('**⛔ Chỉ chủ sở hữu bot mới có thể dùng lệnh này!**\n\n' +
                    '🔐 **Lý do bảo mật:**\n' +
                    '• Lệnh maintenance có thể vô hiệu hóa toàn bộ bot\n' +
                    '• Chỉ owner được phép thực hiện thao tác này\n' +
                    '• Đây là biện pháp bảo vệ hệ thống\n\n' +
                    '💡 **Dành cho Admin server:**\n' +
                    '• Liên hệ owner bot nếu cần bảo trì\n' +
                    '• Sử dụng các lệnh admin khác như `,setprefix`, `,cleargames`')
                .setColor('#FF4444')
                .setFooter({ text: 'Lệnh bảo mật cao cấp' })
                .setTimestamp();
                
            return message.reply({ embeds: [noPermEmbed] });
        }

        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'on' || subCommand === 'enable') {
            return await this.enableMaintenance(message, args.slice(1));
        } else if (subCommand === 'off' || subCommand === 'disable') {
            return await this.disableMaintenance(message);
        } else if (subCommand === 'status') {
            return await this.showStatus(message);
        } else {
            return await this.showHelp(message);
        }
    },

    async enableMaintenance(message, reasonArgs) {
        if (global.maintenanceMode.enabled) {
            return message.reply('⚠️ Bot đã đang trong chế độ bảo trì!');
        }

        const reason = reasonArgs.join(' ') || 'Bảo trì hệ thống';
        
        global.maintenanceMode = {
            enabled: true,
            reason: reason,
            startTime: new Date(),
            enabledBy: message.author.id
        };

        // Cập nhật activity bot
        try {
            await message.client.user.setActivity('🔧 ĐANG BẢO TRÌ - Chỉ Owner', { 
                type: 'WATCHING' 
            });
        } catch (error) {
            console.error('Lỗi cập nhật activity:', error);
        }

        const embed = new EmbedBuilder()
            .setTitle('🔧 CHẤU ĐỘ BẢO TRÌ ĐÃ BẬT')
            .setDescription(`**Bot hiện đang trong chế độ bảo trì!**\n\n` +
                `**📋 Thông tin:**\n` +
                `• **Lý do:** ${reason}\n` +
                `• **Bật bởi:** ${message.author.displayName}\n` +
                `• **Thời gian:** ${new Date().toLocaleString('vi-VN')}\n\n` +
                `**⚠️ Tác động:**\n` +
                `• Chỉ owner bot có thể dùng lệnh\n` +
                `• Tất cả user khác sẽ nhận thông báo bảo trì\n` +
                `• Activity bot hiển thị trạng thái bảo trì\n\n` +
                `**🔧 Để tắt:** \`,maintenance off\``)
            .setColor('#FFA500')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2377/2377194.png')
            .setFooter({ text: 'Chế độ bảo trì đã kích hoạt' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        
        console.log(`🔧 [MAINTENANCE] Enabled by ${message.author.tag} - Reason: ${reason}`);
    },

    async disableMaintenance(message) {
        if (!global.maintenanceMode.enabled) {
            return message.reply('⚠️ Bot không đang trong chế độ bảo trì!');
        }

        const duration = Date.now() - global.maintenanceMode.startTime;
        const durationText = this.formatDuration(duration);

        global.maintenanceMode = {
            enabled: false,
            reason: null,
            startTime: null,
            enabledBy: null
        };

        // Cập nhật lại activity bot bình thường
        try {
            if (global.updateBotActivity) {
                await global.updateBotActivity();
            }
        } catch (error) {
            console.error('Lỗi cập nhật activity:', error);
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ CHẤU ĐỘ BẢO TRÌ ĐÃ TẮT')
            .setDescription(`**Bot đã trở lại hoạt động bình thường!**\n\n` +
                `**📊 Thống kê bảo trì:**\n` +
                `• **Thời gian bảo trì:** ${durationText}\n` +
                `• **Tắt bởi:** ${message.author.displayName}\n` +
                `• **Hoàn thành lúc:** ${new Date().toLocaleString('vi-VN')}\n\n` +
                `**🎉 Bot đã sẵn sàng phục vụ tất cả người dùng!**`)
            .setColor('#00FF00')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/190/190411.png')
            .setFooter({ text: 'Bảo trì hoàn tất' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        
        console.log(`✅ [MAINTENANCE] Disabled by ${message.author.tag} - Duration: ${durationText}`);
    },

    async showStatus(message) {
        const maintenance = global.maintenanceMode;
        
        if (!maintenance.enabled) {
            const embed = new EmbedBuilder()
                .setTitle('✅ BOT HOẠT ĐỘNG BÌNH THƯỜNG')
                .setDescription('**Bot hiện đang hoạt động bình thường.**\n\n' +
                    '🟢 **Trạng thái:** Online\n' +
                    '📊 **Servers:** ' + message.client.guilds.cache.size + '\n' +
                    '👥 **Users:** ' + message.client.users.cache.size + '\n' +
                    '⚡ **Ping:** ' + Math.round(message.client.ws.ping) + 'ms')
                .setColor('#00FF00')
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }

        const duration = Date.now() - maintenance.startTime;
        const durationText = this.formatDuration(duration);
        
        const user = await message.client.users.fetch(maintenance.enabledBy).catch(() => null);
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 BOT ĐANG BẢO TRÌ')
            .setDescription(`**Bot hiện đang trong chế độ bảo trì.**\n\n` +
                `**📋 Chi tiết:**\n` +
                `• **Lý do:** ${maintenance.reason}\n` +
                `• **Bật bởi:** ${user ? user.displayName : 'Unknown'}\n` +
                `• **Bắt đầu:** ${maintenance.startTime.toLocaleString('vi-VN')}\n` +
                `• **Thời gian:** ${durationText}\n\n` +
                `**⚠️ Chỉ owner bot có thể sử dụng lệnh.**`)
            .setColor('#FFA500')
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = new EmbedBuilder()
            .setTitle('🔧 HƯỚNG DẪN MAINTENANCE')
            .setDescription('**Quản lý chế độ bảo trì bot**')
            .addFields(
                {
                    name: '📋 Lệnh cơ bản',
                    value: '• `,maintenance on [lý do]` - Bật bảo trì\n' +
                           '• `,maintenance off` - Tắt bảo trì\n' +
                           '• `,maintenance status` - Xem trạng thái',
                    inline: false
                },
                {
                    name: '💡 Ví dụ',
                    value: '• `,maintenance on Cập nhật database`\n' +
                           '• `,maintenance on Update bot version 2.1`\n' +
                           '• `,maintenance off`',
                    inline: false
                },
                {
                    name: '⚠️ Lưu ý',
                    value: '• Chỉ owner bot có thể dùng\n' +
                           '• Khi bật, chỉ owner được dùng bot\n' +
                           '• Activity bot sẽ hiển thị trạng thái bảo trì',
                    inline: false
                }
            )
            .setColor('#0099FF')
            .setFooter({ text: 'Dành cho owner bot' });

        await message.reply({ embeds: [embed] });
    },

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} ngày ${hours % 24} giờ`;
        if (hours > 0) return `${hours} giờ ${minutes % 60} phút`;
        if (minutes > 0) return `${minutes} phút ${seconds % 60} giây`;
        return `${seconds} giây`;
    }
}; 