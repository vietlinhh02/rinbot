const { EmbedBuilder } = require('discord.js');
const { TREE_IMAGES } = require('../../utils/constants');
const Tree = require('../../models/Tree');

module.exports = {
    name: 'tuoicay',
    description: 'Tưới nước cho cây (mỗi 30 phút). Mỗi cây chỉ cần 3 lần tưới, sau khi đủ 3 lần tưới hoặc bón phân thì chờ 1 tiếng để thu hoạch. Mỗi người chỉ được 1 cây.',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        // Tìm tất cả cây của người chơi trong server này
        const trees = await Tree.find({ userId, guildId: message.guild.id }).sort({ plantedAt: 1 });
        if (trees.length === 0) {
            return message.reply('❌ Bạn chưa có cây nào! Hãy dùng lệnh `muacay` để trồng cây.');
        }

        // Nếu có nhiều cây và không chỉ định số thứ tự
        if (trees.length > 1 && args.length === 0) {
            let treeList = '';
            trees.forEach((tree, index) => {
                const stageEmojis = ['🌱', '🌿', '🌳', '🎄'];
                const emoji = stageEmojis[tree.growthStage] || '🌱';
                
                // Kiểm tra cooldown
                const now = new Date();
                let canWater = true;
                let cooldownText = '';
                
                if (tree.lastWater) {
                    const timeDiff = now - new Date(tree.lastWater);
                    const minutesDiff = timeDiff / (1000 * 60);
                    
                    if (minutesDiff < 30) {
                        canWater = false;
                        const remainingMinutes = Math.ceil(30 - minutesDiff);
                        cooldownText = `⏰ ${remainingMinutes}p nữa`;
                    } else {
                        cooldownText = '✅ Có thể tưới';
                    }
                } else {
                    cooldownText = '🆕 Chưa tưới';
                }
                
                treeList += `${index + 1}. ${emoji} **${tree.species}** - ${cooldownText}\n`;
            });
            
            return message.reply(`🌱 **Bạn có ${trees.length} cây!** Chỉ định số thứ tự để tưới:\n\n${treeList}\n💡 **Cách dùng:** \`tuoicay 1\` (tưới cây số 1)`);
        }

        // Xác định cây cần tưới
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
        
        // Kiểm tra cooldown (30 phút)
        if (tree.lastWater) {
            const timeDiff = now - new Date(tree.lastWater);
            const minutesDiff = timeDiff / (1000 * 60);
            
            if (minutesDiff < 30) {
                const remainingMinutes = Math.ceil(30 - minutesDiff);
                return message.reply(`⏰ Cây số ${treeNumber} vẫn đủ nước! Hãy quay lại sau **${remainingMinutes} phút**.`);
            }
        }

        // Tưới nước và cập nhật cây
        tree.waterCount += 1;
        tree.lastWater = now;
        // Nếu đủ 3 lần tưới thì cập nhật plantedAt = now để tính 1 tiếng chờ thu hoạch
        if (tree.waterCount >= 3) {
            tree.growthStage = 3;
            tree.plantedAt = now;
            tree.maturedAt = now;
            tree.deadAt = null;
        }
        
        // Tính tuổi cây (phút kể từ khi trồng)
        const ageInMinutes = (now - new Date(tree.plantedAt)) / (1000 * 60);
        tree.age = Math.floor(ageInMinutes);

        await tree.save();

        // Hiển thị trạng thái cây
        const stageNames = ['🌱 Mầm non', '🌿 Cây con', '🌳 Đang lớn', '🎄 Cây lớn'];
        const currentStage = stageNames[tree.growthStage];
        
        const embed = new EmbedBuilder()
            .setTitle('💧 TƯỚI NƯỚC THÀNH CÔNG!')
            .setDescription(`**Cây số ${treeNumber}: ${tree.species}** của ${message.author.displayName}\n\n` +
                `**📊 Trạng thái hiện tại:**\n` +
                `🎭 Giai đoạn: ${currentStage}\n` +
                `💧 Lần tưới: ${tree.waterCount}/3\n` +
                `🕒 Lần tưới cuối: Vừa xong\n` +
                (tree.growthStage >= 3 ? 
                    `✅ **Cây đã lớn! Có thể thu hoạch sau 1 tiếng kể từ lần tưới/bón cuối cùng bằng lệnh \`thuhoach ${treeNumber}\`**` :
                    `⏳ **Cần thêm:** ${Math.max(0, 3 - tree.waterCount)} lần tưới`))
            .setThumbnail(TREE_IMAGES[tree.species])
            .setColor(tree.growthStage >= 3 ? '#FFD700' : '#00FF00')
            .setFooter({ text: `Cây số ${treeNumber} - Tưới nước tiếp theo sau 30 phút!` });

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