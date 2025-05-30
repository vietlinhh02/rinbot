const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { TREE_VALUES, TREE_IMAGES } = require('../../utils/constants');
const Tree = require('../../models/Tree');

module.exports = {
    name: 'caycheck',
    description: 'Kiểm tra trạng thái tất cả cây hiện tại',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        // Tìm tất cả cây của người chơi
        const trees = await Tree.find({ userId }).sort({ plantedAt: 1 });
        if (trees.length === 0) {
            return message.reply('❌ Bạn chưa có cây nào! Hãy dùng lệnh `muacay` để trồng cây.');
        }

        const now = new Date();
        
        // Nếu có tham số số, hiển thị cây cụ thể
        if (args.length > 0) {
            const treeIndex = parseInt(args[0]) - 1;
            if (treeIndex >= 0 && treeIndex < trees.length) {
                return await this.showDetailedTree(message, trees[treeIndex], treeIndex + 1, now);
            } else {
                return message.reply(`❌ Số thứ tự không hợp lệ! Bạn có ${trees.length} cây (từ 1 đến ${trees.length}).`);
            }
        }

        // Hiển thị tổng quan tất cả cây
        let treeSummary = '';
        let totalValue = 0;
        let readyToHarvest = 0;

        for (let i = 0; i < trees.length; i++) {
            const tree = trees[i];
            
            // Cập nhật tuổi cây
            const ageInMinutes = (now - new Date(tree.plantedAt)) / (1000 * 60);
            tree.age = Math.floor(ageInMinutes);

            // Tính yêu cầu
            const requiredWaters = this.getRequiredWaters(tree.species);
            const requiredAge = 60;

            // Cập nhật giai đoạn phát triển
            if (tree.waterCount >= requiredWaters && tree.age >= requiredAge) {
                tree.growthStage = 3;
                readyToHarvest++;
            } else if (tree.waterCount >= Math.floor(requiredWaters * 0.7)) {
                tree.growthStage = 2;
            } else if (tree.waterCount >= Math.floor(requiredWaters * 0.3)) {
                tree.growthStage = 1;
            } else {
                tree.growthStage = 0;
            }

            await tree.save();

            const stageNames = ['🌱 Mầm non', '🌿 Cây con', '🌳 Đang lớn', '🎄 Cây lớn'];
            const currentStage = stageNames[tree.growthStage];
            const treeValue = TREE_VALUES[tree.species];
            totalValue += treeValue;

            // Thời gian tưới cuối
            let waterStatus = '';
            if (tree.lastWater) {
                const timeSinceWater = (now - new Date(tree.lastWater)) / (1000 * 60);
                if (timeSinceWater < 30) {
                    const remaining = Math.ceil(30 - timeSinceWater);
                    waterStatus = `⏰ ${remaining}p nữa`;
                } else {
                    waterStatus = '✅ Có thể tưới';
                }
            } else {
                waterStatus = '🆕 Chưa tưới';
            }

            treeSummary += `**${i + 1}. ${currentStage} ${tree.species}**\n`;
            treeSummary += `💧 ${tree.waterCount}/${requiredWaters} | ⏰ ${Math.floor(tree.age / 60)}h${tree.age % 60}m | ${waterStatus}\n`;
            if (tree.growthStage >= 3) {
                treeSummary += `✅ **Có thể thu hoạch ${treeValue} Rin!**\n`;
            }
            treeSummary += '\n';
        }

        const embed = new EmbedBuilder()
            .setTitle('🌱 FARM CỦA BẠN')
            .setDescription(`**👤 Chủ farm:** ${message.author.displayName}\n` +
                `**📊 Thống kê:** ${trees.length}/5 cây | ${readyToHarvest} cây có thể thu hoạch\n` +
                `**💰 Tổng giá trị:** ${totalValue} Rin (khi thu hoạch hết)\n\n` +
                treeSummary +
                `**💡 Cách dùng:**\n` +
                `• \`caycheck 1\` - Xem chi tiết cây số 1\n` +
                `• \`tuoicay 2\` - Tưới cây số 2\n` +
                `• \`bonphan 3\` - Bón phân cây số 3`)
            .setColor(readyToHarvest > 0 ? '#FFD700' : '#00FF00')
            .setFooter({ 
                text: readyToHarvest > 0 ? 
                    `🎉 ${readyToHarvest} cây sẵn sàng thu hoạch!` : 
                    'Hãy chăm sóc cây thường xuyên!'
            });

        // Tạo buttons để xem chi tiết từng cây (tối đa 5 buttons)
        if (trees.length <= 5) {
            const row = new ActionRowBuilder();
            trees.forEach((tree, index) => {
                const stageEmojis = ['🌱', '🌿', '🌳', '🎄'];
                const emoji = stageEmojis[tree.growthStage] || '🌱';
                const button = new ButtonBuilder()
                    .setCustomId(`tree_detail_${index + 1}`)
                    .setLabel(`${index + 1}. ${emoji}`)
                    .setStyle(tree.growthStage >= 3 ? ButtonStyle.Success : ButtonStyle.Secondary);
                row.addComponents(button);
            });
            await message.reply({ embeds: [embed], components: [row] });
        } else {
            await message.reply({ embeds: [embed] });
        }
    },

    async handleInteraction(interaction) {
        if (interaction.customId && interaction.customId.startsWith('tree_detail_')) {
            const treeIndex = parseInt(interaction.customId.split('_')[2]) - 1;
            const trees = await Tree.find({ userId: interaction.user.id }).sort({ plantedAt: 1 });
            
            if (treeIndex >= 0 && treeIndex < trees.length) {
                await this.showDetailedTree(interaction, trees[treeIndex], treeIndex + 1, new Date(), true);
            }
        }
    },

    async showDetailedTree(messageOrInteraction, tree, treeNumber, now, isInteraction = false) {
        // Cập nhật tuổi cây
        const ageInMinutes = (now - new Date(tree.plantedAt)) / (1000 * 60);
        tree.age = Math.floor(ageInMinutes);

        // Tính thời gian tưới cuối
        let lastWaterText = 'Chưa tưới lần nào';
        if (tree.lastWater) {
            const timeSinceWater = (now - new Date(tree.lastWater)) / (1000 * 60);
            if (timeSinceWater < 30) {
                const remaining = Math.ceil(30 - timeSinceWater);
                lastWaterText = `${remaining} phút nữa có thể tưới`;
            } else {
                lastWaterText = '✅ Có thể tưới ngay';
            }
        }

        // Tính yêu cầu
        const requiredWaters = this.getRequiredWaters(tree.species);
        const requiredAge = 60;

        // Cập nhật giai đoạn phát triển
        if (tree.waterCount >= requiredWaters && tree.age >= requiredAge) {
            tree.growthStage = 3;
        } else if (tree.waterCount >= Math.floor(requiredWaters * 0.7)) {
            tree.growthStage = 2;
        } else if (tree.waterCount >= Math.floor(requiredWaters * 0.3)) {
            tree.growthStage = 1;
        } else {
            tree.growthStage = 0;
        }

        await tree.save();

        // Hiển thị trạng thái
        const stageNames = ['🌱 Mầm non', '🌿 Cây con', '🌳 Đang lớn', '🎄 Cây lớn'];
        const currentStage = stageNames[tree.growthStage];
        const rewardValue = TREE_VALUES[tree.species];

        // Tính thời gian trồng
        const totalDays = Math.floor(tree.age / (60 * 24));
        const totalHours = Math.floor((tree.age % (60 * 24)) / 60);
        const totalMinutes = tree.age % 60;

        let timeText = '';
        if (totalDays > 0) timeText += `${totalDays} ngày `;
        if (totalHours > 0) timeText += `${totalHours} giờ `;
        if (totalMinutes > 0) timeText += `${totalMinutes} phút`;

        // Trạng thái
        let statusText = '';
        if (tree.growthStage >= 3) {
            statusText = `✅ **CÓ THỂ THU HOẠCH!** Dùng lệnh \`thuhoach ${treeNumber}\``;
        } else {
            const needWaters = Math.max(0, requiredWaters - tree.waterCount);
            const needTime = Math.max(0, requiredAge - tree.age);
            statusText = `⏳ **Cần thêm:** ${needWaters} lần tưới, ${needTime} phút`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🌱 CÂY SỐ ${treeNumber}`)
            .setDescription(`**${tree.species}** - *${messageOrInteraction.user ? messageOrInteraction.user.displayName : messageOrInteraction.author.displayName}*\n\n` +
                `**📊 Thông tin cây:**\n` +
                `🎭 Giai đoạn: ${currentStage}\n` +
                `💧 Lần tưới: ${tree.waterCount}/${requiredWaters}\n` +
                `⏰ Tuổi: ${timeText || '0 phút'}\n` +
                `🕒 Tưới cuối: ${lastWaterText}\n` +
                `💚 Đã bón phân: ${tree.bonused ? 'Có' : 'Không'}\n\n` +
                `**💰 Giá trị:**\n` +
                `🎁 Thu hoạch: ${rewardValue} Rin\n` +
                `📈 Lợi nhuận dự kiến: +${rewardValue - 50 - (tree.bonused ? 30 : 0)} Rin\n\n` +
                statusText)
            .setThumbnail(TREE_IMAGES[tree.species])
            .setColor(tree.growthStage >= 3 ? '#FFD700' : '#00FF00')
            .setFooter({ 
                text: tree.growthStage >= 3 ? 
                    `Cây số ${treeNumber} sẵn sàng thu hoạch!` : 
                    `Cây số ${treeNumber} - Hãy kiên nhẫn chăm sóc!`
            });

        if (isInteraction) {
            await messageOrInteraction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await messageOrInteraction.reply({ embeds: [embed] });
        }
    },

    // Hàm tính số lần tưới cần thiết dựa trên loại cây
    getRequiredWaters(species) {
        const waterRequirements = {
            'Cỏ thúi địch': 3,
            'Cây chuối': 4,
            'Cây dưa hấu': 4,
            'Cây xoài': 5,
            'Cây thơm': 6,
            'Cây cam': 6,
            'Cây dâu tây': 7,
            'Cây dừa': 8
        };
        
        return waterRequirements[species] || 5;
    }
}; 