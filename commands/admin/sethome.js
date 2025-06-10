const { EmbedBuilder } = require('discord.js');
const { updateCityUser, getCityUser } = require('../../utils/database');
const FastUtils = require('../../utils/fastUtils');

// Thông tin các loại nhà
const HOUSE_TYPES = {
    'nhatro': { name: 'Nhà Trọ', price: 500 },
    'nhatuong': { name: 'Nhà Thường', price: 2000 },
    'nhalau': { name: 'Nhà Lầu', price: 5000 },
    'bietthu': { name: 'Biệt Thự', price: 8000 }
};

module.exports = {
    name: 'sethome',
    description: '[ADMIN] Set nhà cho user',
    
    async execute(message, args) {
        // Kiểm tra quyền admin
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Chỉ admin mới có thể sử dụng lệnh này!');
        }

        if (args.length < 2) {
            return message.reply('❌ Cú pháp: `,sethome @user <nhatro|nhatuong|nhalau|bietthu|null>`');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Phải mention user cần set nhà!');
        }

        const houseType = args[1].toLowerCase();
        
        if (houseType === 'null') {
            // Reset nhà về null
            await updateCityUser(targetUser.id, { 
                home: null,
                job: null,  // Reset luôn nghề vì cần nhà để có nghề
                lastRepair: null
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ ĐÃ RESET NHÀ')
                .setDescription(`**Target:** ${targetUser.displayName}\n` +
                    `**Hành động:** Reset nhà về null\n` +
                    `**Ghi chú:** Nghề cũng bị reset do không có nhà`)
                .setColor('#00FF00')
                .setFooter({ text: `Set by ${message.author.displayName}` });

            return message.reply({ embeds: [embed] });
        }

        if (!HOUSE_TYPES[houseType]) {
            return message.reply('❌ Loại nhà không hợp lệ! Sử dụng: `nhatro`, `nhatuong`, `nhalau`, `bietthu`, hoặc `null`');
        }

        const cityUser = await getCityUser(targetUser.id);
        const houseInfo = HOUSE_TYPES[houseType];

        await updateCityUser(targetUser.id, {
            home: houseType,
            lastRepair: new Date()
        });

        const embed = new EmbedBuilder()
            .setTitle('🏠 ĐÃ SET NHÀ THÀNH CÔNG')
            .setDescription(`**Target:** ${targetUser.displayName}\n` +
                `**Nhà mới:** ${houseInfo.name}\n` +
                `**Giá trị:** ${houseInfo.price} Rin\n` +
                `**Nhà cũ:** ${cityUser.home ? HOUSE_TYPES[cityUser.home]?.name || 'Không rõ' : 'Chưa có'}\n\n` +
                `**📋 Ghi chú:**\n` +
                `• User giờ có thể đăng ký nghề phù hợp\n` +
                `• Không tự động trừ tiền user\n` +
                `• Last repair đã được set về hiện tại`)
            .setColor('#00FF00')
            .setFooter({ text: `Set by ${message.author.displayName}` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}; 