import React, { useMemo, useEffect } from 'react';
import { format, parseISO, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { X, Clock, AlertTriangle, CheckCircle, XCircle, CalendarOff, UserX } from 'lucide-react';
import { safeFormat, safeParseDate } from '../utils/dateUtils';

interface EmployeeAttendanceDetailModalProps {
  employee: any;
  timesheets: any[];
  schedules: any[];
  month: string; // YYYY-MM
  onClose: () => void;
  adminTheme: any;
}

export const EmployeeAttendanceDetailModal: React.FC<EmployeeAttendanceDetailModalProps> = ({
  employee,
  timesheets,
  schedules,
  month,
  onClose,
  adminTheme
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const { days, summary } = useMemo(() => {
    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]) - 1;
    const startDate = startOfMonth(new Date(year, monthNum));
    const daysInMonth = getDaysInMonth(startDate);

    const daysArray = [];
    let totalHours = 0;
    let totalLateMinutes = 0;
    let totalPhoneMinutes = 0;

    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = addDays(startDate, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      const dayTimesheets = timesheets.filter(ts => ts.date === dateStr);
      const daySchedules = schedules.filter(s => s.date === dateStr);

      let isOff = false;
      let isAbsent = false;
      let isDefaultOff = false;

      if (daySchedules.length > 0) {
        isOff = daySchedules.some(s => s.isOff);
        // Chỉ đánh dấu nghỉ luôn nếu quản lý xác định (có trường isAbsent trong lịch)
        isAbsent = daySchedules.some(s => s.isAbsent);
        
        // Nếu có lịch nhưng không đi làm và không được đánh dấu nghỉ luôn thì mặc định là OFF
        if (!isOff && !isAbsent && dayTimesheets.length === 0) {
          isOff = true;
          isDefaultOff = true;
        }
      } else if (dayTimesheets.length === 0) {
        // Không có lịch và không chấm công -> Mặc định là OFF (chỉ hiển thị cho các ngày đã qua hoặc hôm nay)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (currentDate <= today) {
          isOff = true;
          isDefaultOff = true;
        }
      }

      const shifts = dayTimesheets.map(ts => {
        const checkIn = ts.checkInTime ? safeFormat(ts.checkInTime, 'HH:mm', '--:--', ts.date) : '--:--';
        const checkOut = ts.checkOutTime ? safeFormat(ts.checkOutTime, 'HH:mm', '--:--', ts.date) : '--:--';
        const hours = ts.totalHours || 0;
        const lateMins = (!ts.isLateExcused && ts.latePenaltyMinutes) ? ts.latePenaltyMinutes : 0;
        const phonePenalty = ts.TienPhatSuDungDienThoai || 0;

        totalHours += hours;
        totalLateMinutes += lateMins;
        totalPhoneMinutes += phonePenalty;

        return {
          id: ts.id,
          checkIn,
          checkOut,
          hours,
          lateMins,
          phonePenalty,
          note: ts.note || '',
          requiresApproval: ts.checkoutRequiresApproval,
          approved: ts.checkoutRequiresApproval === false && ts.checkOutTime !== null && !ts.checkoutRejectedBy,
          rejected: !!ts.checkoutRejectedBy
        };
      });

      if (shifts.length > 0 || isOff || isAbsent) {
        daysArray.push({
          date: dateStr,
          displayDate: format(currentDate, 'dd/MM/yyyy'),
          shifts,
          isOff,
          isAbsent,
          isDefaultOff
        });
      }
    }

    return {
      days: daysArray.sort((a, b) => b.date.localeCompare(a.date)), // Sort descending
      summary: {
        totalHours,
        totalLateMinutes,
        totalPhoneMinutes
      }
    };
  }, [timesheets, schedules, month]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-white/10 ${adminTheme.header}`}>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Chi tiết chấm công</h2>
            <p className="text-sm text-white/70 mt-1">
              Nhân viên: <span className="font-semibold text-white">{employee?.fullName}</span> • Tháng {month}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-6 ${adminTheme.bg || 'bg-slate-50/30'}`}>
          <div className="space-y-4">
            {days.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Không có dữ liệu chấm công trong tháng này.
              </div>
            ) : (
              days.map((day) => (
                <div key={day.date} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className={`px-4 py-3 ${adminTheme.bg || 'bg-slate-50'} border-b border-slate-200 flex items-center justify-between`}>
                    <span className="font-semibold text-slate-700">{day.displayDate}</span>
                    <div className="flex gap-2">
                      {day.isOff && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">
                          <CalendarOff className="w-3.5 h-3.5" />
                          {day.isDefaultOff ? 'OFF' : 'Lịch Off'}
                        </span>
                      )}
                      {day.isAbsent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold">
                          <UserX className="w-3.5 h-3.5" />
                          Nghỉ luôn
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {day.shifts.length > 0 && (
                    <div className="divide-y divide-slate-100">
                      {day.shifts.map((shift: any, index: number) => (
                        <div key={shift.id || index} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Time & Hours */}
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">Thời gian</span>
                              <div className="font-medium text-slate-900">
                                {shift.checkIn} - {shift.checkOut}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">Giờ công</span>
                              <div className={`font-bold ${adminTheme.text || 'text-sky-600'}`}>
                                {shift.hours.toFixed(2)}h
                              </div>
                            </div>
                            
                            {/* Violations */}
                            <div className="col-span-2 sm:col-span-2 flex flex-col gap-1">
                              <span className="text-xs text-slate-500 block mb-1">Vi phạm</span>
                              <div className="flex flex-wrap gap-2">
                                {shift.lateMins > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded">
                                    <Clock className="w-3.5 h-3.5" />
                                    Trễ {shift.lateMins}p
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 px-2 py-1">Không đi trễ</span>
                                )}
                                {shift.phonePenalty > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Phạt ĐT {shift.phonePenalty.toLocaleString('vi-VN')}đ
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 px-2 py-1">Không dùng ĐT</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notes & Approval */}
                          <div className="sm:w-64 flex flex-col gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                            <div className="text-sm text-slate-600 italic">
                              {shift.note ? `"${shift.note}"` : <span className="text-slate-400">Không có ghi chú</span>}
                            </div>
                            {shift.requiresApproval && (
                              <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                                <Clock className="w-3.5 h-3.5" />
                                Chờ duyệt ra ca
                              </div>
                            )}
                            {shift.approved && (
                              <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Đã duyệt
                              </div>
                            )}
                            {shift.rejected && (
                              <div className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded w-fit">
                                <XCircle className="w-3.5 h-3.5" />
                                Từ chối
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Summary */}
        <div className={`${adminTheme.accent || 'bg-slate-800'} text-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div className="font-medium text-white/80">Tổng kết tháng {month}</div>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center sm:items-end">
              <span className="text-xs text-white/70 uppercase tracking-wider">Tổng giờ công</span>
              <span className={`text-xl font-bold text-white`}>{summary.totalHours.toFixed(2)}h</span>
            </div>
            <div className="flex flex-col items-center sm:items-end">
              <span className="text-xs text-white/70 uppercase tracking-wider">Tổng phút trễ</span>
              <span className={`text-xl font-bold ${summary.totalLateMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {summary.totalLateMinutes}p
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-end">
              <span className="text-xs text-white/70 uppercase tracking-wider">Tổng phạt dùng ĐT</span>
              <span className={`text-xl font-bold ${summary.totalPhoneMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {summary.totalPhoneMinutes.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
