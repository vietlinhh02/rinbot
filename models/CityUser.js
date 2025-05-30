const mongoose = require('mongoose');

const cityUserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    home: String,
    job: String,
    jobStreak: { type: Number, default: 0 },
    lastWorked: Date,
    jailedUntil: Date,
    jailedBy: String,
    lastRepair: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('CityUser', cityUserSchema); 