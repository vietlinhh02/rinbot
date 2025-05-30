const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCityUser, updateCityUser, getUserRin, updateUserRin } = require('../../utils/database');
const { JOB_TYPES, JOB_IMAGES, COLORS } = require('../../utils/constants');

module.exports = {
    name: 'dangkynghe',
    description: 'Đăng ký nghề nghiệp để làm việc kiếm tiền',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);

            if (!cityUser.home) {
                return message.reply('❌ Bạn cần thuê nhà trước khi đăng ký nghề nghiệp! Dùng `,thuenha` để thuê nhà.');
            }

            // Nếu không có tham số, hiển thị danh sách nghề
            if (args.length === 0) {
                return await this.showJobList(message, cityUser);
            }

            // Lệnh nghỉ việc phải đặt trước kiểm tra jobType
            if (args[0] && args[0].toLowerCase() === 'nghiviec') {
                if (!cityUser.job) {
                    return message.reply('❌ Bạn chưa có nghề để nghỉ!');
                }
                await updateUserRin(userId, 50);
                await updateCityUser(userId, { job: null, workProgress: 0, lastWork: null, workStartTime: null });
                return message.reply('✅ Bạn đã nghỉ việc thành công và nhận 50 Rin trợ cấp. Hãy chọn nghề mới nếu muốn!');
            }

            const jobType = args[0].toLowerCase();
            const jobInfo = JOB_TYPES[jobType];

            if (!jobInfo) {
                return message.reply('❌ Nghề nghiệp không hợp lệ! Sử dụng: `trom`, `nhabao`, `mc`, hoặc `congan`');
            }

            // Kiểm tra yêu cầu nhà
            if (!jobInfo.requiredHouse.includes(cityUser.home)) {
                const requiredHouses = jobInfo.requiredHouse.map(house => {
                    const houseNames = {
                        'nhatro': 'Nhà Trọ',
                        'nhatuong': 'Nhà Thường', 
                        'bietlau': 'Biệt Lầu',
                        'bietthu': 'Biệt Thự'
                    };
                    return houseNames[house];
                }).join(', ');
                
                return message.reply(`❌ Nghề **${jobInfo.name}** yêu cầu: ${requiredHouses}\nBạn hiện đang ở: ${this.getHouseName(cityUser.home)}`);
            }

            // Kiểm tra nếu đã có nghề
            if (cityUser.job) {
                if (cityUser.job === jobType) {
                    return message.reply(`💼 Bạn đã làm nghề **${jobInfo.name}** rồi!`);
                } else {
                    return message.reply(`❌ Bạn đã có nghề **${JOB_TYPES[cityUser.job].name}**! Hãy nghỉ việc trước khi đăng ký nghề mới.`);
                }
            }

            // Xác nhận đăng ký nghề
            const embed = new EmbedBuilder()
                .setTitle(`💼 ĐĂNG KÝ NGHỀ ${jobInfo.name.toUpperCase()}`)
                .setDescription(`**Xác nhận đăng ký nghề ${jobInfo.name}?**\n\n` +
                    `**📝 Mô tả:** ${jobInfo.description}\n\n` +
                    `**⚠️ Lưu ý đặc biệt:**\n${this.getJobSpecialInfo(jobType)}\n\n` +
                    `**⏰ Cooldown:** ${this.formatCooldown(jobInfo.cooldown)}`)
                .setThumbnail(JOB_IMAGES[jobType] || null)
                .setColor(COLORS.city)
                .setFooter({ text: 'Quyết định trong 30 giây!' })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`job_apply_confirm_${jobType}_${userId}`)
                .setLabel(`💼 Đăng ký ${jobInfo.name}`)
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`job_apply_cancel_${userId}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Lỗi dangkynghe:', error);
            await message.reply('❌ Có lỗi xảy ra khi đăng ký nghề nghiệp!');
        }
    },

    // Hiển thị danh sách nghề nghiệp
    async showJobList(message, cityUser) {
        const userRin = await getUserRin(message.author.id);
        
        let jobList = '';
        Object.entries(JOB_TYPES).forEach(([type, info]) => {
            const canApply = info.requiredHouse.includes(cityUser.home) ? '✅' : '❌';
            const current = cityUser.job === type ? ' ⭐ **ĐANG LÀM**' : '';
            jobList += `💼 **${info.name}** ${canApply}${current}\n`;
            jobList += `└ ${info.description}\n`;
            jobList += `└ Yêu cầu: ${this.formatRequiredHouses(info.requiredHouse)}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('💼 DANH SÁCH NGHỀ NGHIỆP')
            .setDescription(`**👤 Người xin việc:** ${message.author.displayName}\n` +
                `**🏠 Nhà hiện tại:** ${this.getHouseName(cityUser.home)}\n` +
                `**💼 Nghề hiện tại:** ${cityUser.job ? JOB_TYPES[cityUser.job].name : 'Chưa có'}\n\n` +
                jobList +
                `**💡 Cách sử dụng:**\n` +
                `• \",dangkynghe trom\" - Đăng ký nghề Trộm\n` +
                `• \",dangkynghe nhabao\" - Đăng ký nghề Nhà Báo\n` +
                `• \",dangkynghe mc\" - Đăng ký nghề MC\n` +
                `• \",dangkynghe congan\" - Đăng ký nghề Công An\n\n` +
                `⚠️ **Lưu ý:** Mỗi nghề có cách làm việc khác nhau!`)
            .setColor(COLORS.city)
            .setFooter({ text: 'Chọn nghề phù hợp với nhà của bạn!' });
        if (cityUser.job && JOB_IMAGES[cityUser.job]) {
            embed.setThumbnail(JOB_IMAGES[cityUser.job]);
        }

        await message.reply({ embeds: [embed] });
    },

    // Helper functions
    getHouseName(houseType) {
        const houseNames = {
            'nhatro': 'Nhà Trọ',
            'nhatuong': 'Nhà Thường',
            'nhalau': 'Nhà Lầu', 
            'bietthu': 'Biệt Thự'
        };
        return houseNames[houseType] || 'Không rõ';
    },

    formatRequiredHouses(houses) {
        return houses.map(house => this.getHouseName(house)).join(', ');
    },

    formatCooldown(ms) {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        return `${hours} giờ`;
    },

    getJobSpecialInfo(jobType) {
        const specialInfo = {
            'trom': '• Chỉ trộm được cây của người khác đã trồng\n• Có thể bị công an bắt trong 10 phút\n• Rủi ro cao nhưng lợi nhuận lớn',
            'nhabao': '• Cần chat 50 tin nhắn trong server để hoàn thành\n• Mỗi tin nhắn được 5 Rin\n• Công việc an toàn, thu nhập ổn định',
            'mc': '• Cần ngồi room voice đủ 15 phút/ngày để nhận thưởng\n• Thu nhập 120 Rin/ngày, không cần chat',
            'congan': '• Nhận thông báo khi có trộm hoạt động\n• Có 10 phút để bắt trộm\n• Phải giải đố mới bắt được, sai = thất bại'
        };
        return specialInfo[jobType] || '';
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('job_apply_')) return;

        const parts = interaction.customId.split('_');
        const result = parts[2]; // confirm hoặc cancel
        const userId = parts[parts.length - 1];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ người đăng ký mới có thể thực hiện!', ephemeral: true });
        }

        if (result === 'confirm') {
            const jobType = parts[3];
            const jobInfo = JOB_TYPES[jobType];

            try {
                const cityUser = await getCityUser(userId);

                if (cityUser.job) {
                    return interaction.reply({ content: '❌ Bạn đã có nghề rồi!', ephemeral: true });
                }

                if (!jobInfo.requiredHouse.includes(cityUser.home)) {
                    return interaction.reply({ content: '❌ Nhà của bạn không đủ điều kiện cho nghề này!', ephemeral: true });
                }

                // Cập nhật nghề nghiệp
                await updateCityUser(userId, {
                    job: jobType,
                    workProgress: 0, // Reset progress
                    lastWork: null
                });

                const embed = new EmbedBuilder()
                    .setTitle('🎉 ĐĂNG KÝ NGHỀ THÀNH CÔNG!')
                    .setDescription(`**Nghề nghiệp:** ${jobInfo.name} 💼\n\n` +
                        `**📝 Mô tả:** ${jobInfo.description}\n\n` +
                        `**🎯 Bước tiếp theo:**\n${this.getNextSteps(jobType)}\n\n` +
                        `**⏰ Cooldown:** ${this.formatCooldown(jobInfo.cooldown)}\n\n` +
                        `**Chúc mừng bạn có việc làm mới! 🎊**`)
                    .setThumbnail(JOB_IMAGES[jobType] || null)
                    .setColor(COLORS.success)
                    .setFooter({ text: 'Hãy làm việc chăm chỉ để kiếm nhiều Rin!' })
                    .setTimestamp();

                // Update message để xóa buttons
                await interaction.update({ embeds: [embed], components: [] });

            } catch (error) {
                console.error('Lỗi xác nhận đăng ký nghề:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi đăng ký nghề!', ephemeral: true });
            }

        } else {
            // Hủy bỏ
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY ĐĂNG KÝ NGHỀ')
                .setDescription('Bạn đã quyết định không đăng ký nghề. Hãy cân nhắc và quay lại sau!')
                .setColor('#6C757D');

            // Update message để xóa buttons
            await interaction.update({ embeds: [embed], components: [] });
        }
    },

    getNextSteps(jobType) {
        const nextSteps = {
            'trom': '• Dùng `,lamviec` để tìm và trộm cây\n• Cẩn thận với công an!',
            'nhabao': '• Dùng `,lamviec` để bắt đầu ca làm\n• Chat 50 tin nhắn để hoàn thành',
            'mc': '• Dùng `,lamviec` để bắt đầu ca làm\n• Vào room voice và ngồi đủ 15 phút để nhận thưởng', 
            'congan': '• Luôn sẵn sàng bắt trộm khi có thông báo\n• Dùng `,lamviec` để tuần tra'
        };
        return nextSteps[jobType] || '';
    }
}; 