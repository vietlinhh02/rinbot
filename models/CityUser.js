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
    lastRepair: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('CityUser', cityUserSchema); 