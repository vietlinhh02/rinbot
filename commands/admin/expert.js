const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Expert, Consultation } = require('../../models/Expert');

// Các lĩnh vực chuyên môn
const SPECIALTIES = {
    'general': '🌟 Tổng quát',
    'love': '💕 Tình yêu',
    'career': '💼 Sự nghiệp',
    'health': '🏥 Sức khỏe',
    'finance': '💰 Tài chính',
    'family': '👨‍👩‍👧‍👦 Gia đình',
    'education': '📚 Học tập',
    'life': '🌈 Cuộc sống'
};

module.exports = {
    name: 'expert',
    description: 'Quản lý chuyên gia tư vấn (Admin only)',
    async execute(message, args) {
        try {
            // Kiểm tra quyền admin
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await message.reply('❌ Chỉ admin mới có thể sử dụng lệnh này!');
            }

            if (!args[0]) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🔧 QUẢN LÝ CHUYÊN GIA')
                    .setDescription('**Các lệnh quản lý chuyên gia:**\n\n' +
                        '**Thêm chuyên gia:**\n' +
                        '`,expert add @user [specialty1] [specialty2]...`\n' +
                        '**Ví dụ:** `,expert add @john love career`\n\n' +
                        '**Xóa chuyên gia:**\n' +
                        '`,expert remove @user`\n\n' +
                        '**Danh sách chuyên gia:**\n' +
                        '`,expert list`\n\n' +
                        '**Thống kê:**\n' +
                        '`,expert stats`\n\n' +
                        '**Bật/tắt chuyên gia:**\n' +
                        '`,expert toggle @user`')
                    .addFields({
                        name: '📋 Lĩnh vực chuyên môn',
                        value: Object.entries(SPECIALTIES)
                            .map(([key, name]) => `\`${key}\` - ${name}`)
                            .join('\n'),
                        inline: false
                    })
                    .setColor('#0099FF');

                return await message.reply({ embeds: [helpEmbed] });
            }

            const subcommand = args[0].toLowerCase();

            switch (subcommand) {
                case 'add':
                    await this.addExpert(message, args);
                    break;
                case 'remove':
                    await this.removeExpert(message, args);
                    break;
                case 'list':
                    await this.listExperts(message);
                    break;
                case 'stats':
                    await this.showStats(message);
                    break;
                case 'toggle':
                    await this.toggleExpert(message, args);
                    break;
                default:
                    await message.reply('❌ Lệnh không hợp lệ! Gõ `,expert` để xem hướng dẫn.');
            }

        } catch (error) {
            console.error('Lỗi expert command:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Thêm chuyên gia
    async addExpert(message, args) {
        if (!message.mentions.users.first()) {
            return await message.reply('❌ Vui lòng tag user cần thêm làm chuyên gia!');
        }

        const user = message.mentions.users.first();
        const specialties = args.slice(2).filter(s => SPECIALTIES[s]);

        if (specialties.length === 0) {
            return await message.reply('❌ Vui lòng chỉ định ít nhất 1 lĩnh vực chuyên môn hợp lệ!');
        }

        try {
            // Kiểm tra đã là chuyên gia chưa
            const existingExpert = await Expert.findOne({ userId: user.id });
            
            if (existingExpert) {
                return await message.reply('❌ User này đã là chuyên gia rồi!');
            }

            // Tạo chuyên gia mới
            const expert = await Expert.create({
                userId: user.id,
                username: user.username,
                specialties: specialties,
                addedBy: message.author.id
            });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Đã thêm chuyên gia')
                .setDescription(`**Chuyên gia:** ${user.displayName}\n` +
                    `**Lĩnh vực:** ${specialties.map(s => SPECIALTIES[s]).join(', ')}\n` +
                    `**Trạng thái:** Đang hoạt động`)
                .setColor('#00FF00')
                .setThumbnail(user.displayAvatarURL());

            await message.reply({ embeds: [successEmbed] });

            // Gửi DM thông báo cho chuyên gia
            try {
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('🎉 Chúc mừng bạn đã trở thành chuyên gia!')
                    .setDescription(`Bạn đã được thêm vào hệ thống tư vấn với lĩnh vực: ${specialties.map(s => SPECIALTIES[s]).join(', ')}\n\n` +
                        '**Cách nhận và trả lời câu hỏi:**\n' +
                        '1️⃣ Bạn sẽ nhận được DM khi có câu hỏi mới\n' +
                        '2️⃣ Trả lời bằng format: `!reply [mã] [câu trả lời]`\n' +
                        '3️⃣ Hệ thống sẽ chuyển câu trả lời cho người hỏi\n\n' +
                        '🔒 **Hoàn toàn ẩn danh** - Bạn và người hỏi không biết nhau')
                    .setColor('#00FF00');

                await user.send({ embeds: [welcomeEmbed] });
            } catch (dmError) {
                console.log('Không thể gửi DM cho chuyên gia:', dmError.message);
            }

        } catch (error) {
            console.error('Lỗi add expert:', error);
            await message.reply('❌ Có lỗi xảy ra khi thêm chuyên gia!');
        }
    },

    // Xóa chuyên gia
    async removeExpert(message, args) {
        if (!message.mentions.users.first()) {
            return await message.reply('❌ Vui lòng tag user cần xóa khỏi danh sách chuyên gia!');
        }

        const user = message.mentions.users.first();

        try {
            const expert = await Expert.findOneAndDelete({ userId: user.id });
            
            if (!expert) {
                return await message.reply('❌ User này không phải là chuyên gia!');
            }

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Đã xóa chuyên gia')
                .setDescription(`**${user.displayName}** đã được xóa khỏi danh sách chuyên gia.`)
                .setColor('#FF0000');

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Lỗi remove expert:', error);
            await message.reply('❌ Có lỗi xảy ra khi xóa chuyên gia!');
        }
    },

    // Danh sách chuyên gia
    async listExperts(message) {
        try {
            const experts = await Expert.find({}).sort({ totalConsultations: -1 });
            
            if (experts.length === 0) {
                return await message.reply('📋 Chưa có chuyên gia nào!');
            }

            const expertList = experts.map((expert, index) => {
                const status = expert.status === 'active' ? '🟢' : '🔴';
                const available = expert.isAvailable ? '✅' : '⏸️';
                const specialties = expert.specialties.map(s => SPECIALTIES[s]).join(', ');
                
                return `${index + 1}. ${status}${available} **${expert.username}**\n` +
                       `   📋 ${specialties}\n` +
                       `   📊 ${expert.totalConsultations} tư vấn • ⭐ ${expert.rating}/5`;
            }).join('\n\n');

            const listEmbed = new EmbedBuilder()
                .setTitle('👥 DANH SÁCH CHUYÊN GIA')
                .setDescription(expertList)
                .setColor('#0099FF')
                .setFooter({ text: '🟢 Active • 🔴 Inactive • ✅ Available • ⏸️ Busy' });

            await message.reply({ embeds: [listEmbed] });

        } catch (error) {
            console.error('Lỗi list experts:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Thống kê
    async showStats(message) {
        try {
            const totalExperts = await Expert.countDocuments();
            const activeExperts = await Expert.countDocuments({ status: 'active' });
            const availableExperts = await Expert.countDocuments({ status: 'active', isAvailable: true });
            
            const totalConsultations = await Consultation.countDocuments();
            const pendingConsultations = await Consultation.countDocuments({ status: 'pending' });
            const assignedConsultations = await Consultation.countDocuments({ status: 'assigned' });
            const answeredConsultations = await Consultation.countDocuments({ status: 'answered' });

            const statsEmbed = new EmbedBuilder()
                .setTitle('📊 THỐNG KÊ HỆ THỐNG TƯ VẤN')
                .addFields(
                    {
                        name: '👥 Chuyên gia',
                        value: `**Tổng:** ${totalExperts}\n` +
                               `**Đang hoạt động:** ${activeExperts}\n` +
                               `**Sẵn sàng:** ${availableExperts}`,
                        inline: true
                    },
                    {
                        name: '📋 Tư vấn',
                        value: `**Tổng:** ${totalConsultations}\n` +
                               `**Đang chờ:** ${pendingConsultations}\n` +
                               `**Đã gán:** ${assignedConsultations}\n` +
                               `**Đã trả lời:** ${answeredConsultations}`,
                        inline: true
                    }
                )
                .setColor('#FFA500')
                .setTimestamp();

            await message.reply({ embeds: [statsEmbed] });

        } catch (error) {
            console.error('Lỗi show stats:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Bật/tắt chuyên gia
    async toggleExpert(message, args) {
        if (!message.mentions.users.first()) {
            return await message.reply('❌ Vui lòng tag chuyên gia cần bật/tắt!');
        }

        const user = message.mentions.users.first();

        try {
            const expert = await Expert.findOne({ userId: user.id });
            
            if (!expert) {
                return await message.reply('❌ User này không phải là chuyên gia!');
            }

            const newStatus = expert.status === 'active' ? 'inactive' : 'active';
            expert.status = newStatus;
            await expert.save();

            const statusEmbed = new EmbedBuilder()
                .setTitle('✅ Đã cập nhật trạng thái')
                .setDescription(`**${user.displayName}** đã được ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'}.`)
                .setColor(newStatus === 'active' ? '#00FF00' : '#FF0000');

            await message.reply({ embeds: [statusEmbed] });

        } catch (error) {
            console.error('Lỗi toggle expert:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    }
}; 