import React, { useState, useEffect } from 'react';
import { StickyNote } from 'lucide-react';
import { safeParseDate } from './dateUtils';

export const TABLE_COL_WIDTHS = {
  NGAY: 80,
  NAME: 220,
  GIO: 100,
  PHOTO: 100,
  SD_DT: 120,
  PHAT_DT: 150,
  DI_TRE: 120,
  PHAT_TRE: 150,
  GIO_CONG: 120,
  ACTIONS: 120
};

export const extractTimeStr = (tm: string | undefined | null, dateStr?: string | null) => {
    if (!tm || tm === '--:--') return null;
    if (tm.length === 5 && tm.includes(':')) return tm; // "HH:mm" format
    
    // Check if it's an ISO string or Timestamp
    const d = safeParseDate(tm, dateStr);
    if (d) {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    
    return tm.includes('T') ? tm.split('T')[1].substring(0, 5) : (tm.includes(' ') ? tm.split(' ')[1].substring(0, 5) : tm.substring(0, 5));
};

export const findEmployee = (empId: string | undefined | null, fullName: string | undefined | null, nhanViens: any[]) => {
  if (empId && typeof empId === 'string' && empId.trim() !== '') {
    const matches = nhanViens.filter(nv => nv.empId === empId || nv.id === empId);
    if (matches.length > 0) {
      if (fullName) {
        const exactMatch = matches.find(nv => nv.fullName === fullName);
        if (exactMatch) return exactMatch;
        
        const cleanName = fullName.toLowerCase().trim();
        const pMatch = matches.find(nv => nv.fullName && nv.fullName.toLowerCase().trim() === cleanName);
        if (pMatch) return pMatch;

        // DB BUG WORKAROUND: If empId matched but the name doesn't match the employees sharing this empId,
        // it means empId is corrupted/duplicated. Trust the fullName instead.
        const globalNameMatch = nhanViens.find(nv => nv.fullName === fullName || (nv.fullName && nv.fullName.toLowerCase().trim() === cleanName));
        if (globalNameMatch) return globalNameMatch;
      }
      return matches[0];
    }
  }

  if (fullName) {
    const cleanName = fullName.toLowerCase().trim();
    return nhanViens.find(nv => nv.fullName === fullName || (nv.fullName && nv.fullName.toLowerCase().trim() === cleanName));
  }
  
  return undefined;
};

export const matchSchedulesForTimesheet = (cc: any, daySchedules: any[]) => {
  if (!daySchedules || daySchedules.length === 0) return cc;

  const ccInMins = cc.checkInTime ? parseInt(cc.checkInTime.split(':')[0]) * 60 + parseInt(cc.checkInTime.split(':')[1]) : null;
  const ccOutMins = cc.checkOutTime ? parseInt(cc.checkOutTime.split(':')[0]) * 60 + parseInt(cc.checkOutTime.split(':')[1]) : null;

  let matchIn = daySchedules[0];
  if (ccInMins !== null) {
    let minDiff = Infinity;
    for (const s of daySchedules) {
      if (!s.startTime) continue;
      const sIn = parseInt(s.startTime.split(':')[0]) * 60 + parseInt(s.startTime.split(':')[1]);
      const diff = Math.abs(ccInMins - sIn);
      if (diff < minDiff) { minDiff = diff; matchIn = s; }
    }
  }

  let matchOut = matchIn;
  if (ccOutMins !== null) {
    let minDiff = Infinity;
    for (const s of daySchedules) {
      if (!s.endTime) continue;
      const sOut = parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1]);
      const diff = Math.abs(ccOutMins - sOut);
      if (diff < minDiff) { minDiff = diff; matchOut = s; }
    }
  }

  if (matchIn && matchOut && matchIn.startTime && matchOut.endTime) {
    const inTime = parseInt(matchIn.startTime.split(':')[0]) * 60 + parseInt(matchIn.startTime.split(':')[1]);
    const outTime = parseInt(matchOut.endTime.split(':')[0]) * 60 + parseInt(matchOut.endTime.split(':')[1]);
    if (outTime < inTime) {
      matchOut = matchIn;
    }
  }

  if (matchIn) {
    const overrides: any = {
      scheduledStartTime: matchIn.startTime,
      scheduledEndTime: matchOut.endTime
    };

    const defaults = [{ s: '06:00', e: '11:00' }, { s: '12:00', e: '17:00' }, { s: '17:00', e: '22:00' }];
    const isDefault = defaults.some(d => d.s === matchIn.startTime && d.e === matchOut.endTime);

    if (!isDefault && matchIn.startTime && matchOut.endTime) {
      const [sH, sM] = matchIn.startTime.split(':').map(Number);
      const [eH, eM] = matchOut.endTime.split(':').map(Number);
      const duration = (eH + eM / 60) - (sH + sM / 60);
      if (duration > 0) {
        overrides.totalHours = duration;
        if (matchIn.id !== matchOut.id || matchIn.startTime !== matchOut.startTime) {
           overrides._isManualScheduleOverride = true;
           // Calculate the gap between shifts
           let totalApprovedShiftMins = 0;
           
           const sInTime = matchIn.startTime ? parseInt(matchIn.startTime.split(':')[0]) * 60 + parseInt(matchIn.startTime.split(':')[1]) : 0;
           const sOutTime = matchOut.endTime ? parseInt(matchOut.endTime.split(':')[0]) * 60 + parseInt(matchOut.endTime.split(':')[1]) : 0;
           
           for (const sched of daySchedules) {
               if (sched.startTime && sched.endTime && !sched.isOff) {
                   const startMins = parseInt(sched.startTime.split(':')[0]) * 60 + parseInt(sched.startTime.split(':')[1]);
                   const endMins = parseInt(sched.endTime.split(':')[0]) * 60 + parseInt(sched.endTime.split(':')[1]);
                   if (startMins >= sInTime && endMins <= sOutTime) {
                       totalApprovedShiftMins += (endMins - startMins);
                   }
               }
           }
           
           const totalSpannedMins = sOutTime - sInTime;
           const gapMins = totalSpannedMins - totalApprovedShiftMins;
           if (gapMins > 0) {
               overrides._unapprovedGapHours = gapMins / 60;
           }
        }
      }
    }
    
    return { ...cc, ...overrides };
  }

  return cc;
};

export const getScheduledEndTime = (t: any) => {
  return extractTimeStr(t.scheduledEndTime, t.date);
};

export const getScheduledStartTime = (t: any) => {
  return extractTimeStr(t.scheduledStartTime, t.date);
};

export const getLateMinutes = (t: any, isAdmin: boolean = false) => {
  if (isAdmin) return 0;
  
  const inTimeStr = extractTimeStr(t.actualCheckInTime || t.checkInTime, t.date);
  let schTimeStr = getScheduledStartTime(t);

  if (schTimeStr && inTimeStr) {
    const [schH, schM] = schTimeStr.split(':').map(Number);
    const [inH, inM] = inTimeStr.split(':').map(Number);
    let diff = (inH * 60 + inM) - (schH * 60 + schM);
    if (diff < 0 && (24 - schH + inH) < 12) diff += 24 * 60;
    if (diff > 0 && diff < 12 * 60) {
      return diff;
    }
  }
  
  if (t.lateMinutes !== undefined) return t.lateMinutes;
  if (t.latePenaltyMinutes !== undefined && t.latePenaltyMinutes > 0) return t.latePenaltyMinutes / 3;
  return 0;
};

export const getLatePenaltyMinutes = (t: any, isAdmin: boolean = false, allMonthLogs: any[] = []) => {
  if (isAdmin) return 0;
  if (t.isLateExcused) return 0;
  
  const lateMins = getLateMinutes(t, isAdmin);
  if (lateMins >= 10) return lateMins * 3;
  
  if (lateMins > 0 && lateMins < 10 && allMonthLogs.length > 0) {
    // Sort all month logs chronologically
    const sortedLogs = [...allMonthLogs].sort((a, b) => {
      const timeA = a.date + 'T' + (a.checkInTime || '00:00');
      const timeB = b.date + 'T' + (b.checkInTime || '00:00');
      return timeA.localeCompare(timeB);
    });
    
    // Find index of current log among minor lates
    let minorLateCount = 0;
    for (const log of sortedLogs) {
      if (log.status === 'pending_approval') continue;
      const m = getLateMinutes(log, isAdmin);
      if (m > 0 && m < 10 && !log.isLateExcused) {
        minorLateCount++;
        if (log.id === t.id) {
          if (minorLateCount > 5) return lateMins * 3;
          return 0;
        }
      }
    }
  }
  
  if (t.latePenaltyMinutes !== undefined && t.latePenaltyMinutes > 0) return t.latePenaltyMinutes;
  return 0;
};

export const getPhonePenalty = (t: any, hourlyRate: number) => {
  // SUSPENDED: Tạm ngưng tính phạt điện thoại
  return 0;
  /*
  let penalty = Number(t.phonePenalty) || 0;
  const mins = Number(t.phoneMinutes) || Number(t.PhutPhatRoiApp) || 0;
  const count = Number(t.SoLanRoiApp) || 0;
  const hr = Number(hourlyRate) || 0;

  if (penalty === 0 && (mins > 5 || count > 3)) {
    penalty = Math.round(mins * 3 * (hr / 60));
  }
  
  return penalty;
  */
};

export const getTotalHours = (t: any) => {
  // If admin manually edited this timesheet, always respect their exact saved hours
  if (t.isManualEdit && typeof t.totalHours === 'number') {
    return t.totalHours;
  }

  const inTimeStr = extractTimeStr(t.checkInTime, t.date);
  const outTimeStr = extractTimeStr(t.checkOutTime, t.date);

  if (inTimeStr && outTimeStr) {
    let [inH, inM] = inTimeStr.split(':').map(Number);
    
    // Optimize check-in time against scheduled start time
    const schedStartTimeStr = getScheduledStartTime(t);
    if (schedStartTimeStr) {
      if (schedStartTimeStr) {
        const [schH, schM] = schedStartTimeStr.split(':').map(Number);
        if (inH * 60 + inM < schH * 60 + schM || (inH * 60 + inM > 21 * 60 && schH * 60 + schM < 3 * 60)) {
          inH = schH;
          inM = schM;
        }
      }
    }

    let [outH, outM] = outTimeStr.split(':').map(Number);
    
    // Optimize check-out time against scheduled end time
    const schedEndTimeStr = getScheduledEndTime(t);
    if (schedEndTimeStr) {
      const [schEndH, schEndM] = schedEndTimeStr.split(':').map(Number);
      const outTotal = outH * 60 + outM;
      const schEndTotal = schEndH * 60 + schEndM;

      if (outTotal > schEndTotal && outTotal <= schEndTotal + 14) {
          outH = schEndH;
          outM = schEndM;
      } else if (outTotal >= schEndTotal + 15) {
          if (t.status !== 'approved' && t.status !== 'Present_Approved') {
              outH = schEndH;
              outM = schEndM;
          }
      }
    }
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60; // overnight
    
    // Subtract gap if across multiple shifts and not approved
    if (t._unapprovedGapHours && t.status !== 'approved' && t.status !== 'Present_Approved') {
        diff -= t._unapprovedGapHours * 60;
    }
    
    if (diff > 0) return diff / 60;
  }

  return 0;
};

export const formatMinutes = (minutes: number) => {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}p`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m > 0 ? `${h}h${m}p` : `${h}h`;
};

export const formatDecimalHours = (decimalHours: number) => {
  return Number(decimalHours).toFixed(2);
};

export const getTimeStyle = (timeStr: string | null, dateStr?: string | null) => {
  if (!timeStr) return 'bg-slate-50 text-slate-400 border-slate-100';
  const d = safeParseDate(timeStr, dateStr);
  const hour = d ? d.getHours() : 0;
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
    shifts.push({ name: 'SÁNG', hours: Number(morningHours.toFixed(2)), color: 'bg-emerald-50 text-emerald-700 border-emerald-100' });
  }

  // Afternoon Shift
  const afternoonHours = getOverlap(inDate, outDate, mEnd, aEnd);
  if (afternoonHours > 0) {
    shifts.push({ name: 'TRƯA', hours: Number(afternoonHours.toFixed(2)), color: 'bg-amber-50 text-amber-700 border-amber-100' });
  }

  // Evening Shift
  const eveningHours = getOverlap(inDate, outDate, aEnd, eEnd);
  if (eveningHours > 0) {
    shifts.push({ name: 'TỐI', hours: Number(eveningHours.toFixed(2)), color: 'bg-slate-100 text-slate-700 border-slate-100' });
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
