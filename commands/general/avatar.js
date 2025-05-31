const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Xem avatar của bạn hoặc người khác',
    
    async execute(message, args) {
        try {
            // Xác định target user
            let targetUser = message.author;
            
            // Nếu có mention hoặc ID
            if (args.length > 0) {
                const mention = message.mentions.users.first();
                if (mention) {
                    targetUser = mention;
                } else {
                    // Thử parse user ID
                    try {
                        const userId = args[0].replace(/[<@!>]/g, '');
                        const user = await message.client.users.fetch(userId);
                        if (user) targetUser = user;
                    } catch {
                        return message.reply('❌ Không tìm thấy user! Hãy tag user hoặc nhập đúng ID.');
                    }
                }
            }
            
            // Lấy member để có server avatar (nếu có)
            let member = null;
            try {
                member = await message.guild.members.fetch(targetUser.id);
            } catch {
                // User không trong server này
            }
            
            // URLs avatar
            const globalAvatar = targetUser.displayAvatarURL({ 
                dynamic: true, 
                size: 4096 
            });
            
            const serverAvatar = member?.avatar ? 
                member.displayAvatarURL({ dynamic: true, size: 4096 }) : 
                null;
            
            // Tạo embed mặc định (global avatar)
            let currentAvatar = globalAvatar;
            let avatarType = 'Global Avatar';
            
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ AVATAR CỦA ${targetUser.displayName}`)
                .setDescription(`**📱 Loại:** ${avatarType}\n` +
                    `**👤 User:** ${targetUser.tag}\n` +
                    `**🔗 [Tải ảnh gốc](${currentAvatar})**\n\n` +
                    `*Click vào nút bên dưới để chuyển đổi avatar!*`)
                .setImage(currentAvatar)
                .setColor('#0099ff')
                .setFooter({ 
                    text: `Requested by ${message.author.displayName}` 
                })
                .setTimestamp();
            
            // Tạo buttons để chuyển đổi
            const row = new ActionRowBuilder();
            
            // Button Global Avatar
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('global_avatar')
                    .setLabel('🌐 Global')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true) // Mặc định đã chọn global
            );
            
            // Button Server Avatar (nếu có)
            if (serverAvatar && serverAvatar !== globalAvatar) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('server_avatar')
                        .setLabel('🏠 Server')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            
            // Button Download
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('📥 Tải về')
                    .setStyle(ButtonStyle.Link)
                    .setURL(currentAvatar)
            );
            
            const sentMessage = await message.reply({ 
                embeds: [embed], 
                components: [row] 
            });
            
            // Collector cho buttons (chỉ nếu có server avatar)
            if (serverAvatar && serverAvatar !== globalAvatar) {
                const collector = sentMessage.createMessageComponentCollector({ 
                    time: 60000 // 1 phút
                });
                
                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({ 
                            content: '❌ Chỉ người dùng lệnh mới có thể thao tác!', 
                            ephemeral: true 
                        });
                    }
                    
                    if (interaction.customId === 'global_avatar') {
                        currentAvatar = globalAvatar;
                        avatarType = 'Global Avatar';
                        
                        // Update buttons
                        row.components[0].setDisabled(true);
                        row.components[1].setDisabled(false);
                        row.components[2].setURL(currentAvatar);
                        
                    } else if (interaction.customId === 'server_avatar') {
                        currentAvatar = serverAvatar;
                        avatarType = 'Server Avatar';
                        
                        // Update buttons
                        row.components[0].setDisabled(false);
                        row.components[1].setDisabled(true);
                        row.components[2].setURL(currentAvatar);
                    }
                    
                    // Update embed
                    const newEmbed = new EmbedBuilder()
                        .setTitle(`🖼️ AVATAR CỦA ${targetUser.displayName}`)
                        .setDescription(`**📱 Loại:** ${avatarType}\n` +
                            `**👤 User:** ${targetUser.tag}\n` +
                            `**🔗 [Tải ảnh gốc](${currentAvatar})**\n\n` +
                            `*Click vào nút bên dưới để chuyển đổi avatar!*`)
                        .setImage(currentAvatar)
                        .setColor('#0099ff')
                        .setFooter({ 
                            text: `Requested by ${message.author.displayName}` 
                        })
                        .setTimestamp();
                    
                    await interaction.update({ 
                        embeds: [newEmbed], 
                        components: [row] 
                    });
                });
                
                collector.on('end', () => {
                    // Disable tất cả buttons khi hết thời gian
                    row.components.forEach(component => {
                        if (component.data.style !== ButtonStyle.Link) {
                            component.setDisabled(true);
                        }
                    });
                    
                    sentMessage.edit({ components: [row] }).catch(() => {});
                });
            }
            
        } catch (error) {
            console.error('Lỗi avatar:', error);
            await message.reply('❌ Có lỗi xảy ra khi lấy avatar!');
        }
    }
}; 