// client/src/components/common/GlassDatePicker.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface GlassDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  showTimeSelect?: boolean;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
  selected,
  onChange,
  placeholderText = '选择日期',
  showTimeSelect = false,
  className = '',
  disabled = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selected || new Date());
  // 关键修复：临时选中的日期，初始值应该是当前选中的日期
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(selected);
  const [tempTime, setTempTime] = useState<string>(() => {
    if (selected) {
      return `${selected.getHours().toString().padStart(2, '0')}:${selected.getMinutes().toString().padStart(2, '0')}`;
    }
    return '12:00';
  });
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 当 selected 从外部变化时，同步到临时状态
  useEffect(() => {
    setTempSelectedDate(selected);
    if (selected) {
      setTempTime(`${selected.getHours().toString().padStart(2, '0')}:${selected.getMinutes().toString().padStart(2, '0')}`);
    }
    if (selected) {
      setViewDate(selected);
    }
  }, [selected]);

  // 获取当前年月
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // 构建日历数组 (5行就够了)
  const calendarDays: (number | null)[] = [];
  
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push(daysInPrevMonth - i);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }
  const remainingCells = 35 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push(i);
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 计算弹窗位置
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pickerWidth = 300;
      const pickerHeight = showTimeSelect ? 400 : 340;
      
      let top = rect.bottom + 5;
      let left = rect.left + (rect.width / 2) - (pickerWidth / 2);
      
      // 下方空间不足，显示在上方
      if (top + pickerHeight > window.innerHeight) {
        top = rect.top - pickerHeight - 5;
      }
      
      // 左右边界检查
      left = Math.max(5, Math.min(left, window.innerWidth - pickerWidth - 5));
      
      setPosition({ top, left });
    }
  };

  const openPicker = () => {
    if (!disabled) {
      // 重置临时状态为当前选中的值
      setTempSelectedDate(selected);
      if (selected) {
        setViewDate(selected);
        setTempTime(`${selected.getHours().toString().padStart(2, '0')}:${selected.getMinutes().toString().padStart(2, '0')}`);
      }
      setIsOpen(true);
      setTimeout(updatePosition, 10);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node) &&
          containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 判断日期状态
  const isToday = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  // 关键修复：判断是否被临时选中
  const isTempSelected = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth || !tempSelectedDate) return false;
    return tempSelectedDate.getFullYear() === year && 
           tempSelectedDate.getMonth() === month && 
           tempSelectedDate.getDate() === day;
  };

  const isDisabledDate = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return true;
    const date = new Date(year, month, day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setTimeout(updatePosition, 10);
  };
  
  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setTimeout(updatePosition, 10);
  };

  // 选择日期（临时选中，不等同于确认）
  const selectDate = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth || isDisabledDate(day, isCurrentMonth)) return;
    
    const newDate = new Date(year, month, day);
    const [hours, minutes] = tempTime.split(':');
    newDate.setHours(parseInt(hours), parseInt(minutes));
    
    // 更新临时选中的日期
    setTempSelectedDate(newDate);
    
    // 如果不显示时间选择器，直接确认
    if (!showTimeSelect) {
      onChange(newDate);
      setIsOpen(false);
    }
  };

  const confirmSelection = () => {
    if (tempSelectedDate) {
      const [hours, minutes] = tempTime.split(':');
      const finalDate = new Date(tempSelectedDate);
      finalDate.setHours(parseInt(hours), parseInt(minutes));
      onChange(finalDate);
      setIsOpen(false);
    }
  };

  const clearSelection = () => {
    onChange(null);
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    if (!selected) return '';
    if (showTimeSelect) {
      return `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')} ${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
    }
    return `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={formatDisplayDate()}
        readOnly
        onClick={openPicker}
        placeholder={placeholderText}
        disabled={disabled}
        className={`w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none transition cursor-pointer ${className}`}
      />
      
      {isOpen && !disabled && createPortal(
        <div 
          ref={pickerRef}
          className="fixed z-[9999]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: '300px'
          }}
        >
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-white font-semibold text-sm">
                  {year}年 {monthNames[month]}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 星期 */}
            <div className="grid grid-cols-7 gap-0.5 px-2 pt-3">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 py-1.5">
                  {day}
                </div>
              ))}
            </div>
            
            {/* 日期 */}
            <div className="grid grid-cols-7 gap-0.5 px-2 pb-2">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = index >= firstDayOfMonth && index < firstDayOfMonth + daysInMonth;
                const dayNum = day as number;
                const today = isToday(dayNum, isCurrentMonth);
                const tempSelected = isTempSelected(dayNum, isCurrentMonth);
                const disabledDate = isDisabledDate(dayNum, isCurrentMonth);
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectDate(dayNum, isCurrentMonth)}
                    disabled={disabledDate}
                    className={`
                      relative w-9 h-9 rounded-lg text-xs font-medium transition-all duration-200
                      ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600 cursor-default' : ''}
                      ${disabledDate ? 'opacity-40 cursor-not-allowed' : ''}
                      ${tempSelected ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-95' : ''}
                      ${today && !tempSelected ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : ''}
                      ${!tempSelected && !disabledDate && isCurrentMonth ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20' : ''}
                    `}
                  >
                    {dayNum}
                    {today && !tempSelected && (
                      <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500"></span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* 时间选择 */}
            {showTimeSelect && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="time"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={confirmSelection}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-md"
                  >
                    确认
                  </button>
                </div>
              </div>
            )}
            
            {/* 底部 */}
            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex justify-between">
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 transition"
              >
                清除
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GlassDatePicker;