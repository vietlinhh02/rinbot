const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { TREE_IMAGES } = require('../../utils/constants');
const Tree = require('../../models/Tree');

module.exports = {
    name: 'bonphan',
    description: 'Bón phân cho cây (30 Rin). Mỗi cây chỉ cần 3 lần tưới, sau khi đủ 3 lần tưới hoặc bón phân thì chờ 1 tiếng để thu hoạch. Mỗi người chỉ được 1 cây.',
    
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
                const bonusStatus = tree.bonused ? '💚 Đã bón' : (tree.growthStage >= 3 ? '❌ Đã lớn' : '✅ Có thể bón');
                treeList += `${index + 1}. ${emoji} **${tree.species}** - ${bonusStatus}\n`;
            });
            
            return message.reply(`🌱 **Bạn có ${trees.length} cây!** Chỉ định số thứ tự để bón phân:\n\n${treeList}\n💡 **Cách dùng:** \`bonphan 1\` (bón phân cây số 1)`);
        }

        // Xác định cây cần bón phân
        let treeIndex = 0;
        if (args.length > 0) {
            treeIndex = parseInt(args[0]) - 1;
            if (treeIndex < 0 || treeIndex >= trees.length) {
                return message.reply(`❌ Số thứ tự không hợp lệ! Bạn có ${trees.length} cây (từ 1 đến ${trees.length}).`);
            }
        }

        const tree = trees[treeIndex];
        const treeNumber = treeIndex + 1;

        // Kiểm tra cây đã được bón phân chưa
        if (tree.bonused) {
            return message.reply(`❌ Cây số ${treeNumber} đã được bón phân rồi! Mỗi cây chỉ có thể bón phân 1 lần.`);
        }

        // Kiểm tra số Rin
        const userRin = await getUserRin(userId);
        if (userRin < 30) {
            return message.reply('❌ Bạn cần 30 Rin để mua phân bón!');
        }

        // Kiểm tra cây đã lớn chưa
        if (tree.growthStage >= 3) {
            return message.reply(`❌ Cây số ${treeNumber} đã lớn rồi, không cần bón phân nữa! Hãy thu hoạch.`);
        }

        // Trừ tiền và bón phân
        await updateUserRin(userId, -30);
        
        const now = new Date();
        
        // Tính tuổi cây hiện tại
        const ageInMinutes = (now - new Date(tree.plantedAt)) / (1000 * 60);
        tree.age = Math.floor(ageInMinutes);

        // Bonus: Nếu chưa tưới nước lần nào thì waterCount = 2, nếu đã tưới thì chỉ set waterCount = 3 nếu nhỏ hơn 3
        if (tree.waterCount === 0) {
            tree.waterCount = 2;
        } else if (tree.waterCount < 3) {
            tree.waterCount = 3;
        }
        tree.growthStage = 3;
        tree.plantedAt = now;
        tree.maturedAt = now;
        tree.deadAt = null;
        tree.bonused = true;
        await tree.save();

        // Hiển thị kết quả
        const stageNames = ['🌱 Mầm non', '🌿 Cây con', '🌳 Đang lớn', '🎄 Cây lớn'];
        const currentStage = stageNames[tree.growthStage];
        const embed = new EmbedBuilder()
            .setTitle('💚 BÓN PHÂN THÀNH CÔNG!')
            .setDescription(`**Cây số ${treeNumber}: ${tree.species}** của ${message.author.displayName}\n\n` +
                `**🌟 Hiệu quả phân bón:**\n` +
                `✨ Đã bón phân, cây sẽ trưởng thành sau 1 tiếng\n` +
                `💧 Số lần tưới hiện tại: ${tree.waterCount}/3\n` +
                `💰 Tốn: 30 Rin\n\n` +
                `**📊 Trạng thái sau khi bón:**\n` +
                `🎭 Giai đoạn: ${currentStage}\n` +
                `⏰ Đã trưởng thành lúc: ${tree.maturedAt ? new Date(tree.maturedAt).toLocaleString() : 'Chưa'}\n` +
                `🕒 Lần tưới cuối: ${tree.lastWater ? new Date(tree.lastWater).toLocaleString() : 'Chưa tưới'}\n` +
                (tree.growthStage >= 3 ? 
                    `🎉 **Cây đã lớn nhờ phân bón! Có thể thu hoạch sau 1 tiếng!**` :
                    `⏳ **Cần thêm:** Đủ 3 lần tưới và chờ 1 tiếng sau khi trưởng thành`))
            .setThumbnail(TREE_IMAGES[tree.species])
            .setColor(tree.growthStage >= 3 ? '#FFD700' : '#00CC00')
            .setFooter({ text: `Cây số ${treeNumber} - Phân bón chất lượng cao!` });
        await message.reply({ embeds: [embed] });
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