const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Expert, Consultation } = require('../../models/Expert');
const config = require('../../config/config.js');

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
    async execute(message, args, client) {
        try {
            // Kiểm tra quyền admin hoặc owner
            const isOwner = config.isOwner(message.author.id);
            const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
            
            if (!isAdmin && !isOwner) {
                return await message.reply('❌ Chỉ admin hoặc chủ bot mới có thể sử dụng lệnh này!');
            }

            if (!args[0]) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🔧 QUẢN LÝ CHUYÊN GIA')
                    .setDescription('**Các lệnh quản lý chuyên gia:**\n\n' +
                        '**Thêm/Cập nhật chuyên gia:**\n' +
                        '`,expert add @user [specialty1] [specialty2]...`\n' +
                        '**Ví dụ:** `,expert add @john love career`\n\n' +
                        '**Xóa lĩnh vực:**\n' +
                        '`,expert delfield @user [specialty1] [specialty2]...`\n' +
                        '**Ví dụ:** `,expert delfield @john love`\n\n' +
                        '**Xóa chuyên gia:**\n' +
                        '`,expert remove @user`\n\n' +
                        '**Danh sách chuyên gia:**\n' +
                        '`,expert list`\n\n' +
                        '**Thống kê:**\n' +
                        '`,expert stats`\n\n' +
                        '**Bật/tắt chuyên gia:**\n' +
                        '`,expert toggle @user`\n\n' +
                        '**🆕 Đăng ký room public:**\n' +
                        '`,expert setroom #channel` - Đặt room để public câu hỏi\n' +
                        '`,expert removeroom` - Xóa room public\n' +
                        '`,expert showroom` - Xem room hiện tại\n\n' +
                        '**🎛️ Tùy chỉnh mã:**\n' +
                        '`,expert setcode [format]` - Đặt format mã (VD: Q{4}, ASK{6})\n' +
                        '`,expert resetcode` - Reset về mã mặc định\n' +
                        '`,expert showcode` - Xem format hiện tại')
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
                case 'delfield':
                    await this.removeSpecialty(message, args);
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
                case 'setroom':
                    await this.setPublicRoom(message, args);
                    break;
                case 'removeroom':
                    await this.removePublicRoom(message);
                    break;
                case 'showroom':
                    await this.showPublicRoom(message);
                    break;
                case 'setcode':
                    await this.setCodeFormat(message, args);
                    break;
                case 'resetcode':
                    await this.resetCodeFormat(message);
                    break;
                case 'showcode':
                    await this.showCodeFormat(message);
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
            let expert = await Expert.findOne({ userId: user.id });
            
            if (expert) {
                // Nếu đã là chuyên gia, thêm lĩnh vực mới
                const newSpecialties = [...new Set([...expert.specialties, ...specialties])]; // Loại bỏ trùng lặp
                expert.specialties = newSpecialties;
                await expert.save();
                
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Đã cập nhật lĩnh vực')
                    .setDescription(`**Chuyên gia:** ${user.displayName}\n` +
                        `**Lĩnh vực hiện tại:** ${newSpecialties.map(s => SPECIALTIES[s]).join(', ')}\n` +
                        `**Trạng thái:** ${expert.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}`)
                    .setColor('#00FF00')
                    .setThumbnail(user.displayAvatarURL());

                return await message.reply({ embeds: [successEmbed] });
            }

            // Tạo chuyên gia mới nếu chưa tồn tại
            expert = await Expert.create({
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

    // Xóa lĩnh vực của chuyên gia
    async removeSpecialty(message, args) {
        if (!message.mentions.users.first()) {
            return await message.reply('❌ Vui lòng tag chuyên gia cần xóa lĩnh vực!');
        }

        const user = message.mentions.users.first();
        const specialtiesToRemove = args.slice(2).filter(s => SPECIALTIES[s]);

        if (specialtiesToRemove.length === 0) {
            return await message.reply('❌ Vui lòng chỉ định ít nhất 1 lĩnh vực cần xóa!');
        }

        try {
            const expert = await Expert.findOne({ userId: user.id });
            
            if (!expert) {
                return await message.reply('❌ User này không phải là chuyên gia!');
            }

            // Lọc ra các lĩnh vực còn lại
            const remainingSpecialties = expert.specialties.filter(s => !specialtiesToRemove.includes(s));
            
            if (remainingSpecialties.length === 0) {
                return await message.reply('❌ Không thể xóa tất cả lĩnh vực! Chuyên gia cần ít nhất 1 lĩnh vực.\n\nNếu muốn xóa hoàn toàn, hãy dùng lệnh `,expert remove @user`');
            }

            // Cập nhật lĩnh vực
            expert.specialties = remainingSpecialties;
            await expert.save();

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Đã xóa lĩnh vực')
                .setDescription(`**Chuyên gia:** ${user.displayName}\n` +
                    `**Đã xóa:** ${specialtiesToRemove.map(s => SPECIALTIES[s]).join(', ')}\n` +
                    `**Lĩnh vực còn lại:** ${remainingSpecialties.map(s => SPECIALTIES[s]).join(', ')}`)
                .setColor('#FFA500')
                .setThumbnail(user.displayAvatarURL());

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Lỗi remove specialty:', error);
            await message.reply('❌ Có lỗi xảy ra khi xóa lĩnh vực!');
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
    },

    // Đặt room public cho câu hỏi
    async setPublicRoom(message, args) {
        try {
            const channel = message.mentions.channels.first();
            if (!channel) {
                return await message.reply('❌ Vui lòng tag channel cần đặt làm room public!\n**Ví dụ:** `,expert setroom #hoi-chuyen-gia`');
            }

            // Kiểm tra quyền của bot trong channel
            const botMember = message.guild.members.cache.get(message.client.user.id);
            const permissions = channel.permissionsFor(botMember);
            
            if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                return await message.reply('❌ Bot không có quyền gửi tin nhắn trong channel này!');
            }

            // Lưu vào database hoặc config
            const { getGuildConfig, updateGuildConfig } = require('../../utils/database');
            await updateGuildConfig(message.guild.id, { 
                expertPublicRoom: channel.id 
            });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Đã đặt room public')
                .setDescription(`**Channel:** ${channel}\n\n` +
                    '📋 **Cách hoạt động mới:**\n' +
                    '• Khi có người hỏi chuyên gia, câu hỏi sẽ được đăng công khai trong room này\n' +
                    '• Chuyên gia có thể reply trực tiếp bằng button, không cần mã phức tạp\n' +
                    '• Reply sẽ ẩn danh (không hiện tên chuyên gia)\n' +
                    '• Người hỏi và chuyên gia đều thấy câu hỏi & câu trả lời')
                .setColor('#00FF00');

            await message.reply({ embeds: [successEmbed] });

            // Gửi thông báo vào room được đặt
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🎉 ROOM CHUYÊN GIA ĐƯỢC KÍCH HOẠT')
                .setDescription('**Room này đã được đặt làm nơi public câu hỏi chuyên gia!**\n\n' +
                    '📋 **Cách thức hoạt động:**\n' +
                    '• Khi có người sử dụng lệnh hỏi chuyên gia, câu hỏi sẽ xuất hiện ở đây\n' +
                    '• Chuyên gia có thể trả lời trực tiếp bằng button\n' +
                    '• Tất cả reply đều ẩn danh\n' +
                    '• Mọi người đều có thể thấy câu hỏi và câu trả lời\n\n' +
                    '🔒 **Hoàn toàn ẩn danh và chuyên nghiệp**')
                .setColor('#0099FF')
                .setFooter({ text: 'Hệ thống tư vấn công khai' });

            await channel.send({ embeds: [welcomeEmbed] });

        } catch (error) {
            console.error('Lỗi set public room:', error);
            await message.reply('❌ Có lỗi xảy ra khi đặt room public!');
        }
    },

    // Xóa room public
    async removePublicRoom(message) {
        try {
            const { getGuildConfig, updateGuildConfig } = require('../../utils/database');
            const config = await getGuildConfig(message.guild.id);
            
            if (!config?.expertPublicRoom) {
                return await message.reply('❌ Chưa có room public nào được đặt!');
            }

            await updateGuildConfig(message.guild.id, { 
                expertPublicRoom: null 
            });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Đã xóa room public')
                .setDescription('Hệ thống sẽ quay lại chế độ DM như cũ.')
                .setColor('#FF0000');

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Lỗi remove public room:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Xem room public hiện tại
    async showPublicRoom(message) {
        try {
            const { getGuildConfig } = require('../../utils/database');
            const config = await getGuildConfig(message.guild.id);
            
            if (!config?.expertPublicRoom) {
                return await message.reply('📋 Chưa có room public nào được đặt.\n\nSử dụng `,expert setroom #channel` để đặt room.');
            }

            const channel = message.guild.channels.cache.get(config.expertPublicRoom);
            if (!channel) {
                return await message.reply('⚠️ Room public đã bị xóa hoặc không tồn tại.');
            }

            const infoEmbed = new EmbedBuilder()
                .setTitle('📋 Room Public Hiện Tại')
                .setDescription(`**Channel:** ${channel}\n\n` +
                    '✅ Đang hoạt động bình thường\n' +
                    '📊 Câu hỏi mới sẽ được đăng công khai ở đây')
                .setColor('#0099FF');

            await message.reply({ embeds: [infoEmbed] });

        } catch (error) {
            console.error('Lỗi show public room:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Đặt format mã custom
    async setCodeFormat(message, args) {
        try {
            if (!args[1]) {
                return await message.reply('❌ Vui lòng nhập format mã!\n\n' +
                    '**Cách sử dụng:**\n' +
                    '`,expert setcode Q{4}` - Mã dạng Q1234\n' +
                    '`,expert setcode ASK{6}` - Mã dạng ASK123456\n' +
                    '`,expert setcode HELP{3}` - Mã dạng HELP123\n\n' +
                    '**Lưu ý:** {số} là độ dài phần số ngẫu nhiên');
            }

            const format = args[1];
            
            // Validate format
            const formatRegex = /^[A-Z]*\{([1-9]\d*)\}$/;
            const match = format.match(formatRegex);
            
            if (!match) {
                return await message.reply('❌ Format không hợp lệ!\n\n' +
                    '**Format đúng:** [PREFIX]{số}\n' +
                    '**Ví dụ:** Q{4}, ASK{6}, HELP{3}\n' +
                    '• PREFIX có thể rỗng hoặc chỉ chứa chữ IN HOA\n' +
                    '• Số phải từ 1-20');
            }

            const length = parseInt(match[1]);
            if (length > 20) {
                return await message.reply('❌ Độ dài tối đa là 20 ký tự!');
            }

            // Lưu format
            const { getGuildConfig, updateGuildConfig } = require('../../utils/database');
            await updateGuildConfig(message.guild.id, { 
                expertCodeFormat: format 
            });

            const prefix = format.replace(/\{\d+\}$/, '');
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Đã đặt format mã')
                .setDescription(`**Format mới:** \`${format}\`\n\n` +
                    `**Ví dụ mã:** \`${this.generateCode(format)}\`\n` +
                    `**Prefix:** ${prefix || '(Không có)'}\n` +
                    `**Độ dài số:** ${length} ký tự\n\n` +
                    '✨ Format này sẽ áp dụng cho tất cả câu hỏi mới!')
                .setColor('#00FF00');

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Lỗi set code format:', error);
            await message.reply('❌ Có lỗi xảy ra khi đặt format mã!');
        }
    },

    // Reset format mã về mặc định
    async resetCodeFormat(message) {
        try {
            const { getGuildConfig, updateGuildConfig } = require('../../utils/database');
            await updateGuildConfig(message.guild.id, { 
                expertCodeFormat: null 
            });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Đã reset format mã')
                .setDescription('**Format:** Mặc định (4 ký tự ngẫu nhiên)\n' +
                    '**Ví dụ:** `A1B2`, `X9Y7`\n\n' +
                    '🔄 Đã quay về format mặc định của hệ thống!')
                .setColor('#FFA500');

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Lỗi reset code format:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Xem format mã hiện tại
    async showCodeFormat(message) {
        try {
            const { getGuildConfig } = require('../../utils/database');
            const config = await getGuildConfig(message.guild.id);
            
            const format = config?.expertCodeFormat;
            
            let description;
            if (format) {
                description = `**Format hiện tại:** \`${format}\`\n` +
                    `**Ví dụ mã:** \`${this.generateCode(format)}\`\n\n` +
                    '🎛️ **Custom format được thiết lập**\n' +
                    'Dùng `,expert resetcode` để về mặc định';
            } else {
                description = '**Format:** Mặc định (4 ký tự ngẫu nhiên)\n' +
                    '**Ví dụ:** `A1B2`, `X9Y7`\n\n' +
                    '⚙️ **Sử dụng format mặc định**\n' +
                    'Dùng `,expert setcode [format]` để tùy chỉnh';
            }

            const infoEmbed = new EmbedBuilder()
                .setTitle('🎛️ Format Mã Câu Hỏi')
                .setDescription(description)
                .setColor('#0099FF');

            await message.reply({ embeds: [infoEmbed] });

        } catch (error) {
            console.error('Lỗi show code format:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Helper: Generate code theo format
    generateCode(format) {
        if (!format) {
            // Mặc định
            return Math.random().toString(36).substring(2, 6).toUpperCase();
        }

        const match = format.match(/^([A-Z]*)\{(\d+)\}$/);
        if (!match) return 'INVALID';

        const prefix = match[1];
        const length = parseInt(match[2]);
        
        // Tạo phần số ngẫu nhiên
        let randomPart = '';
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < length; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return prefix + randomPart;
    }
}; 