const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const { getUserRin, updateUserRin } = require('../../utils/database');
const config = require('../../config/config.js');

// Lưu trữ giveaway đang hoạt động
const activeGiveaways = new Map();

module.exports = {
    name: 'giveaway',
    description: 'Tạo giveaway cho thành viên',
    async execute(message, args) {
        // Kiểm tra quyền admin hoặc owner
        const isOwner = config.isOwner(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!isAdmin && !isOwner) {
            return await message.reply('❌ Chỉ admin hoặc chủ bot mới có thể tạo giveaway!');
        }

        if (args.length < 3) {
            return message.reply('❌ Cách dùng: `,giveaway <thời_gian> <số_người_thắng> <phần_thưởng> [--to @user1 @user2]`\nVí dụ: `,giveaway 1h 2 100 Rin --to @user1 @user2`');
        }

        const duration = args[0];
        const winners = parseInt(args[1]);
        
        // Tìm vị trí của --to để tách phần thưởng và người nhận
        const toIndex = args.findIndex(arg => arg === '--to');
        let prize, targetUsers = [];
        
        if (toIndex !== -1) {
            // Có chỉ định người nhận
            prize = args.slice(2, toIndex).join(' ');
            const targetMentions = args.slice(toIndex + 1);
            
            // Parse user mentions từ các argument
            for (const mention of targetMentions) {
                const userId = mention.replace(/<@!?|>/g, '');
                if (/^\d{17,19}$/.test(userId)) {
                    try {
                        const user = await message.client.users.fetch(userId);
                        targetUsers.push(user);
                    } catch (error) {
                        console.error('Không thể fetch user:', userId);
                    }
                }
            }
            
            if (targetUsers.length === 0) {
                return message.reply('❌ Không tìm thấy người dùng hợp lệ sau --to!\nVí dụ: `--to @user1 @user2`');
            }
        } else {
            // Giveaway bình thường
            prize = args.slice(2).join(' ');
        }

        if (isNaN(winners) || winners <= 0) {
            return message.reply('❌ Số người thắng phải là số nguyên dương!');
        }

        // Parse thời gian
        let seconds = 0;
        try {
            if (duration.endsWith('s')) {
                seconds = parseInt(duration.slice(0, -1));
            } else if (duration.endsWith('m')) {
                seconds = parseInt(duration.slice(0, -1)) * 60;
            } else if (duration.endsWith('h')) {
                seconds = parseInt(duration.slice(0, -1)) * 3600;
            } else if (duration.endsWith('d')) {
                seconds = parseInt(duration.slice(0, -1)) * 86400;
            } else {
                throw new Error('Invalid duration');
            }

            if (seconds < 30 || seconds > 7 * 86400) {
                return message.reply('❌ Thời gian phải từ 30 giây đến 7 ngày!');
            }
        } catch (error) {
            return message.reply('❌ Thời gian không hợp lệ! Ví dụ: `10s`, `5m`, `1h`, `2d`');
        }

        const endTime = new Date(Date.now() + seconds * 1000);

        // Tạo embed giveaway
        let description = `**Phần thưởng**: ${prize}\n` +
            `**Số người thắng**: ${winners}\n` +
            `**Thời gian**: ${duration}\n` +
            `**Host**: ${message.author}\n\n`;

        if (targetUsers.length > 0) {
            description += `**🎯 Dành riêng cho:** ${targetUsers.map(u => u.toString()).join(', ')}\n\n`;
            description += `Chỉ những người được chỉ định mới có thể nhận quà!\nBấm 🎉 để tham gia!`;
        } else {
            description += `Bấm 🎉 để tham gia!`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎉 GIVEAWAY XỊN MỊN 🎉')
            .setDescription(description)
            .setColor('#FFD700')
            .setFooter({ text: 'Kết thúc lúc' })
            .setTimestamp(endTime);

        const giveawayMessage = await message.channel.send({ embeds: [embed] });
        await giveawayMessage.react('🎉');

        // Lưu vào database
        const giveaway = new Giveaway({
            messageId: giveawayMessage.id,
            channelId: message.channel.id,
            guildId: message.guild.id,
            hostId: message.author.id,
            prize,
            winners,
            endTime,
            participants: [],
            targetUsers: targetUsers.map(u => u.id) // Lưu danh sách người được chỉ định
        });

        await giveaway.save();

        // Lưu vào memory
        activeGiveaways.set(giveawayMessage.id, {
            ...giveaway.toObject(),
            participants: new Set(),
            targetUsers: targetUsers.map(u => u.id)
        });
    },

    // Command để chỉ định người thắng
    async executePickWinner(message, args) {
        // Kiểm tra quyền admin hoặc owner
        const isOwner = config.isOwner(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!isAdmin && !isOwner) {
            return message.reply('❌ Chỉ admin hoặc chủ bot mới được chỉ định người thắng!');
        }

        if (args.length < 2) {
            return message.reply('❌ Cách dùng: `,gpick <message_id> <@user1> [@user2]...`');
        }

        const messageId = args[0];
        const giveaway = await Giveaway.findOne({ messageId, ended: false });

        if (!giveaway) {
            return message.reply('❌ Không tìm thấy giveaway hoặc đã kết thúc!');
        }

        // Lấy danh sách user được mention
        const mentionedUsers = message.mentions.users;
        if (mentionedUsers.size === 0) {
            return message.reply('❌ Bạn phải mention ít nhất 1 người!');
        }

        const winnersList = Array.from(mentionedUsers.values());
        const winnersDisplay = winnersList.map(user => user.toString()).join(', ');

        // Cập nhật database
        giveaway.ended = true;
        await giveaway.save();

        // Xóa khỏi memory
        activeGiveaways.delete(messageId);

        // Gửi thông báo kết quả
        const resultEmbed = new EmbedBuilder()
            .setTitle('🎉 GIVEAWAY KẾT THÚC (Chỉ định thủ công) 🎉')
            .setDescription(
                `**Phần thưởng**: ${giveaway.prize}\n` +
                `**Người thắng**: ${winnersDisplay}\n` +
                `**Được chỉ định bởi**: ${message.author}\n\n` +
                `Chúc mừng các bạn!`
            )
            .setColor('#00FF00')
            .setFooter({ text: `Hosted bởi ${message.client.users.cache.get(giveaway.hostId)?.tag || 'Unknown'}` });

        await message.channel.send({ embeds: [resultEmbed] });
    },

    // Xử lý reaction
    async handleReaction(reaction, user, action) {
        if (user.bot) return;
        if (reaction.emoji.name !== '🎉') return;

        const giveaway = activeGiveaways.get(reaction.message.id);
        if (!giveaway) return;

        // Kiểm tra nếu giveaway có chỉ định người nhận cụ thể
        if (giveaway.targetUsers && giveaway.targetUsers.length > 0) {
            if (!giveaway.targetUsers.includes(user.id)) {
                // Nếu không phải người được chỉ định, xóa reaction
                try {
                    await reaction.users.remove(user.id);
                } catch (error) {
                    console.error('Lỗi xóa reaction:', error);
                }
                return;
            }
        }

        if (action === 'add') {
            giveaway.participants.add(user.id);
        } else if (action === 'remove') {
            giveaway.participants.delete(user.id);
        }

        // Cập nhật database
        try {
            await Giveaway.findOneAndUpdate(
                { messageId: reaction.message.id },
                { participants: Array.from(giveaway.participants) }
            );
        } catch (error) {
            console.error('Lỗi cập nhật giveaway participants:', error);
        }
    },

    // Kiểm tra giveaway hết hạn
    async checkGiveaways(client) {
        const now = new Date();
        const expiredGiveaways = await Giveaway.find({
            endTime: { $lte: now },
            ended: false
        });

        for (const giveaway of expiredGiveaways) {
            try {
                const channel = await client.channels.fetch(giveaway.channelId);
                if (!channel) continue;

                const participants = giveaway.participants || [];
                
                if (participants.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🎉 Giveaway kết thúc!')
                        .setDescription('Không có ai tham gia!')
                        .setColor('#FF0000');
                    
                    await channel.send({ embeds: [embed] });
                } else {
                    // Lọc người tham gia nếu có targetUsers
                    let eligibleParticipants = participants;
                    
                    if (giveaway.targetUsers && giveaway.targetUsers.length > 0) {
                        // Chỉ những người được chỉ định mới có thể thắng
                        eligibleParticipants = participants.filter(userId => 
                            giveaway.targetUsers.includes(userId)
                        );
                        
                        if (eligibleParticipants.length === 0) {
                            const embed = new EmbedBuilder()
                                .setTitle('🎉 Giveaway kết thúc!')
                                .setDescription(`Không có ai trong danh sách được chỉ định tham gia!\n\n**Người được chỉ định:** ${giveaway.targetUsers.map(id => `<@${id}>`).join(', ')}`)
                                .setColor('#FF0000');
                            
                            await channel.send({ embeds: [embed] });
                            // Đánh dấu đã kết thúc
                            giveaway.ended = true;
                            await giveaway.save();
                            activeGiveaways.delete(giveaway.messageId);
                            continue;
                        }
                    }
                    
                    // Random chọn người thắng từ danh sách đủ điều kiện
                    const winnersCount = Math.min(giveaway.winners, eligibleParticipants.length);
                    const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
                    const winners = shuffled.slice(0, winnersCount);
                    
                    const winnersDisplay = winners.map(userId => `<@${userId}>`).join(', ');
                    
                    let description = `**Phần thưởng**: ${giveaway.prize}\n` +
                        `**Người thắng**: ${winnersDisplay}\n` +
                        `**Tổng người tham gia**: ${participants.length}\n`;
                    
                    if (giveaway.targetUsers && giveaway.targetUsers.length > 0) {
                        description += `**Đủ điều kiện thắng**: ${eligibleParticipants.length}\n`;
                    }
                    
                    description += `\nChúc mừng các bạn!`;
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🎉 GIVEAWAY KẾT THÚC 🎉')
                        .setDescription(description)
                        .setColor('#00FF00')
                        .setFooter({ text: `Hosted bởi ${client.users.cache.get(giveaway.hostId)?.tag || 'Unknown'}` });
                    
                    await channel.send({ embeds: [embed] });
                }

                // Đánh dấu đã kết thúc
                giveaway.ended = true;
                await giveaway.save();
                
                // Xóa khỏi memory
                activeGiveaways.delete(giveaway.messageId);

            } catch (error) {
                console.error('Lỗi xử lý giveaway hết hạn:', error);
            }
        }
    },

    // Load giveaway từ database khi bot khởi động
    async loadActiveGiveaways(client) {
        try {
            const activeDbGiveaways = await Giveaway.find({ ended: false });
            
            for (const giveaway of activeDbGiveaways) {
                activeGiveaways.set(giveaway.messageId, {
                    ...giveaway.toObject(),
                    participants: new Set(giveaway.participants || []),
                    targetUsers: giveaway.targetUsers || []
                });
            }

            console.log(`✅ Đã load ${activeDbGiveaways.length} giveaway đang hoạt động`);
        } catch (error) {
            console.error('Lỗi load giveaway:', error);
        }
    },

    async endGiveaway(message, args) {
        try {
            // Kiểm tra quyền admin hoặc owner
            const isOwner = config.isOwner(message.author.id);
            const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
            
            if (!isAdmin && !isOwner) {
                return await message.reply('❌ Chỉ admin hoặc chủ bot mới có thể kết thúc giveaway!');
            }
        } catch (error) {
            console.error('Lỗi xử lý endGiveaway:', error);
            return message.reply('❌ Đã xảy ra lỗi khi kết thúc giveaway!');
        }
    }
}; 