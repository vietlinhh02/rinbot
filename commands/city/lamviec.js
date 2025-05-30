const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCityUser, updateCityUser, getUserRin, updateUserRin, getUser } = require('../../utils/database');
const { getFarmUser, updateFarmUser } = require('../../utils/database');
const { JOB_TYPES, JOB_IMAGES, POLICE_PUZZLES, JOB_NOTIFICATIONS, COLORS, TREE_VALUES } = require('../../utils/constants');
const Tree = require('../../models/Tree');

module.exports = {
    name: 'lamviec',
    description: 'Làm việc theo nghề nghiệp để kiếm tiền',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);

            if (!cityUser.job) {
                return message.reply('❌ Bạn chưa có nghề nghiệp! Dùng `,dangkynghe` để đăng ký nghề.');
            }

            const job = JOB_TYPES[cityUser.job];
            const now = new Date();
            const lastWork = cityUser.lastWork ? new Date(cityUser.lastWork) : null;

            // Kiểm tra cooldown - riêng cho trộm là 2 phút
            let cooldownTime = job.cooldown;
            if (cityUser.job === 'trom') {
                cooldownTime = 2 * 60 * 1000; // 2 phút
            }

            if (lastWork && (now - lastWork) < cooldownTime) {
                const timeLeft = cooldownTime - (now - lastWork);
                const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
                if (cityUser.job === 'trom') {
                    return message.reply(`⏰ Bạn cần nghỉ thêm **${minutesLeft} phút** nữa mới có thể trộm tiếp!`);
                } else {
                    const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000));
                    return message.reply(`⏰ Bạn cần nghỉ thêm **${hoursLeft} giờ** nữa mới có thể làm việc tiếp!`);
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
            const embed = new EmbedBuilder()
                .setTitle('🥷 NGHỀ TRỘM - HƯỚNG DẪN')
                .setDescription(`**Cách thức hoạt động:**\n` +
                    `• Trộm cây từ farm của người khác\n` +
                    `• Chỉ trộm được cây đã trồng (không phải hạt giống)\n` +
                    `• Có thể bị công an bắt trong 10 phút\n` +
                    `• **Cooldown:** 2 phút giữa các lần trộm\n\n` +
                    `🏠 **TRỘM TIỀN TRONG NHÀ** (19h-21h):\n` +
                    `• Chỉ hoạt động từ 19:00 đến 21:00\n` +
                    `• Mỗi nhà chỉ trộm được 1 lần/ngày\n` +
                    `• Trộm tiền ngẫu nhiên từ 100-500 Rin\n\n` +
                    `**Giờ hiện tại:** ${currentHour}:00 ${currentHour >= 19 && currentHour < 21 ? '✅ (Có thể trộm tiền)' : '❌ (Chỉ trộm cây)'}\n\n` +
                    `**Cách sử dụng:**\n` +
                    `\`,lamviec @user\` - Trộm cây hoặc tiền của user\n` +
                    `\`,lamviec list\` - Xem danh sách có thể trộm\n\n` +
                    `**⚠️ Rủi ro:** Nếu bị bắt sẽ mất tiền phạt!`)
                .setColor(COLORS.warning)
                .setThumbnail(JOB_IMAGES.trom);

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
                `🌱 **Trộm cây:** Luôn có thể (nếu có cây phù hợp)\n` +
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
                if (!tree.maturedAt) return false;
                const matured = new Date(tree.maturedAt);
                const minutesSinceMature = (new Date() - matured) / (1000 * 60);
                if (minutesSinceMature < 80) return false; // Chưa đủ 1h20p
                if (minutesSinceMature > 180) return false; // Đã chết
                return true;
            });

            // Xác định có thể trộm gì
            const canStealTrees = stealableTrees.length > 0;
            const canStealHouseMoney = canStealMoney && hasHouse && !hasStealenMoneyToday;

            if (!canStealTrees && !canStealHouseMoney) {
                let reason = '';
                if (!canStealTrees && !hasHouse) {
                    reason = `${targetUser.displayName} không có cây nào để trộm và không có nhà!`;
                } else if (!canStealTrees && hasHouse) {
                    if (!canStealMoney) {
                        reason = `${targetUser.displayName} không có cây để trộm và không trong giờ trộm tiền (19h-21h)!`;
                    } else if (hasStealenMoneyToday) {
                        reason = `${targetUser.displayName} không có cây để trộm và bạn đã trộm tiền nhà này hôm nay rồi!`;
                    }
                } else if (canStealTrees && hasHouse && hasStealenMoneyToday && !canStealMoney) {
                    reason = `${targetUser.displayName} có cây nhưng không trong giờ trộm tiền và đã trộm tiền nhà này hôm nay!`;
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
                const treeValue = TREE_VALUES[randomTree.type] || 100;
                stolenAmount = Math.floor(treeValue * (0.3 + Math.random() * 0.4)); // 30-70% giá trị
                description = `cây ${randomTree.type} từ farm ${targetUser.displayName}`;

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
        
        if (cityUser.job === 'mc') {
            // Xử lý nghề MC - Voice
            const member = await message.guild.members.fetch(message.author.id);
            
            if (!member.voice.channel) {
                // Nếu không ở voice, hiển thị hướng dẫn và thống kê
                const lastJoin = cityUser.lastVoiceJoin ? new Date(cityUser.lastVoiceJoin) : null;
                const voiceMinutes = lastJoin ? Math.floor((now - lastJoin) / 60000) : 0;
                const dailyProgress = cityUser.dailyVoiceMinutes || 0;
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isNewDay = !cityUser.lastWork || new Date(cityUser.lastWork) < todayStart;
                
                const embed = new EmbedBuilder()
                    .setTitle('🎤 NGHỀ MC - THỐNG KÊ')
                    .setDescription(`**📊 Tiến độ hôm nay:**\n` +
                        `• **Voice đã ngồi:** ${isNewDay ? 0 : dailyProgress} phút\n` +
                        `• **Cần hoàn thành:** ${job.minVoiceMinutes} phút\n` +
                        `• **Còn thiếu:** ${Math.max(0, job.minVoiceMinutes - (isNewDay ? 0 : dailyProgress))} phút\n\n` +
                        `**💰 Thưởng:** ${job.rewardPerDay} Rin khi hoàn thành\n` +
                        `**⏰ Cooldown:** ${this.formatCooldown(job.cooldown)}\n\n` +
                        `**📋 Hướng dẫn:**\n` +
                        `• Vào bất kỳ room voice nào trong server\n` +
                        `• Dùng \`,lamviec\` khi đang ở voice để check tiến độ\n` +
                        `• Ngồi đủ ${job.minVoiceMinutes} phút trong ngày để nhận thưởng\n\n` +
                        `⚠️ **Bạn phải vào voice để tiếp tục!**`)
                    .setColor(COLORS.warning)
                    .setThumbnail(JOB_IMAGES.mc);
                
                return message.reply({ embeds: [embed] });
            }
            
            // Nếu đang ở voice, tính thời gian và cập nhật
            const lastJoin = cityUser.lastVoiceJoin ? new Date(cityUser.lastVoiceJoin) : now;
            const sessionMinutes = Math.floor((now - lastJoin) / 60000);
            const dailyProgress = cityUser.dailyVoiceMinutes || 0;
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isNewDay = !cityUser.lastWork || new Date(cityUser.lastWork) < todayStart;
            
            // Reset nếu là ngày mới
            const currentDaily = isNewDay ? sessionMinutes : dailyProgress + sessionMinutes;
            
            if (currentDaily >= job.minVoiceMinutes) {
                // Hoàn thành công việc
                await updateUserRin(message.author.id, job.rewardPerDay);
                await updateCityUser(message.author.id, { 
                    lastWork: now,
                    lastVoiceJoin: null,
                    dailyVoiceMinutes: 0
                });
                
                const embed = new EmbedBuilder()
                    .setTitle('🎉 MC - HOÀN THÀNH CÔNG VIỆC!')
                    .setDescription(`**✅ Chúc mừng! Bạn đã hoàn thành ca làm MC!**\n\n` +
                        `• **Thời gian voice hôm nay:** ${currentDaily} phút\n` +
                        `• **Yêu cầu:** ${job.minVoiceMinutes} phút\n` +
                        `• **Thưởng nhận được:** ${job.rewardPerDay} Rin\n\n` +
                        `**⏰ Cooldown:** ${this.formatCooldown(job.cooldown)}\n` +
                        `Hãy nghỉ ngơi và quay lại sau!`)
                    .setColor(COLORS.success)
                    .setThumbnail(JOB_IMAGES.mc);
                
                return message.reply({ embeds: [embed] });
            } else {
                // Cập nhật tiến độ
                await updateCityUser(message.author.id, {
                    lastVoiceJoin: lastJoin,
                    dailyVoiceMinutes: currentDaily
                });
                
                const embed = new EmbedBuilder()
                    .setTitle('🎤 MC - TIẾN ĐỘ VOICE')
                    .setDescription(`**📊 Thống kê thời gian voice:**\n\n` +
                        `• **Session hiện tại:** ${sessionMinutes} phút\n` +
                        `• **Tổng hôm nay:** ${currentDaily} phút\n` +
                        `• **Mục tiêu:** ${job.minVoiceMinutes} phút\n` +
                        `• **Còn thiếu:** ${job.minVoiceMinutes - currentDaily} phút\n` +
                        `• **Tiến độ:** ${Math.round((currentDaily / job.minVoiceMinutes) * 100)}%\n\n` +
                        `**💰 Thưởng khi hoàn thành:** ${job.rewardPerDay} Rin\n\n` +
                        `📍 **Bạn đang ở:** ${member.voice.channel.name}\n` +
                        `⏰ **Thời gian bắt đầu:** ${lastJoin.toLocaleTimeString('vi-VN')}\n\n` +
                        `💡 **Tip:** Tiếp tục ngồi voice để tích lũy thời gian!`)
                    .setColor(COLORS.info)
                    .setThumbnail(JOB_IMAGES.mc);
                
                return message.reply({ embeds: [embed] });
            }
            
        } else if (cityUser.job === 'nhabao') {
            // Xử lý nghề Nhà báo - Chat
            const currentProgress = cityUser.workProgress || 0;
            const isWorking = cityUser.workStartTime && !cityUser.lastWork;
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastWorkDate = cityUser.lastWork ? new Date(cityUser.lastWork) : null;
            const isNewDay = !lastWorkDate || lastWorkDate < todayStart;
            
            if (currentProgress >= job.targetMessages && !isNewDay) {
                return message.reply('✅ Bạn đã hoàn thành ca làm Nhà báo hôm nay! Hãy nghỉ và chờ cooldown.');
            }
            
            if (!isWorking) {
                // Bắt đầu ca làm mới
                await updateCityUser(message.author.id, { 
                    workStartTime: now,
                    workProgress: isNewDay ? 0 : currentProgress
                });
            }
            
            const resetProgress = isNewDay ? 0 : currentProgress;
            
            const embed = new EmbedBuilder()
                .setTitle('📰 NGHỀ NHÀ BÁO - THỐNG KÊ')
                .setDescription(`**📊 Tiến độ chat:**\n\n` +
                    `• **Tin nhắn đã chat:** ${resetProgress}/${job.targetMessages}\n` +
                    `• **Còn thiếu:** ${Math.max(0, job.targetMessages - resetProgress)} tin nhắn\n` +
                    `• **Tiến độ:** ${Math.round((resetProgress / job.targetMessages) * 100)}%\n` +
                    `• **Thưởng/tin nhắn:** ${job.rewardPerMessage} Rin\n` +
                    `• **Tổng thưởng:** ${job.targetMessages * job.rewardPerMessage} Rin\n\n` +
                    `**📋 Hướng dẫn:**\n` +
                    `• Chat bình thường trong server này\n` +
                    `• Mỗi tin nhắn được tính và nhận tiền ngay\n` +
                    `• Dùng \`,lamviec\` để check tiến độ\n` +
                    `• Chat đủ ${job.targetMessages} tin nhắn để hoàn thành\n\n` +
                    `**⏰ Cooldown:** ${this.formatCooldown(job.cooldown)}\n\n` +
                    `${isWorking ? '✅ **Ca làm đang diễn ra**' : '🚀 **Bắt đầu ca làm mới**'}\n` +
                    `💬 **Hãy bắt đầu chat để tích lũy tiến độ!**`)
                .setColor(isWorking ? COLORS.info : COLORS.success)
                .setThumbnail(JOB_IMAGES.nhabao);
            
            return message.reply({ embeds: [embed] });
        }
    },

    // Xử lý nghề Công An  
    async handlePoliceWork(message, cityUser) {
        const embed = new EmbedBuilder()
            .setTitle('👮‍♂️ TUẦN TRA CÔNG AN')
            .setDescription(`**Nhiệm vụ của bạn:**\n` +
                `• Theo dõi thông báo trộm cắp\n` +
                `• Bắt trộm trong vòng 10 phút\n` +
                `• Giải đố để bắt thành công\n\n` +
                `**Cách bắt trộm:**\n` +
                `\`,battrom @user\` khi có thông báo trộm\n\n` +
                `**⚠️ Lưu ý:** Giải sai đố = thất bại!`)
            .setColor(COLORS.info)
            .setThumbnail(JOB_IMAGES.congan);

        await updateCityUser(message.author.id, { lastWork: new Date() });
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