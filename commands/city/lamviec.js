const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCityUser, updateCityUser, getUserRin, updateUserRin, getUser } = require('../../utils/database');
const { getFarmUser, updateFarmUser } = require('../../utils/database');
const { JOB_TYPES, JOB_IMAGES, POLICE_PUZZLES, JOB_NOTIFICATIONS, COLORS, TREE_VALUES } = require('../../utils/constants');
const Tree = require('../../models/Tree');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'lamviec',
    description: 'Làm việc theo nghề nghiệp để kiếm tiền',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 3 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'lamviec', 
                3, // 3 giây cooldown
                this.executeLamViec,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },

    async executeLamViec(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);

            if (!cityUser.job) {
                return message.reply('❌ Bạn chưa có nghề nghiệp! Dùng `,dangkynghe` để đăng ký nghề.');
            }

            const job = JOB_TYPES[cityUser.job];
            const now = new Date();
            const lastWork = cityUser.lastWork ? new Date(cityUser.lastWork) : null;
            
            // Kiểm tra đã làm việc hôm nay chưa
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const hasWorkedToday = lastWork && lastWork >= todayStart;

            // Nghề trộm và công an có cooldown riêng, không giới hạn 1 lần/ngày
            if (cityUser.job === 'trom') {
                const cooldownTime = 2 * 60 * 1000; // 2 phút
                if (lastWork && (now - lastWork) < cooldownTime) {
                    const timeLeft = cooldownTime - (now - lastWork);
                    const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
                    return message.reply(`⏰ Bạn cần nghỉ thêm **${minutesLeft} phút** nữa mới có thể trộm tiếp!`);
                }
            } else if (cityUser.job === 'congan') {
                const cooldownTime = job.cooldown; // 1 giờ
                if (lastWork && (now - lastWork) < cooldownTime) {
                    const timeLeft = cooldownTime - (now - lastWork);
                    const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
                    const hoursLeft = Math.floor(minutesLeft / 60);
                    const remainingMinutes = minutesLeft % 60;
                    
                    const timeString = hoursLeft > 0 ? `${hoursLeft}h ${remainingMinutes}p` : `${remainingMinutes} phút`;
                    return message.reply(`⏰ Bạn cần nghỉ thêm **${timeString}** nữa mới có thể tuần tra tiếp!`);
                }
            } else {
                // Các nghề khác (nhà báo, MC) kiểm tra 1 lần/ngày
                if (hasWorkedToday) {
                    const tomorrow = new Date(todayStart);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const timeUntilTomorrow = tomorrow - now;
                    const hoursLeft = Math.floor(timeUntilTomorrow / (60 * 60 * 1000));
                    const minutesLeft = Math.floor((timeUntilTomorrow % (60 * 60 * 1000)) / (60 * 1000));
                    
                    return message.reply(`✅ Bạn đã làm việc hôm nay rồi!\n⏰ Có thể làm việc lại sau: **${hoursLeft}h ${minutesLeft}p** nữa (0:00 ngày mai)`);
                }
            }

            // Xử lý theo từng loại nghề
            switch (cityUser.job) {
                case 'trom':
                    return await this.handleThiefWork(message, cityUser, args);
                case 'nhabao':
                    return await this.handleChatWork(message, cityUser);
                case 'mc':
                    return await this.handleVoiceWork(message, cityUser);
                case 'congan':
                    return await this.handlePoliceWork(message, cityUser);
                default:
                    return message.reply('❌ Nghề nghiệp không được hỗ trợ!');
            }

        } catch (error) {
            console.error('Lỗi lamviec:', error);
            await message.reply('❌ Có lỗi xảy ra khi làm việc!');
        }
    },

    // Xử lý nghề Trộm
    async handleThiefWork(message, cityUser, args) {
        if (args.length === 0) {
            const currentHour = new Date().getHours();
            const canStealMoney = currentHour >= 19 && currentHour < 21;
            const job = JOB_TYPES[cityUser.job];
            const now = new Date();
            const lastWork = cityUser.lastWork ? new Date(cityUser.lastWork) : null;
            const canWork = !lastWork || (now - lastWork) >= (2 * 60 * 1000); // 2 phút cooldown
            
            let cooldownInfo = '';
            if (!canWork) {
                const timeLeft = (2 * 60 * 1000) - (now - lastWork);
                const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
                cooldownInfo = `⏰ **Cooldown:** Còn ${minutesLeft} phút nữa mới có thể trộm tiếp!\n\n`;
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🥷 NGHỀ TRỘM - THỐNG KÊ CHI TIẾT')
                .setDescription(`**📊 Trạng thái công việc:**\n` +
                    `• **Nghề nghiệp:** ${job.name}\n` +
                    `• **Trạng thái:** ${canWork ? '✅ Sẵn sàng trộm' : '⏳ Đang nghỉ'}\n` +
                    `• **Rủi ro bị bắt:** ${Math.round(job.riskChance * 100)}%\n\n` +
                    `${cooldownInfo}` +
                    `🏠 **TRỘM TIỀN TRONG NHÀ** (19h-21h):\n` +
                    `• **Giờ hiện tại:** ${currentHour}:00 ${canStealMoney ? '✅ Có thể trộm tiền' : '❌ Ngoài giờ'}\n` +
                    `• **Hoạt động:** Từ 19:00 đến 21:00\n` +
                    `• **Giới hạn:** Mỗi nhà chỉ trộm được 1 lần/ngày\n` +
                    `• **Thu nhập:** 100-500 Rin ngẫu nhiên\n\n` +
                    `🌱 **TRỘM CÂY TRONG FARM:**\n` +
                    `• **Điều kiện:** Cây đã trưởng thành và có thể thu hoạch\n` +
                    `• **Thời gian:** Từ khi cây có thể thu hoạch đến 3 tiếng (chưa chết)\n` +
                    `• **Thu nhập:** 30-70% giá trị cây\n` +
                    `• **Rủi ro:** Có thể bị công an bắt trong 10 phút\n\n` +
                    `**⚠️ LƯU Ý QUAN TRỌNG:**\n` +
                    `• **Cooldown đặc biệt:** 2 phút/lần trộm\n` +
                    `• **Nguy hiểm:** Có thể bị công an bắt và mất tiền phạt\n` +
                    `• **Thành công:** ~70% cơ hội thành công\n\n` +
                    `**📋 Cách sử dụng:**\n` +
                    `• \`,lamviec @user\` - Trộm cây hoặc tiền của user\n` +
                    `• \`,lamviec list\` - Xem danh sách có thể trộm\n\n` +
                    `${canWork ? '🎯 **Sẵn sàng để trộm!**' : '⏰ **Đang nghỉ, hãy chờ cooldown!**'}`)
                .setColor(canWork ? COLORS.warning : COLORS.error)
                .setThumbnail(JOB_IMAGES.trom)
                .setFooter({ 
                    text: `${canWork ? 'Sẵn sàng hành động' : `Cooldown còn ${Math.ceil(((2 * 60 * 1000) - (now - lastWork)) / (60 * 1000))} phút`} | Rủi ro cao!` 
                });

            return message.reply({ embeds: [embed] });
        }

        // Lệnh xem danh sách
        if (args[0].toLowerCase() === 'list') {
            return await this.showStealTargets(message);
        }

        // Trộm của user
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Hãy tag người bạn muốn trộm: `,lamviec @user`');
        }

        if (targetUser.id === message.author.id) {
            return message.reply('❌ Không thể tự trộm chính mình!');
        }

        return await this.stealFromUser(message, cityUser, targetUser);
    },

    // Hiển thị danh sách có thể trộm
    async showStealTargets(message) {
        const currentHour = new Date().getHours();
        const canStealMoney = currentHour >= 19 && currentHour < 21;

        const embed = new EmbedBuilder()
            .setTitle('🎯 DANH SÁCH MỤC TIÊU TRỘM')
            .setDescription(`**Danh sách những người có thể trộm:**\n\n` +
                `🌱 **Trộm cây:** Cây đã trưởng thành và có thể thu hoạch\n` +
                `🏠 **Trộm tiền:** ${canStealMoney ? '✅ Hiện tại có thể (19h-21h)' : '❌ Ngoài giờ (19h-21h)'}\n\n` +
                `⏰ **Cooldown:** 2 phút/lần trộm\n` +
                `⚠️ **Nguy cơ:** Có thể bị công an bắt\n` +
                `📅 **Trộm tiền:** Mỗi nhà chỉ 1 lần/ngày\n\n` +
                `*Sử dụng:* \`,lamviec @user\` để trộm`)
            .setColor(COLORS.info);

        return message.reply({ embeds: [embed] });
    },

    // Thực hiện trộm
    async stealFromUser(message, thiefCityUser, targetUser) {
        try {
            const thiefId = message.author.id;
            const targetId = targetUser.id;
            const currentHour = new Date().getHours();
            const canStealMoney = currentHour >= 19 && currentHour < 21;

            // Kiểm tra đã trộm tiền nhà này hôm nay chưa
            const today = new Date().toDateString();
            const dailyStealRecord = thiefCityUser.dailyMoneySteal || {};
            const hasStealenMoneyToday = dailyStealRecord[targetId] === today;

            // Kiểm tra target có nhà không (để trộm tiền)
            const targetCityUser = await getCityUser(targetId);
            const hasHouse = !!targetCityUser.home;

            // Kiểm tra farm của target (để trộm cây)
            const targetTrees = await Tree.find({ 
                userId: targetId,
                guildId: message.guild.id // Chỉ tìm cây trong server hiện tại
            });
            const stealableTrees = targetTrees.filter(tree => {
                if (!tree.maturedAt) return false; // Cây phải đã trưởng thành
                const matured = new Date(tree.maturedAt);
                const minutesSinceMature = (new Date() - matured) / (1000 * 60);
                if (minutesSinceMature < 60) return false; // Phải chờ ít nhất 1 tiếng sau khi mature (có thể thu hoạch)
                if (minutesSinceMature > 180) return false; // Đã chết sau 3 tiếng
                return true;
            });

            // Xác định có thể trộm gì
            const canStealTrees = stealableTrees.length > 0 && hasHouse; // CHỈ trộm cây khi có nhà
            const canStealHouseMoney = canStealMoney && hasHouse && !hasStealenMoneyToday;

            if (!canStealTrees && !canStealHouseMoney) {
                let reason = '';
                if (!hasHouse) {
                    reason = `${targetUser.displayName} không có nhà trọ! Cần có nhà để có thể bị trộm cây hoặc tiền.`;
                } else if (stealableTrees.length === 0) {
                    if (!canStealMoney) {
                        reason = `${targetUser.displayName} không có cây nào để trộm và không trong giờ trộm tiền (19h-21h)!`;
                    } else if (hasStealenMoneyToday) {
                        reason = `${targetUser.displayName} không có cây nào để trộm và bạn đã trộm tiền nhà này hôm nay rồi!`;
                    }
                } else {
                    // Có cây nhưng không thể trộm vì các lý do khác
                    if (!canStealMoney) {
                        reason = `${targetUser.displayName} có cây nhưng không trong giờ trộm tiền (19h-21h)!`;
                    } else if (hasStealenMoneyToday) {
                        reason = `${targetUser.displayName} có cây nhưng bạn đã trộm tiền nhà này hôm nay rồi!`;
                    }
                }
                return message.reply(`❌ ${reason}`);
            }

            // Quyết định trộm gì (ưu tiên tiền nếu có thể)
            let stealType = '';
            let stolenAmount = 0;
            let description = '';

            if (canStealHouseMoney && Math.random() < 0.6) { // 60% cơ hội trộm tiền nếu có thể
                // Trộm tiền trong nhà
                stealType = 'money';
                stolenAmount = Math.floor(100 + Math.random() * 400); // 100-500 Rin
                description = `tiền từ nhà ${targetUser.displayName}`;

                // Cập nhật record trộm tiền hôm nay
                const newDailyRecord = { ...dailyStealRecord, [targetId]: today };
                await updateCityUser(thiefId, { dailyMoneySteal: newDailyRecord });

            } else if (canStealTrees) {
                // Trộm cây
                stealType = 'tree';
                const randomTree = stealableTrees[Math.floor(Math.random() * stealableTrees.length)];
                const treeValue = TREE_VALUES[randomTree.species] || 100;
                stolenAmount = Math.floor(treeValue * (0.3 + Math.random() * 0.4)); // 30-70% giá trị
                description = `cây ${randomTree.species} từ farm ${targetUser.displayName}`;

                // Xóa cây khỏi farm
                await Tree.deleteOne({ _id: randomTree._id });
            }

            // Thông báo cho channel về việc trộm
            const stealNotification = JOB_NOTIFICATIONS.steal_attempt
                .replace('{thief}', message.author.displayName)
                .replace('{victim}', targetUser.displayName);

            await message.channel.send(stealNotification);

            // Tỷ lệ thành công
            const successRate = 0.7; // 70% thành công
            const isSuccess = Math.random() < successRate;

            if (isSuccess) {
                // Trộm thành công
                await updateUserRin(thiefId, stolenAmount);
                await updateCityUser(thiefId, { 
                    lastWork: new Date(),
                    workProgress: (thiefCityUser.workProgress || 0) + 1
                });

                const successMsg = JOB_NOTIFICATIONS.steal_success
                    .replace('{thief}', message.author.displayName)
                    .replace('{amount}', stolenAmount.toLocaleString())
                    .replace('{victim}', targetUser.displayName);

                const embed = new EmbedBuilder()
                    .setTitle('🥷 TRỘM THÀNH CÔNG!')
                    .setDescription(`Bạn đã trộm được **${description}**!\n\n` +
                        `**💰 Kiếm được:** ${stolenAmount.toLocaleString()} Rin\n` +
                        `**⚠️ Cẩn thận:** Công an có thể bắt bạn trong 10 phút!\n` +
                        `**⏰ Cooldown:** 2 phút`)
                    .setColor(COLORS.warning)
                    .setThumbnail(JOB_IMAGES.trom);

                await message.reply({ embeds: [embed] });
                await message.channel.send(successMsg);

                // Lưu thông tin để công an có thể bắt
                this.saveTheftRecord(thiefId, targetId, stolenAmount, message.guild.id);

            } else {
                // Trộm thất bại
                const failMsg = JOB_NOTIFICATIONS.steal_failed
                    .replace('{thief}', message.author.displayName);

                const embed = new EmbedBuilder()
                    .setTitle('❌ TRỘM THẤT BẠI!')
                    .setDescription(`Bạn đã bị phát hiện khi cố trộm ${description}!\n\n` +
                        `**💸 Mất:** 50 Rin (phí phạt)\n` +
                        `**⏰ Cooldown:** 2 phút`)
                    .setColor(COLORS.error);

                await updateUserRin(thiefId, -50);
                await updateCityUser(thiefId, { lastWork: new Date() });
                
                await message.reply({ embeds: [embed] });
                await message.channel.send(failMsg);
            }

        } catch (error) {
            console.error('Lỗi trộm:', error);
            await message.reply('❌ Có lỗi xảy ra khi trộm!');
        }
    },

    // Xử lý nghề Chat/Voice (Nhà Báo, MC)
    async handleVoiceWork(message, cityUser) {
        const job = JOB_TYPES[cityUser.job];
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastWork = cityUser.lastWork ? new Date(cityUser.lastWork) : null;
        const hasWorkedToday = lastWork && lastWork >= todayStart;
        
        // Nếu đã hoàn thành hôm nay thì không cho làm nữa
        if (hasWorkedToday) {
            const tomorrow = new Date(todayStart);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const timeUntilTomorrow = tomorrow - now;
            const hoursLeft = Math.floor(timeUntilTomorrow / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeUntilTomorrow % (60 * 60 * 1000)) / (60 * 1000));
            
            return message.reply(`✅ Bạn đã hoàn thành ca làm MC hôm nay!\n⏰ Có thể làm việc lại sau: **${hoursLeft}h ${minutesLeft}p** nữa (0:00 ngày mai)\n\n💡 **Lưu ý:** Mỗi ngày chỉ được làm MC 1 lần duy nhất!`);
        }
        
        // Chỉ xử lý nghề MC - Voice
        const member = await message.guild.members.fetch(message.author.id);
        const isInVoice = !!member.voice.channel;
        
        const lastJoin = cityUser.lastVoiceJoin ? new Date(cityUser.lastVoiceJoin) : null;
        const dailyProgress = cityUser.dailyVoiceMinutes || 0;
        
        // Reset tiến độ cho ngày mới
        const actualProgress = hasWorkedToday ? dailyProgress : 0;
        
        // Tính thời gian session hiện tại nếu đang ở voice
        let sessionMinutes = 0;
        if (isInVoice && lastJoin && !hasWorkedToday) {
            sessionMinutes = Math.floor((now - lastJoin) / 60000);
        }
        
        const totalToday = actualProgress + sessionMinutes;
        const remainingMinutes = Math.max(0, job.minVoiceMinutes - totalToday);
        const progressPercent = Math.round((totalToday / job.minVoiceMinutes) * 100);
        
        const embed = new EmbedBuilder()
            .setTitle('🎤 NGHỀ MC - THỐNG KÊ CHI TIẾT')
            .setDescription(`**📊 Trạng thái công việc:**\n` +
                `• **Nghề nghiệp:** ${job.name}\n` +
                `• **Voice đã ngồi hôm nay:** ${totalToday}/${job.minVoiceMinutes} phút\n` +
                `• **Tiến độ:** ${Math.min(100, progressPercent)}%\n` +
                `• **Còn thiếu:** ${remainingMinutes} phút\n\n` +
                `**💰 Thu nhập:**\n` +
                `• **Thưởng/ngày:** ${job.rewardPerDay} Rin\n` +
                `• **Trạng thái thưởng:** ${totalToday >= job.minVoiceMinutes ? '✅ Đủ điều kiện nhận' : '⏳ Chưa đủ điều kiện'}\n\n` +
                `**⏰ Thời gian:**\n` +
                `• **Session hiện tại:** ${sessionMinutes} phút\n` +
                `• **Tích lũy hôm nay:** ${actualProgress} phút\n` +
                `• **Giới hạn:** 1 lần/ngày (reset 0:00 tự động)\n\n` +
                `**📍 Trạng thái Voice:**\n` +
                `• **Hiện tại:** ${isInVoice ? `🟢 Đang ở ${member.voice.channel.name}` : '🔴 Không ở voice'}\n` +
                `${lastJoin && !hasWorkedToday ? `• **Bắt đầu session:** ${lastJoin.toLocaleTimeString('vi-VN')}\n` : ''}` +
                `${isInVoice && !hasWorkedToday ? `• **Thời gian session:** ${sessionMinutes} phút\n` : ''}\n` +
                `**📋 Hướng dẫn:**\n` +
                `• Vào bất kỳ room voice nào trong server\n` +
                `• Bot tự động tính thời gian khi bạn ở voice\n` +
                `• Dùng \`,lamviec\` để check tiến độ\n` +
                `• Ngồi đủ ${job.minVoiceMinutes} phút trong ngày để nhận thưởng\n\n` +
                `${isInVoice && !hasWorkedToday ? '🎤 **Đang tích lũy thời gian voice!**' : hasWorkedToday ? '✅ **Đã hoàn thành hôm nay!**' : '⚠️ **Hãy vào voice để bắt đầu tích lũy!**'}`)
            .setColor(hasWorkedToday ? COLORS.success : (isInVoice ? COLORS.info : COLORS.warning))
            .setThumbnail(JOB_IMAGES.mc)
            .setFooter({ 
                text: `${hasWorkedToday ? 'Đã hoàn thành' : (isInVoice ? 'Đang tích lũy thời gian' : 'Cần vào voice')} | 1 lần/ngày` 
            });
        
        return message.reply({ embeds: [embed] });
    },

    // Xử lý nghề Nhà báo - Chat
    async handleChatWork(message, cityUser) {
        const job = JOB_TYPES[cityUser.job];
        const now = new Date();
        
        const currentProgress = cityUser.workProgress || 0;
        const isWorking = cityUser.workStartTime && !cityUser.lastWork;
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastWorkDate = cityUser.lastWork ? new Date(cityUser.lastWork) : null;
        const hasWorkedToday = lastWorkDate && lastWorkDate >= todayStart;
        
        // Nếu đã hoàn thành hôm nay thì không cho làm nữa
        if (hasWorkedToday) {
            const tomorrow = new Date(todayStart);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const timeUntilTomorrow = tomorrow - now;
            const hoursLeft = Math.floor(timeUntilTomorrow / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeUntilTomorrow % (60 * 60 * 1000)) / (60 * 1000));
            
            return message.reply(`✅ Bạn đã hoàn thành ca làm Nhà báo hôm nay!\n⏰ Có thể làm việc lại sau: **${hoursLeft}h ${minutesLeft}p** nữa (0:00 ngày mai)\n\n💡 **Lưu ý:** Mỗi ngày chỉ được làm Nhà báo 1 lần duy nhất!`);
        }
        
        if (!isWorking) {
            // Bắt đầu ca làm mới - reset tiến độ về 0 cho ngày mới
            await updateCityUser(message.author.id, { 
                workStartTime: now,
                workProgress: 0
            });
        }
        
        // Hiển thị tiến độ thực tế hiện tại
        const displayProgress = isWorking ? currentProgress : 0;
        const workTimeMinutes = isWorking ? Math.floor((now - new Date(cityUser.workStartTime)) / 60000) : 0;
        
        const embed = new EmbedBuilder()
            .setTitle('📰 NGHỀ NHÀ BÁO - THỐNG KÊ CHI TIẾT')
            .setDescription(`**📊 Trạng thái công việc:**\n` +
                `• **Nghề nghiệp:** ${job.name}\n` +
                `• **Tin nhắn đã chat:** ${displayProgress}/${job.targetMessages}\n` +
                `• **Tiến độ:** ${Math.round((displayProgress / job.targetMessages) * 100)}%\n` +
                `• **Còn thiếu:** ${Math.max(0, job.targetMessages - displayProgress)} tin nhắn\n\n` +
                `**💰 Thu nhập:**\n` +
                `• **Thưởng/tin nhắn:** ${job.rewardPerMessage} Rin\n` +
                `• **Đã kiếm được:** ${(displayProgress * job.rewardPerMessage).toLocaleString()} Rin\n` +
                `• **Tổng khi hoàn thành:** ${(job.targetMessages * job.rewardPerMessage).toLocaleString()} Rin\n\n` +
                `**⏰ Thời gian:**\n` +
                `• **Trạng thái ca làm:** ${isWorking ? '🟢 Đang làm việc' : '🚀 Bắt đầu ca mới'}\n` +
                `• **Thời gian làm việc:** ${workTimeMinutes} phút\n` +
                `• **Giới hạn:** 1 lần/ngày (reset 0:00)\n\n` +
                `**📋 Hướng dẫn:**\n` +
                `• Chat bình thường trong server này\n` +
                `• Mỗi tin nhắn được tính và nhận tiền ngay\n` +
                `• Dùng \`,lamviec\` để check tiến độ\n` +
                `• Chat đủ ${job.targetMessages} tin nhắn để hoàn thành\n\n` +
                `💬 **Hãy bắt đầu chat để tích lũy tiến độ!**`)
            .setColor(isWorking ? COLORS.info : COLORS.success)
            .setThumbnail(JOB_IMAGES.nhabao)
            .setFooter({ text: `${isWorking ? 'Ca làm đang diễn ra' : 'Bắt đầu ca làm mới'} | 1 lần/ngày` });
        
        return message.reply({ embeds: [embed] });
    },

    // Xử lý nghề Công An  
    async handlePoliceWork(message, cityUser) {
        const job = JOB_TYPES[cityUser.job];
        const now = new Date();
        const lastWork = cityUser.lastWork ? new Date(cityUser.lastWork) : null;
        const canWork = !lastWork || (now - lastWork) >= job.cooldown;
        
        let cooldownInfo = '';
        if (!canWork) {
            const timeLeft = job.cooldown - (now - lastWork);
            const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
            const hoursLeft = Math.floor(minutesLeft / 60);
            const remainingMinutes = minutesLeft % 60;
            
            const timeString = hoursLeft > 0 ? `${hoursLeft}h ${remainingMinutes}p` : `${remainingMinutes} phút`;
            cooldownInfo = `⏰ **Cooldown:** Còn ${timeString} nữa mới có thể tuần tra tiếp!\n\n`;
        }
        
        // Đếm số record trộm hiện tại (nếu có)
        const activeThefts = global.theftRecords ? global.theftRecords.filter(record => 
            record.guildId === message.guild.id && 
            (Date.now() - record.timestamp) <= 10 * 60 * 1000
        ).length : 0;
        
        const embed = new EmbedBuilder()
            .setTitle('👮‍♂️ NGHỀ CÔNG AN - THỐNG KÊ CHI TIẾT')
            .setDescription(`**📊 Trạng thái công việc:**\n` +
                `• **Nghề nghiệp:** ${job.name}\n` +
                `• **Trạng thái:** ${canWork ? '✅ Sẵn sàng tuần tra' : '⏳ Đang nghỉ'}\n` +
                `• **Trộm đang truy nã:** ${activeThefts} người\n\n` +
                `${cooldownInfo}` +
                `**💰 Thu nhập:**\n` +
                `• **Thưởng cơ bản:** ${job.minIncome}-${job.maxIncome} Rin/ca\n` +
                `• **Thưởng bắt trộm:** ${job.puzzleReward} Rin/lần\n` +
                `• **Điều kiện:** Phải giải đúng câu đố\n\n` +
                `**⚖️ Nhiệm vụ chính:**\n` +
                `• **Theo dõi:** Thông báo trộm cắp trong server\n` +
                `• **Hành động:** Bắt trộm trong vòng ${job.catchWindow / (60 * 1000)} phút\n` +
                `• **Kỹ năng:** Giải đố để bắt thành công\n` +
                `• **Hậu quả:** Giải sai = thất bại, trộm thoát\n\n` +
                `**🎯 Cách thức hoạt động:**\n` +
                `• Bot thông báo khi có người trộm\n` +
                `• Dùng \`,battrom @user\` để bắt trộm\n` +
                `• Giải đúng câu đố trong 30 giây\n` +
                `• Thành công = nhận thưởng + trộm mất tiền\n\n` +
                `**⏰ Thời gian:**\n` +
                `• **Cơ hội bắt:** ${job.catchWindow / (60 * 1000)} phút từ lúc trộm\n` +
                `• **Cooldown tuần tra:** ${this.formatCooldown(job.cooldown)}\n\n` +
                `${canWork ? (activeThefts > 0 ? '🚨 **Có trộm đang hoạt động! Hãy bắt ngay!**' : '👮 **Đang tuần tra, sẵn sàng bắt trộm!**') : '⏰ **Đang nghỉ, chờ cooldown!**'}`)
            .setColor(canWork ? (activeThefts > 0 ? COLORS.error : COLORS.info) : COLORS.warning)
            .setThumbnail(JOB_IMAGES.congan);

        // Footer hiển thị cooldown chính xác
        let footerText = '';
        if (canWork) {
            footerText = activeThefts > 0 ? `${activeThefts} trộm đang truy nã` : 'Đang tuần tra';
        } else {
            const timeLeft = job.cooldown - (now - lastWork);
            const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
            const hoursLeft = Math.floor(minutesLeft / 60);
            const remainingMinutes = minutesLeft % 60;
            
            const timeString = hoursLeft > 0 ? `${hoursLeft}h ${remainingMinutes}p` : `${remainingMinutes} phút`;
            footerText = `Cooldown còn ${timeString}`;
        }
        
        embed.setFooter({ text: `${footerText} | Có thể làm liên tục!` });

        // Chỉ cập nhật lastWork khi có thể làm việc
        if (canWork) {
            await updateCityUser(message.author.id, { lastWork: new Date() });
        }
        
        await message.reply({ embeds: [embed] });
    },

    // Lưu record trộm để công an bắt
    saveTheftRecord(thiefId, victimId, amount, guildId) {
        // Lưu vào memory hoặc database tạm thời
        // Sẽ được xóa sau 10 phút
        const record = {
            thiefId,
            victimId,
            amount,
            guildId, // Thêm guild ID để đảm bảo chỉ hoạt động trong server này
            timestamp: Date.now()
        };
        
        // Giả sử có global object để lưu
        if (!global.theftRecords) global.theftRecords = [];
        global.theftRecords.push(record);
        
        // Tự động xóa sau 10 phút
        setTimeout(() => {
            global.theftRecords = global.theftRecords.filter(r => r.timestamp !== record.timestamp);
        }, 10 * 60 * 1000);
    },

    // Xử lý bắt trộm
    async handleCatchThief(message, policeUser, thiefUser) {
        if (!global.theftRecords) global.theftRecords = [];
        
        const now = Date.now();
        const recentTheft = global.theftRecords.find(record => 
            record.thiefId === thiefUser.id && 
            (now - record.timestamp) <= 10 * 60 * 1000 // 10 phút
        );

        if (!recentTheft) {
            return message.reply('❌ Không có bằng chứng trộm cắp gần đây của người này!');
        }

        // Random câu đố
        const puzzle = POLICE_PUZZLES[Math.floor(Math.random() * POLICE_PUZZLES.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🧩 GIẢI ĐỐ ĐỂ BẮT TRỘM')
            .setDescription(`**Câu hỏi:** ${puzzle.question}\n\n` +
                `Bạn có **30 giây** để trả lời!\n` +
                `Trả lời đúng = bắt thành công\n` +
                `Trả lời sai = trộm thoát`)
            .setColor(COLORS.warning);

        const puzzleMsg = await message.reply({ embeds: [embed] });

        // Đợi câu trả lời
        const filter = (msg) => msg.author.id === message.author.id;
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });
            
            const answer = collected.first().content.toLowerCase().trim();
            
            if (answer === puzzle.answer.toLowerCase()) {
                // Bắt thành công
                const reward = 500;
                await updateUserRin(message.author.id, reward);
                await updateUserRin(thiefUser.id, -recentTheft.amount); // Trộm mất tiền

                const successMsg = JOB_NOTIFICATIONS.police_catch
                    .replace('{police}', message.author.displayName)
                    .replace('{thief}', thiefUser.displayName)
                    .replace('{reward}', reward.toLocaleString());

                await message.channel.send(successMsg);

                // Xóa record
                global.theftRecords = global.theftRecords.filter(r => r.timestamp !== recentTheft.timestamp);

            } else {
                // Bắt thất bại
                const failMsg = JOB_NOTIFICATIONS.police_fail
                    .replace('{police}', message.author.displayName)
                    .replace('{thief}', thiefUser.displayName);

                await message.channel.send(failMsg);
            }

        } catch (error) {
            await message.reply('⏰ Hết thời gian! Trộm đã thoát!');
        }
    },

    // Helper functions
    formatCooldown(milliseconds) {
        const hours = Math.floor(milliseconds / (60 * 60 * 1000));
        const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 0) {
            return `${hours} giờ${minutes > 0 ? ` ${minutes} phút` : ''}`;
        } else {
            return `${minutes} phút`;
        }
    }
};