const mongoose = require('mongoose');

// Schema cho chuyên gia
const expertSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    specialties: [{ type: String, required: true }], // Lĩnh vực chuyên môn
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
    totalConsultations: { type: Number, default: 0 },
    rating: { type: Number, default: 5 },
    addedBy: { type: String }, // Admin đã thêm
    addedAt: { type: Date, default: Date.now },
    isAvailable: { type: Boolean, default: true } // Có sẵn sàng nhận câu hỏi không
}, {
    timestamps: true
});

// Schema cho tư vấn
const consultationSchema = new mongoose.Schema({
    consultationId: { type: String, required: true, unique: true },
    shortId: { type: String },
    userId: { type: String, required: true }, // Người hỏi
    guildId: { type: String, required: true }, // Server ID
    question: { type: String, required: true },
    category: { type: String, required: true }, // Thể loại câu hỏi
    status: { type: String, default: 'pending', enum: ['pending', 'assigned', 'published', 'answered', 'rejected'] },
    answer: { type: String },
    expertId: { type: String }, // Chuyên gia được chọn (có thể null nếu random)
    dmMessageId: { type: String }, // ID tin nhắn DM gửi cho expert
    userNotified: { type: Boolean, default: false },
    // Fields cho public room
    publicChannelId: { type: String }, // Channel ID để public
    publicMessageId: { type: String }, // Message ID của câu hỏi public
    expertResponse: {
        answeredAt: { type: Date },
        expertUserId: { type: String }
    },
    createdAt: { type: Date, default: Date.now },
    notifiedExperts: [{ type: String }] // Danh sách ID của các chuyên gia đã được thông báo
}, {
    timestamps: true
});

module.exports = {
    Expert: mongoose.model('Expert', expertSchema),
    Consultation: mongoose.model('Consultation', consultationSchema)
}; 