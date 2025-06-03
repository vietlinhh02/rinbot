const mongoose = require('mongoose');

// Schema cho chuyên gia
const expertSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    specialties: [{ type: String }], // Lĩnh vực chuyên môn
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    totalConsultations: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    addedBy: { type: String }, // Admin đã thêm
    isAvailable: { type: Boolean, default: true } // Có sẵn sàng nhận câu hỏi không
}, {
    timestamps: true
});

// Schema cho tư vấn
const consultationSchema = new mongoose.Schema({
    consultationId: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // Người hỏi
    guildId: { type: String, required: true }, // Server ID
    expertId: { type: String }, // Chuyên gia được chọn (có thể null nếu random)
    question: { type: String, required: true },
    category: { type: String }, // Thể loại câu hỏi
    status: { 
        type: String, 
        enum: ['pending', 'assigned', 'answered', 'closed', 'published'], 
        default: 'pending' 
    },
    answer: { type: String },
    dmMessageId: { type: String }, // ID tin nhắn DM gửi cho expert
    userNotified: { type: Boolean, default: false },
    // Fields cho public room
    shortId: { type: String }, // Mã ngắn 4 ký tự
    publicChannelId: { type: String }, // Channel ID để public
    publicMessageId: { type: String }, // Message ID của câu hỏi public
    expertResponse: {
        answeredAt: { type: Date },
        expertUserId: { type: String }
    },
    notifiedExperts: [{ type: String }] // Danh sách ID của các chuyên gia đã được thông báo
}, {
    timestamps: true
});

module.exports = {
    Expert: mongoose.model('Expert', expertSchema),
    Consultation: mongoose.model('Consultation', consultationSchema)
}; 