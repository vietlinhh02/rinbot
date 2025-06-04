const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCityUser, updateCityUser } = require('../../utils/database');
const FastUtils = require('../../utils/fastUtils');

// Simple lock mechanism để tránh race condition
const userLocks = new Set();

// Auto-cleanup locks sau 30 giây để tránh stuck
const lockCleanup = () => {
    if (userLocks.size > 0) {
        console.log(`🧹 [THUENHA] Cleaning up ${userLocks.size} stuck locks:`, Array.from(userLocks));
        userLocks.clear();
    }
};

// Cleanup mỗi 30 giây
setInterval(lockCleanup, 30000);

// Thông tin các loại nhà
const HOUSE_TYPES = {
    'nhatro': {
        name: 'Nhà Trọ',
        price: 500,
        description: 'Rẻ nhất, phù hợp người mới',
        benefits: ['Cho phép nghề Trộm', 'Sửa chữa miễn phí', 'Không bị phạt'],
        dailyRepair: 0,
        emoji: '🏠'
    },
    'nhatuong': {
        name: 'Nhà Thường',
        price: 2000,
        description: 'Cân bằng giữa giá và lợi ích',
        benefits: ['Cho phép mọi nghề (trừ Trộm, Công An)', 'Bonus EXP +10%', 'Sửa chữa 300 Rin/ngày'],
        dailyRepair: 300,
        emoji: '🏘️'
    },
    'nhalau': {
        name: 'Nhà Lầu',
        price: 5000,
        description: 'Sang trọng cho người giàu',
        benefits: ['Cho phép mọi nghề (trừ Trộm, Công An)', 'Bonus EXP +25%', 'Bonus Rin +20%', 'Sửa chữa 1000 Rin/ngày'],
        dailyRepair: 1000,
        emoji: '🏛️'
    },
    'bietthu': {
        name: 'Biệt Thự',
        price: 8000,
        description: 'Đỉnh cao xa hoa',
        benefits: ['Cho phép nghề Công An', 'Bonus EXP +50%', 'Bonus Rin +40%', 'Ưu tiên trong mọi tính năng', 'Sửa chữa 1500 Rin/ngày'],
        dailyRepair: 1500,
        emoji: '🏰'
    }
};

module.exports = {
    name: 'thuenha',
    description: 'Thuê nhà để mở khóa nghề nghiệp và nhận lợi ích',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);

            // Nếu không có tham số, hiển thị danh sách nhà
            if (args.length === 0) {
                return await this.showHouseList(message, cityUser);
            }

            const houseType = args[0].toLowerCase();
            const houseInfo = HOUSE_TYPES[houseType];

            if (!houseInfo) {
                return message.reply('❌ Loại nhà không hợp lệ! Sử dụng: `nhatro`, `nhatuong`, `nhalau`, hoặc `bietthu`');
            }

            // Kiểm tra nếu đã có nhà
            console.log(`🏠 DEBUG: User ${userId} cố gắng thuê ${houseType}, hiện tại có nhà: ${cityUser.home}`);
            
            if (cityUser.home) {
                if (cityUser.home === houseType) {
                    return message.reply(`🏠 Bạn đã thuê ${houseInfo.name} rồi!`);
                } else {
                    return message.reply(`❌ Bạn đã thuê ${HOUSE_TYPES[cityUser.home].name}! Hãy hủy nhà cũ trước khi thuê nhà mới.`);
                }
            }

            // Kiểm tra số Rin
            if (!(await FastUtils.canAfford(userId, houseInfo.price))) {
                return message.reply(`❌ Cần **${houseInfo.price} Rin** để thuê ${houseInfo.name}!`);
            }

            // Xác nhận thuê nhà
            const embed = new EmbedBuilder()
                .setTitle(`${houseInfo.emoji} THUÊ ${houseInfo.name.toUpperCase()}`)
                .setDescription(`**Xác nhận thuê ${houseInfo.name}?**\n\n` +
                    `**💰 Chi phí:** ${houseInfo.price} Rin\n` +
                    `**📝 Mô tả:** ${houseInfo.description}\n\n` +
                    `**🎯 Lợi ích:**\n` +
                    houseInfo.benefits.map(benefit => `• ${benefit}`).join('\n') + '\n\n' +
                    `**🔧 Chi phí sửa chữa:** ${houseInfo.dailyRepair > 0 ? houseInfo.dailyRepair + ' Rin/ngày' : 'Miễn phí'}\n\n` +
                    `⚠️ **Lưu ý:** Phải sửa chữa mỗi 5 ngày hoặc nhà sẽ bị thu hồi!`)
                .setColor('#0099FF')
                .setFooter({ text: 'Quyết định trong 30 giây!' })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`rent_house_confirm_${houseType}_${userId}`)
                .setLabel(`${houseInfo.emoji} Thuê với ${houseInfo.price} Rin`)
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`rent_house_cancel_${userId}`)
                .setLabel('❌ Hủy bỏ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Lỗi thuenha:', error);
            await message.reply('❌ Có lỗi xảy ra khi thuê nhà!');
        }
    },

    // Hiển thị danh sách nhà
    async showHouseList(message, cityUser) {
        const userRin = await FastUtils.getFastUserRin(message.author.id);
        
        let houseList = '';
        Object.entries(HOUSE_TYPES).forEach(([type, info]) => {
            const affordable = userRin >= info.price ? '✅' : '❌';
            const current = cityUser.home === type ? ' ⭐ **ĐANG THUÊ**' : '';
            
            houseList += `${info.emoji} **${info.name}** - ${info.price} Rin ${affordable}${current}\n`;
            houseList += `└ ${info.description}\n`;
            houseList += `└ Sửa chữa: ${info.dailyRepair > 0 ? info.dailyRepair + ' Rin/ngày' : 'Miễn phí'}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('🏘️ DANH SÁCH NHÀ CÓ THỂ THUÊ')
            .setDescription(`**👤 Người thuê:** ${message.author.displayName}\n` +
                `**💰 Số Rin hiện tại:** ${userRin} Rin\n` +
                `**🏠 Nhà hiện tại:** ${cityUser.home ? HOUSE_TYPES[cityUser.home].name : 'Chưa có'}\n\n` +
                houseList +
                `**💡 Cách sử dụng:**\n` +
                `• \`,thuenha nhatro\` - Thuê nhà trọ\n` +
                `• \`,thuenha nhatuong\` - Thuê nhà thường\n` +
                `• \`,thuenha nhalau\` - Thuê nhà lầu\n` +
                `• \`,thuenha bietthu\` - Thuê biệt thự\n\n` +
                `⚠️ **Lưu ý:** Chỉ có thể thuê 1 nhà cùng lúc!`)
            .setColor('#00CC99')
            .setFooter({ text: 'Chọn loại nhà phù hợp với thu nhập của bạn!' });

        await message.reply({ embeds: [embed] });
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('rent_house_')) return;

        const parts = interaction.customId.split('_');
        const result = parts[2]; // confirm hoặc cancel
        const userId = parts[parts.length - 1];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ người thuê mới có thể thực hiện!', ephemeral: true });
        }

        if (result === 'confirm') {
            const houseType = parts[3];
            const houseInfo = HOUSE_TYPES[houseType];

            // Kiểm tra lock để tránh double-processing
            if (userLocks.has(userId)) {
                console.log(`🔒 User ${userId} đang bị lock, bỏ qua request thuê nhà`);
                return interaction.reply({ content: '❌ Đang xử lý, vui lòng đợi!', ephemeral: true });
            }
            
            userLocks.add(userId);
            console.log(`🔒 Lock user ${userId} bắt đầu xử lý thuê nhà`);

            try {
                const cityUser = await getCityUser(userId);

                console.log(`🏠 DEBUG: User ${userId} xác nhận thuê ${houseType}, hiện tại có nhà: ${cityUser.home}`);

                if (cityUser.home) {
                    return interaction.reply({ content: '❌ Bạn đã có nhà rồi!', ephemeral: true });
                }

                if (!(await FastUtils.canAfford(userId, houseInfo.price))) {
                    return interaction.reply({ content: `❌ Không đủ ${houseInfo.price} Rin!`, ephemeral: true });
                }

                // Trừ tiền và cập nhật nhà
                await FastUtils.updateFastUserRin(userId, -houseInfo.price);
                await updateCityUser(userId, {
                    home: houseType,
                    lastRepair: new Date()
                });

                const embed = new EmbedBuilder()
                    .setTitle('🎉 THUÊ NHÀ THÀNH CÔNG!')
                    .setDescription(`**${houseInfo.name}** đã được thuê thành công! ${houseInfo.emoji}\n\n` +
                        `**💵 Chi phí:** ${houseInfo.price} Rin\n` +
                        `**🎯 Lợi ích đã mở khóa:**\n` +
                        houseInfo.benefits.map(benefit => `• ${benefit}`).join('\n') + '\n\n' +
                        `**🔧 Sửa chữa:** ${houseInfo.dailyRepair > 0 ? houseInfo.dailyRepair + ' Rin/ngày' : 'Miễn phí'}\n\n` +
                        `**📋 Bước tiếp theo:**\n` +
                        `• Dùng \`,dangkynghe\` để chọn nghề nghiệp\n` +
                        `• Dùng \`,nhacheck\` để xem thông tin nhà\n` +
                        `• Nhớ sửa nhà mỗi 5 ngày!`)
                    .setColor('#00FF00')
                    .setFooter({ text: 'Chúc mừng bạn có nhà mới! 🏠' })
                    .setTimestamp();

                // Update message để xóa buttons
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.update({ embeds: [embed], components: [] });
                }

            } catch (error) {
                console.error('Lỗi xác nhận thuê nhà:', error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi thuê nhà!', ephemeral: true });
            } finally {
                userLocks.delete(userId);
                console.log(`🔓 Unlock user ${userId} hoàn thành xử lý thuê nhà`);
            }

        } else {
            // Hủy bỏ
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY THUÊ NHÀ')
                .setDescription('Bạn đã quyết định không thuê nhà. Tiền được giữ nguyên!')
                .setColor('#6C757D');

            // Update message để xóa buttons
            if (!interaction.replied && !interaction.deferred) {
                await interaction.update({ embeds: [embed], components: [] });
            }
        }
    }
}; 