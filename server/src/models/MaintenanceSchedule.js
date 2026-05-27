// server/src/models/MaintenanceSchedule.js
const mongoose = require('mongoose');

const maintenanceScheduleSchema = new mongoose.Schema({
  // 计划名称
  name: {
    type: String,
    required: true,
    default: '维护计划'
  },
  // 计划开始时间
  startTime: {
    type: Date,
    required: true
  },
  // 计划结束时间
  endTime: {
    type: Date,
    required: true
  },
  // 维护提示消息
  message: {
    type: String,
    default: '服务器正在维护中，请稍后再试。'
  },
  // 是否启用（到时间自动启用）
  isActive: {
    type: Boolean,
    default: true
  },
  // 是否已执行（已触发过）
  isExecuted: {
    type: Boolean,
    default: false
  },
  // 是否重复（每周重复）
  repeatWeekly: {
    type: Boolean,
    default: false
  },
  // 重复的星期几（0-6，0=周日）
  repeatDays: {
    type: [Number],
    default: []
  },
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 备注
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 索引
maintenanceScheduleSchema.index({ startTime: 1 });
maintenanceScheduleSchema.index({ endTime: 1 });
maintenanceScheduleSchema.index({ isActive: true, isExecuted: true });

module.exports = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);