const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    userName: String,
    petType: String,
    gender: String,
    health: { type: String, default: 'Bình thường' },
    lastFed: Date,
    lastBred: Date, // Thêm field lastBred cho breeding cooldown
    age: { type: Number, default: 0 },
    breedCount: { type: Number, default: 0 },
    married: { type: Boolean, default: false },
    partnerId: String,
    marriedAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Pet', petSchema); 