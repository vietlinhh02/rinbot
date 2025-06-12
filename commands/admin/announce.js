const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    name: 'announce',
    description: 'Gửi thông báo (Owner only)',
    
    async execute(message, args) {
        // Chỉ owner mới được dùng
        if (!config.isOwner(message.author.id)) {
            return message.reply('⛔ Lệnh này chỉ dành cho owner bot!');
        }

        if (args.length < 2) {
            return this.showHelp(message);
        }

        const type = args[0].toLowerCase();
        const content = args.slice(1).join(' ');

        if (!content || content.trim().length === 0) {
            return message.reply('❌ Nội dung thông báo không được để trống!');
        }

        switch (type) {
            case 'server':
                return await this.announceToCurrentServer(message, content);
            case 'all':
                return await this.announceToAllServers(message, content);
            case 'channel':
                return await this.announceToSpecificChannel(message, content);
            case 'help':
                return this.showHelp(message);
            default:
                return message.reply('❌ Loại thông báo không hợp lệ! Dùng `announce help` để xem hướng dẫn.');
        }
    },

    // Hiển thị hướng dẫn
    showHelp(message) {
        const embed = new EmbedBuilder()
            .setTitle('📢 HƯỚNG DẪN LỆNH ANNOUNCE')
            .setDescription('**Lệnh gửi thông báo cho owner bot**')
            .addFields(
                {
                    name: '🏠 Server hiện tại',
                    value: '`,announce server <nội dung>`\nGửi thông báo trong server này',
                    inline: false
                },
                {
                    name: '🌐 Tất cả server',
                    value: '`,announce all <nội dung>`\nGửi đến tất cả server bot tham gia',
                    inline: false
                },
                {
                    name: '📍 Channel cụ thể',
                    value: '`,announce channel <channelID> <nội dung>`\nGửi đến channel chỉ định',
                    inline: false
                },
                {
                    name: '📝 Định dạng nâng cao',
                    value: 'Sử dụng `||` để ngắt dòng:\n`,announce server Tiêu đề||Nội dung chính||Footer`',
                    inline: false
                }
            )
            .setColor('#FF6B35')
            .setFooter({ text: 'RinBot Announcement System' });

        return message.reply({ embeds: [embed] });
    },

    // Gửi thông báo đến server hiện tại
    async announceToCurrentServer(message, content) {
        try {
            const embed = this.createAnnouncementEmbed(content, message.author);
            
            const confirmButton = new ButtonBuilder()
                .setCustomId(`announce_confirm_server_${message.author.id}`)
                .setLabel('✅ Gửi thông báo')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`announce_cancel_${message.author.id}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            const previewEmbed = new EmbedBuilder()
                .setTitle('📋 XEM TRƯỚC THÔNG BÁO')
                .setDescription(`**Server:** ${message.guild.name}\n**Channel:** ${message.channel.name}`)
                .setColor('#FFA500');

            await message.reply({ 
                embeds: [previewEmbed, embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Lỗi announce server:', error);
            await message.reply('❌ Có lỗi xảy ra khi tạo thông báo!');
        }
    },

    // Gửi thông báo đến tất cả server  
    async announceToAllServers(message, content) {
        try {
            const guilds = message.client.guilds.cache;
            const embed = this.createAnnouncementEmbed(content, message.author);
            
            const confirmButton = new ButtonBuilder()
                .setCustomId(`announce_confirm_all_${message.author.id}`)
                .setLabel('⚠️ Gửi đến tất cả server')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`announce_cancel_${message.author.id}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            const previewEmbed = new EmbedBuilder()
                .setTitle('🌐 XEM TRƯỚC THÔNG BÁO TOÀN MẠNG')
                .setDescription(`**Sẽ gửi đến:** ${guilds.size} server\n**⚠️ CẢNH BÁO: Không thể hoàn tác!**`)
                .setColor('#FF0000');

            await message.reply({ 
                embeds: [previewEmbed, embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Lỗi announce all:', error);
            await message.reply('❌ Có lỗi xảy ra khi tạo thông báo!');
        }
    },

    // Gửi thông báo đến channel cụ thể
    async announceToSpecificChannel(message, content) {
        const parts = content.split(' ');
        const channelId = parts[0];
        const announceContent = parts.slice(1).join(' ');

        if (!channelId || !announceContent) {
            return message.reply('❌ Cú pháp: `announce channel <channelID> <nội dung>`');
        }

        try {
            const channel = await message.client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                return message.reply('❌ Không tìm thấy channel hoặc channel không phải text channel!');
            }

            const embed = this.createAnnouncementEmbed(announceContent, message.author);
            
            const confirmButton = new ButtonBuilder()
                .setCustomId(`announce_confirm_channel_${channelId}_${message.author.id}`)
                .setLabel('✅ Gửi thông báo')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`announce_cancel_${message.author.id}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            const previewEmbed = new EmbedBuilder()
                .setTitle('📍 XEM TRƯỚC THÔNG BÁO CHANNEL')
                .setDescription(`**Channel:** ${channel.name} (${channel.guild.name})`)
                .setColor('#00FF00');

            await message.reply({ 
                embeds: [previewEmbed, embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Lỗi announce channel:', error);
            await message.reply(`❌ Không thể truy cập channel: ${error.message}`);
        }
    },

    // Tạo embed thông báo
    createAnnouncementEmbed(content, author) {
        const parts = content.split('||').map(part => part.trim());
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTimestamp()
            .setFooter({ 
                text: `RinBot Official • By ${author.displayName}`,
                iconURL: author.displayAvatarURL()
            });

        if (parts.length >= 3) {
            embed.setTitle(`📢 ${parts[0]}`)
                 .setDescription(parts[1])
                 .setFooter({ 
                     text: `${parts[2]} • By ${author.displayName}`,
                     iconURL: author.displayAvatarURL()
                 });
        } else if (parts.length === 2) {
            embed.setTitle(`📢 ${parts[0]}`)
                 .setDescription(parts[1]);
        } else {
            embed.setTitle('📢 THÔNG BÁO QUAN TRỌNG')
                 .setDescription(content);
        }

        return embed;
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('announce_')) return;

        const parts = interaction.customId.split('_');
        const action = parts[1];
        const type = parts[2];
        const userId = parts[parts.length - 1];

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ người tạo thông báo mới có thể thực hiện!', flags: 64 });
        }

        if (action === 'cancel') {
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY THÔNG BÁO')
                .setDescription('Thông báo đã được hủy bỏ.')
                .setColor('#6C757D');

            return interaction.update({ embeds: [embed], components: [] });
        }

        if (action === 'confirm') {
            try {
                await interaction.deferUpdate();
                const originalEmbed = interaction.message.embeds[1];
                
                if (type === 'server') {
                    await this.sendToCurrentServer(interaction, originalEmbed);
                } else if (type === 'all') {
                    await this.sendToAllServers(interaction, originalEmbed);
                } else if (type === 'channel') {
                    const channelId = parts[3];
                    await this.sendToSpecificChannel(interaction, originalEmbed, channelId);
                }

            } catch (error) {
                console.error('Lỗi confirm announce:', error);
                await interaction.editReply({ 
                    content: '❌ Có lỗi xảy ra khi gửi thông báo!', 
                    embeds: [], 
                    components: [] 
                });
            }
        }
    },

    // Gửi đến server hiện tại
    async sendToCurrentServer(interaction, announceEmbed) {
        await interaction.channel.send({ embeds: [announceEmbed] });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ THÔNG BÁO ĐÃ ĐƯỢC GỬI')
            .setDescription(`**Server:** ${interaction.guild.name}\n**Channel:** ${interaction.channel.name}`)
            .setColor('#00FF00');

        await interaction.editReply({ embeds: [successEmbed], components: [] });
    },

    // Gửi đến tất cả server
    async sendToAllServers(interaction, announceEmbed) {
        const guilds = interaction.client.guilds.cache;
        let successCount = 0;
        let failCount = 0;

        const progressEmbed = new EmbedBuilder()
            .setTitle('🔄 ĐANG GỬI THÔNG BÁO...')
            .setDescription(`Đang gửi đến ${guilds.size} server...`)
            .setColor('#FFA500');

        await interaction.editReply({ embeds: [progressEmbed], components: [] });

        for (const guild of guilds.values()) {
            try {
                const targetChannel = guild.channels.cache.find(ch => 
                    ch.isTextBased() && 
                    ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'EmbedLinks']) &&
                    (ch.name.includes('general') || ch.name.includes('thong-bao'))
                ) || guild.channels.cache.find(ch => 
                    ch.isTextBased() && 
                    ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'EmbedLinks'])
                );

                if (targetChannel) {
                    await targetChannel.send({ embeds: [announceEmbed] });
                    successCount++;
                } else {
                    failCount++;
                }

                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                failCount++;
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle('📊 KẾT QUẢ GỬI THÔNG BÁO')
            .setDescription(`**✅ Thành công:** ${successCount}/${guilds.size} server\n**❌ Thất bại:** ${failCount}/${guilds.size} server`)
            .setColor(failCount === 0 ? '#00FF00' : '#FFA500');

        await interaction.editReply({ embeds: [resultEmbed], components: [] });
    },

    // Gửi đến channel cụ thể
    async sendToSpecificChannel(interaction, announceEmbed, channelId) {
        const channel = await interaction.client.channels.fetch(channelId);
        await channel.send({ embeds: [announceEmbed] });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ THÔNG BÁO ĐÃ ĐƯỢC GỬI')
            .setDescription(`**Channel:** ${channel.name}\n**Server:** ${channel.guild.name}`)
            .setColor('#00FF00');

        await interaction.editReply({ embeds: [successEmbed], components: [] });
    }
}; 