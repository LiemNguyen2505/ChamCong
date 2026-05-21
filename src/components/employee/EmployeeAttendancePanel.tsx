import React from 'react';
import { Calendar, FileEdit, AlertTriangle, CheckCircle2, Clock, EyeOff, Eye, FileText, History, LogOut, ArrowRight, ShieldAlert } from 'lucide-react';
import BulletinBoard from '../BulletinBoard';

interface EmployeeAttendancePanelProps {
  loggedInEmployee: any;
  kioskBranch: string;
  admins: any[];
  theme: any;
  employees: any[];
  latestLog: any;
  workSchedules: any[];
  monthlyStats: any;
  showStats: boolean;
  setShowStats: (val: boolean) => void;
  setShowWeeklySchedule: (val: boolean) => void;
  setShowRequestModal: (val: boolean) => void;
  setShowViolationModal: (val: boolean) => void;
  setShowSalaryDetails: (val: boolean) => void;
  setShowHistory: (val: boolean) => void;
  handleActionClick: (type: 'check-in' | 'check-out') => void;
  handleToggleTask: (shiftId: string, taskId: string, isCompleted: boolean) => void;
  setRequestType: (val: any) => void;
  setRequestNote: (val: string) => void;
  setSwapWithEmpId: (val: string) => void;
  setRequestTime: (val: string) => void;
  setRequestSubTime: (val: string) => void;
  setRequestDate: (val: string) => void;
  format: (date: Date, str: string) => string;
  selectedMonth: string;
  globalData?: any;
  onRefresh?: () => void;
}

export const EmployeeAttendancePanel: React.FC<EmployeeAttendancePanelProps> = ({
  loggedInEmployee,
  kioskBranch,
  admins,
  theme,
  employees,
  latestLog,
  workSchedules,
  monthlyStats,
  showStats,
  setShowStats,
  setShowWeeklySchedule,
  setShowRequestModal,
  setShowViolationModal,
  setShowSalaryDetails,
  setShowHistory,
  handleActionClick,
  handleToggleTask,
  setRequestType,
  setRequestNote,
  setSwapWithEmpId,
  setRequestTime,
  setRequestSubTime,
  setRequestDate,
  format,
  selectedMonth,
  globalData,
  onRefresh
}) => {
  return (
    <div className="space-y-2">
      {/* Bulletin Board */}
      <BulletinBoard 
        currentEmployee={loggedInEmployee} 
        locationId={loggedInEmployee.locationId || kioskBranch || ''} 
        isAdmin={loggedInEmployee.empId.toUpperCase() === 'ADMIN' || admins.some(a => a.email === loggedInEmployee.fullName)}
        theme={theme}
        employees={employees}
        globalData={globalData}
        onRefresh={onRefresh}
      />

      {/* New Menu Buttons - Side by Side */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => setShowWeeklySchedule(true)}
          className={`flex flex-col items-center justify-center p-2.5 ${theme.bg} ${theme.border} rounded-2xl shadow-sm border hover:border-stone-300 active:scale-[0.95] transition-all group`}
        >
          <div className={`p-2 ${theme.accent} text-white rounded-2xl mb-1.5 shadow-sm`}>
            <Calendar strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <span className={`font-black ${theme.text} text-[9px] uppercase tracking-wider text-center opacity-80 leading-tight`}>Lịch Làm Việc</span>
        </button>

        <button 
          onClick={() => setShowViolationModal?.(true)}
          className={`flex flex-col items-center justify-center p-2.5 ${theme.bg} ${theme.border} rounded-2xl shadow-sm border hover:border-stone-300 active:scale-[0.95] transition-all group`}
        >
          <div className={`p-2 ${theme.accent} text-white rounded-2xl mb-1.5 shadow-sm`}>
            <ShieldAlert strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <span className={`font-black ${theme.text} text-[9px] uppercase tracking-wider text-center opacity-80 leading-tight`}>Trách Nhiệm</span>
        </button>

        <button 
          onClick={() => {
            setRequestType(null);
            setRequestNote('');
            setSwapWithEmpId('');
            setRequestTime('');
            setRequestSubTime('');
            setRequestDate(format(new Date(), 'yyyy-MM-dd'));
            setShowRequestModal(true);
          }}
          className={`flex flex-col items-center justify-center p-2.5 ${theme.bg} ${theme.border} rounded-2xl shadow-sm border hover:border-stone-300 active:scale-[0.95] transition-all group`}
        >
          <div className={`p-2 ${theme.accent} text-white rounded-2xl mb-1.5 shadow-sm`}>
            <FileEdit strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <span className={`font-black ${theme.text} text-[9px] uppercase tracking-wider text-center opacity-80 leading-tight`}>Yêu cầu & Hỗ trợ</span>
        </button>
      </div>

      {/* Leaving App Warning */}
      {latestLog && !latestLog.checkOutTime && (!loggedInEmployee || !(loggedInEmployee.empId.toUpperCase() === 'ADMIN' || admins.some(a => a.email === loggedInEmployee.fullName))) && (
        <div className={`${theme.bg} border ${theme.border} p-3 rounded-2xl animate-pulse flex items-center justify-between shadow-sm`}>
          <p className={`text-[10px] ${theme.text} font-black flex items-center gap-1.5 uppercase tracking-widest`}>
            <AlertTriangle strokeWidth={2} className="w-3.5 h-3.5" />
            GIÁM SÁT
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <p className="text-[9px] text-stone-400 uppercase font-bold tracking-tighter">Rời app:</p>
              <p className="text-sm font-black text-red-500">{latestLog.SoLanRoiApp || 0}/5</p>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-[9px] text-stone-400 uppercase font-bold tracking-tighter">Phạt:</p>
              <p className="text-sm font-black text-red-500">{latestLog.PhutPhatRoiApp || 0}m</p>
            </div>
          </div>
        </div>
      )}

      {/* Tasks in Shift (if active) */}
      {latestLog && !latestLog.checkOutTime && workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)?.tasks && workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)!.tasks!.length > 0 && (
        <div className="bg-white border border-stone-100 p-4 rounded-2xl shadow-sm">
          <h4 className="text-[10px] font-black text-stone-300 mb-3 uppercase tracking-widest">Nhiệm vụ trong ca</h4>
          <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar">
            {workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)!.tasks!.map((task) => (
              <div 
                key={task.id} 
                onClick={() => handleToggleTask(
                  workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)!.id,
                  task.id,
                  !task.isCompleted
                )}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                  task.isCompleted ? 'bg-stone-50 border-stone-100 opacity-60' : 'bg-white border-stone-200 shadow-sm'
                }`}
              >
                <div className={`w-5 h-5 rounded-xl flex items-center justify-center transition-all ${
                  task.isCompleted ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-300'
                }`}>
                  {task.isCompleted && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className={`text-xs flex-1 ${task.isCompleted ? 'line-through text-stone-400' : 'text-stone-700 font-bold'}`}>
                  {task.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary & Statistics Card Upgrade */}
      <div className={`${theme.bg} p-5 rounded-[2.5rem] shadow-sm border ${theme.border} relative overflow-hidden transition-all hover:shadow-md group`}>
        {/* Background Decorative Icon */}
        <div className="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Clock className="w-40 h-40" />
        </div>

        <div className="grid grid-cols-2 gap-0 relative z-10 border-stone-100">
          {/* Column 1: Salary */}
          <div className="flex flex-col items-center justify-center pr-4">
            <div className="flex items-center gap-1.5 mb-2 px-1 whitespace-nowrap" style={{ marginTop: '8px' }}>
              <h3 className={`font-bold ${theme.text} uppercase tracking-widest text-[12px] opacity-60 leading-none`} style={{ marginTop: '8px' }}>Lương Dự Kiến</h3>
              <button 
                onClick={() => setShowStats(!showStats)} 
                className={`${theme.text} opacity-60 hover:opacity-100 transition-opacity`}
                style={{ marginTop: '-6px', paddingTop: '8px' }}
              >
                {showStats ? <EyeOff strokeWidth={1.5} className="w-5 h-5" style={{ marginTop: '-2px' }} /> : <Eye strokeWidth={1.5} className="w-5 h-5" style={{ marginTop: '-2px' }} />}
              </button>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-semibold text-emerald-500 tracking-tighter leading-none transition-colors`}>
                {showStats ? Math.round(monthlyStats.actualSalary).toLocaleString('vi-VN') : '••••••'}
              </span>
              
            </div>
          </div>

          {/* Column 2: Hours */}
          <div className="flex flex-col border-l border-stone-200 pl-4 items-center justify-center" style={{ marginTop: '15px' }}>
            <div className="flex items-center gap-1.5 mb-2 whitespace-nowrap">
              <h3 className={`font-bold ${theme.text} uppercase tracking-widest text-[12px] opacity-60 leading-none`}>Tổng Giờ Công</h3>
              <Clock strokeWidth={2.5} className={`w-[22px] h-[22px] ${theme.text} opacity-60`} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-semibold text-emerald-500 tracking-tighter leading-none transition-colors`}>
                {monthlyStats.totalHours.toFixed(2)}
              </span>
             {/* <span className={`text-[10px] font-black text-emerald-500 opacity-40  leading-none ml-0.5`}>h</span> */}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8 relative z-10">
          <button 
            onClick={() => setShowSalaryDetails(true)}
            className={`py-3 rounded-2xl ${theme.button} text-white shadow-lg ${theme.shadow} transition-all active:scale-[0.97] flex items-center justify-center gap-2`}
          >
            <FileText className="w-4 h-4 opacity-70" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white">CHI TIẾT LƯƠNG</span>
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className={`py-3 rounded-2xl ${theme.button} text-white shadow-lg ${theme.shadow} transition-all active:scale-[0.97] flex items-center justify-center gap-2`}
          >
            <History className="w-4 h-4 opacity-70" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white">BẢNG CHẤM CÔNG</span>
          </button>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => handleActionClick('check-in')}
          disabled={latestLog && !latestLog.checkOutTime}
          className={`w-full py-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.95] ${
            latestLog && !latestLog.checkOutTime
              ? 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
          }`}
        >
          <div className={`p-2.5 rounded-2xl ${latestLog && !latestLog.checkOutTime ? 'bg-stone-200' : 'bg-white/20'}`}>
            <div className="relative">
              <Clock strokeWidth={1.5} className="w-6 h-6" />
              <ArrowRight strokeWidth={2} className="w-3.5 h-3.5 absolute -right-1.5 -bottom-1.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
          </div>
          <span className="font-black text-xs uppercase tracking-widest">VÀO CA</span>
        </button>
        
        <button
          onClick={() => handleActionClick('check-out')}
          disabled={!latestLog || latestLog.checkOutTime}
          className={`w-full py-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.95] ${
            !latestLog || latestLog.checkOutTime
              ? 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'
              : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
          }`}
        >
          <div className={`p-2.5 rounded-2xl ${!latestLog || latestLog.checkOutTime ? 'bg-stone-200' : 'bg-white/20'}`}>
            <LogOut strokeWidth={1.5} className="w-6 h-6" />
          </div>
          <span className="font-black text-xs uppercase tracking-widest">RA CA</span>
        </button>
      </div>
    </div>
  );
};
