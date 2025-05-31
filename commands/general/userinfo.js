const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'userinfo',
    description: 'Xem thông tin chi tiết của user',
    
    async execute(message, args) {
        try {
            // Xác định target user
            let targetUser = message.author;
            let member = await message.guild.members.fetch(message.author.id);
            
            // Nếu có mention hoặc ID
            if (args.length > 0) {
                const mention = message.mentions.users.first();
                if (mention) {
                    targetUser = mention;
                    try {
                        member = await message.guild.members.fetch(mention.id);
                    } catch {
                        member = null;
                    }
                } else {
                    // Thử parse user ID
                    try {
                        const userId = args[0].replace(/[<@!>]/g, '');
                        targetUser = await message.client.users.fetch(userId);
                        try {
                            member = await message.guild.members.fetch(userId);
                        } catch {
                            member = null;
                        }
                    } catch {
                        return message.reply('❌ Không tìm thấy user! Hãy tag user hoặc nhập đúng ID.');
                    }
                }
            }
            
            // Tính toán thời gian
            const accountCreated = Math.floor(targetUser.createdTimestamp / 1000);
            const joinedServer = member ? Math.floor(member.joinedTimestamp / 1000) : null;
            
            // Trạng thái user
            const getStatusEmoji = (status) => {
                switch (status) {
                    case 'online': return '🟢 Online';
                    case 'idle': return '🟡 Idle';
                    case 'dnd': return '🔴 Do Not Disturb';
                    case 'offline': return '⚫ Offline';
                    default: return '❓ Unknown';
                }
            };
            
            const status = member?.presence?.status || 'offline';
            
            // Lấy roles (nếu có member)
            const roles = member ? 
                member.roles.cache
                    .filter(role => role.id !== message.guild.id) // Loại bỏ @everyone
                    .sort((a, b) => b.position - a.position)
                    .map(role => role.toString())
                    .slice(0, 10) // Giới hạn 10 roles
                : [];
            
            // Permissions quan trọng
            const keyPerms = member ? [
                { name: 'Administrator', key: 'Administrator' },
                { name: 'Manage Server', key: 'ManageGuild' },
                { name: 'Manage Channels', key: 'ManageChannels' },
                { name: 'Manage Messages', key: 'ManageMessages' },
                { name: 'Kick Members', key: 'KickMembers' },
                { name: 'Ban Members', key: 'BanMembers' }
            ].filter(perm => member.permissions.has(perm.key)).map(perm => perm.name) : [];
            
            // Badges user
            const getUserBadges = (user) => {
                const badges = [];
                const flags = user.flags?.toArray() || [];
                
                const badgeMap = {
                    'Staff': '👨‍💼',
                    'Partner': '🤝',
                    'Hypesquad': '🎉',
                    'BugHunterLevel1': '🐛',
                    'BugHunterLevel2': '🐛',
                    'HypesquadOnlineHouse1': '🏠', // Bravery
                    'HypesquadOnlineHouse2': '🧠', // Brilliance  
                    'HypesquadOnlineHouse3': '⚖️', // Balance
                    'PremiumEarlySupporter': '💎',
                    'VerifiedDeveloper': '👨‍💻',
                    'CertifiedModerator': '🛡️',
                    'ActiveDeveloper': '⚡'
                };
                
                flags.forEach(flag => {
                    if (badgeMap[flag]) {
                        badges.push(`${badgeMap[flag]} ${flag.replace(/([A-Z])/g, ' $1').trim()}`);
                    }
                });
                
                return badges.length > 0 ? badges.join('\n') : 'Không có badges';
            };
            
            const embed = new EmbedBuilder()
                .setTitle(`👤 THÔNG TIN USER`)
                .setColor(member?.displayHexColor || '#0099ff')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '📋 Thông tin cơ bản',
                        value: `**👤 Tên:** ${targetUser.displayName}\n` +
                               `**🏷️ Tag:** ${targetUser.tag}\n` +
                               `**🆔 ID:** ${targetUser.id}\n` +
                               `**🤖 Bot:** ${targetUser.bot ? '✅ Có' : '❌ Không'}\n` +
                               `**📱 Trạng thái:** ${getStatusEmoji(status)}`,
                        inline: true
                    },
                    {
                        name: '⏰ Thời gian',
                        value: `**📅 Tạo tài khoản:** <t:${accountCreated}:F>\n` +
                               `**⌛ Tuổi tài khoản:** <t:${accountCreated}:R>\n` +
                               `${joinedServer ? `**🚪 Vào server:** <t:${joinedServer}:F>\n**⏳ Thời gian ở server:** <t:${joinedServer}:R>` : '**🚪 Không trong server này**'}`,
                        inline: true
                    }
                );
            
            // Thêm thông tin server nếu user là member
            if (member) {
                embed.addFields(
                    {
                        name: '🏆 Thông tin trong server',
                        value: `**🎨 Nickname:** ${member.nickname || 'Không có'}\n` +
                               `**🎭 Roles:** ${roles.length > 0 ? roles.join(' ') : 'Không có roles'}\n` +
                               `**📊 Số roles:** ${member.roles.cache.size - 1}`,
                        inline: false
                    }
                );
                
                if (keyPerms.length > 0) {
                    embed.addFields({
                        name: '🔐 Permissions quan trọng',
                        value: keyPerms.map(perm => `• ${perm}`).join('\n'),
                        inline: true
                    });
                }
            }
            
            // Thêm badges
            embed.addFields({
                name: '🏅 Discord Badges',
                value: getUserBadges(targetUser),
                inline: true
            });
            
            // Avatar links
            const avatarLinks = [];
            avatarLinks.push(`[Global Avatar](${targetUser.displayAvatarURL({ dynamic: true, size: 4096 })})`);
            
            if (member?.avatar) {
                avatarLinks.push(`[Server Avatar](${member.displayAvatarURL({ dynamic: true, size: 4096 })})`);
            }
            
            embed.addFields({
                name: '🖼️ Avatar Links',
                value: avatarLinks.join(' • '),
                inline: false
            });
            
            embed.setFooter({ 
                text: `Requested by ${message.author.displayName} | ID: ${targetUser.id}` 
            })
            .setTimestamp();
            
            // Đặt màu đặc biệt cho bot owner hoặc admin
            if (member?.permissions.has('Administrator')) {
                embed.setColor('#ff0000'); // Đỏ cho admin
            } else if (targetUser.id === message.client.application?.owner?.id) {
                embed.setColor('#ffd700'); // Vàng cho bot owner
            }
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi userinfo:', error);
            await message.reply('❌ Có lỗi xảy ra khi lấy thông tin user!');
        }
    }
}; 