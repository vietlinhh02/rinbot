const { EmbedBuilder } = require('discord.js');
const { getCityUser, updateUserRin } = require('../../utils/database');
const { JOB_TYPES, POLICE_PUZZLES, JOB_NOTIFICATIONS, COLORS } = require('../../utils/constants');

module.exports = {
    name: 'battrom',
    description: 'Công an bắt trộm (chỉ dành cho nghề Công An)',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);

            // Kiểm tra nghề nghiệp
            if (cityUser.job !== 'congan') {
                return message.reply('❌ Chỉ có **Công An** mới được sử dụng lệnh này!');
            }

            // Kiểm tra cooldown
            const now = new Date();
            const job = JOB_TYPES.congan;
            const lastWork = cityUser.lastWork ? new Date(cityUser.lastWork) : null;

            if (lastWork && (now - lastWork) < job.cooldown) {
                const timeLeft = job.cooldown - (now - lastWork);
                const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
                return message.reply(`⏰ Bạn cần nghỉ thêm **${minutesLeft} phút** nữa mới có thể bắt trộm tiếp!`);
            }

            // Kiểm tra target
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Hãy tag người bạn muốn bắt: `,battrom @user`');
            }

            if (targetUser.id === message.author.id) {
                return message.reply('❌ Không thể tự bắt chính mình!');
            }

            // Kiểm tra xem có bằng chứng trộm cắp không
            if (!global.theftRecords) global.theftRecords = [];
            
            const recentTheft = global.theftRecords.find(record => 
                record.thiefId === targetUser.id && 
                record.guildId === message.guild.id && // Chỉ tìm trong server hiện tại
                (now.getTime() - record.timestamp) <= 10 * 60 * 1000 // 10 phút
            );

            if (!recentTheft) {
                return message.reply(`❌ Không có bằng chứng trộm cắp gần đây của ${targetUser.displayName}!\n\n*Chỉ có thể bắt trộm trong vòng 10 phút sau khi họ trộm.*`);
            }

            // Bắt đầu quá trình bắt trộm với câu đố
            await this.startCatchProcess(message, cityUser, targetUser, recentTheft);

        } catch (error) {
            console.error('Lỗi battrom:', error);
            await message.reply('❌ Có lỗi xảy ra khi bắt trộm!');
        }
    },

    async startCatchProcess(message, policeUser, thiefUser, theftRecord) {
        // Random câu đố
        const puzzle = POLICE_PUZZLES[Math.floor(Math.random() * POLICE_PUZZLES.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🚨 BẮT TRỘM - GIẢI ĐỐ')
            .setDescription(`**👮‍♂️ Công An:** ${message.author.displayName}\n` +
                `**🥷 Nghi phạm:** ${thiefUser.displayName}\n` +
                `**💰 Số tiền trộm:** ${theftRecord.amount.toLocaleString()} Rin\n\n` +
                `**🧩 Câu đố:**\n` +
                `\`${puzzle.question}\`\n\n` +
                `**⏰ Thời gian:** 30 giây để trả lời\n` +
                `**✅ Trả lời đúng:** Bắt thành công + 500 Rin\n` +
                `**❌ Trả lời sai:** Trộm thoát + không có thưởng`)
            .setColor(COLORS.warning)
            .setFooter({ text: 'Hãy suy nghĩ kỹ trước khi trả lời!' })
            .setTimestamp();

        const puzzleMsg = await message.reply({ embeds: [embed] });

        // Đợi câu trả lời với filter cải thiện
        const filter = (msg) => {
            return msg.author.id === message.author.id && 
                   msg.channel.id === message.channel.id &&
                   !msg.author.bot;
        };
        
        try {
            console.log(`[BẮT TRỘM] Bắt đầu đợi câu trả lời từ ${message.author.displayName}...`);
            
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000,
                errors: ['time']
            });
            
            console.log(`[BẮT TRỘM] Nhận được câu trả lời từ ${message.author.displayName}`);
            
            const answer = collected.first().content.toLowerCase().trim();
            const correctAnswer = puzzle.answer.toLowerCase().trim();
            
            console.log(`[BẮT TRỘM] Câu trả lời: "${answer}" | Đáp án: "${correctAnswer}"`);
            
            if (answer === correctAnswer) {
                // Bắt thành công
                await this.handleSuccessfulCatch(message, policeUser, thiefUser, theftRecord);
            } else {
                // Bắt thất bại
                await this.handleFailedCatch(message, policeUser, thiefUser, correctAnswer);
            }

        } catch (error) {
            console.log(`[BẮT TRỘM] Error caught:`, error.message);
            
            // Kiểm tra nếu thực sự là timeout
            if (error.message && error.message.includes('time')) {
                console.log(`[BẮT TRỘM] Timeout - hết thời gian 30 giây`);
                await this.handleTimeout(message, policeUser, thiefUser);
            } else {
                console.error(`[BẮT TRỘM] Lỗi không xác định:`, error);
                await message.reply('❌ Có lỗi xảy ra trong quá trình bắt trộm!');
            }
        }
    },

    async handleSuccessfulCatch(message, policeUser, thiefUser, theftRecord) {
        const reward = 500;
        const fine = theftRecord.amount;

        try {
            // Thưởng cho công an
            await updateUserRin(message.author.id, reward);
            
            // Phạt trộm (trừ tiền đã trộm + phạt thêm)
            await updateUserRin(thiefUser.id, -(fine + 100));
            
            // Cập nhật cooldown cho công an
            await require('../../utils/database').updateCityUser(message.author.id, { 
                lastWork: new Date() 
            });

            // Xóa record trộm cắp
            if (global.theftRecords) {
                global.theftRecords = global.theftRecords.filter(r => r.timestamp !== theftRecord.timestamp);
            }

            const successEmbed = new EmbedBuilder()
                .setTitle('🎉 BẮT TRỘM THÀNH CÔNG!')
                .setDescription(`**👮‍♂️ Công An ${message.author.displayName} đã bắt thành công tên trộm ${thiefUser.displayName}!**\n\n` +
                    `**💰 Phần thưởng cho Công An:**\n` +
                    `• Thưởng bắt trộm: +${reward.toLocaleString()} Rin\n\n` +
                    `**💸 Hình phạt cho Trộm:**\n` +
                    `• Trả lại tiền trộm: -${fine.toLocaleString()} Rin\n` +
                    `• Phạt thêm: -100 Rin\n` +
                    `• Tổng mất: -${(fine + 100).toLocaleString()} Rin\n\n` +
                    `**⚖️ Công lý đã được thực thi!**`)
                .setColor(COLORS.success)
                .setFooter({ text: 'Tội phạm không có chỗ trốn!' })
                .setTimestamp();

            await message.channel.send({ embeds: [successEmbed] });

            // Thông báo riêng cho trộm
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🚨 BẠN ĐÃ BỊ BẮT!')
                    .setDescription(`Bạn đã bị Công An ${message.author.displayName} bắt vì tội trộm cắp!\n\n` +
                        `**💸 Hình phạt:**\n` +
                        `• Trả lại tiền trộm: ${fine.toLocaleString()} Rin\n` +
                        `• Phạt thêm: 100 Rin\n` +
                        `• Tổng mất: ${(fine + 100).toLocaleString()} Rin\n\n` +
                        `**💡 Lời khuyên:** Hãy làm việc chính đáng!`)
                    .setColor(COLORS.error);

                await thiefUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log('Không thể gửi DM cho trộm:', dmError.message);
            }

        } catch (error) {
            console.error('Lỗi xử lý bắt trộm thành công:', error);
            await message.reply('❌ Có lỗi xảy ra khi xử lý kết quả bắt trộm!');
        }
    },

    async handleFailedCatch(message, policeUser, thiefUser, correctAnswer) {
        try {
            // Cập nhật cooldown cho công an
            await require('../../utils/database').updateCityUser(message.author.id, { 
                lastWork: new Date() 
            });

            const failEmbed = new EmbedBuilder()
                .setTitle('❌ BẮT TRỘM THẤT BẠI!')
                .setDescription(`**Công An ${message.author.displayName} đã trả lời sai câu đố!**\n\n` +
                    `**🧩 Đáp án đúng:** \`${correctAnswer}\`\n\n` +
                    `**🏃‍♂️ ${thiefUser.displayName} đã thoát thân thành công!**\n\n` +
                    `**💡 Lời khuyên:** Hãy học hỏi thêm để bắt trộm hiệu quả hơn!`)
                .setColor(COLORS.error)
                .setFooter({ text: 'Lần sau hãy cẩn thận hơn!' })
                .setTimestamp();

            await message.channel.send({ embeds: [failEmbed] });

            // Thông báo cho trộm
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎉 BẠN ĐÃ THOÁT THÂN!')
                    .setDescription(`Công An ${message.author.displayName} đã cố bắt bạn nhưng trả lời sai câu đố!\n\n` +
                        `**🏃‍♂️ Bạn đã thoát thân thành công!**\n` +
                        `**💰 Giữ được tiền trộm**\n\n` +
                        `**⚠️ Cảnh báo:** Lần sau có thể không may mắn như vậy!`)
                    .setColor(COLORS.warning);

                await thiefUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log('Không thể gửi DM cho trộm:', dmError.message);
            }

        } catch (error) {
            console.error('Lỗi xử lý bắt trộm thất bại:', error);
            await message.reply('❌ Có lỗi xảy ra khi xử lý kết quả!');
        }
    },

    async handleTimeout(message, policeUser, thiefUser) {
        try {
            // Cập nhật cooldown cho công an
            await require('../../utils/database').updateCityUser(message.author.id, { 
                lastWork: new Date() 
            });

            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ HẾT THỜI GIAN!')
                .setDescription(`**Công An ${message.author.displayName} đã hết thời gian trả lời!**\n\n` +
                    `**🏃‍♂️ ${thiefUser.displayName} đã thoát thân do công an chậm chạp!**\n\n` +
                    `**💡 Lời khuyên:** Hãy nhanh tay hơn lần sau!`)
                .setColor(COLORS.warning)
                .setFooter({ text: 'Thời gian rất quan trọng trong việc bắt trộm!' });

            await message.channel.send({ embeds: [timeoutEmbed] });

        } catch (error) {
            console.error('Lỗi xử lý timeout:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 