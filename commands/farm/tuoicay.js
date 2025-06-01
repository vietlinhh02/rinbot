const { EmbedBuilder } = require('discord.js');
const { TREE_IMAGES } = require('../../utils/constants');
const Tree = require('../../models/Tree');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'tuoicay',
    description: 'Tưới nước cho cây (mỗi 30 phút). Mỗi cây chỉ cần 3 lần tưới, sau khi đủ 3 lần tưới hoặc bón phân thì chờ 1 tiếng để thu hoạch. Mỗi người chỉ được 1 cây.',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 2 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'tuoicay', 
                2, // 2 giây cooldown
                this.executeTuoiCay,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },
    
    async executeTuoiCay(message, args) {
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
                
                // Kiểm tra trạng thái cây
                const now = new Date();
                let cooldownText = '';
                
                // Nếu cây đã đủ 3 lần tưới và lớn rồi
                if (tree.waterCount >= 3 && tree.growthStage >= 3) {
                    const waitMinutes = tree.maturedAt ? (now - new Date(tree.maturedAt)) / (1000 * 60) : 0;
                    if (waitMinutes >= 60) {
                        cooldownText = '🎉 Có thể thu hoạch';
                    } else {
                        const remainingMinutes = Math.ceil(60 - waitMinutes);
                        cooldownText = `⏳ ${remainingMinutes}p nữa thu hoạch`;
                    }
                } else {
                    // Kiểm tra cooldown tưới nước
                    if (tree.lastWater) {
                        const timeDiff = now - new Date(tree.lastWater);
                        const minutesDiff = timeDiff / (1000 * 60);
                        
                        if (minutesDiff < 30) {
                            const remainingMinutes = Math.ceil(30 - minutesDiff);
                            cooldownText = `⏰ ${remainingMinutes}p nữa`;
                        } else {
                            cooldownText = '✅ Có thể tưới';
                        }
                    } else {
                        cooldownText = '🆕 Chưa tưới';
                    }
                }
                
                treeList += `${index + 1}. ${emoji} **${tree.species}** (${tree.waterCount}/3) - ${cooldownText}\n`;
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

        // Kiểm tra lại cây trước khi tưới (tránh race condition)
        const freshTree = await Tree.findById(tree._id);
        if (freshTree.lastWater) {
            const timeDiff = now - new Date(freshTree.lastWater);
            const minutesDiff = timeDiff / (1000 * 60);
            
            if (minutesDiff < 30) {
                const remainingMinutes = Math.ceil(30 - minutesDiff);
                return message.reply(`⏰ Cây số ${treeNumber} vẫn đủ nước! (Phát hiện spam - còn ${remainingMinutes} phút)`);
            }
        }

        // Kiểm tra xem cây đã đủ điều kiện thu hoạch chưa
        if (freshTree.waterCount >= 3 && freshTree.growthStage >= 3) {
            // Kiểm tra thời gian chờ thu hoạch
            const waitMinutes = freshTree.maturedAt ? (now - new Date(freshTree.maturedAt)) / (1000 * 60) : 0;
            
            if (waitMinutes >= 60) {
                return message.reply(`🎉 Cây số ${treeNumber} đã có thể thu hoạch rồi! Dùng lệnh \`thuhoach ${treeNumber}\` để thu hoạch thay vì tưới thêm.`);
            } else {
                const remainingMinutes = Math.ceil(60 - waitMinutes);
                return message.reply(`⏳ Cây số ${treeNumber} đã đủ 3 lần tưới! Chờ thêm **${remainingMinutes} phút** nữa để thu hoạch. Không cần tưới thêm.`);
            }
        }

        // Tưới nước và cập nhật cây (chỉ khi chưa đủ 3 lần)
        freshTree.waterCount += 1;
        freshTree.lastWater = now;
        
        // Nếu vừa đủ 3 lần tưới lần đầu tiên thì cập nhật trạng thái
        if (freshTree.waterCount === 3 && freshTree.growthStage < 3) {
            freshTree.growthStage = 3;
            freshTree.maturedAt = now;
            freshTree.deadAt = null;
            // KHÔNG reset plantedAt - giữ nguyên thời gian trồng cây
        }
        
        // Tính tuổi cây (phút kể từ khi trồng)
        const ageInMinutes = (now - new Date(freshTree.plantedAt)) / (1000 * 60);
        freshTree.age = Math.floor(ageInMinutes);

        await freshTree.save();

        // Hiển thị trạng thái cây
        const stageNames = ['🌱 Mầm non', '🌿 Cây con', '🌳 Đang lớn', '🎄 Cây lớn'];
        const currentStage = stageNames[freshTree.growthStage];
        
        // Kiểm tra thời gian chờ thu hoạch nếu cây đã lớn
        let harvestInfo = '';
        if (freshTree.growthStage >= 3 && freshTree.maturedAt) {
            const waitMinutes = (now - new Date(freshTree.maturedAt)) / (1000 * 60);
            if (waitMinutes >= 60) {
                harvestInfo = `🎉 **Cây đã có thể thu hoạch! Dùng lệnh \`thuhoach ${treeNumber}\`**`;
            } else {
                const remainingMinutes = Math.ceil(60 - waitMinutes);
                harvestInfo = `⏳ **Còn ${remainingMinutes} phút nữa có thể thu hoạch**`;
            }
        } else {
            harvestInfo = `⏳ **Cần thêm:** ${Math.max(0, 3 - freshTree.waterCount)} lần tưới`;
        }

        const embed = new EmbedBuilder()
            .setTitle('💧 TƯỚI NƯỚC THÀNH CÔNG!')
            .setDescription(`**Cây số ${treeNumber}: ${freshTree.species}** của ${message.author.displayName}\n\n` +
                `**📊 Trạng thái hiện tại:**\n` +
                `🎭 Giai đoạn: ${currentStage}\n` +
                `💧 Lần tưới: ${freshTree.waterCount}/3\n` +
                `🕒 Lần tưới cuối: Vừa xong\n` +
                `${freshTree.maturedAt ? `⏰ Trưởng thành lúc: ${new Date(freshTree.maturedAt).toLocaleTimeString('vi-VN')}\n` : ''}` +
                harvestInfo)
            .setThumbnail(TREE_IMAGES[freshTree.species])
            .setColor(freshTree.growthStage >= 3 ? '#FFD700' : '#00FF00')
            .setFooter({ text: `Cây số ${treeNumber} - ${freshTree.waterCount < 3 ? 'Tưới nước tiếp theo sau 30 phút!' : 'Đã đủ nước, chờ thu hoạch!'}` });

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