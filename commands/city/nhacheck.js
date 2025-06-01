const { EmbedBuilder } = require('discord.js');
const { getCityUser } = require('../../utils/database');
const FastUtils = require('../../utils/fastUtils');
const { JOB_TYPES, HOUSE_IMAGES, COLORS } = require('../../utils/constants');

module.exports = {
    name: 'nhacheck',
    description: 'Kiểm tra thông tin nhà và trạng thái',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);
            const userRin = await FastUtils.getFastUserRin(userId);

            if (!cityUser.home) {
                return message.reply('❌ Bạn chưa thuê nhà! Hãy dùng lệnh `,thuenha` để thuê nhà.');
            }

            const now = new Date();
            
            // Thông tin nhà cơ bản
            const houseInfo = this.getHouseInfo(cityUser.home);
            
            // Tính ngày sửa chữa cuối
            const lastRepair = cityUser.lastRepair ? new Date(cityUser.lastRepair) : new Date(cityUser.createdAt);
            const daysSinceRepair = Math.floor((now - lastRepair) / (1000 * 60 * 60 * 24));
            const daysUntilRepair = Math.max(0, 5 - daysSinceRepair);
            
            // Trạng thái nhà
            let houseStatus = '';
            if (daysUntilRepair === 0) {
                houseStatus = '🚨 **CẦN SỬA NGAY!** Nhà có thể bị thu hồi!';
            } else if (daysUntilRepair <= 1) {
                houseStatus = `⚠️ **Cần sửa trong ${daysUntilRepair} ngày!**`;
            } else {
                houseStatus = `✅ **Nhà tốt** (${daysUntilRepair} ngày nữa cần sửa)`;
            }

            // Thông tin nghề nghiệp
            let jobInfo = '';
            if (cityUser.job) {
                const job = JOB_TYPES[cityUser.job];
                const lastWork = cityUser.lastWork ? new Date(cityUser.lastWork) : null;
                const canWork = !lastWork || (now - lastWork) >= job.cooldown;
                
                jobInfo = `**💼 Nghề nghiệp:** ${job.name}\n` +
                         `**📝 Mô tả:** ${job.description}\n` +
                         `**⏰ Trạng thái:** ${canWork ? '✅ Có thể làm việc' : '⏳ Đang nghỉ'}\n` +
                         `**🔄 Cooldown:** ${this.formatCooldown(job.cooldown)}\n`;
                
                // Thông tin tiến độ chi tiết cho từng nghề
                if (cityUser.job === 'nhabao') {
                    const progress = cityUser.workProgress || 0;
                    const target = job.targetMessages;
                    const percentage = Math.round((progress / target) * 100);
                    const isWorking = cityUser.workStartTime && !cityUser.lastWork;
                    
                    jobInfo += `**📊 Tiến độ chat:** ${progress}/${target} tin nhắn (${percentage}%)\n`;
                    jobInfo += `**💰 Thưởng/tin nhắn:** ${job.rewardPerMessage} Rin\n`;
                    jobInfo += `**🎯 Trạng thái ca làm:** ${isWorking ? '🟢 Đang làm việc' : '🔴 Chưa bắt đầu'}\n`;
                    
                    if (isWorking) {
                        const workStart = new Date(cityUser.workStartTime);
                        const workTime = Math.floor((now - workStart) / 60000);
                        jobInfo += `**⏱️ Thời gian làm:** ${workTime} phút\n`;
                    }
                } else if (cityUser.job === 'mc') {
                    const dailyProgress = cityUser.dailyVoiceMinutes || 0;
                    const target = job.minVoiceMinutes;
                    const percentage = Math.round((dailyProgress / target) * 100);
                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isNewDay = !lastWork || lastWork < todayStart;
                    const actualProgress = isNewDay ? 0 : dailyProgress;
                    
                    jobInfo += `**🎤 Tiến độ voice:** ${actualProgress}/${target} phút (${Math.round((actualProgress / target) * 100)}%)\n`;
                    jobInfo += `**💰 Thưởng/ngày:** ${job.rewardPerDay} Rin\n`;
                    
                    if (cityUser.lastVoiceJoin) {
                        const sessionTime = Math.floor((now - new Date(cityUser.lastVoiceJoin)) / 60000);
                        jobInfo += `**📍 Voice hiện tại:** ${sessionTime} phút\n`;
                    } else {
                        jobInfo += `**📍 Voice hiện tại:** Không ở voice\n`;
                    }
                } else if (cityUser.job === 'trom') {
                    jobInfo += `**⚠️ Rủi ro bị bắt:** ${Math.round(job.riskChance * 100)}%\n`;
                    jobInfo += `**⏰ Cooldown đặc biệt:** 2 phút/lần trộm\n`;
                    jobInfo += `**🕐 Giờ trộm tiền:** 19:00 - 21:00\n`;
                } else if (cityUser.job === 'congan') {
                    jobInfo += `**🎯 Nhiệm vụ:** Bắt trộm và giải đố\n`;
                    jobInfo += `**⚡ Thời gian bắt:** 10 phút/trộm\n`;
                    jobInfo += `**🧩 Yêu cầu:** Giải đúng câu đố\n`;
                }
            } else {
                jobInfo = '**💼 Nghề nghiệp:** Chưa có\n**💡 Tip:** Dùng `,dangkynghe` để đăng ký nghề!\n';
            }

            // Lợi ích của nhà
            const benefits = this.getHouseBenefits(cityUser.home);

            const embed = new EmbedBuilder()
                .setTitle('🏠 THÔNG TIN NHÀ')
                .setDescription(`**📋 Thông tin chi tiết về nhà**\n\n` +
                    `**🏠 Thông tin cơ bản:**\n` +
                    `• Loại nhà: ${houseInfo.name}\n` +
                    `• Giá thuê: ${houseInfo.price.toLocaleString()} Rin\n` +
                    `• Sửa chữa: ${houseInfo.dailyRepair > 0 ? houseInfo.dailyRepair.toLocaleString() + ' Rin/ngày' : 'Miễn phí'}\n\n` +
                    `**🔧 Tình trạng nhà:**\n` +
                    `• ${houseStatus}\n` +
                    `• Sửa chữa cuối: ${lastRepair.toLocaleDateString('vi-VN')}\n` +
                    `• Đã ở: ${daysSinceRepair} ngày\n\n` +
                    jobInfo + '\n' +
                    `**🎯 Lợi ích nhà:**\n${benefits}\n\n` +
                    `**💰 Số dư hiện tại:** ${userRin.toLocaleString()} Rin`)
                .addFields(
                    { 
                        name: '🎮 Hoạt động có thể làm', 
                        value: this.getAvailableActions(cityUser), 
                        inline: false 
                    }
                )
                .setImage(HOUSE_IMAGES[cityUser.home] || null)
                .setColor(daysUntilRepair === 0 ? COLORS.error : daysUntilRepair <= 1 ? COLORS.warning : COLORS.success)
                .setFooter({ 
                    text: daysUntilRepair === 0 ? 
                        '⚠️ Hãy sửa nhà ngay để tránh bị thu hồi!' : 
                        'Hãy chăm sóc nhà cửa thường xuyên!'
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi nhacheck:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra thông tin nhà!');
        }
    },

    // Helper functions
    getHouseInfo(houseType) {
        const houseData = {
            'nhatro': {
                name: 'Nhà Trọ',
                price: 500,
                dailyRepair: 0,
                emoji: '🏠'
            },
            'nhatuong': {
                name: 'Nhà Thường',
                price: 2000,
                dailyRepair: 300,
                emoji: '🏘️'
            },
            'bietlau': {
                name: 'Biệt Lầu',
                price: 5000,
                dailyRepair: 1000,
                emoji: '🏛️'
            },
            'bietthu': {
                name: 'Biệt Thự',
                price: 10000,
                dailyRepair: 1500,
                emoji: '🏰'
            }
        };
        return houseData[houseType] || { name: 'Không rõ', price: 0, dailyRepair: 0, emoji: '❓' };
    },

    getHouseBenefits(houseType) {
        const benefits = {
            'nhatro': '• Cho phép nghề Trộm\n• Sửa chữa miễn phí\n• Không bị phạt',
            'nhatuong': '• Cho phép nghề Nhà Báo, MC\n• Bonus EXP +10%\n• Sửa chữa 300 Rin/ngày',
            'bietlau': '• Cho phép nghề Nhà Báo, MC\n• Bonus EXP +25%\n• Bonus Rin +20%\n• Sửa chữa 1000 Rin/ngày',
            'bietthu': '• Cho phép nghề Công An\n• Bonus EXP +50%\n• Bonus Rin +40%\n• Ưu tiên trong mọi tính năng\n• Sửa chữa 1500 Rin/ngày'
        };
        return benefits[houseType] || '• Không có lợi ích đặc biệt';
    },

    getAvailableActions(cityUser) {
        let actions = [];
        
        // Actions cơ bản
        actions.push('• `,dangkynghe` - Đăng ký/xem nghề nghiệp');
        actions.push('• `,lamviec` - Làm việc kiếm tiền');
        actions.push('• `,nhiemvu` - Nhận nhiệm vụ');
        
        // Actions theo nghề
        if (cityUser.job) {
            const job = JOB_TYPES[cityUser.job];
            if (job.workType === 'steal_trees') {
                actions.push('• `,tromcay @user` - Trộm cây của người khác');
            } else if (job.workType === 'catch_thieves') {
                actions.push('• `,battrom @user` - Bắt trộm (khi có thông báo)');
            }
        }
        
        // Sửa nhà
        const now = new Date();
        const lastRepair = cityUser.lastRepair ? new Date(cityUser.lastRepair) : new Date(cityUser.createdAt);
        const daysSinceRepair = Math.floor((now - lastRepair) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRepair >= 5) {
            actions.push('• `,suanha` - **SỬA NHÀ NGAY!** (Bắt buộc)');
        } else {
            actions.push('• `,suanha` - Sửa nhà (tùy chọn)');
        }
        
        return actions.join('\n');
    },

    formatCooldown(ms) {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        return `${hours} giờ`;
    }
}; 