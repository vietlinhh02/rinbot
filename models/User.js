const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    rin: { type: Number, default: 0 },
    lastDaily: { type: Date },
    balance: { type: Number, default: 1000 }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema); 