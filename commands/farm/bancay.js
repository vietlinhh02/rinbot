const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateUserRin } = require('../../utils/database');
const { TREE_VALUES, TREE_IMAGES } = require('../../utils/constants');
const Tree = require('../../models/Tree');

module.exports = {
    name: 'bancay',
    description: 'Bán cây hiện tại. Mỗi người chỉ được 1 cây, mỗi cây chỉ cần 3 lần tưới, sau khi đủ 3 lần tưới hoặc bón phân thì chờ 1 tiếng để thu hoạch.',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        // Tìm tất cả cây của người chơi
        const trees = await Tree.find({ userId }).sort({ plantedAt: 1 });
        if (trees.length === 0) {
            return message.reply('❌ Bạn chưa có cây nào! Hãy dùng lệnh `muacay` để trồng cây.');
        }

        // Nếu có nhiều cây và không chỉ định số thứ tự
        if (trees.length > 1 && args.length === 0) {
            let treeList = '';
            
            trees.forEach((tree, index) => {
                const stageEmojis = ['🌱', '🌿', '🌳', '🎄'];
                const emoji = stageEmojis[tree.growthStage] || '🌱';
                
                // Tính giá bán
                const fullValue = TREE_VALUES[tree.species];
                const sellPrice = Math.floor(fullValue * this.getSellMultiplier(tree.growthStage));
                const profit = sellPrice - 50 - (tree.bonused ? 30 : 0);
                
                const profitText = profit >= 0 ? `+${profit}` : `${profit}`;
                const profitColor = profit >= 0 ? '💚' : '❤️';
                
                treeList += `${index + 1}. ${emoji} **${tree.species}** - Bán ${sellPrice} Rin ${profitColor} (${profitText})\n`;
            });
            
            return message.reply(`🌱 **Bạn có ${trees.length} cây!** Chỉ định số thứ tự để bán:\n\n${treeList}\n💡 **Cách dùng:** \`bancay 1\` (bán cây số 1)`);
        }

        // Xác định cây cần bán
        let treeIndex = 0;
        if (args.length > 0) {
            treeIndex = parseInt(args[0]) - 1;
            if (treeIndex < 0 || treeIndex >= trees.length) {
                return message.reply(`❌ Số thứ tự không hợp lệ! Bạn có ${trees.length} cây (từ 1 đến ${trees.length}).`);
            }
        }

        const tree = trees[treeIndex];
        const treeNumber = treeIndex + 1;
        const now = new Date();
        
        // Cập nhật tuổi cây
        const ageInMinutes = (now - new Date(tree.plantedAt)) / (1000 * 60);
        tree.age = Math.floor(ageInMinutes);

        // Kiểm tra cây đã có thể thu hoạch chưa
        const requiredWaters = this.getRequiredWaters(tree.species);
        const requiredAge = 60;

        if (tree.waterCount >= requiredWaters && tree.age >= requiredAge) {
            return message.reply(`❌ Cây số ${treeNumber} đã có thể thu hoạch! Hãy dùng lệnh \`thuhoach ${treeNumber}\` để nhận đầy đủ ${TREE_VALUES[tree.species]} Rin thay vì bán thua lỗ.`);
        }

        // Tính giá bán dựa trên giai đoạn phát triển
        const fullValue = TREE_VALUES[tree.species];
        const sellMultiplier = this.getSellMultiplier(tree.growthStage);
        const sellPrice = Math.floor(fullValue * sellMultiplier);
        
        // Tính lợi nhuận (có thể âm)
        const totalCost = 50 + (tree.bonused ? 30 : 0); // Hạt giống + phân (nếu có)
        const profit = sellPrice - totalCost;

        // Hiển thị thông tin xác nhận
        const stageNames = ['🌱 Mầm non', '🌿 Cây con', '🌳 Đang lớn', '🎄 Cây lớn'];
        const currentStage = stageNames[tree.growthStage];

        const embed = new EmbedBuilder()
            .setTitle('⚠️ XÁC NHẬN BÁN CÂY')
            .setDescription(`**Cây số ${treeNumber}: ${tree.species}** của ${message.author.displayName}\n\n` +
                `**📊 Thông tin cây:**\n` +
                `🎭 Giai đoạn: ${currentStage}\n` +
                `💧 Lần tưới: ${tree.waterCount}/${requiredWaters}\n` +
                `⏰ Tuổi: ${Math.floor(tree.age / 60)}h ${tree.age % 60}m\n` +
                `💚 Đã bón phân: ${tree.bonused ? 'Có' : 'Không'}\n\n` +
                `**💰 Tính toán tài chính:**\n` +
                `🎁 Giá trị đầy đủ: ${fullValue} Rin\n` +
                `💸 Giá bán hiện tại: **${sellPrice} Rin** (${Math.round(sellMultiplier * 100)}%)\n` +
                `💰 Chi phí đã đầu tư: ${totalCost} Rin\n` +
                `📊 Lợi nhuận: **${profit >= 0 ? '+' : ''}${profit} Rin** ${profit >= 0 ? '💚' : '❤️'}\n\n` +
                `${profit < 0 ? '⚠️ **Cảnh báo:** Bạn sẽ **thua lỗ** nếu bán ngay!' : '✅ Bạn vẫn có lợi nhuận!'}\n` +
                `💡 **Gợi ý:** ${tree.growthStage < 3 ? 'Chăm sóc thêm để tăng giá trị!' : 'Thu hoạch để có lợi nhuận tối đa!'}`)
            .setThumbnail(TREE_IMAGES[tree.species])
            .setColor(profit >= 0 ? '#FFD700' : '#FF6B6B')
            .setFooter({ text: `Cây số ${treeNumber} - Quyết định cuối cùng là của bạn!` });

        // Tạo buttons xác nhận
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`sell_tree_${treeNumber}`)
                    .setLabel(`✅ Bán (${sellPrice} Rin)`)
                    .setStyle(profit >= 0 ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`cancel_sell_${treeNumber}`)
                    .setLabel('❌ Hủy bỏ')
                    .setStyle(ButtonStyle.Secondary)
            );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction) {
        if (interaction.customId.startsWith('sell_tree_')) {
            const treeNumber = parseInt(interaction.customId.split('_')[2]);
            await this.confirmSellTree(interaction, treeNumber);
        } else if (interaction.customId.startsWith('cancel_sell_')) {
            const embed = new EmbedBuilder()
                .setTitle('❌ ĐÃ HỦY BÁN CÂY')
                .setDescription('Bạn đã quyết định giữ lại cây. Hãy tiếp tục chăm sóc cây nhé! 🌱')
                .setColor('#6C757D');

            // Update message để xóa buttons
            await interaction.update({ embeds: [embed], components: [] });
        }
    },

    async confirmSellTree(interaction, treeNumber) {
        const userId = interaction.user.id;
        
        // Tìm cây theo số thứ tự
        const trees = await Tree.find({ userId }).sort({ plantedAt: 1 });
        if (treeNumber <= 0 || treeNumber > trees.length) {
            return interaction.reply({ content: '❌ Cây không tồn tại!', ephemeral: true });
        }

        const tree = trees[treeNumber - 1];
        
        // Tính giá bán
        const fullValue = TREE_VALUES[tree.species];
        const sellMultiplier = this.getSellMultiplier(tree.growthStage);
        const sellPrice = Math.floor(fullValue * sellMultiplier);
        
        // Tính lợi nhuận
        const totalCost = 50 + (tree.bonused ? 30 : 0);
        const profit = sellPrice - totalCost;

        // Thực hiện bán cây
        await updateUserRin(userId, sellPrice);
        await Tree.deleteOne({ _id: tree._id });

        // Đếm số cây còn lại
        const remainingTrees = await Tree.countDocuments({ userId });

        const embed = new EmbedBuilder()
            .setTitle('💸 BÁN CÂY THÀNH CÔNG!')
            .setDescription(`${interaction.user.displayName} đã bán **Cây số ${treeNumber}: ${tree.species}**!\n\n` +
                `**💰 Kết quả giao dịch:**\n` +
                `💸 Nhận được: **${sellPrice} Rin**\n` +
                `📊 So với giá trị đầy đủ: ${Math.round(sellMultiplier * 100)}% (${fullValue} Rin)\n` +
                `💰 Chi phí đã đầu tư: ${totalCost} Rin\n` +
                `📈 Lợi nhuận thực tế: **${profit >= 0 ? '+' : ''}${profit} Rin** ${profit >= 0 ? '💚' : '❤️'}\n\n` +
                `**📊 Farm hiện tại:** ${remainingTrees}/5 cây\n\n` +
                `${profit < 0 ? 
                    '😢 **Thương vụ thua lỗ!** Lần sau hãy kiên nhẫn chăm sóc cây lâu hơn nhé!' : 
                    '🎉 **Thương vụ có lời!** Chúc mừng bạn!'}\n\n` +
                `**💡 Tip:** ${remainingTrees < 5 ? 'Bạn có thể trồng thêm cây mới!' : 'Hãy chăm sóc những cây còn lại!'}`)
            .setThumbnail(TREE_IMAGES[tree.species])
            .setColor(profit >= 0 ? '#00FF00' : '#FF6B6B')
            .setFooter({ text: profit >= 0 ? 'Kinh doanh thành công!' : 'Học hỏi kinh nghiệm cho lần sau!' });

        // Update message để xóa buttons
        await interaction.update({ embeds: [embed], components: [] });
    },

    // Hàm tính hệ số giá bán dựa trên giai đoạn phát triển
    getSellMultiplier(growthStage) {
        const multipliers = [0.3, 0.45, 0.6, 0.8]; // 30%, 45%, 60%, 80%
        return multipliers[growthStage] || 0.3;
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
        
        return waterRequirements[species] || 5; // Mặc định 5 lần
    }
}; 