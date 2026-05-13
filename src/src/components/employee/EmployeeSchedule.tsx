import React from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameWeek } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Minus, Plus, List, LayoutGrid, Coffee, Users, User, CheckCircle2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getBranchTheme } from '../../utils/theme';

interface EmployeeScheduleProps {
  teamScheduleBranch: string;
  allSchedules: any[];
  employees: any[];
  loggedInEmployee: any;
  setShowWeeklySchedule: (show: boolean) => void;
  scheduleZoom: number;
  setScheduleZoom: React.Dispatch<React.SetStateAction<number>>;
  scheduleViewMode: 'list' | 'grid';
  setScheduleViewMode: (mode: 'list' | 'grid') => void;
  selectedCalendarDate: string;
  setSelectedCalendarDate: (date: string) => void;
  BRANCHES: any[];
  setTeamScheduleBranch: (branch: string) => void;
}

export const EmployeeSchedule: React.FC<EmployeeScheduleProps> = ({
  teamScheduleBranch,
  allSchedules,
  employees,
  loggedInEmployee,
  setShowWeeklySchedule,
  scheduleZoom,
  setScheduleZoom,
  scheduleViewMode,
  setScheduleViewMode,
  selectedCalendarDate,
  setSelectedCalendarDate,
  BRANCHES,
  setTeamScheduleBranch
}) => {
  const [viewDate, setViewDate] = React.useState(new Date());
  
  const scheduleTheme = getBranchTheme(teamScheduleBranch);
  const start = startOfWeek(viewDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dayLabels = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

  const navigateWeek = (direction: 'prev' | 'next') => {
    setViewDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const isCurrentWeek = isSameWeek(viewDate, new Date(), { weekStartsOn: 1 });

  // Auto-select first day of week if current selection is out of range
  React.useEffect(() => {
    const isSelectedDateInWeek = weekDays.some(day => format(day, 'yyyy-MM-dd') === selectedCalendarDate);
    if (!isSelectedDateInWeek) {
      if (isCurrentWeek) {
        setSelectedCalendarDate(format(new Date(), 'yyyy-MM-dd'));
      } else {
        setSelectedCalendarDate(format(start, 'yyyy-MM-dd'));
      }
    }
  }, [start, isCurrentWeek]);

  const getShiftStyle = (startTime: string, isOff: boolean) => {
    if (isOff) return 'bg-[#fee2e2] border-red-200 text-red-700';
    if (startTime < '12:00') return 'bg-[#dcfce7] border-[#bbf7d0] text-[#166534]';
    if (startTime < '17:00') return 'bg-[#fef9c3] border-[#fef08a] text-[#854d0e]';
    return 'bg-[#e2e8f0] border-[#cbd5e1] text-[#475569]';
  };

  const renderDailySummary = (dateStr: string) => {
    const dayShifts = allSchedules.filter(s => s.date === dateStr && s.locationId === teamScheduleBranch && !s.isOff);
    const roles = ["QUẦY", "PV"];
    
    return (
      <div className="p-1 space-y-0.5">
        {roles.map(role => {
          const count = dayShifts.filter(s => {
            const emp = employees.find(e => e.id === s.empId);
            const actualRole = s.roleInShift || emp?.defaultRole || 'PV';
            return actualRole === role;
          }).length;
          if (count === 0) return null;
          return (
            <div key={role} className={`text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-between ${role === 'QUẦY' ? 'bg-[#F4ECE1] text-[#3E2723]' : 'bg-emerald-100 text-emerald-800'}`}>
              <span>{role === 'QUẦY' ? '☕' : '🏃'}</span>
              <span>{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className={`p-4 ${scheduleTheme.accent} border-b border-white/10 flex flex-col gap-3 shadow-lg relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowWeeklySchedule(false)}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-widest leading-none">Lịch Làm Việc</h2>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">Đội ngũ {teamScheduleBranch}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-white/10 rounded-2xl p-1 backdrop-blur-md">
              <button 
                onClick={() => setScheduleViewMode('list')}
                className={`p-1.5 rounded-xl transition-all ${scheduleViewMode === 'list' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/10'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setScheduleViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all ${scheduleViewMode === 'grid' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/10'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Date Navigation Strip */}
        <div className="flex items-center justify-between bg-white/10 rounded-2xl p-2 backdrop-blur-md relative z-10">
          <button 
            onClick={() => navigateWeek('prev')}
            className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-xl text-white active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-white/80" />
              <p className="text-[11px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">
                {format(start, 'dd/MM')} - {format(weekDays[6], 'dd/MM/yyyy')}
              </p>
            </div>
            {isCurrentWeek && (
              <span className="text-[8px] font-black text-emerald-300 uppercase tracking-widest mt-0.5">Tuần hiện tại</span>
            )}
          </div>

          <button 
            onClick={() => navigateWeek('next')}
            className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-xl text-white active:scale-90 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom Controls (Mobile optimized) */}
        {scheduleViewMode === 'grid' && (
          <div className="absolute top-4 right-4 flex items-center bg-white/10 rounded-xl p-0.5 pointer-events-none opacity-0">
             {/* Hidden to save space but keeping logic if needed elsewhere */}
          </div>
        )}
      </div>

      {scheduleViewMode === 'list' ? (
        <div className="flex-1 overflow-auto bg-slate-50 p-2 space-y-3">
          {/* Sticky Calendar Strip */}
          <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md py-2 -mx-2 px-2 border-b border-slate-200">
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {weekDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isSelected = dateStr === selectedCalendarDate;
                const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedCalendarDate(dateStr)}
                    className={`flex-shrink-0 flex flex-col items-center min-w-[45px] p-2 rounded-2xl transition-all ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                        : isToday 
                          ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                          : 'bg-white text-slate-500 border border-slate-100'
                    }`}
                  >
                    <span className="text-[8px] font-black uppercase opacity-60 mb-0.5">{dayLabels[idx].split(' ')[1] || dayLabels[idx]}</span>
                    <span className="text-xs font-black">{format(day, 'dd')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Summary in List View */}
          <div className="grid grid-cols-2 gap-2">
            {["QUẦY", "PV"].map(role => {
              const dayShifts = allSchedules.filter(s => s.date === selectedCalendarDate && s.locationId === teamScheduleBranch && !s.isOff);
              const count = dayShifts.filter(s => {
                const emp = employees.find(e => e.id === s.empId);
                const actualRole = s.roleInShift || emp?.defaultRole || 'PV';
                return actualRole === role;
              }).length;
              
              return (
                <div key={role} className="bg-white p-2 rounded-2xl border border-slate-100 flex items-center gap-2 shadow-sm">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${role === 'QUẦY' ? `${scheduleTheme.bg} ${scheduleTheme.text}` : 'bg-emerald-50 text-emerald-600'}`}>
                    {role === 'QUẦY' ? <Coffee className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{role}</div>
                    <div className="text-xs font-black text-slate-700">{count} nhân sự</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Employee List for Selected Date */}
          <div className="space-y-4">
            {["QUẦY", "PV"].map(role => {
              const roleShifts = allSchedules
                .filter(s => s.date === selectedCalendarDate && s.locationId === teamScheduleBranch)
                .filter(s => {
                  const emp = employees.find(e => e.id === s.empId);
                  const actualRole = s.roleInShift || emp?.defaultRole || 'PV';
                  return actualRole === role;
                })
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              if (roleShifts.length === 0) return null;

              return (
                <div key={role} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className={`w-1 h-3 rounded-full ${role === 'QUẦY' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{role === 'QUẦY' ? 'BỘ PHẬN QUẦY' : 'BỘ PHẬN PHỤC VỤ'}</h3>
                  </div>
                  <div className="grid gap-2">
                    {roleShifts.map(shift => {
                      const emp = employees.find(e => e.id === shift.empId);
                      if (!emp) return null;
                      return (
                        <div key={shift.id} className={`bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 ${shift.isOff ? 'opacity-50' : ''}`}>
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                            {emp.avatar ? (
                              <img src={emp.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <User className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-slate-800 truncate flex items-center gap-1">
                              {emp.fullName}
                              {shift.taskNote && <span title={shift.taskNote} className="text-[10px]">🧹</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getShiftStyle(shift.startTime, shift.isOff)}`}>
                                {shift.isOff ? 'OFF' : `${shift.startTime} - ${shift.endTime}`}
                              </span>
                              {emp.locationId !== teamScheduleBranch && (
                                <span className="text-[8px] text-red-500 font-black italic">Hỗ trợ từ {emp.locationId}</span>
                              )}
                            </div>
                          </div>
                          {loggedInEmployee && loggedInEmployee.empId === emp.empId && (
                            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative">
          <div 
            className="absolute inset-0 overflow-auto p-2 origin-top-left transition-transform duration-200"
            style={{ transform: `scale(${scheduleZoom})`, width: `${100 / scheduleZoom}%`, height: `${100 / scheduleZoom}%` }}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 min-w-[700px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-2 border-b border-r border-slate-200 text-left sticky left-0 bg-slate-50 z-20 w-[120px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</span>
                    </th>
                    {weekDays.map((day, idx) => (
                      <th key={idx} className={`p-2 border-b border-r border-slate-200 text-center min-w-[80px] ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? scheduleTheme.bg : ''}`}>
                        <div className="text-[9px] font-black text-slate-400 uppercase">{dayLabels[idx]}</div>
                        <div className="text-xs font-black text-slate-700">{format(day, 'dd/MM')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const periods = [
                      { type: 'Sáng', check: (s: any) => s.startTime < '12:00', has: allSchedules.some(s => s.empId === emp.id && s.startTime < '12:00' && s.locationId === teamScheduleBranch) },
                      { type: 'Chiều', check: (s: any) => s.startTime >= '12:00' && s.startTime < '18:00', has: allSchedules.some(s => s.empId === emp.id && s.startTime >= '12:00' && s.startTime < '18:00' && s.locationId === teamScheduleBranch) },
                      { type: 'Tối', check: (s: any) => s.startTime >= '18:00', has: allSchedules.some(s => s.empId === emp.id && s.startTime >= '18:00' && s.locationId === teamScheduleBranch) }
                    ];

                    return (
                      <React.Fragment key={emp.id}>
                        {periods.filter(p => p.has).length === 0 ? (
                          <tr className="border-b border-slate-100 opacity-30">
                            <td className="p-2 border-r border-slate-200 font-bold text-[10px] text-slate-400 sticky left-0 bg-white z-10 italic">
                              {emp.fullName}
                            </td>
                            {weekDays.map((_, idx) => (
                              <td key={idx} className="p-1 border-r border-slate-100" />
                            ))}
                          </tr>
                        ) : (
                          periods.filter(p => p.has).map((p, pIdx) => (
                            <tr key={`${emp.id}-${p.type}`} className="border-b border-slate-200 hover:bg-slate-50/30 transition-colors">
                              {pIdx === 0 && (
                                <td rowSpan={periods.filter(p => p.has).length} className="p-2 border-r border-slate-200 font-bold text-[10px] text-slate-700 sticky left-0 bg-white z-10">
                                  <div className="flex flex-col">
                                    <span className="truncate">{emp.fullName}</span>
                                    {emp.locationId !== teamScheduleBranch && (
                                      <span className="text-[7px] text-red-500 font-black italic truncate">Hỗ trợ từ {emp.locationId}</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              {weekDays.map((day, dIdx) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const shift = allSchedules
                                  .filter(s => s.empId === emp.id && s.date === dateStr && s.locationId === teamScheduleBranch)
                                  .find(p.check);
                                const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                return (
                                  <td key={dIdx} className={`p-1 border-r border-slate-200 align-middle ${isToday ? scheduleTheme.bg + '/20' : ''}`}>
                                    <div className="h-[24px] flex items-center justify-center">
                                      {shift ? (
                                        <div 
                                          className={`p-0.5 border text-center transition-all shadow-sm w-full text-[8px] font-black ${getShiftStyle(shift.startTime, shift.isOff)} rounded-md ${loggedInEmployee && loggedInEmployee.empId === emp.empId ? `ring-1 ${scheduleTheme.accent.replace('bg-', 'ring-')} ring-offset-1` : ''} relative group/shift`}
                                        >
                                          {shift.isOff ? 'OFF' : `${shift.startTime} - ${shift.endTime}`}
                                          {shift.taskNote && <span title={shift.taskNote} className="absolute -top-1 -right-1 text-[8px] bg-white rounded-full leading-none shadow-sm">🧹</span>}
                                        </div>
                                      ) : (
                                        <div className="w-full h-full border border-dashed border-slate-50 rounded-md" />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50/80">
                  <tr className="h-[50px]">
                    <td className="p-2 border-t-2 border-r border-slate-200 font-black text-[8px] text-slate-500 uppercase tracking-widest sticky left-0 z-10 text-right bg-slate-50">
                      TỔNG KẾT:
                    </td>
                    {weekDays.map((day, idx) => (
                      <td key={idx} className="p-0 border-t-2 border-r border-slate-200">
                        {renderDailySummary(format(day, 'yyyy-MM-dd'))}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
