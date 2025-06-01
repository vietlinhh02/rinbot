const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { TREE_VALUES, TREE_IMAGES } = require('../../utils/constants');
const Tree = require('../../models/Tree');

module.exports = {
    name: 'muacay',
    description: 'Mua hạt giống và trồng cây random (50 Rin, mỗi người chỉ được 1 cây, mỗi cây chỉ cần 3 lần tưới, chờ 1 tiếng sau lần tưới/bón cuối cùng để thu hoạch)',
    
    async execute(message, args) {
        const userId = message.author.id;
        
        // Kiểm tra số cây hiện có (giới hạn 1 cây)
        const existingTrees = await Tree.find({ userId, guildId: message.guild.id });
        const maxTrees = 1;
        if (existingTrees.length >= maxTrees) {
            let treeList = '';
            existingTrees.forEach((tree, index) => {
                const stageNames = ['🌱', '🌿', '🌳', '🎄'];
                const stage = stageNames[tree.growthStage] || '🌱';
                treeList += `${index + 1}. ${stage} **${tree.species}** (${tree.waterCount} lần tưới)\n`;
            });
            return message.reply(`❌ Bạn chỉ được trồng 1 cây!\n\n**🌱 Cây hiện có:**\n${treeList}\n💡 Hãy thu hoạch hoặc bán cây để trồng mới.`);
        }

        // Kiểm tra số Rin
        const userRin = await getUserRin(userId);
        if (userRin < 50) {
            return message.reply('❌ Bạn cần ít nhất 50 Rin để mua hạt giống!');
        }

        // Random chọn cây
        const treeTypes = Object.keys(TREE_VALUES);
        const randomTree = treeTypes[Math.floor(Math.random() * treeTypes.length)];

        // Trồng cây random
        return await this.plantTree(message, randomTree, userId, false);
    },

    async plantTree(messageOrInteraction, treeType, userId, isInteraction = false) {
        // Kiểm tra giới hạn số cây
        const guildId = isInteraction ? messageOrInteraction.guild.id : messageOrInteraction.guild.id;
        const existingTrees = await Tree.find({ userId, guildId });
        const maxTrees = 1;
        
        if (existingTrees.length >= maxTrees) {
            const content = `❌ Bạn đã đạt giới hạn ${maxTrees} cây! Hãy thu hoạch hoặc bán bớt cây trước.`;
            if (isInteraction) {
                return messageOrInteraction.reply({ content, ephemeral: true });
            } else {
                return messageOrInteraction.reply(content);
            }
        }

        // Kiểm tra số Rin
        const userRin = await getUserRin(userId);
        if (userRin < 50) {
            const content = '❌ Bạn cần ít nhất 50 Rin để mua hạt giống!';
            if (isInteraction) {
                return messageOrInteraction.reply({ content, ephemeral: true });
            } else {
                return messageOrInteraction.reply(content);
            }
        }

        // Trừ tiền và tạo cây
        await updateUserRin(userId, -50);
        
        const newTree = new Tree({
            userId,
            guildId,
            species: treeType,
            age: 0,
            waterCount: 0,
            growthStage: 0,
            lastWater: null,
            bonused: false,
            plantedAt: new Date()
        });
        await newTree.save();

        // Đếm lại số cây sau khi trồng
        const updatedTrees = await Tree.find({ userId, guildId });

        const embed = new EmbedBuilder()
            .setTitle('🌱 TRỒNG CÂY THÀNH CÔNG!')
            .setDescription(`${isInteraction ? messageOrInteraction.user.displayName : messageOrInteraction.author.displayName} đã được random **${treeType}**! 🎲\n\n` +
                `**📊 Trạng thái farm:** ${updatedTrees.length}/1 cây\n\n` +
                '**🎯 Mục tiêu:**\n' +
                `• Thu hoạch để nhận ${TREE_VALUES[treeType]} Rin\n` +
                '• Tưới nước 3 lần (mỗi 30 phút/lần)\n' +
                '• Chờ đúng 1 tiếng sau lần tưới/bón cuối cùng để thu hoạch\n' +
                '• Mỗi người chỉ được 1 cây\n\n' +
                '**💡 Tips:**\n' +
                '• Dùng `bonphan` để tăng tốc\n' +
                '• Dùng `caycheck` để xem trạng thái cây\n' +
                '**🎲 Lần tới sẽ random cây khác!**')
            .setThumbnail(TREE_IMAGES[treeType])
            .setColor('#00FF00')
            .setFooter({ text: 'Chúc mừng! May mắn lần sau nhé!' });

        if (isInteraction) {
            await messageOrInteraction.reply({ embeds: [embed] });
        } else {
            await messageOrInteraction.reply({ embeds: [embed] });
        }
    },

    async handleInteraction(interaction) {
        // Giữ lại function này để tương thích ngược
        // Nhưng giờ không cần dùng nữa vì đã random
        return;
    }
}; 