const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { WebhookClient, EmbedBuilder } = require('discord.js');
const config = require('./config/config.js');

class DeployManager {
    constructor() {
        this.botProcess = null;
        this.restarting = false;
        this.webhook = null;
        this.startTime = new Date();
        this.restartCount = 0;
        
        // Khởi tạo webhook nếu có cấu hình
        if (config.deployWebhook.id && config.deployWebhook.token) {
            this.webhook = new WebhookClient({
                id: config.deployWebhook.id,
                token: config.deployWebhook.token
            });
        }
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Khởi tạo Deploy Manager...');
        
        // Kiểm tra config
        const validation = config.validate();
        if (!validation.isValid) {
            console.error('❌ Lỗi cấu hình:');
            validation.errors.forEach(error => console.error(error));
            console.log('\n💡 Hướng dẫn:');
            console.log('1. Tạo file .env trong thư mục gốc');
            console.log('2. Thêm các biến môi trường cần thiết:');
            console.log('   DISCORD_TOKEN=your_bot_token');
            console.log('   MONGO_URI=your_mongodb_uri');
            console.log('   DEPLOY_WEBHOOK_ID=your_webhook_id (tùy chọn)');
            console.log('   DEPLOY_WEBHOOK_TOKEN=your_webhook_token (tùy chọn)');
            console.log('   DEPLOY_CHANNEL_ID=your_channel_id (tùy chọn)');
        }
        
        // Khởi động bot
        await this.startBot();
        
        // Thiết lập file watcher
        this.setupFileWatcher();
        
        // Thiết lập signal handlers
        this.setupSignalHandlers();
        
        // Gửi thông báo khởi động
        await this.sendDeployNotification('start');
    }
    
    async startBot() {
        if (this.botProcess) {
            console.log('⏹️ Đang dừng bot...');
            this.botProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('▶️ Đang khởi động bot...');
        
        this.botProcess = spawn('node', ['index.js'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            env: { ...process.env, FORCE_COLOR: '1' }
        });
        
        // Xử lý output
        this.botProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            console.log(`[BOT] ${output}`);
            
            // Kiểm tra bot đã sẵn sàng
            if (output.includes('đã sẵn sàng')) {
                this.onBotReady();
            }
        });
        
        this.botProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            console.error(`[BOT ERROR] ${error}`);
        });
        
        this.botProcess.on('close', (code) => {
            console.log(`🔴 Bot đã dừng với code: ${code}`);
            
            if (!this.restarting && code !== 0) {
                console.log('🔄 Bot bị crash, tự động restart sau 5 giây...');
                setTimeout(() => this.startBot(), 5000);
            }
        });
        
        this.botProcess.on('error', (error) => {
            console.error('❌ Lỗi khởi động bot:', error);
            setTimeout(() => this.startBot(), 5000);
        });
    }
    
    async onBotReady() {
        console.log('✅ Bot đã sẵn sàng!');
        this.restartCount++;
        
        if (this.restartCount > 1) {
            await this.sendDeployNotification('restart');
        }
    }
    
    setupFileWatcher() {
        console.log('👀 Thiết lập file watcher...');
        
        // Theo dõi các file quan trọng
        const watcher = chokidar.watch([
            'index.js',
            'commands/**/*.js',
            'utils/**/*.js',
            'models/**/*.js',
            'config/**/*.js'
        ], {
            ignored: /node_modules/,
            persistent: true,
            ignoreInitial: true
        });
        
        // Debounce restart để tránh restart nhiều lần
        let restartTimer = null;
        
        watcher.on('change', (filePath) => {
            console.log(`📝 File thay đổi: ${filePath}`);
            
            if (restartTimer) {
                clearTimeout(restartTimer);
            }
            
            restartTimer = setTimeout(async () => {
                await this.restartBot('Code update detected');
            }, 1000); // Đợi 1 giây sau thay đổi cuối
        });
        
        watcher.on('error', error => {
            console.error('❌ Lỗi file watcher:', error);
        });
    }
    
    async restartBot(reason = 'Manual restart') {
        if (this.restarting) return;
        
        this.restarting = true;
        console.log(`🔄 Đang restart bot: ${reason}`);
        
        await this.sendDeployNotification('update', reason);
        await this.startBot();
        
        this.restarting = false;
    }
    
    async sendDeployNotification(type, reason = '') {
        if (!this.webhook) return;
        
        try {
            const now = new Date();
            const uptime = this.getUptime();
            
            let embed;
            
            switch (type) {
                case 'start':
                    embed = new EmbedBuilder()
                        .setTitle('🚀 BOT KHỞI ĐỘNG')
                        .setDescription('**RinBot đã được khởi động thành công!**')
                        .addFields(
                            { name: '⏰ Thời gian', value: now.toLocaleString('vi-VN'), inline: true },
                            { name: '🔧 Phiên bản Node', value: process.version, inline: true },
                            { name: '💻 Môi trường', value: config.nodeEnv, inline: true }
                        )
                        .setColor(0x00ff00)
                        .setFooter({ text: 'Deploy Manager v1.0' })
                        .setTimestamp();
                    break;
                    
                case 'restart':
                    embed = new EmbedBuilder()
                        .setTitle('🔄 BOT RESTART')
                        .setDescription('**RinBot đã được restart thành công!**')
                        .addFields(
                            { name: '⏰ Thời gian', value: now.toLocaleString('vi-VN'), inline: true },
                            { name: '📊 Lần restart', value: `#${this.restartCount}`, inline: true },
                            { name: '⏱️ Uptime trước đó', value: uptime, inline: true }
                        )
                        .setColor(0xffaa00)
                        .setFooter({ text: 'Auto restart by Deploy Manager' })
                        .setTimestamp();
                    break;
                    
                case 'update':
                    embed = new EmbedBuilder()
                        .setTitle('📝 CODE UPDATE')
                        .setDescription('**Phát hiện code thay đổi, đang restart bot...**')
                        .addFields(
                            { name: '📋 Lý do', value: reason, inline: false },
                            { name: '⏰ Thời gian', value: now.toLocaleString('vi-VN'), inline: true },
                            { name: '⏱️ Uptime', value: uptime, inline: true }
                        )
                        .setColor(0x0099ff)
                        .setFooter({ text: 'Hot reload by Deploy Manager' })
                        .setTimestamp();
                    break;
                    
                case 'stop':
                    embed = new EmbedBuilder()
                        .setTitle('⏹️ BOT DỪNG')
                        .setDescription('**RinBot đã được dừng**')
                        .addFields(
                            { name: '⏰ Thời gian', value: now.toLocaleString('vi-VN'), inline: true },
                            { name: '⏱️ Tổng uptime', value: uptime, inline: true },
                            { name: '📊 Tổng restart', value: `${this.restartCount}`, inline: true }
                        )
                        .setColor(0xff0000)
                        .setFooter({ text: 'Deploy Manager v1.0' })
                        .setTimestamp();
                    break;
            }
            
            await this.webhook.send({ embeds: [embed] });
            console.log(`📤 Đã gửi thông báo ${type} vào Discord`);
            
        } catch (error) {
            console.error('❌ Lỗi gửi webhook:', error.message);
        }
    }
    
    getUptime() {
        const uptime = Date.now() - this.startTime.getTime();
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    setupSignalHandlers() {
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Nhận tín hiệu ${signal}, đang tắt gracefully...`);
            
            await this.sendDeployNotification('stop');
            
            if (this.botProcess) {
                this.botProcess.kill();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log('✅ Đã tắt thành công!');
            process.exit(0);
        };
        
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        
        process.on('uncaughtException', async (error) => {
            console.error('❌ Uncaught Exception:', error);
            await this.restartBot('Uncaught Exception');
        });
        
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            await this.restartBot('Unhandled Rejection');
        });
    }
}

// Khởi động Deploy Manager
if (require.main === module) {
    new DeployManager();
}

module.exports = DeployManager; 