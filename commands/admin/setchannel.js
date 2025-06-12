const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setchannel',
    description: 'Set channel cho các hoạt động của bot (Admin only)',
    
    async execute(message, args) {
        // Kiểm tra quyền admin
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('⛔ Chỉ Administrator mới có thể sử dụng lệnh này!');
        }

        const subCommand = args[0]?.toLowerCase();
        
        if (!subCommand) {
            return await this.showHelp(message);
        }

        switch (subCommand) {
            case 'announce':
            case 'thongbao':
                await this.setAnnounceChannel(message, args);
                break;
                
            case 'log':
            case 'logs':
                await this.setLogChannel(message, args);
                break;
                
            case 'welcome':
            case 'chao':
                await this.setWelcomeChannel(message, args);
                break;
                
            case 'general':
            case 'chung':
                await this.setGeneralChannel(message, args);
                break;
                
            case 'game':
            case 'games':
                await this.setGameChannel(message, args);
                break;
                
            case 'view':
            case 'xem':
                await this.viewChannels(message);
                break;
                
            case 'reset':
                await this.resetChannels(message, args);
                break;
                
            default:
                await this.showHelp(message);
                break;
        }
    },

    async showHelp(message) {
        const prefix = await require('../../utils/database').getGuildPrefix(message.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ SETCHANNEL - CÀI ĐẶT CHANNEL')
            .setDescription('**Quản lý các channel cho bot trong server**')
            .addFields(
                {
                    name: '📢 Thông báo',
                    value: `\`${prefix}setchannel announce\` - Set channel thông báo\n\`${prefix}setchannel announce #channel\` - Set channel cụ thể`,
                    inline: false
                },
                {
                    name: '📝 Logs',
                    value: `\`${prefix}setchannel log\` - Set channel log hoạt động\n\`${prefix}setchannel log #channel\` - Set channel cụ thể`,
                    inline: false
                },
                {
                    name: '👋 Welcome',
                    value: `\`${prefix}setchannel welcome\` - Set channel chào mừng\n\`${prefix}setchannel welcome #channel\` - Set channel cụ thể`,
                    inline: false
                },
                {
                    name: '💬 General',
                    value: `\`${prefix}setchannel general\` - Set channel chat chung\n\`${prefix}setchannel general #channel\` - Set channel cụ thể`,
                    inline: false
                },
                {
                    name: '🎮 Games',
                    value: `\`${prefix}setchannel game\` - Set channel cho games\n\`${prefix}setchannel game #channel\` - Set channel cụ thể`,
                    inline: false
                },
                {
                    name: '🔧 Quản lý',
                    value: `\`${prefix}setchannel view\` - Xem các channel đã set\n\`${prefix}setchannel reset [loại]\` - Reset channel`,
                    inline: false
                }
            )
            .setColor('#0099FF')
            .setFooter({ text: 'Lưu ý: Không mention channel = set channel hiện tại' });

        await message.reply({ embeds: [embed] });
    },

    async setAnnounceChannel(message, args) {
        const channelId = this.getChannelId(message, args[1]);
        await this.saveChannelSetting(message.guild.id, 'announce', channelId);
        
        const embed = new EmbedBuilder()
            .setTitle('📢 ĐÃ SET CHANNEL THÔNG BÁO')
            .setDescription(`Channel thông báo đã được set: <#${channelId}>`)
            .setColor('#00FF00')
            .setFooter({ text: 'Bot sẽ gửi thông báo quan trọng vào channel này' });

        await message.reply({ embeds: [embed] });
    },

    async setLogChannel(message, args) {
        const channelId = this.getChannelId(message, args[1]);
        await this.saveChannelSetting(message.guild.id, 'log', channelId);
        
        const embed = new EmbedBuilder()
            .setTitle('📝 ĐÃ SET CHANNEL LOG')
            .setDescription(`Channel log đã được set: <#${channelId}>`)
            .setColor('#00FF00')
            .setFooter({ text: 'Bot sẽ log các hoạt động quan trọng vào channel này' });

        await message.reply({ embeds: [embed] });
    },

    async setWelcomeChannel(message, args) {
        const channelId = this.getChannelId(message, args[1]);
        await this.saveChannelSetting(message.guild.id, 'welcome', channelId);
        
        const embed = new EmbedBuilder()
            .setTitle('👋 ĐÃ SET CHANNEL CHÀO MỪNG')
            .setDescription(`Channel chào mừng đã được set: <#${channelId}>`)
            .setColor('#00FF00')
            .setFooter({ text: 'Bot sẽ chào mừng thành viên mới vào channel này' });

        await message.reply({ embeds: [embed] });
    },

    async setGeneralChannel(message, args) {
        const channelId = this.getChannelId(message, args[1]);
        await this.saveChannelSetting(message.guild.id, 'general', channelId);
        
        const embed = new EmbedBuilder()
            .setTitle('💬 ĐÃ SET CHANNEL CHUNG')
            .setDescription(`Channel chat chung đã được set: <#${channelId}>`)
            .setColor('#00FF00')
            .setFooter({ text: 'Channel chính cho bot hoạt động' });

        await message.reply({ embeds: [embed] });
    },

    async setGameChannel(message, args) {
        const channelId = this.getChannelId(message, args[1]);
        await this.saveChannelSetting(message.guild.id, 'game', channelId);
        
        const embed = new EmbedBuilder()
            .setTitle('🎮 ĐÃ SET CHANNEL GAME')
            .setDescription(`Channel game đã được set: <#${channelId}>`)
            .setColor('#00FF00')
            .setFooter({ text: 'Channel dành riêng cho các mini games' });

        await message.reply({ embeds: [embed] });
    },

    async viewChannels(message) {
        const guildId = message.guild.id;
        const settings = await this.getChannelSettings(guildId);
        
        let description = '**Các channel đã được cài đặt:**\n\n';
        
        if (settings.announce) {
            description += `📢 **Thông báo:** <#${settings.announce}>\n`;
        }
        if (settings.log) {
            description += `📝 **Log:** <#${settings.log}>\n`;
        }
        if (settings.welcome) {
            description += `👋 **Chào mừng:** <#${settings.welcome}>\n`;
        }
        if (settings.general) {
            description += `💬 **Chat chung:** <#${settings.general}>\n`;
        }
        if (settings.game) {
            description += `🎮 **Game:** <#${settings.game}>\n`;
        }
        
        if (description === '**Các channel đã được cài đặt:**\n\n') {
            description += '*Chưa có channel nào được cài đặt*';
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 DANH SÁCH CHANNEL ĐÃ SET')
            .setDescription(description)
            .setColor('#0099FF')
            .setFooter({ text: `Server: ${message.guild.name}` });

        await message.reply({ embeds: [embed] });
    },

    async resetChannels(message, args) {
        const type = args[1]?.toLowerCase();
        const guildId = message.guild.id;
        
        if (!type || type === 'all') {
            // Reset tất cả
            await this.saveChannelSetting(guildId, 'announce', null);
            await this.saveChannelSetting(guildId, 'log', null);
            await this.saveChannelSetting(guildId, 'welcome', null);
            await this.saveChannelSetting(guildId, 'general', null);
            await this.saveChannelSetting(guildId, 'game', null);
            
            const embed = new EmbedBuilder()
                .setTitle('🔄 ĐÃ RESET TẤT CẢ CHANNEL')
                .setDescription('Tất cả cài đặt channel đã được reset!')
                .setColor('#FF9900');
                
            await message.reply({ embeds: [embed] });
        } else {
            // Reset loại cụ thể
            const validTypes = ['announce', 'log', 'welcome', 'general', 'game'];
            if (!validTypes.includes(type)) {
                return message.reply(`❌ Loại không hợp lệ! Dùng: ${validTypes.join(', ')}`);
            }
            
            await this.saveChannelSetting(guildId, type, null);
            
            const embed = new EmbedBuilder()
                .setTitle(`🔄 ĐÃ RESET CHANNEL ${type.toUpperCase()}`)
                .setDescription(`Cài đặt channel ${type} đã được reset!`)
                .setColor('#FF9900');
                
            await message.reply({ embeds: [embed] });
        }
    },

    getChannelId(message, channelMention) {
        if (channelMention) {
            // Lấy ID từ mention
            const match = channelMention.match(/^<#(\d+)>$/);
            if (match) {
                return match[1];
            }
            // Nếu là ID thuần
            if (/^\d+$/.test(channelMention)) {
                return channelMention;
            }
        }
        // Nếu không có mention, dùng channel hiện tại
        return message.channel.id;
    },

    async saveChannelSetting(guildId, type, channelId) {
        try {
            const Guild = require('../../models/Guild');
            let guild = await Guild.findOne({ guildId });
            
            if (!guild) {
                guild = await Guild.create({ guildId });
            }
            
            if (!guild.channelSettings) {
                guild.channelSettings = {};
            }
            
            if (channelId === null) {
                delete guild.channelSettings[type];
            } else {
                guild.channelSettings[type] = channelId;
            }
            
            guild.markModified('channelSettings');
            await guild.save();
            
        } catch (error) {
            console.error('Lỗi lưu channel setting:', error);
        }
    },

    async getChannelSettings(guildId) {
        try {
            const Guild = require('../../models/Guild');
            const guild = await Guild.findOne({ guildId });
            return guild?.channelSettings || {};
        } catch (error) {
            console.error('Lỗi lấy channel settings:', error);
            return {};
        }
    }
}; 