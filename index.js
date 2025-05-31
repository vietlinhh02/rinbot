const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.js');
const { connectDB, getGuildPrefix, getAllGuildPrefixes } = require('./utils/database.js');
const cron = require('node-cron');
const ReminderScheduler = require('./utils/reminderScheduler');

// Tạo bot client với intents đầy đủ
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,    
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Collection để lưu commands
client.commands = new Collection();

// Biến global để lưu game sessions
global.games = {};
global.typhuRooms = {};

// Khởi tạo ReminderScheduler
const reminderScheduler = new ReminderScheduler(client);

// Function cập nhật Bot Activity động
const updateBotActivity = async () => {
    try {
        const guildPrefixes = await getAllGuildPrefixes();
        
        // Đếm số server sử dụng prefix mặc định vs custom
        const totalServers = client.guilds.cache.size;
        const customPrefixCount = Object.keys(guildPrefixes || {}).length;
        const defaultPrefixCount = totalServers - customPrefixCount;
        
        // Hiển thị thông tin prefix động
        if (customPrefixCount > 0) {
            client.user.setActivity(`RinBot | Default: ${config.prefix} | Custom: ${customPrefixCount}/${totalServers} servers | ,setprefix`, { 
                type: 'PLAYING' 
            });
        } else {
            client.user.setActivity(`RinBot | Prefix: ${config.prefix} | ,setprefix để đổi`, { 
                type: 'PLAYING' 
            });
        }
    } catch (error) {
        console.error('Lỗi cập nhật bot activity:', error);
        // Fallback về hiển thị cơ bản
        client.user.setActivity(`RinBot | Prefix: ${config.prefix} | ,setprefix`, { 
            type: 'PLAYING' 
        });
    }
};

// Hàm export để các command khác gọi
global.updateBotActivity = updateBotActivity;

// Load commands
const loadCommands = () => {
    const commandFolders = fs.readdirSync('./commands');
    
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const command = require(`./commands/${folder}/${file}`);
            if (command.name) {
                client.commands.set(command.name, command);
            }
        }
    }
    
    console.log(`✅ Đã load ${client.commands.size} commands`);
};

// Event handler
client.once('ready', () => {
    console.log(`🤖 Bot ${client.user.tag} đã sẵn sàng!`);
    console.log(`📊 Đang phục vụ ${client.guilds.cache.size} servers`);
    
    // Thiết lập hoạt động với prefix động
    updateBotActivity();
    
    // Khởi động Reminder Scheduler
    reminderScheduler.start();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return; // Không xử lý DM

    // Lấy prefix theo thứ tự ưu tiên: database > .env > default
    let guildPrefix;
    try {
        const dbPrefix = await getGuildPrefix(message.guild.id);
        // Thứ tự ưu tiên: database custom prefix > .env > default
        if (dbPrefix) {
            guildPrefix = dbPrefix; // Prefix custom từ database
        } else {
            guildPrefix = config.prefix; // Prefix từ .env hoặc default
        }
    } catch (error) {
        console.error('Lỗi lấy guild prefix:', error);
        guildPrefix = config.prefix; // Fallback to config prefix
    }
    
    // Xử lý tiến độ nghề nghiệp cho chat jobs (Nhà Báo, MC)
    if (!message.content.startsWith(guildPrefix)) {
        try {
            const { getCityUser, updateCityUser, updateUserRin } = require('./utils/database');
            const { JOB_TYPES } = require('./utils/constants');
            
            const cityUser = await getCityUser(message.author.id);
            
            // Debug log
            if (cityUser.job === 'nhabao') {
                console.log(`🔍 Debug Nhà báo ${message.author.displayName}:`, {
                    hasJob: !!cityUser.job,
                    job: cityUser.job,
                    hasWorkStartTime: !!cityUser.workStartTime,
                    workProgress: cityUser.workProgress || 0,
                    lastWork: cityUser.lastWork
                });
            }
            
            // Kiểm tra xem user có nghề chat và đang trong ca làm việc không
            if (cityUser.job && ['nhabao', 'mc'].includes(cityUser.job) && cityUser.workStartTime) {
                const job = JOB_TYPES[cityUser.job];
                const currentProgress = cityUser.workProgress || 0;
                
                console.log(`✅ Processing chat for ${message.author.displayName}: ${currentProgress + 1}/${job.targetMessages}`);
                
                // Kiểm tra xem đã hoàn thành chưa
                if (currentProgress < job.targetMessages) {
                    const newProgress = currentProgress + 1;
                    
                    // Cộng tiền ngay lập tức
                    await updateUserRin(message.author.id, job.rewardPerMessage);
                    
                    // Cập nhật tiến độ
                    await updateCityUser(message.author.id, { 
                        workProgress: newProgress 
                    });
                    
                    // Thông báo tiến độ mỗi 10 tin nhắn hoặc khi gần hoàn thành
                    const shouldNotify = newProgress % 10 === 0 || newProgress >= job.targetMessages - 5;
                    
                    if (shouldNotify && newProgress < job.targetMessages) {
                        const remaining = job.targetMessages - newProgress;
                        const progressPercent = Math.round((newProgress / job.targetMessages) * 100);
                        
                        // Thêm reaction để báo tiến độ
                        if (remaining <= 5) {
                            await message.react('🔥'); // Gần hoàn thành
                        } else if (newProgress % 10 === 0) {
                            await message.react('📈'); // Milestone
                        }
                        
                        // Thông báo nhẹ
                        setTimeout(async () => {
                            const msg = await message.reply(`📊 **Nhà báo:** ${newProgress}/${job.targetMessages} tin nhắn (${progressPercent}%) - Còn ${remaining} tin nhắn nữa! 💪`);
                            setTimeout(() => msg.delete().catch(() => {}), 5000); // Xóa sau 5s
                        }, 1000);
                    }
                    
                    // Thông báo khi hoàn thành
                    if (newProgress >= job.targetMessages) {
                        const { EmbedBuilder } = require('discord.js');
                        const { COLORS } = require('./utils/constants');
                        
                        await message.react('🎉'); // Hoàn thành
                        
                        const embed = new EmbedBuilder()
                            .setTitle('🎉 HOÀN THÀNH CA LÀM VIỆC!')
                            .setDescription(`**${job.name}** ${message.author.displayName} đã hoàn thành ca làm!\n\n` +
                                `**📊 Thành tích:**\n` +
                                `• Tin nhắn: ${newProgress}/${job.targetMessages}\n` +
                                `• Tổng thu nhập: ${(newProgress * job.rewardPerMessage).toLocaleString()} Rin\n\n` +
                                `**⏰ Cooldown:** ${Math.floor(job.cooldown / (60 * 60 * 1000))} giờ\n\n` +
                                `**Chúc mừng! 🎊**`)
                            .setColor(COLORS.success)
                            .setFooter({ text: 'Hãy nghỉ ngơi và quay lại sau!' });
                        
                        await message.channel.send({ embeds: [embed] });
                        
                        // Cập nhật thời gian làm việc cuối và xóa workStartTime
                        await updateCityUser(message.author.id, { 
                            lastWork: new Date(),
                            workStartTime: null,
                            workProgress: 0 // Reset cho ca mới
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi xử lý tiến độ chat job:', error);
        }
    }

    if (!message.content.startsWith(guildPrefix)) return;

    const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error('❌ Lỗi khi thực thi command:', error);
        message.reply('❌ Có lỗi xảy ra khi thực thi lệnh!');
    }
});

// Xử lý interactions (buttons, modals)
client.on('interactionCreate', async (interaction) => {
    try {
        // Xử lý interactions cho tạo bàn Xì Dách (CHECK TRƯỚC để tránh conflict)
        if (interaction.customId && (
            interaction.customId === 'xj_join' ||
            interaction.customId === 'xj_start' ||
            interaction.customId.startsWith('bet_') ||
            interaction.customId === 'bet_cancel'
        )) {
            // Chỉ route vào Xì Dách nếu có game trong channel này
            const channelId = String(interaction.channel.id);
            if (global.games[channelId] || interaction.customId === 'xj_join' || interaction.customId === 'xj_start') {
                const xjgoCommand = client.commands.get('xjgo');
                if (xjgoCommand) {
                    // Handle theo customId
                    if (interaction.customId === 'xj_join') {
                        await xjgoCommand.handleJoin(interaction, channelId);
                    } else if (interaction.customId === 'xj_start') {
                        await xjgoCommand.handleStart(interaction, channelId);
                    } else if (interaction.customId.startsWith('bet_') && interaction.customId !== 'bet_cancel') {
                        await xjgoCommand.handleBetButton(interaction, channelId);
                    } else if (interaction.customId === 'bet_cancel') {
                        await interaction.update({ 
                            content: '❌ Đã hủy tham gia', 
                            embeds: [], 
                            components: [] 
                        });
                    }
                }
                return;
            }
        }

        // Xử lý interactions cho Bầu Cua (người dùng làm nhà cái)
        if (interaction.customId && (
            interaction.customId.startsWith('bet_') ||
            interaction.customId === 'confirm_bet' ||
            interaction.customId === 'start_game' ||
            interaction.customId === 'cancel_game' ||
            interaction.customId.startsWith('bet_modal_')
        )) {
            const bauCuaCommand = client.commands.get('bcgo');
            if (bauCuaCommand && bauCuaCommand.handleInteraction) {
                await bauCuaCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho Bầu Cua Bot (bot làm nhà cái)
        if (interaction.customId && (
            interaction.customId.startsWith('bot_bet_') ||
            interaction.customId === 'bot_confirm_bet' ||
            interaction.customId === 'bot_auto_play' ||
            interaction.customId.startsWith('bot_bet_modal_')
        )) {
            const botBauCuaCommand = client.commands.get('bcbot');
            if (botBauCuaCommand && botBauCuaCommand.handleInteraction) {
                await botBauCuaCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho Xì Dách
        if (interaction.customId && (
            interaction.customId === 'view_cards' ||
            interaction.customId === 'draw_card' ||
            interaction.customId === 'stop_turn'
        )) {
            const xjrinCommand = client.commands.get('xjrin');
            if (xjrinCommand && xjrinCommand.ActionView) {
                await xjrinCommand.ActionView.handleInteraction(interaction, interaction.channel.id);
            }
            return;
        }

        // Xử lý modal submit cho bet
        if (interaction.isModalSubmit() && interaction.customId === 'bet_modal') {
            const xjgoCommand = client.commands.get('xjgo');
            if (xjgoCommand) {
                const channelId = String(interaction.channel.id);
                
                await xjgoCommand.handleBetModal(interaction, channelId);
            }
            return;
        }

        // Xử lý interactions cho Cờ Tỷ Phú
        if (interaction.customId && (
            interaction.customId === 'tp_join' ||
            interaction.customId === 'tp_start' ||
            interaction.customId.startsWith('roll_dice_') ||
            interaction.customId.startsWith('buy_property_') ||
            interaction.customId.startsWith('skip_property_')
        )) {
            const typhuCommand = client.commands.get('typhu');
            if (typhuCommand && typhuCommand.handleInteraction) {
                await typhuCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho Xì Dách Bot
        if (interaction.customId && (
            interaction.customId === 'xjbot_join' ||
            interaction.customId === 'xjbot_start' ||
            interaction.customId === 'xjbot_hit' ||
            interaction.customId === 'xjbot_stand'
        )) {
            const xjbotCommand = client.commands.get('xjbot');
            if (xjbotCommand && xjbotCommand.handleInteraction) {
                await xjbotCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý modal submit cho Xì Dách Bot
        if (interaction.isModalSubmit() && interaction.customId === 'xjbot_bet_modal') {
            const xjbotCommand = client.commands.get('xjbot');
            if (xjbotCommand && xjbotCommand.handleInteraction) {
                await xjbotCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho Cờ Tỷ Phú Bot
        if (interaction.customId && (
            interaction.customId === 'tpbot_join' ||
            interaction.customId === 'tpbot_start' ||
            interaction.customId.startsWith('tpbot_roll_dice_') ||
            interaction.customId.startsWith('tpbot_buy_property_') ||
            interaction.customId.startsWith('tpbot_skip_property_')
        )) {
            const tpbotCommand = client.commands.get('tpbot');
            if (tpbotCommand && tpbotCommand.handleInteraction) {
                await tpbotCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho Farm (muacay)
        if (interaction.customId && (
            interaction.customId.startsWith('plant_tree_')
        )) {
            const muacayCommand = client.commands.get('muacay');
            if (muacayCommand && muacayCommand.handleInteraction) {
                await muacayCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho caycheck (xem chi tiết cây)
        if (interaction.customId && (
            interaction.customId.startsWith('tree_detail_')
        )) {
            const cayCheckCommand = client.commands.get('caycheck');
            if (cayCheckCommand && cayCheckCommand.handleInteraction) {
                await cayCheckCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho bancay
        if (interaction.customId && (
            interaction.customId.startsWith('sell_tree_') ||
            interaction.customId.startsWith('cancel_sell_')
        )) {
            const bancayCommand = client.commands.get('bancay');
            if (bancayCommand && bancayCommand.handleInteraction) {
                await bancayCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho Pet system
        if (interaction.customId && (
            interaction.customId.startsWith('breed_') ||
            interaction.customId.startsWith('sell_pet_') ||
            interaction.customId.startsWith('retire_pet_') ||
            interaction.customId.startsWith('cancel_pet_')
        )) {
            let petCommand = null;
            
            if (interaction.customId.startsWith('breed_')) {
                petCommand = client.commands.get('petchich');
            } else if (interaction.customId.startsWith('sell_pet_')) {
                petCommand = client.commands.get('banpet');
            } else if (interaction.customId.startsWith('retire_pet_')) {
                petCommand = client.commands.get('gia');
            } else if (interaction.customId.startsWith('cancel_pet_')) {
                petCommand = client.commands.get('huypet');
            }
            
            if (petCommand && petCommand.handleInteraction) {
                await petCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho City system
        if (interaction.customId && (
            interaction.customId.startsWith('rent_house_') ||
            interaction.customId.startsWith('job_apply_') ||
            interaction.customId.startsWith('mission_') ||
            interaction.customId.startsWith('repair_') ||
            interaction.customId.startsWith('early_repair_') ||
            interaction.customId.startsWith('cancel_house_')
        )) {
            let cityCommand = null;
            
            if (interaction.customId.startsWith('rent_house_')) {
                cityCommand = client.commands.get('thuenha');
            } else if (interaction.customId.startsWith('job_apply_')) {
                cityCommand = client.commands.get('dangkynghe');
            } else if (interaction.customId.startsWith('mission_')) {
                cityCommand = client.commands.get('nhiemvu');
            } else if (interaction.customId.startsWith('repair_') || interaction.customId.startsWith('early_repair_')) {
                cityCommand = client.commands.get('suanha');
            } else if (interaction.customId.startsWith('cancel_house_')) {
                cityCommand = client.commands.get('huynha');
            }
            
            if (cityCommand && cityCommand.handleInteraction) {
                await cityCommand.handleInteraction(interaction);
            }
            return;
        }

        // Xử lý interactions cho Reminder system
        if (interaction.customId && (
            interaction.customId.startsWith('refresh_reminders_') ||
            interaction.customId.startsWith('clear_reminders_')
        )) {
            const reminderCommand = client.commands.get('xemnhacnho');
            if (reminderCommand && reminderCommand.handleInteraction) {
                await reminderCommand.handleInteraction(interaction);
            }
            return;
        }

    } catch (error) {
        console.error('Lỗi interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Có lỗi xảy ra!', flags: 64 });
        }
    }
});

// Xử lý reaction cho giveaway
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    // Import giveaway handler
    try {
        const giveawayHandler = require('./commands/general/giveaway.js');
        if (giveawayHandler.handleReaction) {
            await giveawayHandler.handleReaction(reaction, user, 'add');
        }
    } catch (error) {
        console.error('Lỗi xử lý reaction:', error);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    
    try {
        const giveawayHandler = require('./commands/general/giveaway.js');
        if (giveawayHandler.handleReaction) {
            await giveawayHandler.handleReaction(reaction, user, 'remove');
        }
    } catch (error) {
        console.error('Lỗi xử lý reaction remove:', error);
    }
});

// Lưu thời điểm join voice vào DB cho nghề MC
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const { getCityUser, updateCityUser, updateUserRin } = require('./utils/database');
        const { JOB_TYPES, COLORS } = require('./utils/constants');
        const { EmbedBuilder } = require('discord.js');
        
        // User join voice channel
        if (!oldState.channelId && newState.channelId) {
            const userId = newState.id;
            const cityUser = await getCityUser(userId);
            if (cityUser && cityUser.job === 'mc') {
                await updateCityUser(userId, { lastVoiceJoin: new Date() });
                console.log(`🎤 MC ${newState.member.displayName} đã vào voice`);
            }
        }
        
        // User leave voice channel - tính thời gian và update tiến độ
        if (oldState.channelId && !newState.channelId) {
            const userId = oldState.id;
            const cityUser = await getCityUser(userId);
            if (cityUser && cityUser.job === 'mc' && cityUser.lastVoiceJoin) {
                const job = JOB_TYPES.mc;
                const now = new Date();
                const lastJoin = new Date(cityUser.lastVoiceJoin);
                const sessionMinutes = Math.floor((now - lastJoin) / 60000);
                const dailyProgress = cityUser.dailyVoiceMinutes || 0;
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isNewDay = !cityUser.lastWork || new Date(cityUser.lastWork) < todayStart;
                
                // Reset nếu là ngày mới
                const currentDaily = isNewDay ? sessionMinutes : dailyProgress + sessionMinutes;
                
                console.log(`🎤 MC ${oldState.member.displayName} rời voice: ${sessionMinutes} phút, tổng: ${currentDaily} phút`);
                
                if (currentDaily >= job.minVoiceMinutes && (isNewDay || dailyProgress < job.minVoiceMinutes)) {
                    // Hoàn thành công việc
                    await updateUserRin(userId, job.rewardPerDay);
                    await updateCityUser(userId, { 
                        lastWork: now,
                        lastVoiceJoin: null,
                        dailyVoiceMinutes: 0
                    });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🎉 MC - HOÀN THÀNH CÔNG VIỆC!')
                        .setDescription(`**✅ Chúc mừng ${oldState.member.displayName}! Bạn đã hoàn thành ca làm MC!**\n\n` +
                            `• **Thời gian voice hôm nay:** ${currentDaily} phút\n` +
                            `• **Yêu cầu:** ${job.minVoiceMinutes} phút\n` +
                            `• **Thưởng nhận được:** ${job.rewardPerDay} Rin\n\n` +
                            `**⏰ Cooldown:** ${Math.floor(job.cooldown / (60 * 60 * 1000))} giờ\n` +
                            `Hãy nghỉ ngơi và quay lại sau!`)
                        .setColor(COLORS.success);
                    
                    // Gửi thông báo đến channel mà user đang ở
                    const channels = oldState.guild.channels.cache.filter(c => c.type === 0);
                    const targetChannel = channels.find(c => c.name.includes('chat') || c.name.includes('general')) || channels.first();
                    if (targetChannel) {
                        await targetChannel.send({ embeds: [embed] });
                    }
                } else {
                    // Chỉ cập nhật tiến độ
                    await updateCityUser(userId, {
                        lastVoiceJoin: null,
                        dailyVoiceMinutes: currentDaily
                    });
                }
            }
        }
    } catch (err) {
        console.error('Lỗi voiceStateUpdate:', err);
    }
});

// Cron jobs
const setupCronJobs = () => {
    // Update tiến độ MC mỗi phút cho user đang ở voice
    cron.schedule('* * * * *', async () => {
        try {
            const { getCityUser, updateCityUser, updateUserRin } = require('./utils/database');
            const { JOB_TYPES, COLORS } = require('./utils/constants');
            const { EmbedBuilder } = require('discord.js');
            
            for (const guild of client.guilds.cache.values()) {
                for (const voiceChannel of guild.channels.cache.filter(c => c.type === 2).values()) {
                    for (const member of voiceChannel.members.values()) {
                        if (member.user.bot) continue;
                        
                        const cityUser = await getCityUser(member.id);
                        if (cityUser && cityUser.job === 'mc' && cityUser.lastVoiceJoin) {
                            const job = JOB_TYPES.mc;
                            const now = new Date();
                            const lastJoin = new Date(cityUser.lastVoiceJoin);
                            const sessionMinutes = Math.floor((now - lastJoin) / 60000);
                            const dailyProgress = cityUser.dailyVoiceMinutes || 0;
                            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const isNewDay = !cityUser.lastWork || new Date(cityUser.lastWork) < todayStart;
                            
                            // Reset nếu là ngày mới
                            const currentDaily = isNewDay ? sessionMinutes : dailyProgress + sessionMinutes;
                            
                            // Kiểm tra nếu đủ điều kiện hoàn thành và chưa hoàn thành hôm nay
                            if (currentDaily >= job.minVoiceMinutes && (isNewDay || dailyProgress < job.minVoiceMinutes)) {
                                // Hoàn thành công việc
                                await updateUserRin(member.id, job.rewardPerDay);
                                await updateCityUser(member.id, { 
                                    lastWork: now,
                                    lastVoiceJoin: null,
                                    dailyVoiceMinutes: 0
                                });
                                
                                const embed = new EmbedBuilder()
                                    .setTitle('🎉 MC - HOÀN THÀNH CÔNG VIỆC!')
                                    .setDescription(`**✅ Chúc mừng ${member.displayName}! Bạn đã hoàn thành ca làm MC!**\n\n` +
                                        `• **Thời gian voice hôm nay:** ${currentDaily} phút\n` +
                                        `• **Yêu cầu:** ${job.minVoiceMinutes} phút\n` +
                                        `• **Thưởng nhận được:** ${job.rewardPerDay} Rin\n\n` +
                                        `**⏰ Cooldown:** ${Math.floor(job.cooldown / (60 * 60 * 1000))} giờ\n` +
                                        `Hãy nghỉ ngơi và quay lại sau!`)
                                    .setColor(COLORS.success);
                                
                                // Gửi thông báo đến channel chính
                                const channels = guild.channels.cache.filter(c => c.type === 0);
                                const targetChannel = channels.find(c => c.name.includes('chat') || c.name.includes('general')) || channels.first();
                                if (targetChannel) {
                                    await targetChannel.send({ embeds: [embed] });
                                }
                                console.log(`🎉 MC ${member.displayName} đã hoàn thành ca làm tự động!`);
                            } else if (sessionMinutes > 0) {
                                // Cập nhật tiến độ
                                await updateCityUser(member.id, {
                                    dailyVoiceMinutes: currentDaily
                                });
                                console.log(`⏱️ Update MC ${member.displayName}: ${currentDaily}/${job.minVoiceMinutes} phút`);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi update tiến độ MC:', error);
        }
    });

    // Kiểm tra giveaway mỗi 10 giây
    cron.schedule('*/10 * * * * *', async () => {
        try {
            const giveawayHandler = require('./commands/general/giveaway.js');
            if (giveawayHandler.checkGiveaways) {
                await giveawayHandler.checkGiveaways(client);
            }
        } catch (error) {
            console.error('Lỗi kiểm tra giveaway:', error);
        }
    });

    // Kiểm tra sửa nhà mỗi ngày
    cron.schedule('0 0 * * *', async () => {
        try {
            const cityHandler = require('./commands/city/city.js');
            if (cityHandler.checkRepair) {
                await cityHandler.checkRepair(client);
            }
        } catch (error) {
            console.error('Lỗi kiểm tra sửa nhà:', error);
        }
    });

    // Cập nhật bot activity mỗi 30 phút
    cron.schedule('*/30 * * * *', async () => {
        try {
            if (client.isReady()) {
                await updateBotActivity();
            }
        } catch (error) {
            console.error('Lỗi cập nhật bot activity:', error);
        }
    });
    
    console.log('⏰ Đã thiết lập các cron jobs');
};

// Khởi động bot
const startBot = async () => {
    try {
        // Kết nối database
        await connectDB(config.mongoUri);
        
        // Load commands
        loadCommands();
        
        // Setup cron jobs
        setupCronJobs();
        
        // Load giveaway đang hoạt động
        const giveawayHandler = require('./commands/general/giveaway.js');
        if (giveawayHandler.loadActiveGiveaways) {
            await giveawayHandler.loadActiveGiveaways(client);
        }
        
        // Đăng nhập bot
        await client.login(config.token);
    } catch (error) {
        console.error('❌ Lỗi khởi động bot:', error);
        process.exit(1);
    }
};

startBot(); 