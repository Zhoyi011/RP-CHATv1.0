// server/src/models/SystemSettings.js
const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
  description: { type: String }
});

// 默认设置
const defaultSettings = [
  { key: 'maintenance_mode', value: false, description: '维护模式开关' },
  { key: 'maintenance_message', value: '服务器正在维护中，请稍后再试。', description: '维护模式提示信息' },
  { key: 'maintenance_end_time', value: null, description: '预计维护结束时间' }
];

systemSettingsSchema.statics.initDefaultSettings = async function() {
  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { key: setting.key },
      { $set: setting },
      { upsert: true, new: true }
    );
  }
  console.log('✅ 系统设置初始化完成');
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);