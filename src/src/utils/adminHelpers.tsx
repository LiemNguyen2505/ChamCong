import React, { useState, useEffect } from 'react';
import { StickyNote } from 'lucide-react';

export const TABLE_COL_WIDTHS = {
  NGAY: 80,
  NAME: 220,
  GIO: 100,
  SD_DT: 120,
  PHAT_DT: 150,
  DI_TRE: 120,
  PHAT_TRE: 150,
  GIO_CONG: 120,
  ACTIONS: 120
};

export const formatMinutes = (minutes: number) => {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}p`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m > 0 ? `${h}h ${m}p` : `${h}h`;
};

export const formatDecimalHours = (decimalHours: number) => {
  const minutes = Math.round(decimalHours * 60);
  return formatMinutes(minutes);
};

export const getTimeStyle = (timeStr: string | null) => {
  if (!timeStr) return 'bg-slate-50 text-slate-400 border-slate-100';
  const hour = new Date(timeStr).getHours();
  if (hour >= 6 && hour < 12) return 'bg-emerald-50 text-emerald-700 border-emerald-100';     // Sáng
  if (hour >= 12 && hour < 17) return 'bg-amber-50 text-amber-700 border-amber-200';      // Trưa
  if (hour >= 17 && hour < 22) return 'bg-slate-100 text-slate-700 border-slate-200';      // Tối
  return 'bg-slate-50 text-slate-400 border-slate-100';
};

// SHIFT SPLITTING LOGIC
export const calculateShifts = (checkIn: string | null, checkOut: string | null) => {
  if (!checkIn || !checkOut) return [];
  
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  
  const baseDate = new Date(inDate);
  baseDate.setHours(0, 0, 0, 0);

  // Brackets: 06:00 - 11:59, 12:00 - 16:59, 17:00 - 22:00
  const mStart = new Date(baseDate); mStart.setHours(6, 0, 0, 0);
  const mEnd = new Date(baseDate); mEnd.setHours(12, 0, 0, 0);
  const aEnd = new Date(baseDate); aEnd.setHours(17, 0, 0, 0);
  const eEnd = new Date(baseDate); eEnd.setHours(22, 0, 0, 0);

  const shifts: { name: string, hours: number, color: string }[] = [];

  const getOverlap = (start1: Date, end1: Date, start2: Date, end2: Date) => {
    const start = start1 > start2 ? start1 : start2;
    const end = end1 < end2 ? end1 : end2;
    if (start >= end) return 0;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  // Morning Shift
  const morningHours = getOverlap(inDate, outDate, mStart, mEnd);
  if (morningHours > 0) {
    shifts.push({ name: 'SÁNG', hours: Number(morningHours.toFixed(1)), color: 'bg-emerald-50 text-emerald-700 border-emerald-100' });
  }

  // Afternoon Shift
  const afternoonHours = getOverlap(inDate, outDate, mEnd, aEnd);
  if (afternoonHours > 0) {
    shifts.push({ name: 'TRƯA', hours: Number(afternoonHours.toFixed(1)), color: 'bg-amber-50 text-amber-700 border-amber-100' });
  }

  // Evening Shift
  const eveningHours = getOverlap(inDate, outDate, aEnd, eEnd);
  if (eveningHours > 0) {
    shifts.push({ name: 'TỐI', hours: Number(eveningHours.toFixed(1)), color: 'bg-slate-100 text-slate-700 border-slate-100' });
  }

  return shifts;
};

export const FieldNote = ({ 
  value, 
  onChange, 
  placeholder = "Nhập ghi chú..." 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative inline-flex items-center ml-1">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-0.5 rounded-full transition-colors ${value ? 'text-sky-600 bg-sky-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
        title={value || "Thêm ghi chú"}
      >
        <StickyNote className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[110]" 
            onClick={() => {
              setIsOpen(false);
              onChange(localValue);
            }} 
          />
          <div className="absolute bottom-full right-0 mb-2 z-[120] w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-2 animate-in fade-in slide-in-from-bottom-1">
            <textarea
              autoFocus
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={() => {
                setIsOpen(false);
                onChange(localValue);
              }}
              placeholder={placeholder}
              className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:ring-1 focus:ring-sky-500 min-h-[60px] resize-none"
            />
          </div>
        </>
      )}
    </div>
  );
};
