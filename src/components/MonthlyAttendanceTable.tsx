import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { Employee, Timesheet } from '../types/admin';
import { safeFormat, safeParseDate } from '../utils/dateUtils';
import { getLateMinutes } from '../utils/adminHelpers';

interface MonthlyAttendanceTableProps {
  nhanViens: Employee[];
  attendanceData: Timesheet[];
  filterMonth: string;
  filterBranch: string;
  adminTheme: any;
  onDayClick: (dateStr: string) => void;
  onEmployeeClick: (emp: Employee) => void;
  isLoading?: boolean;
}

export const MonthlyAttendanceTable: React.FC<MonthlyAttendanceTableProps> = ({ 
  nhanViens, 
  attendanceData, 
  filterMonth, 
  filterBranch, 
  adminTheme, 
  onDayClick, 
  onEmployeeClick,
  isLoading
}) => {
  const year = parseInt(filterMonth.split('-')[0]);
  const month = parseInt(filterMonth.split('-')[1]);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredEmployees = nhanViens.filter(nv => 
    filterBranch === 'All' || 
    nv.locationId === filterBranch || 
    (nv.locationIds && nv.locationIds.includes(filterBranch)) ||
    attendanceData.some(cc => cc.empId === nv.id || cc.empId === nv.empId)
  );

  const dailyHeadCount = useMemo(() => {
    return days.map(day => {
      const dateStr = `${filterMonth}-${day.toString().padStart(2, '0')}`;
      const uniqueEmps = new Set(
        attendanceData
          .filter(cc => cc.date === dateStr && filteredEmployees.some(emp => emp.id === cc.empId || emp.empId === cc.empId))
          .map(cc => cc.empId)
      );
      return uniqueEmps.size;
    });
  }, [days, attendanceData, filterMonth, filteredEmployees]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* Loading Overlay */}
      {isLoading && attendanceData.length === 0 && (
         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] transition-all">
            <div className={`w-12 h-12 border-4 ${adminTheme.accent.includes('rose') ? 'border-rose-200 border-t-rose-600' : 'border-blue-200 border-t-blue-600'} rounded-full animate-spin mb-4`} />
            <p className="text-sm font-black text-slate-600 uppercase tracking-widest animate-pulse">Đang tải dữ liệu tháng {filterMonth}...</p>
         </div>
      )}
      
      {/* Skeleton / Spinner for partial loading (when data exists but refreshing) */}
      {isLoading && attendanceData.length > 0 && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-white/90 border border-slate-200 rounded-full shadow-sm">
          <div className="w-3 h-3 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đang đồng bộ...</span>
        </div>
      )}

      {/* Grand Total Summary for the Month - per Request 8 */}
      {!isLoading && filteredEmployees.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng NV:</span>
              <span className="text-sm font-black text-slate-700">{filteredEmployees.length}</span>
           </div>
           <div className="w-px h-4 bg-slate-200" />
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng giờ Công Branch:</span>
              <div className="flex items-baseline gap-1">
                 <span className="text-sm font-black text-emerald-600">
                    {attendanceData
                      .filter(cc => filteredEmployees.some(emp => emp.id === cc.empId || emp.empId === cc.empId))
                      .reduce((sum, cc) => sum + (cc.status !== 'pending_approval' ? (cc.totalHours || 0) : 0), 0)
                      .toFixed(2)}h
                 </span>
                 {attendanceData
                    .filter(cc => filteredEmployees.some(emp => emp.id === cc.empId || emp.empId === cc.empId) && cc.status === 'pending_approval')
                    .reduce((sum, cc) => sum + (cc.totalHours || 0), 0) > 0 && (
                    <span className="text-[10px] font-bold text-amber-500">
                      (+{attendanceData
                          .filter(cc => filteredEmployees.some(emp => emp.id === cc.empId || emp.empId === cc.empId) && cc.status === 'pending_approval')
                          .reduce((sum, cc) => sum + (cc.totalHours || 0), 0)
                          .toFixed(2)}h pnd)
                    </span>
                 )}
              </div>
           </div>
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse border border-[#e0e0e0]">
          <thead>
            <tr className="bg-slate-50 border-b border-[#e0e0e0]">
              <th className="sticky left-0 z-20 bg-slate-50 border-r border-[#e0e0e0] p-2 min-w-[150px] text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Nhân viên
              </th>
              {days.map(day => {
                const dateStr = `${filterMonth}-${day.toString().padStart(2, '0')}`;
                const date = new Date(year, month - 1, day);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const fullDayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                const dayName = fullDayNames[dayOfWeek];

                return (
                  <th 
                    key={day} 
                    onClick={(e) => { e.stopPropagation(); onDayClick(dateStr); }}
                    className={`border-r border-[#e0e0e0] p-1 min-w-[40px] text-center cursor-pointer transition-colors group relative ${
                      isWeekend ? 'bg-[#f8f9fa] text-rose-600' : 'text-slate-500 hover:bg-sky-50'
                    }`}
                    title={`Xem chi tiết ngày ${day} (${dayName})`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${isWeekend ? 'text-rose-600' : 'text-slate-400'}`}>
                        {dayName}
                      </span>
                      <span className={`text-[11px] font-black ${isWeekend ? 'text-rose-600' : 'text-slate-600'}`}>
                        {day}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-20 bg-amber-50 border-l border-amber-200 p-2 min-w-[60px] text-center text-[10px] font-black text-amber-600 uppercase tracking-widest">T.Giờ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {filteredEmployees.map((emp, empIdx) => {
              let approvedHours = 0;
              let pendingHours = 0;
              return (
                <tr key={emp.id} className="hover:bg-yellow-50 transition-colors group even:bg-[#fdfcfb]">
                  <td 
                    className="sticky left-0 z-10 bg-inherit border-r border-[#e0e0e0] p-[8px_12px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] cursor-pointer text-slate-800 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onEmployeeClick(emp); }}
                    title={`Xem lịch sử của ${emp.fullName}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                        {empIdx + 1}
                      </div>
                      <span className="text-[11px] font-bold whitespace-nowrap group-hover:text-blue-600 group-hover:underline">{emp.fullName}</span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const dateStr = `${filterMonth}-${day.toString().padStart(2, '0')}`;
                    const dayLogs = attendanceData.filter(cc => (cc.empId === emp.id || cc.empId === emp.empId) && cc.date === dateStr);
                    const isWorked = dayLogs.length > 0;
                    if (isWorked) {
                      dayLogs.forEach(log => {
                        if (log.status === 'pending_approval') {
                          pendingHours += (log.totalHours || 0);
                        } else {
                          approvedHours += (log.totalHours || 0);
                        }
                      });
                    }

                    let statusColor = "bg-emerald-500";
                    let textColor = "text-emerald-600";
                    
                    if (isWorked) {
                      const hasAbandoned = dayLogs.some(log => log.isAbandonedShift);
                      const hasViolations = dayLogs.some(log => getLateMinutes(log) > 0 || (log.SoLanRoiApp || 0) > 0 || log.status === 'pending_approval');
                      
                      if (hasAbandoned) {
                        statusColor = "bg-rose-500";
                        textColor = "text-rose-600";
                      } else if (hasViolations) {
                        statusColor = "bg-amber-500";
                        textColor = "text-amber-600";
                      }
                    }

                    return (
                      <td key={day} className={`border-r border-[#e0e0e0] p-[4px] text-center transition-colors group/cell relative ${ (new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6) ? 'bg-slate-50/50' : ''}`}>
                        {isWorked ? (
                          <>
                            <div className="flex flex-col gap-0.5 items-center">
                              <div className={`w-6 h-6 rounded-lg ${statusColor} flex items-center justify-center shadow-sm brightness-110`}>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className={`text-[8px] font-black ${textColor} leading-none`}>
                                {dayLogs.length > 1 ? `${dayLogs.length} ca` : (dayLogs[0].checkInTime ? safeFormat(dayLogs[0].checkInTime, 'HH:mm', '00:00', dayLogs[0].date) : '00:00')}
                              </span>
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-[100] pointer-events-none">
                              <div className="bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl whitespace-nowrap border border-slate-700/50">
                                {dayLogs.map((log, lIdx) => (
                                  <div key={lIdx} className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-emerald-400">VÀO: {log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '00:00', log.date) : '00:00'}</span>
                                      <span className="font-black text-rose-400">RA: {log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '00:00', log.date) : '00:00'}</span>
                                    </div>
                                    {getLateMinutes(log) > 0 && <span className="text-amber-400 font-bold">Trễ: {getLateMinutes(log) < 60 ? `${getLateMinutes(log)}p` : `${Math.floor(getLateMinutes(log) / 60)}h${getLateMinutes(log) % 60 > 0 ? `${getLateMinutes(log) % 60}p` : ''}`}</span>}
                                  </div>
                                ))}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700/50" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-200 font-black">.</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-amber-50/50 group-hover:bg-amber-50 border-l border-amber-200 p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-black ${adminTheme.text}`}>{approvedHours.toFixed(2)}</span>
                      {pendingHours > 0 && (
                        <span className="text-[9px] font-black text-amber-600 mt-0.5 animate-pulse" title={`Có ${pendingHours.toFixed(2)}h chưa duyệt`}>
                          (+{pendingHours.toFixed(2)}?)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-100/50 font-black border-t-2 border-slate-200">
              <td className="sticky left-0 z-10 bg-slate-100 p-4 text-[10px] uppercase text-slate-500 tracking-widest border-r border-slate-200">
                NHÂN SỰ / NGÀY
              </td>
              {dailyHeadCount.map((count, idx) => {
                const day = days[idx];
                const date = new Date(year, month - 1, day);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                return (
                  <td key={idx} className={`p-2 text-center text-xs text-slate-700 border-r border-slate-200 ${isWeekend ? 'bg-slate-200/50' : ''}`}>
                    {count > 0 ? count : '-'}
                  </td>
                );
              })}
              <td className="sticky right-0 z-10 bg-amber-100 p-4 text-center text-amber-700 border-l border-amber-200">
                -
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
