const { EmbedBuilder } = require('discord.js');
const FastUtils = require('../../utils/fastUtils');
const { TREE_VALUES, TREE_IMAGES } = require('../../utils/constants');
const Tree = require('../../models/Tree');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'thuhoach',
    description: 'Thu hoạch cây đã lớn để nhận Rin',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 2 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'thuhoach', 
                1, // Giảm cooldown
                this.executeThuHoach,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },
    
    async executeThuHoach(message, args) {
        const userId = message.author.id;
        
        // Tìm tất cả cây của người chơi trong server này
        const trees = await Tree.find({ userId, guildId: message.guild.id }).sort({ plantedAt: 1 });
        if (trees.length === 0) {
            return message.reply('❌ Bạn chưa có cây nào! Hãy dùng lệnh `muacay` để trồng cây.');
        }

        // Nếu có nhiều cây và không chỉ định số thứ tự
        if (trees.length > 1 && args.length === 0) {
            let treeList = '';
            let readyTrees = 0;
            
            trees.forEach((tree, index) => {
                const stageEmojis = ['🌱', '🌿', '🌳', '🎄'];
                const emoji = stageEmojis[tree.growthStage] || '🌱';
                
                // Kiểm tra điều kiện thu hoạch
                const now = new Date();
                const ageInMinutes = (now - new Date(tree.plantedAt)) / (1000 * 60);
                tree.age = Math.floor(ageInMinutes);
                
                const requiredWaters = this.getRequiredWaters(tree.species);
                const requiredAge = 60;
                
                const canHarvest = tree.waterCount >= requiredWaters && tree.age >= requiredAge;
                if (canHarvest) readyTrees++;
                
                const status = canHarvest ? '✅ Có thể thu hoạch' : '⏳ Chưa đủ điều kiện';
                const value = TREE_VALUES[tree.species];
                
                treeList += `${index + 1}. ${emoji} **${tree.species}** (${value} Rin) - ${status}\n`;
            });
            
            return message.reply(`🌱 **Bạn có ${trees.length} cây!** (${readyTrees} cây có thể thu hoạch)\n\n${treeList}\n💡 **Cách dùng:** \`thuhoach 1\` (thu hoạch cây số 1) hoặc \`thuhoach all\` (thu hoạch tất cả)`);
        }

        // Xử lý thu hoạch tất cả
        if (args[0] && args[0].toLowerCase() === 'all') {
            const readyTrees = [];
            const now = new Date();
            
            for (let i = 0; i < trees.length; i++) {
                const tree = trees[i];
                const ageInMinutes = (now - new Date(tree.plantedAt)) / (1000 * 60);
                tree.age = Math.floor(ageInMinutes);
                
                const requiredWaters = this.getRequiredWaters(tree.species);
                const requiredAge = 60;
                
                if (tree.waterCount >= requiredWaters && tree.age >= requiredAge) {
                    readyTrees.push({ tree, index: i + 1 });
                }
            }
            
            if (readyTrees.length === 0) {
                return message.reply('❌ Không có cây nào đủ điều kiện thu hoạch!');
            }
            
            let totalReward = 0;
            let harvestSummary = '';
            
            for (const { tree, index } of readyTrees) {
                const reward = TREE_VALUES[tree.species];
                totalReward += reward;
                harvestSummary += `${index}. **${tree.species}**: ${reward} Rin\n`;
                await Tree.deleteOne({ _id: tree._id });
            }
            
            await FastUtils.updateFastUserRin(userId, totalReward);
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 THU HOẠCH TẤT CẢ THÀNH CÔNG!')
                .setDescription(`${message.author.displayName} đã thu hoạch **${readyTrees.length} cây**!\n\n` +
                    `**💰 Chi tiết thu hoạch:**\n${harvestSummary}\n` +
                    `**📊 Tổng kết:**\n` +
                    `🎁 Tổng Rin nhận được: **${totalReward} Rin**\n` +
                    `🌱 Còn lại: ${trees.length - readyTrees.length} cây\n\n` +
                    `**💡 Tip:** Hãy trồng thêm cây để tiếp tục làm nông!`)
                .setColor('#FFD700')
                .setFooter({ text: 'Chúc mừng! Bạn là nông dân xuất sắc!' });
            
            return await message.reply({ embeds: [embed] });
        }

        // Xác định cây cần thu hoạch
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

        // Kiểm tra điều kiện thu hoạch
        if (tree.waterCount < 3) {
            return message.reply(`❌ Cây số ${treeNumber} chưa đủ 3 lần tưới! Hiện tại: **${tree.waterCount}** lần.`);
        }
        // Đủ 3 lần tưới, kiểm tra đã đủ 1 tiếng chưa
        const nowTime = new Date();
        const waitMinutes = (nowTime - new Date(tree.plantedAt)) / (1000 * 60);
        if (waitMinutes < 60) {
            const remain = Math.ceil(60 - waitMinutes);
            return message.reply(`⏳ Cây số ${treeNumber} cần chờ thêm **${remain} phút** sau lần tưới/bón cuối cùng mới thu hoạch được!`);
        }
        // Kiểm tra cây chết
        if (tree.maturedAt) {
            const deadMinutes = (nowTime - new Date(tree.maturedAt)) / (1000 * 60);
            if (deadMinutes >= 180) {
                await Tree.deleteOne({ _id: tree._id });
                return message.reply(`💀 Cây số ${treeNumber} đã chết vì không thu hoạch sau 3 tiếng trưởng thành!`);
            }
        }

        // Kiểm tra lại cây trước khi thu hoạch (tránh race condition)
        const freshTree = await Tree.findById(tree._id);
        if (!freshTree) {
            return message.reply(`❌ Cây số ${treeNumber} không tồn tại! (Phát hiện spam)`);
        }

        // Thu hoạch thành công
        const reward = TREE_VALUES[freshTree.species];
        const profit = reward - 50; // Trừ đi giá hạt giống
        const profitText = freshTree.bonused ? profit - 30 : profit; // Trừ thêm tiền phân nếu có

        await FastUtils.updateFastUserRin(userId, reward);
        await Tree.deleteOne({ _id: freshTree._id }); // Xóa cây sau khi thu hoạch

        // Tính thống kê
        const totalDays = Math.floor(freshTree.age / (60 * 24));
        const totalHours = Math.floor((freshTree.age % (60 * 24)) / 60);
        const totalMinutes = freshTree.age % 60;

        let timeText = '';
        if (totalDays > 0) timeText += `${totalDays} ngày `;
        if (totalHours > 0) timeText += `${totalHours} giờ `;
        if (totalMinutes > 0) timeText += `${totalMinutes} phút`;

        // Đếm số cây còn lại trong server này
        const remainingTrees = await Tree.countDocuments({ userId, guildId: message.guild.id });

        const embed = new EmbedBuilder()
            .setTitle('🎉 THU HOẠCH THÀNH CÔNG!')
            .setDescription(`${message.author.displayName} đã thu hoạch **Cây số ${treeNumber}: ${freshTree.species}**!\n\n` +
                `**💰 Phần thưởng:**\n` +
                `🎁 Nhận được: **${reward} Rin**\n` +
                `📊 Lợi nhuận ròng: **${profitText >= 0 ? '+' : ''}${profitText} Rin**\n\n` +
                `**📈 Thống kê cây:**\n` +
                `⏰ Thời gian nuôi: ${timeText}\n` +
                `💧 Tổng lần tưới: ${freshTree.waterCount}\n` +
                `💚 Đã bón phân: ${freshTree.bonused ? 'Có (+30 Rin)' : 'Không'}\n` +
                `🌱 Giá hạt giống: 50 Rin\n\n` +
                `**📊 Farm hiện tại:** ${remainingTrees}/5 cây\n\n` +
                `**💡 Tip:** ${remainingTrees < 5 ? 'Có thể trồng thêm cây!' : 'Bạn có thể tiếp tục chăm sóc hoặc thu hoạch cây khác!'}`)
            .setThumbnail(TREE_IMAGES[freshTree.species])
            .setColor('#FFD700')
            .setFooter({ text: 'Chúc mừng thành quả lao động của bạn!' });

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