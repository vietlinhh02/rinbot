const mongoose = require('mongoose');

const treeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    species: String,
    age: { type: Number, default: 0 },
    waterCount: { type: Number, default: 0 },
    growthStage: { type: Number, default: 0 },
    lastWater: Date,
    bonused: { type: Boolean, default: false },
    plantedAt: Date,
    maturedAt: Date,
    deadAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Tree', treeSchema); 