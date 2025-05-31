const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    description: 'Xem thông tin chi tiết của server',
    
    async execute(message, args) {
        try {
            const guild = message.guild;
            
            // Fetch thêm data từ API
            await guild.fetch();
            
            // Tính toán thời gian
            const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
            
            // Đếm channels
            const channels = await guild.channels.fetch();
            const textChannels = channels.filter(channel => channel.type === 0).size;
            const voiceChannels = channels.filter(channel => channel.type === 2).size;
            const categoryChannels = channels.filter(channel => channel.type === 4).size;
            
            // Đếm members
            const memberCount = guild.memberCount;
            const members = await guild.members.fetch();
            const humans = members.filter(member => !member.user.bot).size;
            const bots = members.filter(member => member.user.bot).size;
            const onlineMembers = members.filter(member => 
                member.presence?.status && member.presence.status !== 'offline'
            ).size;
            
            // Đếm roles và emojis
            const roles = await guild.roles.fetch();
            const emojis = await guild.emojis.fetch();
            const stickers = await guild.stickers.fetch();
            
            // Boost info
            const boostLevel = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount || 0;
            
            // Security level
            const getVerificationLevel = (level) => {
                const levels = {
                    0: '❌ Không có',
                    1: '📧 Email xác minh',
                    2: '⏰ Đăng ký > 5 phút',
                    3: '👤 Thành viên > 10 phút',
                    4: '📱 Số điện thoại xác minh'
                };
                return levels[level] || '❓ Không xác định';
            };
            
            const getExplicitFilter = (level) => {
                const levels = {
                    0: '❌ Tắt',
                    1: '⚠️ Không có role',
                    2: '🛡️ Tất cả members'
                };
                return levels[level] || '❓ Không xác định';
            };
            
            // Features
            const features = guild.features.map(feature => {
                const featureMap = {
                    'COMMUNITY': '🏘️ Community',
                    'PARTNERED': '🤝 Partnered',
                    'VERIFIED': '✅ Verified',
                    'VANITY_URL': '🔗 Vanity URL',
                    'INVITE_SPLASH': '🎨 Invite Splash',
                    'BANNER': '🖼️ Banner',
                    'ANIMATED_ICON': '🎭 Animated Icon',
                    'WELCOME_SCREEN_ENABLED': '👋 Welcome Screen',
                    'DISCOVERY_DISABLED': '🔍 Discovery',
                    'MONETIZATION_ENABLED': '💰 Monetization',
                    'NEWS': '📰 News Channels',
                    'THREADS_ENABLED': '🧵 Threads'
                };
                return featureMap[feature] || feature;
            });
            
            const embed = new EmbedBuilder()
                .setTitle(`🏰 THÔNG TIN SERVER`)
                .setColor('#5865f2')
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '📋 Thông tin cơ bản',
                        value: `**🏷️ Tên:** ${guild.name}\n` +
                               `**🆔 ID:** ${guild.id}\n` +
                               `**👑 Owner:** <@${guild.ownerId}>\n` +
                               `**🌍 Region:** ${guild.preferredLocale || 'Auto'}\n` +
                               `**📅 Tạo lúc:** <t:${createdTimestamp}:F>\n` +
                               `**⌛ Tuổi server:** <t:${createdTimestamp}:R>`,
                        inline: true
                    },
                    {
                        name: '👥 Thành viên',
                        value: `**👤 Tổng:** ${memberCount.toLocaleString()}\n` +
                               `**🧑 Người:** ${humans.toLocaleString()}\n` +
                               `**🤖 Bot:** ${bots.toLocaleString()}\n` +
                               `**🟢 Online:** ${onlineMembers.toLocaleString()}\n` +
                               `**📊 Tỷ lệ:** ${((humans/memberCount)*100).toFixed(1)}% người`,
                        inline: true
                    },
                    {
                        name: '📢 Kênh & Nội dung',
                        value: `**💬 Text:** ${textChannels}\n` +
                               `**🔊 Voice:** ${voiceChannels}\n` +
                               `**📁 Category:** ${categoryChannels}\n` +
                               `**🎭 Role:** ${roles.size}\n` +
                               `**😀 Emoji:** ${emojis.size}\n` +
                               `**🎪 Sticker:** ${stickers.size}`,
                        inline: true
                    }
                );
            
            // Boost info
            if (boostLevel > 0) {
                const boostEmojis = ['', '⭐', '⭐⭐', '⭐⭐⭐'];
                embed.addFields({
                    name: '🚀 Server Boost',
                    value: `**Level:** ${boostEmojis[boostLevel]} ${boostLevel}\n` +
                           `**Boost:** ${boostCount}/`,
                    inline: true
                });
            }
            
            // Security settings
            embed.addFields({
                name: '🛡️ Bảo mật',
                value: `**Xác minh:** ${getVerificationLevel(guild.verificationLevel)}\n` +
                       `**Content Filter:** ${getExplicitFilter(guild.explicitContentFilter)}\n` +
                       `**2FA Required:** ${guild.mfaLevel ? '✅ Có' : '❌ Không'}`,
                inline: true
            });
            
            // Features
            if (features.length > 0) {
                embed.addFields({
                    name: '✨ Tính năng đặc biệt',
                    value: features.slice(0, 10).join('\n') || 'Không có',
                    inline: false
                });
            }
            
            // Banner và icon
            const links = [];
            if (guild.iconURL()) {
                links.push(`[Icon](${guild.iconURL({ dynamic: true, size: 4096 })})`);
            }
            if (guild.bannerURL()) {
                links.push(`[Banner](${guild.bannerURL({ dynamic: true, size: 4096 })})`);
                embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
            }
            if (guild.splashURL()) {
                links.push(`[Splash](${guild.splashURL({ dynamic: true, size: 4096 })})`);
            }
            
            if (links.length > 0) {
                embed.addFields({
                    name: '🖼️ Hình ảnh',
                    value: links.join(' • '),
                    inline: false
                });
            }
            
            // Description nếu có
            if (guild.description) {
                embed.setDescription(`**📝 Mô tả:**\n*${guild.description}*`);
            }
            
            embed.setFooter({ 
                text: `Requested by ${message.author.displayName} | Server ID: ${guild.id}` 
            })
            .setTimestamp();
            
            // Màu đặc biệt cho server có boost
            if (boostLevel >= 3) {
                embed.setColor('#ff73fa'); // Hồng cho boost level 3
            } else if (boostLevel >= 2) {
                embed.setColor('#ff7675'); // Đỏ cho boost level 2  
            } else if (boostLevel >= 1) {
                embed.setColor('#fd79a8'); // Hồng nhạt cho boost level 1
            }
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi serverinfo:', error);
            await message.reply('❌ Có lỗi xảy ra khi lấy thông tin server!');
        }
    }
};