const { EmbedBuilder } = require('discord.js');

class ErrorHandler {
    constructor(client) {
        this.client = client;
        // Hỗ trợ nhiều owner ID từ config
        const config = require('../config/config');
        this.ownerIds = config.ownerIds || [];
        this.errorQueue = [];
        this.isProcessing = false;
        this.lastErrorTime = new Map(); // Track để tránh spam
        this.setupErrorListeners();
    }

    setupErrorListeners() {
        // Catch uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.sendErrorToOwner('Uncaught Exception', error);
        });

        // Catch unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.sendErrorToOwner('Unhandled Promise Rejection', reason);
        });

        // Override console.error để catch tất cả errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError.apply(console, args);
            
            // Tạo error message từ arguments
            const errorMessage = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            // Chỉ gửi nếu có từ khóa lỗi
            if (this.isActualError(errorMessage)) {
                this.sendErrorToOwner('Console Error', errorMessage);
            }
        };
    }

    isActualError(message) {
        const errorKeywords = [
            'error', 'Error', 'ERROR',
            'exception', 'Exception', 'EXCEPTION',
            'TypeError', 'ReferenceError', 'SyntaxError',
            'failed', 'Failed', 'FAILED',
            'cannot', 'Cannot', 'CANNOT',
            'undefined', 'null'
        ];

        // Bỏ qua một số log thông thường
        const ignoreKeywords = [
            'Heartbeat',
            'WebSocket',
            'Ready!',
            'Logged in as'
        ];

        if (ignoreKeywords.some(keyword => message.includes(keyword))) {
            return false;
        }

        return errorKeywords.some(keyword => message.includes(keyword));
    }

    async sendErrorToOwner(type, error) {
        if (!this.client || !this.ownerIds || this.ownerIds.length === 0) return;

        try {
            // Rate limiting - chỉ gửi 1 lỗi tương tự mỗi 5 phút
            const errorHash = this.getErrorHash(error);
            const now = Date.now();
            const lastTime = this.lastErrorTime.get(errorHash);
            
            if (lastTime && now - lastTime < 300000) { // 5 phút
                return;
            }
            
            this.lastErrorTime.set(errorHash, now);

            const errorString = error instanceof Error ? error.stack || error.message : String(error);
            
            // Giới hạn độ dài message
            const truncatedError = errorString.length > 1500 
                ? errorString.substring(0, 1500) + '...' 
                : errorString;

            const embed = new EmbedBuilder()
                .setTitle(`🚨 ${type}`)
                .setDescription(`\`\`\`\n${truncatedError}\`\`\``)
                .setColor('#FF0000')
                .setTimestamp()
                .addFields(
                    { name: '🤖 Bot', value: this.client.user?.tag || 'Unknown', inline: true },
                    { name: '🌐 Servers', value: this.client.guilds.cache.size.toString(), inline: true },
                    { name: '👥 Users', value: this.client.users.cache.size.toString(), inline: true }
                )
                .setFooter({ text: 'RinBot Error Reporter' });

            // Gửi cho tất cả owner
            let sentCount = 0;
            for (const ownerId of this.ownerIds) {
                try {
                    const owner = await this.client.users.fetch(ownerId);
                    if (owner) {
                        await owner.send({ embeds: [embed] });
                        sentCount++;
                    }
                } catch (ownerError) {
                    console.error(`Không thể gửi lỗi cho owner ${ownerId}:`, ownerError.message);
                }
            }

            if (sentCount > 0) {
                console.log(`✅ Đã gửi lỗi cho ${sentCount}/${this.ownerIds.length} owner(s): ${type}`);
            }

        } catch (sendError) {
            console.error('Không thể gửi lỗi cho owner:', sendError);
        }
    }

    getErrorHash(error) {
        // Tạo hash đơn giản để nhận diện lỗi tương tự
        const errorString = error instanceof Error ? error.message : String(error);
        return errorString.substring(0, 100); // Lấy 100 ký tự đầu làm hash
    }

    // Method để manually gửi lỗi
    reportError(message, error = null) {
        this.sendErrorToOwner('Manual Report', error || message);
    }

    // Method để test
    async testErrorReport() {
        await this.sendErrorToOwner('Test Error', new Error('Đây là test error từ RinBot'));
    }
}

module.exports = ErrorHandler; 