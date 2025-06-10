const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCityUser, updateCityUser, getUserRin, updateUserRin } = require('../../utils/database');
const { MISSIONS, COLORS, EMOJIS } = require('../../utils/constants');

module.exports = {
    name: 'nhiemvu',
    description: 'Nhận và thực hiện nhiệm vụ để kiếm tiền',
    
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const cityUser = await getCityUser(userId);

            if (!cityUser.home) {
                return message.reply('❌ Bạn cần thuê nhà trước khi nhận nhiệm vụ! Dùng `,thuenha` để thuê nhà.');
            }

            // Nếu không có tham số, hiển thị trạng thái nhiệm vụ
            if (args.length === 0) {
                return await this.showMissionStatus(message, cityUser);
            }

            const action = args[0].toLowerCase();

            switch (action) {
                case 'list':
                case 'danh':
                    return await this.showMissionList(message, cityUser);
                case 'nhan':
                case 'take':
                    if (args.length < 2) {
                        return message.reply('❌ Cần chỉ định loại nhiệm vụ: `giaohang`, `donvesinh`, `baove`, hoặc `quanly`');
                    }
                    return await this.takeMission(message, cityUser, args[1]);
                case 'huy':
                case 'cancel':
                    return await this.cancelMission(message, cityUser);
                case 'hoanthanh':
                case 'complete':
                    return await this.completeMission(message, cityUser);
                default:
                    return message.reply('❌ Hành động không hợp lệ! Sử dụng: `list`, `nhan <loại>`, `huy`, hoặc `hoanthanh`');
            }

        } catch (error) {
            console.error('Lỗi nhiemvu:', error);
            await message.reply('❌ Có lỗi xảy ra khi xử lý nhiệm vụ!');
        }
    },

    // Hiển thị trạng thái nhiệm vụ hiện tại
    async showMissionStatus(message, cityUser) {
        const userRin = await getUserRin(message.author.id);
        let statusDescription = '';

        // Làm mới dữ liệu cityUser để đảm bảo có thông tin mới nhất
        const freshCityUser = await getCityUser(message.author.id);

        if (freshCityUser.currentMission) {
            const mission = MISSIONS[freshCityUser.currentMission.type];
            const startTime = new Date(freshCityUser.currentMission.startTime);
            const now = new Date();
            const elapsed = Math.floor((now - startTime) / (60 * 1000)); // phút
            const remaining = Math.max(0, mission.duration - elapsed);

            if (remaining > 0) {
                statusDescription = `**📋 Nhiệm vụ đang thực hiện:**\n` +
                    `${mission.emoji} **${mission.name}**\n` +
                    `⏰ Còn lại: **${remaining} phút**\n` +
                    `💰 Thưởng: **${mission.reward.toLocaleString()} Rin**\n\n` +
                    `*Dùng \`,nhiemvu hoanthanh\` khi hoàn thành!*`;
            } else {
                statusDescription = `**✅ Nhiệm vụ hoàn thành!**\n` +
                    `${mission.emoji} **${mission.name}**\n` +
                    `💰 Nhận thưởng: **${mission.reward.toLocaleString()} Rin**\n\n` +
                    `*Dùng \`,nhiemvu hoanthanh\` để nhận thưởng!*`;
            }
        } else {
            statusDescription = `**💼 Chưa có nhiệm vụ nào**\n\n` +
                `Bạn có thể nhận nhiệm vụ mới để kiếm tiền!\n` +
                `Dùng \`,nhiemvu list\` để xem danh sách nhiệm vụ.`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 TRẠNG THÁI NHIỆM VỤ - ${message.author.displayName}`)
            .setDescription(statusDescription)
            .addFields(
                { 
                    name: '💰 Số dư hiện tại', 
                    value: `${userRin.toLocaleString()} Rin`, 
                    inline: true 
                },
                { 
                    name: '🏠 Nhà hiện tại', 
                    value: this.getHouseName(freshCityUser.home), 
                    inline: true 
                },
                {
                    name: '🎮 Hướng dẫn',
                    value: '• `,nhiemvu list` - Xem danh sách\n' +
                           '• `,nhiemvu nhan <loại>` - Nhận nhiệm vụ\n' +
                           '• `,nhiemvu huy` - Hủy nhiệm vụ\n' +
                           '• `,nhiemvu hoanthanh` - Hoàn thành',
                    inline: false
                }
            )
            .setColor(freshCityUser.currentMission ? COLORS.warning : COLORS.info)
            .setFooter({ text: 'Làm nhiệm vụ để kiếm Rin!' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },

    // Hiển thị danh sách nhiệm vụ
    async showMissionList(message, cityUser) {
        let missionList = '';
        
        Object.entries(MISSIONS).forEach(([type, mission]) => {
            const available = !cityUser.currentMission ? '✅' : '❌';
            missionList += `${mission.emoji} **${mission.name}** ${available}\n`;
            missionList += `└ ${mission.description}\n`;
            missionList += `└ Thời gian: ${mission.duration} phút\n`;
            missionList += `└ Thưởng: ${mission.reward.toLocaleString()} Rin\n\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('📋 DANH SÁCH NHIỆM VỤ')
            .setDescription(`**Các nhiệm vụ có thể nhận:**\n\n${missionList}` +
                `**💡 Cách nhận nhiệm vụ:**\n` +
                `• \`,nhiemvu nhan giaohang\` - Giao hàng (30p)\n` +
                `• \`,nhiemvu nhan donvesinh\` - Dọn vệ sinh (60p)\n` +
                `• \`,nhiemvu nhan baove\` - Bảo vệ (120p)\n` +
                `• \`,nhiemvu nhan quanly\` - Quản lý (240p)\n\n` +
                `⚠️ **Lưu ý:** Chỉ có thể nhận 1 nhiệm vụ tại một thời điểm!`)
            .setColor(COLORS.city)
            .setFooter({ text: 'Thời gian càng dài = thưởng càng cao!' });

        await message.reply({ embeds: [embed] });
    },

    // Nhận nhiệm vụ mới
    async takeMission(message, cityUser, missionType) {
        // Làm mới dữ liệu để kiểm tra trạng thái mới nhất
        const freshCityUser = await getCityUser(message.author.id);
        
        if (freshCityUser.currentMission) {
            const currentMission = MISSIONS[freshCityUser.currentMission.type];
            return message.reply(`❌ Bạn đang thực hiện nhiệm vụ **${currentMission.name}**! Hãy hoàn thành hoặc hủy nhiệm vụ hiện tại trước.`);
        }

        const mission = MISSIONS[missionType.toLowerCase()];
        if (!mission) {
            return message.reply('❌ Loại nhiệm vụ không hợp lệ! Sử dụng: `giaohang`, `donvesinh`, `baove`, hoặc `quanly`');
        }

        // Tạo button xác nhận
        const confirmButton = new ButtonBuilder()
            .setCustomId(`mission_confirm_${missionType}_${message.author.id}`)
            .setLabel(`${mission.emoji} Nhận nhiệm vụ`)
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId(`mission_cancel_${message.author.id}`)
            .setLabel('❌ Hủy bỏ')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        const embed = new EmbedBuilder()
            .setTitle(`📋 XÁC NHẬN NHẬN NHIỆM VỤ`)
            .setDescription(`${mission.emoji} **${mission.name}**\n\n` +
                `**📝 Mô tả:** ${mission.description}\n` +
                `**⏰ Thời gian:** ${mission.duration} phút\n` +
                `**💰 Thưởng:** ${mission.reward.toLocaleString()} Rin\n\n` +
                `**Bạn có muốn nhận nhiệm vụ này không?**`)
            .setColor(COLORS.warning)
            .setFooter({ text: 'Quyết định trong 30 giây!' })
            .setTimestamp();

        await message.reply({ embeds: [embed], components: [row] });
    },

    // Hủy nhiệm vụ hiện tại
    async cancelMission(message, cityUser) {
        // Làm mới dữ liệu để kiểm tra trạng thái mới nhất
        const freshCityUser = await getCityUser(message.author.id);
        
        if (!freshCityUser.currentMission) {
            return message.reply('❌ Bạn không có nhiệm vụ nào để hủy!');
        }

        const mission = MISSIONS[freshCityUser.currentMission.type];
        
        // Tạo button xác nhận hủy
        const confirmButton = new ButtonBuilder()
            .setCustomId(`mission_cancel_confirm_${message.author.id}`)
            .setLabel('⚠️ Xác nhận hủy')
            .setStyle(ButtonStyle.Danger);

        const keepButton = new ButtonBuilder()
            .setCustomId(`mission_cancel_keep_${message.author.id}`)
            .setLabel('✅ Tiếp tục làm')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(confirmButton, keepButton);

        const embed = new EmbedBuilder()
            .setTitle('⚠️ XÁC NHẬN HỦY NHIỆM VỤ')
            .setDescription(`Bạn đang thực hiện nhiệm vụ:\n` +
                `${mission.emoji} **${mission.name}**\n\n` +
                `**⚠️ Cảnh báo:** Hủy nhiệm vụ sẽ mất toàn bộ tiến độ!\n` +
                `Bạn có chắc chắn muốn hủy không?`)
            .setColor(COLORS.error)
            .setFooter({ text: 'Quyết định trong 30 giây!' });

        await message.reply({ embeds: [embed], components: [row] });
    },

    // Hoàn thành nhiệm vụ
    async completeMission(message, cityUser) {
        // Làm mới dữ liệu để kiểm tra trạng thái mới nhất
        const freshCityUser = await getCityUser(message.author.id);
        
        if (!freshCityUser.currentMission) {
            return message.reply('❌ Bạn không có nhiệm vụ nào để hoàn thành!');
        }

        const mission = MISSIONS[freshCityUser.currentMission.type];
        const startTime = new Date(freshCityUser.currentMission.startTime);
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / (60 * 1000)); // phút

        if (elapsed < mission.duration) {
            const remaining = mission.duration - elapsed;
            return message.reply(`⏰ Nhiệm vụ chưa hoàn thành! Còn lại **${remaining} phút** nữa.`);
        }

        // Tính thưởng với bonus theo loại nhà
        let reward = mission.reward;
        const houseBonus = this.getHouseBonus(freshCityUser.home);
        const bonusAmount = Math.floor(reward * houseBonus);
        const totalReward = reward + bonusAmount;

        // Cập nhật tiền và xóa nhiệm vụ
        await updateUserRin(message.author.id, totalReward);
        await updateCityUser(message.author.id, { 
            currentMission: null,
            completedMissions: (freshCityUser.completedMissions || 0) + 1
        });

        const embed = new EmbedBuilder()
            .setTitle('🎉 HOÀN THÀNH NHIỆM VỤ!')
            .setDescription(`${mission.emoji} **${mission.name}** đã hoàn thành!\n\n` +
                `**💰 Thưởng cơ bản:** ${reward.toLocaleString()} Rin\n` +
                `**🏠 Bonus nhà:** +${bonusAmount.toLocaleString()} Rin (${Math.round(houseBonus * 100)}%)\n` +
                `**💎 Tổng nhận:** ${totalReward.toLocaleString()} Rin\n\n` +
                `**📊 Thống kê:**\n` +
                `• Nhiệm vụ hoàn thành: ${(freshCityUser.completedMissions || 0) + 1}\n` +
                `• Thời gian thực hiện: ${elapsed} phút\n\n` +
                `**Chúc mừng bạn! 🎊**`)
            .setColor(COLORS.success)
            .setFooter({ text: 'Hãy nhận nhiệm vụ mới để tiếp tục kiếm tiền!' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },

    // Xử lý button interactions
    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('mission_')) return;

        const parts = interaction.customId.split('_');
        const action = parts[1]; // confirm, cancel
        const userId = parts[parts.length - 1];

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Chỉ người nhận nhiệm vụ mới có thể thực hiện!', ephemeral: true });
        }

        try {
            const cityUser = await getCityUser(userId);

            if (action === 'confirm') {
                const missionType = parts[2];
                const mission = MISSIONS[missionType];

                if (cityUser.currentMission) {
                    return interaction.reply({ content: '❌ Bạn đã có nhiệm vụ rồi!', ephemeral: true });
                }

                // Nhận nhiệm vụ
                await updateCityUser(userId, {
                    currentMission: {
                        type: missionType,
                        startTime: new Date()
                    }
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ NHẬN NHIỆM VỤ THÀNH CÔNG!')
                    .setDescription(`${mission.emoji} **${mission.name}**\n\n` +
                        `**⏰ Thời gian:** ${mission.duration} phút\n` +
                        `**💰 Thưởng:** ${mission.reward.toLocaleString()} Rin\n\n` +
                        `**📝 Hướng dẫn:**\n` +
                        `• Chờ ${mission.duration} phút\n` +
                        `• Dùng \`,nhiemvu hoanthanh\` để nhận thưởng\n` +
                        `• Có thể dùng \`,nhiemvu huy\` để hủy\n\n` +
                        `**Chúc bạn thành công! 💪**`)
                    .setColor(COLORS.success)
                    .setFooter({ text: 'Hãy quay lại sau khi hoàn thành!' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else if (action === 'cancel') {
                if (parts[2] === 'confirm') {
                    // Xác nhận hủy nhiệm vụ
                    await updateCityUser(userId, { currentMission: null });

                    const embed = new EmbedBuilder()
                        .setTitle('❌ ĐÃ HỦY NHIỆM VỤ')
                        .setDescription('Bạn đã hủy nhiệm vụ hiện tại.\n\n' +
                            'Có thể nhận nhiệm vụ mới bất cứ lúc nào!')
                        .setColor(COLORS.error);

                    await interaction.reply({ embeds: [embed] });

                } else if (parts[2] === 'keep') {
                    // Tiếp tục làm nhiệm vụ
                    const embed = new EmbedBuilder()
                        .setTitle('✅ TIẾP TỤC NHIỆM VỤ')
                        .setDescription('Bạn đã quyết định tiếp tục thực hiện nhiệm vụ.\n\n' +
                            'Hãy hoàn thành để nhận thưởng!')
                        .setColor(COLORS.success);

                    await interaction.reply({ embeds: [embed] });

                } else {
                    // Hủy bỏ nhận nhiệm vụ
                    const embed = new EmbedBuilder()
                        .setTitle('❌ ĐÃ HỦY NHẬN NHIỆM VỤ')
                        .setDescription('Bạn đã quyết định không nhận nhiệm vụ này.\n\n' +
                            'Có thể chọn nhiệm vụ khác bất cứ lúc nào!')
                        .setColor(COLORS.error);

                    await interaction.reply({ embeds: [embed] });
                }
            }

        } catch (error) {
            console.error('Lỗi xử lý interaction nhiệm vụ:', error);
            await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
        }
    },

    // Helper functions
    getHouseName(houseType) {
        const houseNames = {
            'nhatro': 'Nhà Trọ',
            'nhatuong': 'Nhà Thường',
            'bietlau': 'Biệt Lầu',
            'bietthu': 'Biệt Thự'
        };
        return houseNames[houseType] || 'Không rõ';
    },

    getHouseBonus(houseType) {
        const bonuses = {
            'nhatro': 0,      // 0% bonus
            'nhatuong': 0.1,  // 10% bonus
            'bietlau': 0.25,  // 25% bonus 
            'bietthu': 0.5    // 50% bonus
        };
        return bonuses[houseType] || 0;
    }
}; 