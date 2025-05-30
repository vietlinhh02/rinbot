const { EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');

module.exports = {
    name: 'version',
    description: 'Kiểm tra phiên bản bot hiện tại',
    
    async execute(message, args) {
        try {
            const package = require('../../package.json');
            
            // Lấy thông tin Git
            exec('git log -1 --pretty=format:"%h|%s|%cr|%an"', (error, stdout) => {
                let gitInfo = 'Không thể lấy thông tin Git';
                let commitHash = 'Unknown';
                let commitMessage = 'Unknown';
                let commitTime = 'Unknown';
                let commitAuthor = 'Unknown';
                
                if (!error && stdout) {
                    const parts = stdout.split('|');
                    commitHash = parts[0] || 'Unknown';
                    commitMessage = parts[1] || 'Unknown';
                    commitTime = parts[2] || 'Unknown';
                    commitAuthor = parts[3] || 'Unknown';
                }

                // Tính uptime
                const uptime = process.uptime();
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor((uptime % 86400) / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const uptimeStr = `${days}d ${hours}h ${minutes}m`;

                // Tính memory usage
                const memoryUsage = process.memoryUsage();
                const memoryUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
                const memoryTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);

                const embed = new EmbedBuilder()
                    .setTitle('🤖 THÔNG TIN PHIÊN BẢN RINBOT')
                    .setDescription('**Thông tin chi tiết về bot hiện tại**')
                    .addFields(
                        {
                            name: '📦 Bot Version',
                            value: `\`${package.version || '1.0.0'}\``,
                            inline: true
                        },
                        {
                            name: '🔗 Discord.js',
                            value: `\`${require('discord.js').version}\``,
                            inline: true
                        },
                        {
                            name: '📱 Node.js',
                            value: `\`${process.version}\``,
                            inline: true
                        },
                        {
                            name: '💾 Memory Usage',
                            value: `\`${memoryUsed}MB / ${memoryTotal}MB\``,
                            inline: true
                        },
                        {
                            name: '⏰ Uptime',
                            value: `\`${uptimeStr}\``,
                            inline: true
                        },
                        {
                            name: '🏓 Ping',
                            value: `\`${message.client.ws.ping}ms\``,
                            inline: true
                        },
                        {
                            name: '📝 Last Commit',
                            value: `**${commitHash}** - ${commitMessage}\n*${commitTime} by ${commitAuthor}*`,
                            inline: false
                        },
                        {
                            name: '🛠️ Tech Stack',
                            value: '• MongoDB + Mongoose\n• Node.js + Discord.js\n• PM2 Process Manager\n• Git Version Control',
                            inline: false
                        }
                    )
                    .setColor('#00FF7F')
                    .setFooter({ 
                        text: `RinBot by VietLinhh • Server: ${message.guild.name}`,
                        iconURL: message.client.user.displayAvatarURL() 
                    })
                    .setTimestamp();

                message.reply({ embeds: [embed] });
            });

        } catch (error) {
            console.error('Lỗi version command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ LỖI KIỂM TRA PHIÊN BẢN')
                .setDescription(`Có lỗi xảy ra khi lấy thông tin phiên bản:\n\`\`\`${error.message}\`\`\``)
                .setColor('#FF0000')
                .setTimestamp();
                
            await message.reply({ embeds: [errorEmbed] });
        }
    }
}; 