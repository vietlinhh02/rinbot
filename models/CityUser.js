const mongoose = require('mongoose');

const cityUserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    home: String,
    job: String,
    jobStreak: { type: Number, default: 0 },
    lastWorked: Date,
    lastWork: Date,
    workStartTime: Date,
    workProgress: { type: Number, default: 0 },
    lastVoiceJoin: Date,
    dailyVoiceMinutes: { type: Number, default: 0 },
    jailedUntil: Date,
    jailedBy: String,
    lastRepair: Date,
    // Thêm các trường cho hệ thống nhà
    houseId: String, // ID loại nhà
    houseHealth: { type: Number, default: 100 }, // Độ bền nhà (%)
    houseRentedUntil: Date, // Thời gian thuê nhà hết hạn
    dailyMoneySteal: { type: Number, default: 0 } // Số tiền đã trộm trong ngày
}, {
    timestamps: true
});

const CityUser = mongoose.model('CityUser', cityUserSchema);

module.exports = { CityUser }; 