const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildPrefix } = require('../../utils/database');
const { getPrefix } = require('../../utils/prefixHelper');
const config = require('../../config/config.js');

module.exports = {
    name: 'rinhelp',
    description: 'Hiển thị hướng dẫn sử dụng bot',
    async execute(message, args) {
        const topic = args[0]?.toLowerCase();
        const prefix = await getGuildPrefix(message.guild.id);

        // Nếu không có topic, hiển thị menu chính
        if (!topic) {
            const embed = new EmbedBuilder()
                .setTitle('📖 HƯỚNG DẪN RINBOT')
                .setDescription('**🤖 Chào mừng đến với RinBot!** 🎉\n\n' +
                    'RinBot là bot đa năng với nhiều tính năng vui nhộn!\n\n' +
                    '**📚 Danh mục hướng dẫn:**\n' +
                    `• \`${prefix}rinhelp basic\` - 💰 Lệnh cơ bản (Rin, shop, marriage, AI)\n` +
                    `• \`${prefix}rinhelp farm\` - 🌱 Hệ thống Farm (trồng cây)\n` +
                    `• \`${prefix}rinhelp pet\` - 🐾 Hệ thống Pet (nuôi thú cưng)\n` +
                    `• \`${prefix}rinhelp city\` - 🏙️ Hệ thống City (thuê nhà, nghề nghiệp)\n` +
                    `• \`${prefix}rinhelp games\` - 🎮 Các game giải trí\n` +
                    `• \`${prefix}rinhelp xidach\` - 🃏 Game Xì Dách chi tiết\n` +
                    `• \`${prefix}rinhelp taixiu\` - 🎲 Game Tài Xỉu chi tiết\n` +
                    `• \`${prefix}rinhelp admin\` - ⚙️ Lệnh admin (chỉ mod)\n\n` +
                    '**🆘 Hỗ trợ thêm:**\n' +
                    `• Prefix hiện tại: \`${prefix}\`\n` +
                    `• Đổi prefix: \`${prefix}setprefix\`\n` +
                    '• Liên hệ dev nếu có lỗi')
                .setColor('#0099FF')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1157/1157109.png')
                .setFooter({ text: 'Chọn một chủ đề để xem hướng dẫn chi tiết!' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'basic') {
            const embed = new EmbedBuilder()
                .setTitle('💰 LỆNH CƠ BẢN')
                .setDescription('**Hệ thống tiền tệ và lệnh thiết yếu**')
                .addFields(
                    { 
                        name: '💳 Quản lý Rin', 
                        value: `• \`${prefix}rincheck\` - Xem số Rin hiện tại\n` +
                               `• \`${prefix}rindaily\` - Nhận 200 Rin mỗi ngày\n` +
                               `• \`${prefix}lamviec\` - Làm việc kiếm 50-150 Rin (4h/lần)\n` +
                               `• \`${prefix}top\` - Xem top người giàu (${prefix}top help)\n` +
                               `• \`${prefix}grin @user 100\` - Chuyển Rin`, 
                        inline: false 
                    },
                    { 
                        name: '🏪 Cửa hàng & Inventory', 
                        value: `• \`${prefix}shop\` - Xem cửa hàng\n` +
                               `• \`${prefix}inventory\` - Xem túi đồ\n` +
                               `• \`${prefix}buy thuoc 5\` - Mua thuốc (100 Rin/cái)\n` +
                               `• \`${prefix}buy balo\` - Mua balo (500 Rin, +5 slots)\n` +
                               `• \`${prefix}use thuoc @user\` - Dùng thuốc chữa pet`, 
                        inline: false 
                    },
                    { 
                        name: '💒 Hệ thống Marriage', 
                        value: `• \`${prefix}buy nhankim\` - Mua nhẫn kim (1,000 Rin)\n` +
                               `• \`${prefix}buy nhanbac\` - Mua nhẫn bạc (3,000 Rin)\n` +
                               `• \`${prefix}buy nhanvang\` - Mua nhẫn vàng (10,000 Rin)\n` +
                               `• \`${prefix}marry @user nhankim\` - Cầu hôn với nhẫn\n` +
                               `• \`${prefix}marriage\` - Xem thông tin hôn nhân\n` +
                               `• \`${prefix}divorce\` - Ly hôn (hoàn 30% giá nhẫn)`, 
                        inline: false 
                    },
                    { 
                        name: '🎲 Giải trí cơ bản', 
                        value: `• \`${prefix}cf\` - Tung xu cơ bản\n` +
                               `• \`${prefix}dice\` - Tung xúc xắc\n` +
                               `• \`${prefix}rps\` - Kéo búa bao\n` +
                               `• \`${prefix}8ball\` - Hỏi quả cầu pha lê`, 
                        inline: false 
                    },
                    { 
                        name: '⚙️ Tiện ích', 
                        value: `• \`${prefix}ping\` - Kiểm tra độ trễ bot\n` +
                               `• \`${prefix}avatar\` - Xem avatar\n` +
                               `• \`${prefix}userinfo\` - Thông tin user\n` +
                               `• \`${prefix}serverinfo\` - Thông tin server`, 
                        inline: false 
                    },
                    { 
                        name: '⏰ Nhắc nhở', 
                        value: `• \`${prefix}nhacnho 17h dậy đi học\` - Đặt nhắc nhở\n` +
                               `• \`${prefix}nhacnho 25/12 20h sinh nhật\` - Nhắc theo ngày\n` +
                               `• \`${prefix}xemnhacnho\` - Xem danh sách nhắc nhở\n` +
                               `• \`${prefix}huynhacnho 1\` - Hủy nhắc nhở số 1\n` +
                               `• **Gửi DM:** Bot sẽ gửi tin nhắn riêng khi tới giờ`, 
                        inline: false 
                    },
                    { 
                        name: '🔮 AI Bói & Tư vấn', 
                        value: `• \`${prefix}setgemini\` - Cài đặt Gemini API Key (miễn phí)\n` +
                               `• \`${prefix}boi\` - Xem bói AI ngẫu nhiên\n` +
                               `• \`${prefix}boi tarot\` - Bói bài Tarot\n` +
                               `• \`${prefix}boi tuongso\` - Tướng số\n` +
                               `• \`${prefix}boi sao\` - Bói sao\n` +
                               `• \`${prefix}hoi\` - Hỏi chuyên gia tư vấn ẩn danh\n` +
                               `• **8 chủ đề:** Tổng quát, Tình yêu, Sự nghiệp, Sức khỏe, Tài chính, Gia đình, Học tập, Cuộc sống\n` +
                               `• **Hoàn toàn ẩn danh:** Chuyên gia và người hỏi không biết nhau`, 
                        inline: false 
                    }
                )
                .setColor('#00CC99')
                .setFooter({ text: 'Đây là những lệnh bạn sẽ dùng thường xuyên nhất!' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'farm') {
            const embed = new EmbedBuilder()
                .setTitle('🌱 HỆ THỐNG FARM')
                .setDescription('**Trồng cây và thu hoạch để kiếm Rin!** 🚜')
                .addFields(
                    { 
                        name: '🌱 Trồng cây', 
                        value: `• \`${prefix}muacay\` - Random cây (50 Rin)\n` +
                               `• \`${prefix}caycheck\` - Xem tổng quan farm\n` +
                               `• \`${prefix}caycheck 1\` - Chi tiết cây số 1\n` +
                               `• **Giới hạn:** Mỗi người chỉ được 1 cây`, 
                        inline: false 
                    },
                    { 
                        name: '🚿 Chăm sóc', 
                        value: `• \`${prefix}tuoicay 1\` - Tưới cây số 1 (30p/lần)\n` +
                               `• \`${prefix}bonphan 1\` - Bón phân cây 1 (30 Rin)\n` +
                               `• **Lưu ý:** Mỗi cây chỉ bón phân 1 lần\n` +
                               `• **Hiệu quả:** Nếu chưa tưới nước lần nào thì bón phân sẽ tính là 2/3 lần tưới, nếu đã tưới rồi thì bón phân sẽ đủ 3/3 lần tưới`, 
                        inline: false 
                    },
                    { 
                        name: '🎯 Thu hoạch', 
                        value: `• \`${prefix}thuhoach 1\` - Thu hoạch cây 1\n` +
                               `• \`${prefix}bancay 1\` - Bán sớm cây 1 (thua lỗ)\n` +
                               `• **Điều kiện:** Đủ 3 lần tưới hoặc bón phân và chờ đúng 1 tiếng sau lần tưới/bón cuối cùng`, 
                        inline: false 
                    }
                )
                .setColor('#00CC99')
                .setFooter({ text: 'Chăm cây đủ 3 lần tưới hoặc bón phân, chờ 1 tiếng rồi thu hoạch!' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'pet') {
            const embed = new EmbedBuilder()
                .setTitle('🐾 HỆ THỐNG PET')
                .setDescription('**Nuôi thú cưng, ghép cặp và kiếm lời!** 🐕🐈')
                .addFields(
                    { 
                        name: '🏪 Mua thú cưng', 
                        value: `• \`${prefix}muapet\` - **Lựa chọn** loài + giới tính (100 Rin)\n` +
                               `• **9 loài:** Mèo, Chó, Thỏ, Cá mập, Chim, Kong, Godzilla...\n` +
                               `• **Giới tính:** Đực hoặc Cái (ảnh hưởng sinh sản)\n` +
                               `• **Giới hạn:** Mỗi người 1 thú cưng`, 
                        inline: false 
                    },
                    { 
                        name: '🍖 Chăm sóc', 
                        value: `• \`${prefix}petcheck\` - Xem thông tin thú cưng\n` +
                               `• \`${prefix}thucan\` - Cho ăn (3h/lần, 20 Rin)\n` +
                               `• \`${prefix}thuoc\` - Chữa bệnh khi ốm (50 Rin)\n` +
                               `• **Lưu ý:** Tuổi tăng mỗi lần cho ăn`, 
                        inline: false 
                    },
                    { 
                        name: '💕 Sinh sản', 
                        value: `• \`${prefix}petchich @user\` - Ghép cặp thú cưng\n` +
                               `• **Điều kiện:** Khác giới tính + sức khỏe tốt\n` +
                               `• **Kết quả:** +1 lần đẻ cho cả 2 thú\n` +
                               `• **Thời gian:** Cooldown 24h sau mỗi lần`, 
                        inline: false 
                    },
                    { 
                        name: '💰 Kiếm lời', 
                        value: `• \`${prefix}banpet\` - Bán thú đã đẻ (giá theo số lần đẻ)\n` +
                               `• \`${prefix}huypet\` - **MỚI!** Hủy thú và nhận bồi thường\n` +
                               `• \`${prefix}gia\` - Về hưu (3+ lần đẻ, nhận lương hưu)\n` +
                               `• **Công thức giá:** 100 + (số lần đẻ × 75) Rin\n` +
                               `• **Bồi thường hủy:** 60+ Rin tùy tình trạng pet\n` +
                               `• **Lương hưu:** 50-150 Rin tùy thống kê`, 
                        inline: false 
                    }
                )
                .setColor('#FF99CC')
                .setFooter({ text: 'Hãy chọn thú cưng yêu thích và chăm sóc thật tốt!' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'city') {
            const embed = new EmbedBuilder()
                .setTitle('🏙️ HỆ THỐNG CITY')
                .setDescription('**Thuê nhà, xin việc và sống trong thành phố!** 🏠\n\n' +
                    '⚠️ **LƯU Ý QUAN TRỌNG:** Tất cả hoạt động nghề nghiệp chỉ diễn ra trong server hiện tại!')
                .addFields(
                    { 
                        name: '🏠 Nhà ở', 
                        value: `• \`${prefix}city\` - Xem thông tin thành phố\n` +
                               `• \`${prefix}thuenha\` - Thuê nhà (500-8000 Rin)\n` +
                               `• \`${prefix}huynha\` - **MỚI!** Hủy thuê nhà (hoàn 50% tiền)\n` +
                               `• \`${prefix}suanha\` - Sửa nhà mỗi 5 ngày\n` +
                               `• **4 loại:** Nhà trọ (500) → Nhà thường (2000) → Nhà lầu (5000) → Biệt thự (8000)`, 
                        inline: false 
                    },
                    { 
                        name: '💼 Nghề nghiệp', 
                        value: `• \`${prefix}dangkynghe\` - Đăng ký nghề nghiệp\n` +
                               `• \`${prefix}lamviec\` - Làm việc theo nghề\n` +
                               `• **Trộm:** Trộm cây + tiền 19-21h (nhà trọ, cooldown 2 phút)\n` +
                               `• **Nhà báo:** Chat 50 tin nhắn (nhà thường+, cooldown 4h)\n` +
                               `• **MC:** Ngồi voice 15 phút (nhà thường+, cooldown 4h)\n` +
                               `• **Công an:** Bắt trộm, giải đố (biệt thự, cooldown 1h)`, 
                        inline: false 
                    },
                    { 
                        name: '🎯 Tính năng đặc biệt', 
                        value: `• **Trộm tiền:** 19-21h, 100-500 Rin/lần, 1 lần/nhà/ngày\n` +
                               `• **Trộm cây:** Chỉ từ farm trong server này\n` +
                               `• **Công an:** Chỉ nhận thông báo trộm trong server này\n` +
                               `• **Hủy nhà:** Hoàn 50% tiền thuê, mất nghề và tiến trình`, 
                        inline: false 
                    },
                    { 
                        name: '🌐 Phạm vi hoạt động', 
                        value: `• **Trộm cây:** Chỉ thấy và trộm cây của người trong server này\n` +
                               `• **Thông báo công an:** Chỉ gửi cho công an trong server này\n` +
                               `• **Chat nghề Nhà báo:** Chỉ tính tin nhắn trong server này\n` +
                               `• **Voice nghề MC:** Chỉ tính thời gian voice trong server này\n` +
                               `• **Bắt trộm:** Công an chỉ bắt được trộm trong server này`, 
                        inline: false 
                    },
                    { 
                        name: '⚠️ Lưu ý quan trọng', 
                        value: `• Nhà cần sửa mỗi 5 ngày hoặc bị thu hồi\n` +
                               `• Mỗi nghề có cooldown và yêu cầu nhà khác nhau\n` +
                               `• Trộm có rủi ro bị công an bắt trong 10 phút\n` +
                               `• Nghỉ việc nhận 50 Rin trợ cấp\n` +
                               `• **Tất cả hoạt động chỉ trong server hiện tại!**`, 
                        inline: false 
                    }
                )
                .setColor('#FFD700')
                .setFooter({ text: 'Xây dựng cuộc sống trong thành phố! Mỗi server là một thành phố riêng biệt.' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'games') {
            const embed = new EmbedBuilder()
                .setTitle('🎮 CÁC GAME GIẢI TRÍ')
                .setDescription('**Chơi game cùng bạn bè và bot AI!** 🎯')
                .addFields(
                    { 
                        name: '🎲 Tài Xỉu', 
                        value: `• \`${prefix}taixiu\` - Mở phiên Tài Xỉu (làm nhà cái)\n` +
                               `• **Cách chơi:** 3 xúc xắc, 11-17 = Tài, 4-10 = Xỉu\n` +
                               `• **Tỷ lệ:** 1:1 (cược 100 thắng 200)\n` +
                               `• **Tự động:** 60s cược → quay xúc xắc → kết quả\n` +
                               `• **Đặc biệt:** Cược được cả 2 cửa, xem cầu/phiên đồ\n` +
                               `• **Nút nhanh:** Kết thúc phiên có nút "Bắt đầu phiên mới"`, 
                        inline: false 
                    },
                    { 
                        name: '🃏 Xì Dách', 
                        value: `• \`${prefix}xjgo\` - Mở bàn (người tạo làm nhà cái)\n` +
                               `• \`${prefix}xjbot\` - Chơi với Bot AI\n` +
                               `• \`${prefix}xjrin\` - Xem bài và hành động\n` +
                               `• **Mục tiêu:** Gần 21 điểm nhất, tránh quắc`, 
                        inline: false 
                    },
                    { 
                        name: '🎲 Bầu Cua', 
                        value: `• \`${prefix}bcgo\` - Mở bàn Bầu Cua (user làm nhà cái)\n` +
                               `• \`${prefix}bcbot\` - Chơi Bầu Cua với Bot\n` +
                               `• **6 con vật:** Bầu, Cua, Tôm, Cá, Gà, Nai\n` +
                               `• **Tỷ lệ:** 1:1 (đoán đúng được gấp đôi)`, 
                        inline: false 
                    },
                    { 
                        name: '🏠 Cờ Tỷ Phú', 
                        value: `• \`${prefix}typhu\` - Mở bàn Cờ Tỷ Phú\n` +
                               `• \`${prefix}tpbot\` - Chơi với Bot AI\n` +
                               `• **Chi phí:** 100 Rin để vào game\n` +
                               `• **Tiền game:** 2000 Nene (chỉ trong game)\n` +
                               `• **Thắng:** 500 Rin vào tài khoản thật\n` +
                               `• **Mục tiêu:** Làm cho đối thủ phá sản`, 
                        inline: false 
                    },
                    { 
                        name: '🎰 Khác', 
                        value: `• \`${prefix}cf 100\` - Tung xu cược Rin\n` +
                               `• \`${prefix}slot 50\` - Máy slot may mắn\n` +
                               `• \`${prefix}lottery 10\` - Mua vé số`, 
                        inline: false 
                    }
                )
                .setColor('#FF6B6B')
                .setFooter({ text: 'Hãy chơi có trách nhiệm và vui vẻ!' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'xidach') {
            const embed = new EmbedBuilder()
                .setTitle('🃏 HƯỚNG DẪN XÌ DÁCH CHI TIẾT')
                .setDescription('**Game bài kinh điển với nhiều biến thể!** ♠️♥️♦️♣️')
                .addFields(
                    { 
                        name: '🎯 Mục tiêu', 
                        value: `Rút bài sao cho **tổng điểm gần 21 nhất** mà không quắc (>21)\n` +
                               `**Điểm số:** A=1/11, J/Q/K=10, số khác=mệnh giá`, 
                        inline: false 
                    },
                    { 
                        name: '🎮 Cách chơi', 
                        value: `**User làm nhà cái:**\n` +
                               `1. \`${prefix}xjgo\` - Mở bàn (người tạo = nhà cái)\n` +
                               `2. Người khác join bằng button + nhập tiền cược\n` +
                               `3. Nhà cái bấm "Bắt đầu" khi đủ người\n` +
                               `4. \`${prefix}xjrin\` để xem bài và rút/dằn\n` +
                               `5. **Nhà cái mở bài cuối cùng, so sánh điểm**\n\n` +
                               `**Bot AI:**\n` +
                               `1. \`${prefix}xjbot\` - Thách đấu Bot trực tiếp\n` +
                               `2. Bot có AI thông minh, tự ra quyết định\n` +
                               `3. Timeout 5 phút, mỗi lượt 30 giây`, 
                        inline: false 
                    },
                    { 
                        name: '🎊 Bài đặc biệt', 
                        value: `**💎 Xì Bàn:** 2 con A = Thắng x3 tiền (mạnh nhất)\n` +
                               `**🔥 Xì Dách:** A + (10/J/Q/K) = Thắng x2 tiền\n` +
                               `**🌟 Ngũ Linh:** 5 lá ≤21 điểm = Thắng x2 tiền\n\n` +
                               `**💥 Luật quắc mới:**\n` +
                               `• 22-27 điểm: Quắc nhẹ (hòa nếu cả hai cùng quắc)\n` +
                               `• ≥28 điểm: Quắc nặng (thua x2 tiền)\n` +
                               `• <16 điểm: Chưa đủ tuổi (thua x2 tiền)`, 
                        inline: false 
                    },
                    { 
                        name: '💰 Hệ thống tiền', 
                        value: `**User host:** Nhà cái cũng chơi, điểm cao hơn = thắng tiền\n` +
                               `**So sánh:** Player vs Nhà cái, thắng thua dựa trên điểm số\n` +
                               `**Bot AI:** Thắng Bot được +750 Rin bonus\n` +
                               `**Hòa:** Lấy lại tiền cược\n` +
                               `**Lưu ý:** Tiền cược bị trừ ngay khi bắt đầu`, 
                        inline: false 
                    },
                    { 
                        name: '⚡ Tips', 
                        value: `• **Dằn ở 17-20:** An toàn, ít rủi ro\n` +
                               `• **Rút thêm ở <16:** Cần thiết để tránh "chưa đủ tuổi"\n` +
                               `• **Quan sát nhà cái:** Nếu nhà cái quắc, bạn thắng\n` +
                               `• **Bot AI:** Khó thắng hơn, nhưng bonus lớn!`, 
                        inline: false 
                    }
                )
                .setColor('#0099FF')
                .setFooter({ text: 'Chúc bạn may mắn tại bàn Xì Dách!' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'taixiu') {
            const embed = new EmbedBuilder()
                .setTitle('🎲 HƯỚNG DẪN TÀI XỈU CHI TIẾT')
                .setDescription('**Game xúc xắc truyền thống Việt Nam!** ⚀⚁⚂⚃⚄⚅')
                .addFields(
                    { 
                        name: '🎯 Cách chơi cơ bản', 
                        value: `**Mục tiêu:** Đoán tổng điểm 3 xúc xắc\n` +
                               `• **🔥 TÀI:** Tổng 11-17 điểm\n` +
                               `• **❄️ XỈU:** Tổng 4-10 điểm\n` +
                               `• **Tỷ lệ:** 1:1 (cược 100, thắng nhận 200)\n` +
                               `• **Đặc biệt:** Có thể cược cả 2 cửa cùng lúc!`, 
                        inline: false 
                    },
                    { 
                        name: '🎮 Quy trình chơi', 
                        value: `1. \`${prefix}taixiu\` - Mở phiên (làm nhà cái)\n` +
                               `2. **60 giây cược:** Bấm nút TÀI/XỈU → nhập số Rin\n` +
                               `3. **Tự động quay:** Hết thời gian → 3 xúc xắc quay\n` +
                               `4. **Hiển thị từng viên:** Xúc xắc 1 → 2 → 3 → Kết quả\n` +
                               `5. **Tính tiền:** Thắng thua theo kết quả\n` +
                               `6. **Nút nhanh:** "🚀 Bắt đầu phiên mới" để tiếp tục`, 
                        inline: false 
                    },
                    { 
                        name: '💰 Hệ thống cược', 
                        value: `**Nhập số tiền:** 100, 1k, 50%, all, 1.5k...\n` +
                               `**Cược đơn:** Chỉ chọn TÀI hoặc XỈU\n` +
                               `**Cược kép:** Cược cả TÀI và XỈU (hedge bet)\n` +
                               `**Cộng dồn:** Cược cùng cửa nhiều lần = cộng tổng\n` +
                               `**Trừ tiền:** Tự động khi hết thời gian cược\n` +
                               `**Hoàn tiền:** Thắng nhận gấp đôi, thua mất hết`, 
                        inline: false 
                    },
                    { 
                        name: '📊 Cầu và Phiên đồ', 
                        value: `**📈 Cầu:** Chuỗi kết quả liên tiếp (VD: T-T-X-T-T)\n` +
                               `**📋 Phiên đồ:** Lịch sử 15 phiên gần nhất\n` +
                               `• **Xem chi tiết:** Bấm nút "📊 Xem Phiên Đồ"\n` +
                               `• **Thông tin:** Phiên, điểm, kết quả, xúc xắc\n` +
                               `• **Phân tích:** Theo dõi xu hướng Tài/Xỉu`, 
                        inline: false 
                    },
                    { 
                        name: '🎲 Hiệu ứng xúc xắc', 
                        value: `**Giai đoạn 1:** Chuẩn bị quay → Đang lắc bát\n` +
                               `**Giai đoạn 2:** Xúc xắc 1 dừng → Hiện số\n` +
                               `**Giai đoạn 3:** Xúc xắc 2 dừng → Hiện 2 số\n` +
                               `**Giai đoạn 4:** Xúc xắc 3 dừng → Hiện đầy đủ\n` +
                               `**Kết quả:** Tổng điểm + So sánh + Chi tiết người chơi\n` +
                               `**Emoji xúc xắc:** ⚀⚁⚂⚃⚄⚅ (mỗi số có biểu tượng riêng)`, 
                        inline: false 
                    },
                    { 
                        name: '⚡ Tips & Chiến thuật', 
                        value: `• **Quan sát cầu:** Nếu TÀI dài → có thể sắp XỈU\n` +
                               `• **Cược kép:** An toàn hơn nhưng lợi nhuận thấp\n` +
                               `• **Quản lý vốn:** Không cược quá 10% tổng Rin\n` +
                               `• **Tâm lý:** Không đuổi theo khi thua liên tiếp\n` +
                               `• **Nhà cái:** Cần ít nhất 1,000 Rin để mở phiên\n` +
                               `• **Nút nhanh:** Dùng để liên tục mở phiên mới`, 
                        inline: false 
                    }
                )
                .setColor('#FFD700')
                .setFooter({ text: 'Chúc bạn may mắn và chơi có trách nhiệm! 🍀' });
            
            return await message.reply({ embeds: [embed] });
        }

        if (topic === 'admin') {
            // Kiểm tra quyền admin hoặc owner
            const isOwner = config.isOwner(message.author.id);
            const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
            
            if (!isAdmin && !isOwner) {
                return message.reply('❌ Bạn không có quyền xem hướng dẫn admin!');
            }
            
            const embed = new EmbedBuilder()
                .setTitle('⚙️ LỆNH ADMIN')
                .setDescription('**Dành cho Administrator server** 🛡️')
                .addFields(
                    { 
                        name: '🎮 Quản lý Game', 
                        value: `• \`${prefix}xjhuy\` - Hủy game Xì Dách\n` +
                               `• \`${prefix}huybc\` - Hủy game Bầu Cua\n` +
                               `• \`${prefix}huytp\` - Hủy game Cờ Tỷ Phú\n` +
                               `• \`${prefix}cleargames\` - Xóa tất cả game\n` +
                               `• \`${prefix}giveaway\` - Tổ chức giveaway\n` +
                               `• \`${prefix}gpick\` - Chỉ định người thắng giveaway`, 
                        inline: false 
                    },
                    { 
                        name: '🏠 Quản lý City', 
                        value: `• \`${prefix}resetcity @user\` - Reset thông tin city\n` +
                               `• \`${prefix}sethome @user villa\` - Set nhà cho user\n` +
                               `• \`${prefix}setjob @user mc\` - Set nghề cho user`, 
                        inline: false 
                    },
                    { 
                        name: '⚙️ Hệ thống', 
                        value: `• \`${prefix}setprefix !\` - Đổi prefix server\n` +
                               `• \`${prefix}announce\` - Thông báo quan trọng\n` +
                               `• \`${prefix}maintenance\` - Bật/tắt bảo trì\n` +
                               `• \`${prefix}version\` - Kiểm tra phiên bản bot`, 
                        inline: false 
                    },
                    { 
                        name: '🔄 Cập nhật Bot (Chỉ Owner)', 
                        value: `• \`${prefix}update check\` - Kiểm tra cập nhật 🔒\n` +
                               `• \`${prefix}update\` - Cập nhật bot tự động 🔒\n` +
                               `• \`${prefix}update force\` - Cập nhật bắt buộc 🔒\n` +
                               `• \`${prefix}update backup\` - Backup dữ liệu 🔒\n` +
                               `• \`${prefix}update status\` - Trạng thái bot 🔒\n\n` +
                               `⚠️ **Lưu ý:** Chỉ chủ sở hữu bot mới có thể dùng!`, 
                        inline: false 
                    }
                )
                .setColor('#FF4444')
                .setFooter({ text: 'Chỉ dành cho Admin! Lệnh update chỉ dành cho Owner bot.' });
            
            return await message.reply({ embeds: [embed] });
        }

        // Nếu topic không hợp lệ
        const embed = new EmbedBuilder()
            .setTitle('❌ CHỦ ĐỀ KHÔNG TỒN TẠI')
            .setDescription(`Không tìm thấy hướng dẫn cho **"${topic}"**\n\n` +
                '**📚 Các chủ đề có sẵn:**\n' +
                `• \`${prefix}rinhelp basic\` - Lệnh cơ bản\n` +
                `• \`${prefix}rinhelp farm\` - Hệ thống Farm\n` +
                `• \`${prefix}rinhelp pet\` - Hệ thống Pet\n` +
                `• \`${prefix}rinhelp city\` - Hệ thống City\n` +
                `• \`${prefix}rinhelp games\` - Các game\n` +
                `• \`${prefix}rinhelp xidach\` - Xì Dách chi tiết\n` +
                `• \`${prefix}rinhelp admin\` - Lệnh admin\n\n` +
                `Hoặc dùng \`${prefix}rinhelp\` để xem menu chính.`)
            .setColor('#FF0000');
        
        return await message.reply({ embeds: [embed] });
    }
};