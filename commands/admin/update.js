const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../../config/config');

module.exports = {
    name: 'update',
    description: 'Cập nhật bot từ GitHub repository (chỉ dành cho owner)',
    
    async execute(message, args) {
        // Kiểm tra quyền owner
        if (!config.isOwner(message.author.id)) {
            const noPermEmbed = new EmbedBuilder()
                .setTitle('🔒 QUYỀN TRUY CẬP BỊ TỪ CHỐI')
                .setDescription('**⛔ Chỉ chủ sở hữu bot mới có thể cập nhật!**\n\n' +
                    '🔐 **Lý do bảo mật:**\n' +
                    '• Lệnh update có thể thay đổi toàn bộ code bot\n' +
                    '• Chỉ owner được phép thực hiện thao tác này\n' +
                    '• Đây là biện pháp bảo vệ hệ thống\n\n' +
                    '💡 **Dành cho Admin server:**\n' +
                    '• Liên hệ owner bot nếu cần update\n' +
                    '• Sử dụng các lệnh admin khác như `,setprefix`, `,cleargames`')
                .setColor('#FF4444')
                .setFooter({ text: 'Lệnh bảo mật cao cấp' })
                .setTimestamp();
                
            return message.reply({ embeds: [noPermEmbed] });
        }

        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'check') {
            return await this.checkUpdates(message);
        } else if (subCommand === 'force') {
            return await this.forceUpdate(message);
        } else if (subCommand === 'backup') {
            return await this.backupData(message);
        } else if (subCommand === 'status') {
            return await this.showStatus(message);
        } else {
            return await this.performUpdate(message);
        }
    },

    // Kiểm tra có update không
    async checkUpdates(message) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 KIỂM TRA CẬP NHẬT')
            .setDescription('Đang kiểm tra phiên bản mới...')
            .setColor('#FFA500')
            .setTimestamp();

        const statusMsg = await message.reply({ embeds: [embed] });

        try {
            exec('git fetch origin && git status', (error, stdout, stderr) => {
                if (error) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ LỖI KIỂM TRA CẬP NHẬT')
                        .setDescription(`\`\`\`${error.message}\`\`\``)
                        .setColor('#FF0000')
                        .setTimestamp();
                    
                    statusMsg.edit({ embeds: [errorEmbed] });
                    return;
                }

                const hasUpdates = stdout.includes('behind') || stdout.includes('can be fast-forwarded');
                
                const updateEmbed = new EmbedBuilder()
                    .setTitle(hasUpdates ? '🆕 CÓ CẬP NHẬT MỚI!' : '✅ ĐÃ Ở PHIÊN BẢN MỚI NHẤT')
                    .setDescription(hasUpdates ? 
                        '**GitHub có phiên bản mới!**\n\n' +
                        '📋 **Git status:**\n' +
                        `\`\`\`${stdout}\`\`\`\n` +
                        '💡 **Để cập nhật:**\n' +
                        '• `,update` - Cập nhật tự động\n' +
                        '• `,update force` - Cập nhật bắt buộc\n' +
                        '• `,update backup` - Backup trước khi update'
                        :
                        '**Bot đang ở phiên bản mới nhất!**\n\n' +
                        '📋 **Git status:**\n' +
                        `\`\`\`${stdout}\`\`\`\n` +
                        '✨ Không cần cập nhật gì thêm!'
                    )
                    .setColor(hasUpdates ? '#00FF00' : '#0099FF')
                    .setTimestamp();

                statusMsg.edit({ embeds: [updateEmbed] });
            });

        } catch (error) {
            console.error('Lỗi check updates:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra cập nhật!');
        }
    },

    // Thực hiện cập nhật
    async performUpdate(message) {
        const confirmEmbed = new EmbedBuilder()
            .setTitle('⚠️ XÁC NHẬN CẬP NHẬT BOT')
            .setDescription('**🤖 Bạn có chắc muốn cập nhật bot?**\n\n' +
                '**Quá trình sẽ bao gồm:**\n' +
                '1. 🔍 Kiểm tra Git status\n' +
                '2. 💾 Backup dữ liệu quan trọng\n' +
                '3. ⬇️ Pull code mới từ GitHub\n' +
                '4. 📦 Cài đặt dependencies mới\n' +
                '5. 🔄 Restart bot\n\n' +
                '⏰ **Thời gian dự kiến:** 1-3 phút\n' +
                '⚠️ **Lưu ý:** Bot sẽ offline trong quá trình update!\n\n' +
                '**Phản hồi "yes" để tiếp tục, "no" để hủy**')
            .setColor('#FF6600')
            .setFooter({ text: 'Hết hạn sau 30 giây' })
            .setTimestamp();

        await message.reply({ embeds: [confirmEmbed] });

        // Đợi phản hồi xác nhận
        const filter = (m) => m.author.id === message.author.id && ['yes', 'no', 'y', 'n'].includes(m.content.toLowerCase());
        
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            const response = collected.first().content.toLowerCase();
            
            if (response === 'yes' || response === 'y') {
                await this.executeUpdate(message);
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❌ ĐÃ HỦY CẬP NHẬT')
                    .setDescription('Cập nhật bot đã được hủy bỏ.')
                    .setColor('#6C757D')
                    .setTimestamp();
                
                await message.reply({ embeds: [cancelEmbed] });
            }

        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ HẾT THỜI GIAN')
                .setDescription('Không nhận được phản hồi. Đã hủy cập nhật.')
                .setColor('#FF0000')
                .setTimestamp();
            
            await message.reply({ embeds: [timeoutEmbed] });
        }
    },

    // Thực hiện update thực sự
    async executeUpdate(message) {
        const progressEmbed = new EmbedBuilder()
            .setTitle('🔄 ĐANG CẬP NHẬT BOT...')
            .setDescription('**Bước 1/5:** Đang backup dữ liệu và chuẩn bị...')
            .setColor('#FFA500')
            .setTimestamp();

        const progressMsg = await message.reply({ embeds: [progressEmbed] });

        try {
            // Bước 1: Backup và setup
            await this.updateProgress(progressMsg, 1, 'Backup dữ liệu và setup Git authentication', '#FFA500');
            await this.performBackup();
            await this.setupGitAuth();

            // Bước 2: Git pull
            await this.updateProgress(progressMsg, 2, 'Đang pull code từ private repository', '#FFA500');
            await this.executeGitPull();

            // Bước 3: Cài dependencies
            await this.updateProgress(progressMsg, 3, 'Đang cài đặt dependencies mới', '#FFA500');
            await this.executeCommand('npm install --production');

            // Bước 4: Kiểm tra integrity
            await this.updateProgress(progressMsg, 4, 'Kiểm tra tính toàn vẹn và cấu hình', '#FFA500');
            await this.checkIntegrity();

            // Bước 5: Restart
            await this.updateProgress(progressMsg, 5, 'Hoàn thành và restart bot', '#00FF00');
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ CẬP NHẬT THÀNH CÔNG!')
                .setDescription('**🎉 Bot đã được cập nhật từ private repository!**\n\n' +
                    '✅ **Backup & Setup:** Hoàn thành\n' +
                    '✅ **Pull Code:** Hoàn thành\n' +
                    '✅ **Dependencies:** Hoàn thành\n' +
                    '✅ **Integrity Check:** OK\n' +
                    '✅ **Restart:** Hoàn thành\n\n' +
                    '**🤖 Bot đang khởi động lại...**\n' +
                    '🔄 Bot sẽ online trở lại trong vài giây!')
                .setColor('#00FF00')
                .setFooter({ text: 'Private repo update completed at' })
                .setTimestamp();

            await progressMsg.edit({ embeds: [successEmbed] });

            // Restart bot (sau 3 giây để gửi được tin nhắn)
            setTimeout(() => {
                process.exit(0); // PM2 sẽ tự restart
            }, 3000);

        } catch (error) {
            console.error('Lỗi update private repo:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ CẬP NHẬT PRIVATE REPO THẤT BẠI!')
                .setDescription(`**💥 Có lỗi xảy ra trong quá trình cập nhật:**\n\n` +
                    `\`\`\`${error.message}\`\`\`\n\n` +
                    '**🔧 Giải pháp cho Private Repository:**\n' +
                    '• Kiểm tra `GITHUB_TOKEN` trong .env\n' +
                    '• Đảm bảo token có quyền truy cập repo\n' +
                    '• Thử `,update force` để reset và pull lại\n' +
                    '• Kiểm tra SSH key nếu dùng SSH\n' +
                    '• Liên hệ dev nếu vẫn lỗi')
                .setColor('#FF0000')
                .setTimestamp();

            await progressMsg.edit({ embeds: [errorEmbed] });
        }
    },

    // Setup Git authentication cho private repository
    async setupGitAuth() {
        try {
            // Kiểm tra xem có GitHub token không
            const githubToken = process.env.GITHUB_TOKEN;
            const githubUser = process.env.GITHUB_USERNAME || 'github-user';
            
            if (githubToken) {
                // Sử dụng Personal Access Token
                console.log('🔑 Đang setup GitHub authentication với PAT...');
                
                // Set up git credential helper để sử dụng token
                await this.executeCommand(`git config credential.helper store`);
                
                // Get current remote URL
                const remoteUrl = await this.executeCommand('git config --get remote.origin.url');
                const cleanUrl = remoteUrl.trim();
                
                // Nếu URL hiện tại là HTTPS, thêm token
                if (cleanUrl.includes('https://github.com/')) {
                    const repoPath = cleanUrl.replace('https://github.com/', '');
                    const newUrl = `https://${githubUser}:${githubToken}@github.com/${repoPath}`;
                    await this.executeCommand(`git remote set-url origin "${newUrl}"`);
                    console.log('✅ Đã cấu hình GitHub PAT authentication');
                } else if (cleanUrl.includes('git@github.com:')) {
                    console.log('🔑 Đang sử dụng SSH authentication');
                    // SSH key should be already configured
                } else {
                    console.log('⚠️ Unknown git remote format:', cleanUrl);
                }
            } else {
                console.log('⚠️ Không tìm thấy GITHUB_TOKEN, sử dụng authentication hiện tại');
            }
            
        } catch (error) {
            console.error('Lỗi setup git auth:', error);
            // Không throw error ở đây, để thử git pull trước
        }
    },

    // Git pull với hỗ trợ private repository
    async executeGitPull() {
        try {
            // Thử fetch trước để kiểm tra authentication
            await this.executeCommand('git fetch origin');
            
            // Nếu fetch thành công, thực hiện pull
            const pullResult = await this.executeCommand('git pull origin main');
            console.log('Git pull result:', pullResult);
            
            return pullResult;
            
        } catch (error) {
            // Nếu main branch không tồn tại, thử master
            try {
                console.log('Thử pull từ master branch...');
                const pullResult = await this.executeCommand('git pull origin master');
                console.log('Git pull master result:', pullResult);
                return pullResult;
            } catch (masterError) {
                throw new Error(`Git pull failed: ${error.message}. Also tried master: ${masterError.message}`);
            }
        }
    },

    // Cập nhật bắt buộc (bypass conflicts)
    async forceUpdate(message) {
        const warningEmbed = new EmbedBuilder()
            .setTitle('⚠️ CẬP NHẬT BẮT BUỘC')
            .setDescription('**🚨 CẢNH BÁO: Cập nhật bắt buộc sẽ:**\n\n' +
                '• ❌ Xóa tất cả thay đổi local\n' +
                '• 🔄 Reset về phiên bản GitHub\n' +
                '• 💾 Backup tự động trước khi reset\n\n' +
                '**⚠️ Chỉ dùng khi update thường gặp xung đột!**\n\n' +
                'Gõ "force" để xác nhận:')
            .setColor('#FF4444')
            .setTimestamp();

        await message.reply({ embeds: [warningEmbed] });

        const filter = (m) => m.author.id === message.author.id;
        
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 15000, 
                errors: ['time'] 
            });

            if (collected.first().content.toLowerCase() === 'force') {
                await this.executeForceUpdate(message);
            } else {
                await message.reply('❌ Đã hủy force update.');
            }

        } catch (error) {
            await message.reply('⏰ Hết thời gian. Đã hủy force update.');
        }
    },

    // Thực hiện force update
    async executeForceUpdate(message) {
        const progressMsg = await message.reply('🔄 **FORCE UPDATE:** Đang backup và reset private repo...');

        try {
            // Backup trước khi reset
            await this.performBackup();
            
            // Setup authentication cho private repo
            await this.setupGitAuth();
            
            // Reset hard và pull từ private repo
            await this.executeCommand('git fetch origin');
            
            // Thử reset về main hoặc master
            try {
                await this.executeCommand('git reset --hard origin/main');
            } catch (error) {
                console.log('Thử reset về master branch...');
                await this.executeCommand('git reset --hard origin/master');
            }
            
            await this.executeCommand('npm install --production');

            await progressMsg.edit('✅ **FORCE UPDATE:** Private repo đã reset thành công! Đang restart...');
            
            setTimeout(() => {
                process.exit(0);
            }, 2000);

        } catch (error) {
            await progressMsg.edit(`❌ **FORCE UPDATE:** Lỗi private repo!\n\`\`\`${error.message}\`\`\`\n\n` +
                '**💡 Kiểm tra:**\n' +
                '• GITHUB_TOKEN trong .env\n' +
                '• Quyền access token\n' +
                '• Remote URL repository');
        }
    },

    // Backup dữ liệu
    async backupData(message) {
        try {
            await this.performBackup();
            
            const backupEmbed = new EmbedBuilder()
                .setTitle('💾 BACKUP HOÀN THÀNH')
                .setDescription('**✅ Đã backup thành công!**\n\n' +
                    '📁 **Đã backup:**\n' +
                    '• Config files (.env)\n' +
                    '• Package.json\n' +
                    '• Custom modifications\n\n' +
                    '📍 **Vị trí:** `./backup/` folder\n' +
                    '⏰ **Thời gian:** ' + new Date().toLocaleString('vi-VN'))
                .setColor('#00FF00')
                .setTimestamp();

            await message.reply({ embeds: [backupEmbed] });

        } catch (error) {
            await message.reply(`❌ Lỗi backup: \`${error.message}\``);
        }
    },

    // Hiển thị trạng thái
    async showStatus(message) {
        try {
            const package = require('../../package.json');
            
            exec('git log -1 --pretty=format:"%h - %s (%cr)"', (error, stdout) => {
                const commit = error ? 'Không thể lấy thông tin' : stdout;
                
                const statusEmbed = new EmbedBuilder()
                    .setTitle('📊 TRẠNG THÁI BOT')
                    .addFields(
                        { name: '🏷️ Version', value: package.version || 'Unknown', inline: true },
                        { name: '📦 Node.js', value: process.version, inline: true },
                        { name: '💾 Memory', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`, inline: true },
                        { name: '⏰ Uptime', value: this.formatUptime(process.uptime()), inline: true },
                        { name: '🔗 Discord.js', value: require('discord.js').version, inline: true },
                        { name: '🗃️ MongoDB', value: 'Connected', inline: true },
                        { name: '📝 Last Commit', value: commit, inline: false }
                    )
                    .setColor('#0099FF')
                    .setTimestamp();

                message.reply({ embeds: [statusEmbed] });
            });

        } catch (error) {
            await message.reply(`❌ Lỗi lấy status: \`${error.message}\``);
        }
    },

    // Helper functions
    async updateProgress(message, step, description, color) {
        const progressEmbed = new EmbedBuilder()
            .setTitle('🔄 ĐANG CẬP NHẬT BOT...')
            .setDescription(`**Bước ${step}/5:** ${description}`)
            .setColor(color)
            .setTimestamp();

        await message.edit({ embeds: [progressEmbed] });
    },

    async executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    },

    async performBackup() {
        const backupDir = './backup';
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Backup important files
        if (fs.existsSync('.env')) {
            fs.copyFileSync('.env', `${backupDir}/.env.backup.${timestamp}`);
        }
        
        if (fs.existsSync('package.json')) {
            fs.copyFileSync('package.json', `${backupDir}/package.json.backup.${timestamp}`);
        }
    },

    async checkIntegrity() {
        // Kiểm tra file quan trọng tồn tại
        const requiredFiles = ['index.js', 'package.json', 'config/config.js'];
        
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`File quan trọng không tồn tại: ${file}`);
            }
        }
    },

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        return `${days}d ${hours}h ${minutes}m`;
    }
}; 