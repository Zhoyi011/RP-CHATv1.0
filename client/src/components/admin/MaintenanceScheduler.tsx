// client/src/components/admin/MaintenanceScheduler.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import GlassDatePicker from '../common/GlassDatePicker';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface MaintenanceSchedule {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  message: string;
  isActive: boolean;
  isExecuted: boolean;
  repeatWeekly: boolean;
  repeatDays: number[];
  note: string;
  createdBy: { username: string };
  createdAt: string;
}

const MaintenanceScheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 表单状态 - 使用 Date 对象
  const [formData, setFormData] = useState({
    name: '',
    startTime: null as Date | null,
    endTime: null as Date | null,
    message: '服务器正在维护中，请稍后再试。',
    repeatWeekly: false,
    repeatDays: [] as number[],
    note: ''
  });

  // 星期几选项
  const weekDays = [
    { value: 0, label: '周日', short: '日' },
    { value: 1, label: '周一', short: '一' },
    { value: 2, label: '周二', short: '二' },
    { value: 3, label: '周三', short: '三' },
    { value: 4, label: '周四', short: '四' },
    { value: 5, label: '周五', short: '五' },
    { value: 6, label: '周六', short: '六' }
  ];

  // 加载维护计划
  const loadSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/maintenance/schedules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('加载维护计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  // 创建/更新维护计划
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startTime || !formData.endTime) {
      toast.error('请设置开始和结束时间');
      return;
    }
    
    if (formData.startTime >= formData.endTime) {
      toast.error('结束时间必须晚于开始时间');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_BASE}/admin/maintenance/schedules/${editingId}`
        : `${API_BASE}/admin/maintenance/schedules`;
      
      const bodyData = {
        name: formData.name,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        message: formData.message,
        repeatWeekly: formData.repeatWeekly,
        repeatDays: formData.repeatDays,
        note: formData.note
      };
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? '计划已更新' : '计划已创建');
        setShowForm(false);
        setEditingId(null);
        setFormData({
          name: '',
          startTime: null,
          endTime: null,
          message: '服务器正在维护中，请稍后再试。',
          repeatWeekly: false,
          repeatDays: [],
          note: ''
        });
        loadSchedules();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 删除维护计划
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个维护计划吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/maintenance/schedules/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('计划已删除');
        loadSchedules();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 编辑计划
  const handleEdit = (schedule: MaintenanceSchedule) => {
    setFormData({
      name: schedule.name,
      startTime: new Date(schedule.startTime),
      endTime: new Date(schedule.endTime),
      message: schedule.message,
      repeatWeekly: schedule.repeatWeekly,
      repeatDays: schedule.repeatDays,
      note: schedule.note
    });
    setEditingId(schedule._id);
    setShowForm(true);
  };

  // 切换重复星期几
  const toggleRepeatDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      repeatDays: prev.repeatDays.includes(day)
        ? prev.repeatDays.filter(d => d !== day)
        : [...prev.repeatDays, day]
    }));
  };

  // 格式化日期时间显示（24小时制）
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 获取计划状态
  const getScheduleStatus = (schedule: MaintenanceSchedule) => {
    const now = new Date();
    const start = new Date(schedule.startTime);
    const end = new Date(schedule.endTime);
    
    if (!schedule.isActive) return { text: '已禁用', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' };
    if (schedule.isExecuted) return { text: '已执行', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' };
    if (now >= start && now <= end) return { text: '进行中', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' };
    if (now < start) return { text: '待执行', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
    return { text: '已结束', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' };
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 添加计划按钮 */}
      <button
        onClick={() => {
          setEditingId(null);
          setFormData({
            name: '',
            startTime: null,
            endTime: null,
            message: '服务器正在维护中，请稍后再试。',
            repeatWeekly: false,
            repeatDays: [],
            note: ''
          });
          setShowForm(true);
        }}
        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition shadow-md"
      >
        + 添加维护计划
      </button>

      {/* 表单弹窗 */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {editingId ? '编辑维护计划' : '新建维护计划'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* 计划名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    计划名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如: 每周维护"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                
                {/* 开始时间 - 使用 GlassDatePicker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    开始时间
                  </label>
                  <GlassDatePicker
                    selected={formData.startTime}
                    onChange={(date) => setFormData({ ...formData, startTime: date })}
                    showTimeSelect
                    placeholderText="选择开始时间"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                {/* 结束时间 - 使用 GlassDatePicker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    结束时间
                  </label>
                  <GlassDatePicker
                    selected={formData.endTime}
                    onChange={(date) => setFormData({ ...formData, endTime: date })}
                    showTimeSelect
                    placeholderText="选择结束时间"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                {/* 提示消息 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    提示消息
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                {/* 每周重复 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">每周重复</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, repeatWeekly: !formData.repeatWeekly })}
                    className={`w-10 h-5 rounded-full transition-all ${formData.repeatWeekly ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-all ${formData.repeatWeekly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                
                {/* 重复星期几选择 */}
                {formData.repeatWeekly && (
                  <div className="flex gap-2 flex-wrap">
                    {weekDays.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleRepeatDay(day.value)}
                        className={`w-10 h-10 rounded-full font-medium transition-all ${
                          formData.repeatDays.includes(day.value)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* 备注 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    备注
                  </label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="可选"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                {/* 提交按钮 */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition"
                  >
                    {editingId ? '更新' : '创建'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 计划列表 */}
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>暂无维护计划</p>
            <p className="text-xs mt-1">点击上方按钮创建定时维护</p>
          </div>
        ) : (
          schedules.map((schedule) => {
            const status = getScheduleStatus(schedule);
            return (
              <div
                key={schedule._id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                        {schedule.name}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                      {schedule.repeatWeekly && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                          🔁 每周
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="inline-block w-16">开始：</span>
                        {formatDateTime(schedule.startTime)}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="inline-block w-16">结束：</span>
                        {formatDateTime(schedule.endTime)}
                      </p>
                      {schedule.repeatWeekly && schedule.repeatDays.length > 0 && (
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="inline-block w-16">重复：</span>
                          每周 {schedule.repeatDays.map(d => weekDays.find(w => w.value === d)?.short).join('、')}
                        </p>
                      )}
                      {schedule.note && (
                        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                          📝 {schedule.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(schedule._id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MaintenanceScheduler;