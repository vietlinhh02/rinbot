const mongoose = require('mongoose');

const maintenanceModeSchema = new mongoose.Schema({
    _id: { type: String, default: 'maintenance_state' }, // Chỉ có 1 document duy nhất
    enabled: { type: Boolean, default: false },
    reason: { type: String, default: null },
    startTime: { type: Date, default: null },
    enabledBy: { type: String, default: null } // userId của owner
}, {
    timestamps: true
});

module.exports = mongoose.model('MaintenanceMode', maintenanceModeSchema); 