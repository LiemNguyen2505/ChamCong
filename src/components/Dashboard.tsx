import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Users, AlertCircle, DollarSign, TrendingUp, CheckCircle2, Clock, ChevronDown, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Employee, Timesheet, AdminAccount, PayrollAdjustment, ApprovalRequest } from '../types/admin';
import { findEmployee } from '../utils/adminHelpers';
import { startOfMonth, endOfMonth, differenceInDays, isSameMonth, parse } from 'date-fns';
import { SafeChartContainer } from './ui/SafeChartContainer';

interface DashboardProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  filterBranch: string;
  filterMonth: string;
  nhanViens: Employee[];
  filteredChamCongs: Timesheet[];
  payrollAdjustments: PayrollAdjustment[];
  currentAdmin: AdminAccount | null;
  adminTheme: any;
  formatCurrency: (val: number) => string;
  getPreviousMonthRates: (empId: string, monthYear: string, adjustments: PayrollAdjustment[]) => any;
  toast: any;
  pendingRequests: ApprovalRequest[];
  BranchTabs: React.FC<any>;
}

// Memoized Personnel Overview
const PersonnelOverview = React.memo(({ personnelOverview, branchEmployees, adminTheme }: { 
  personnelOverview: any, 
  branchEmployees: any[], 
  adminTheme: any 
}) => {
  const { activeEmps, lateEmpsToday, top3 } = personnelOverview;
  
  return (
    <div className="bg-white rounded-xl md:rounded-3xl border border-stone-100 shadow-sm p-4 md:p-8 hover:shadow-md transition-shadow group md:flex-[2] flex flex-col min-h-[160px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${adminTheme.accent.replace('bg-', 'bg-')}/10 ${adminTheme.text} rounded-lg`}>
            <Users strokeWidth={2.5} className="w-5 h-5" />
          </div>
          <h3 className={`font-black text-white ${adminTheme.accent} px-3 py-1.5 rounded-lg text-[13px] md:text-lg uppercase tracking-tight leading-none inline-block shadow-sm`}>
            TỔNG QUAN NHÂN SỰ
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-sm font-black text-slate-400 p-2 bg-slate-50 rounded-lg">
            {activeEmps.length}/{branchEmployees.length} ON
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5 no-scrollbar">
          {activeEmps.map((name: string, i: number) => (
            <div key={`active-${i}`} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-100">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] md:text-xs font-black uppercase tracking-tighter">{name}</span>
            </div>
          ))}
          {lateEmpsToday.map((name: string, i: number) => (
            <div key={`late-${i}`} className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-full border border-rose-100">
              <AlertCircle className="w-2 h-2" />
              <span className="text-[9px] md:text-xs font-black uppercase tracking-tighter">{name} (Trễ)</span>
            </div>
          ))}
          {activeEmps.length === 0 && (
            <span className="text-[10px] font-bold text-slate-300 italic uppercase">Chưa có ai vào ca...</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
           {top3.map((item: any, idx: number) => (
             <div key={idx} className="flex items-center justify-between bg-stone-50/50 p-2 rounded-xl border border-stone-100 group/item hover:bg-white transition-colors">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">{item.label}</span>
                   <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{item.name}</span>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-slate-400 italic bg-white px-2 py-0.5 rounded-md border border-stone-100">
                     {item.detail}
                   </span>
                </div>
             </div>
           ))}
           {top3.length === 0 && (
             <div className="col-span-full py-2 text-center border border-dashed border-stone-200 rounded-xl">
                <span className="text-[10px] font-black text-slate-300 uppercase italic">Chưa có ghi nhận kỷ luật</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
});

// Memoized Financial Metrics
const FinancialMetrics = React.memo(({ 
  totalSalary, 
  totalHoursMonth, 
  monthlyTargetHours, 
  setMonthlyTargetHours, 
  avgHoursDay, 
  avgSalaryDay, 
  adminTheme, 
  formatCurrency, 
  filterMonth, 
  setActiveTab, 
  toast 
}: {
  totalSalary: number,
  totalHoursMonth: number,
  monthlyTargetHours: number,
  setMonthlyTargetHours: (val: number) => void,
  avgHoursDay: number,
  avgSalaryDay: number,
  adminTheme: any,
  formatCurrency: (val: number) => string,
  filterMonth: string,
  setActiveTab: (tab: string) => void,
  toast: any
}) => {
  return (
    <div className="bg-white rounded-xl md:rounded-3xl border border-stone-100 shadow-sm p-4 md:p-8 group md:flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 md:p-3 ${adminTheme.accent.replace('bg-', 'bg-')}/10 ${adminTheme.text} rounded-xl`}>
            <DollarSign strokeWidth={2.5} className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className={`font-black text-white ${adminTheme.accent} px-3 py-1.5 rounded-lg text-[13px] md:text-lg uppercase tracking-tight leading-none inline-block shadow-sm`}>
                LƯƠNG HÔM NAY
              </h3>
              <div className="flex items-center gap-1 text-emerald-600 font-black text-[8px] uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
                <TrendingUp className="w-2.5 h-2.5" /> REAL-TIME
              </div>
            </div>
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-2 opacity-60">DỰ TOÁN {filterMonth}</p>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab('bangluong')}
          className="p-2 bg-stone-50 rounded-xl text-stone-400"
        >
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </button>
      </div>

      <div className={`text-3xl md:text-5xl font-black ${adminTheme.text} tracking-tighter mb-6 text-center md:text-left`}>
        {formatCurrency(totalSalary)}
      </div>

      <div className="mb-4">
        <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] md:text-sm font-black text-stone-400 uppercase tracking-widest italic">GIỜ HÔM NAY</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl md:text-3xl font-black text-slate-900">{totalHoursMonth.toFixed(2)}</span>
              <span className="text-[12px] font-black text-slate-900">h</span>
            </div>
          </div>
          
          <div className="space-y-1 relative pt-4">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-stone-900">MỤC TIÊU</span>
              <button 
                onClick={() => {
                  const val = prompt('Nhập mục tiêu số giờ:', monthlyTargetHours.toString());
                  if (val && !isNaN(parseInt(val, 10))) {
                    setMonthlyTargetHours(parseInt(val, 10));
                    toast.success(`Đã cập nhật mục tiêu: ${val}h`);
                  }
                }}
                className="text-[10px] md:text-sm font-extrabold text-stone-900 flex items-center gap-1 hover:bg-stone-100 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
              >
                {monthlyTargetHours}h
              </button>
            </div>
            <div className="h-6 w-full bg-emerald-100 rounded-full overflow-hidden shadow-inner relative flex items-center justify-center">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 absolute left-0 top-0"
                style={{ width: `${Math.min(100, (totalHoursMonth / monthlyTargetHours) * 100)}%` }}
              />
              <span className="relative z-10 text-[11px] md:text-sm font-black text-red-600 drop-shadow-sm">
                {Math.min(100, Math.round((totalHoursMonth / monthlyTargetHours) * 100))}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-400">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-tight">TB GIỜ/NGÀY</span>
          </div>
          <span className="text-[12px] md:text-lg font-black text-slate-700 whitespace-nowrap">
            {(avgHoursDay || 0).toFixed(2)}h / ngày
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-400">
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-tight">TB LƯƠNG/NGÀY</span>
          </div>
          <span className="text-[12px] md:text-lg font-black text-slate-700 whitespace-nowrap">
            {(avgSalaryDay / 1000 || 0).toLocaleString('vi-VN')}k / ngày
          </span>
        </div>
      </div>
    </div>
  );
});

export const Dashboard: React.FC<DashboardProps> = ({
  activeTab,
  setActiveTab,
  filterBranch,
  filterMonth,
  nhanViens,
  filteredChamCongs,
  payrollAdjustments,
  currentAdmin,
  adminTheme,
  formatCurrency,
  getPreviousMonthRates,
  toast,
  pendingRequests,
  BranchTabs
}) => {
  const [monthlyTargetHours, setMonthlyTargetHours] = React.useState(() => {
    const saved = localStorage.getItem(`targetHours_${filterBranch}`);
    return saved ? parseInt(saved, 10) : 850;
  });

  React.useEffect(() => {
    localStorage.setItem(`targetHours_${filterBranch}`, monthlyTargetHours.toString());
  }, [monthlyTargetHours, filterBranch]);

  const branchEmployees = React.useMemo(() => 
    nhanViens.filter(emp => filterBranch === 'All' ? true : emp.locationId === filterBranch || (emp.locationIds && emp.locationIds.includes(filterBranch))),
    [nhanViens, filterBranch]
  );

  const personnelOverview = React.useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // Real-time status
    const activeEmps = filteredChamCongs
      .filter(cc => (cc.date === todayStr && !cc.checkOutTime))
      .map(cc => findEmployee(cc.empId, cc.fullName, nhanViens)?.fullName?.split(' ').pop() || cc.fullName?.split(' ').pop())
      .filter(Boolean);

    const lateEmpsToday = filteredChamCongs
      .filter(cc => (cc.date === todayStr && (cc.lateMinutes || 0) > 0))
      .map(cc => findEmployee(cc.empId, cc.fullName, nhanViens)?.fullName?.split(' ').pop() || cc.fullName?.split(' ').pop())
      .filter(Boolean);

    // Aggregate stats for discipline progress
    const stats: Record<string, { lates: number, onTime: number, phoneViolations: number, total: number, name: string }> = {};
    
    filteredChamCongs
      .filter(cc => cc.date.startsWith(filterMonth) && cc.status !== 'pending_approval')
      .forEach(cc => {
        const id = cc.empId;
        if (!stats[id]) {
          const emp = findEmployee(id, undefined, nhanViens);
          stats[id] = { lates: 0, onTime: 0, phoneViolations: 0, total: 0, name: emp?.fullName?.split(' ').pop() || 'NV' };
        }
        stats[id].total++;
        if ((cc.lateMinutes || 0) > 0) stats[id].lates++;
        else stats[id].onTime++;
        
        if (cc.hasPhoneViolation) {
          stats[id].phoneViolations++;
        }
      });

    const sortedByLate = Object.values(stats).sort((a, b) => b.lates - a.lates);
    const sortedByOnTime = Object.values(stats).sort((a, b) => b.onTime - a.onTime);
    const sortedByPhone = Object.values(stats).filter(s => s.phoneViolations > 0).sort((a, b) => b.phoneViolations - a.phoneViolations);

    const top3 = [];
    if (sortedByOnTime[0]) top3.push({ label: '🐝 Ong Chăm Chỉ', ...sortedByOnTime[0], detail: `Đúng ${sortedByOnTime[0].onTime}/${sortedByOnTime[0].total}` });
    
    // Prioritize phone violations if they are significant
    if (sortedByPhone[0]) {
      top3.push({ label: '📱 Nghiện ĐT', ...sortedByPhone[0], detail: `Vi phạm ${sortedByPhone[0].phoneViolations} ca` });
    } else if (sortedByLate[0] && sortedByLate[0].lates > 0) {
      top3.push({ label: '🧶 Dây Thun', ...sortedByLate[0], detail: `Trễ ${sortedByLate[0].lates}/${sortedByLate[0].total}` });
    }
    
    if (sortedByOnTime[1]) top3.push({ label: '🌟 Tiềm Năng', ...sortedByOnTime[1], detail: `Đúng ${sortedByOnTime[1].onTime}/${sortedByOnTime[1].total}` });

    return { 
      activeEmps, 
      lateEmpsToday, 
      top3: top3.slice(0, 3) 
    };
  }, [branchEmployees, nhanViens, filteredChamCongs, filterMonth]);

  const financialMetrics = React.useMemo(() => {
    // Note: selectedMonth is 'yyyy-MM' (e.g. '2026-05')
    // The previous code was using parse(filterMonth, 'MM/yyyy', ...) which might be wrong
    // Let's ensure consistency.
    const [year, month] = filterMonth.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, 1);
    const now = new Date();
    const isCurrentMonth = isSameMonth(selectedDate, now);
    const totalDaysInMonth = differenceInDays(endOfMonth(selectedDate), startOfMonth(selectedDate)) + 1;
    const daysElapsed = isCurrentMonth ? now.getDate() : totalDaysInMonth;

    const totalSalary = branchEmployees
      .reduce((total, emp) => {
        const empTimesheets = filteredChamCongs.filter(cc => (cc.empId === emp.id || cc.empId === emp.empId) && cc.date.startsWith(filterMonth) && cc.status !== 'pending_approval');
        const totalHours = empTimesheets.reduce((sum, cc) => sum + (cc.totalHours || 0), 0);
        const adjustment = payrollAdjustments.find(a => (a.empId === emp.id || a.empId === emp.empId) && a.monthYear === filterMonth);
        const prevRates = getPreviousMonthRates(emp.id, filterMonth, payrollAdjustments);
        const currentHourlyRate = adjustment?.hourlyRate ?? (prevRates.hourlyRate ?? (emp.hourlyRate || 0));
        return total + (totalHours * currentHourlyRate);
      }, 0);

    const totalHoursMonth = filteredChamCongs
      .filter(cc => cc.date.startsWith(filterMonth) && cc.status !== 'pending_approval' && branchEmployees.some(e => e.id === cc.empId || e.empId === cc.empId))
      .reduce((sum, cc) => sum + (cc.totalHours || 0), 0);

    return { totalSalary, totalHoursMonth, daysElapsed };
  }, [branchEmployees, filteredChamCongs, filterMonth, payrollAdjustments, getPreviousMonthRates]);

  const { totalSalary, totalHoursMonth, daysElapsed } = financialMetrics;
  const avgHoursDay = totalHoursMonth / Math.max(1, daysElapsed);
  const avgSalaryDay = totalSalary / Math.max(1, daysElapsed);

  if (activeTab !== 'dashboard') return null;

  return (
    <div className="p-2 px-0 md:p-8 space-y-1.5 md:space-y-6">
      <div className="px-3 md:px-0 mb-0.5">
        <BranchTabs />
      </div>
      <div className="flex flex-row justify-between items-end px-3 md:px-0 mb-6 pt-6 md:pt-2">
        <h2 className="text-[18px] md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">TỔNG QUAN</h2>
        <div className="text-[13px] md:text-lg text-slate-500 font-black opacity-90 uppercase tracking-widest leading-none">
          {format(new Date(), "dd/MM/yyyy", { locale: vi })}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-stretch gap-3 px-2 md:px-0 pb-20">
        <PersonnelOverview 
            personnelOverview={personnelOverview} 
            branchEmployees={branchEmployees} 
            adminTheme={adminTheme} 
        />

        <FinancialMetrics 
            totalSalary={totalSalary}
            totalHoursMonth={totalHoursMonth}
            monthlyTargetHours={monthlyTargetHours}
            setMonthlyTargetHours={setMonthlyTargetHours}
            avgHoursDay={avgHoursDay}
            avgSalaryDay={avgSalaryDay}
            adminTheme={adminTheme}
            formatCurrency={formatCurrency}
            filterMonth={filterMonth}
            setActiveTab={setActiveTab}
            toast={toast}
        />
      </div>
    </div>
  );
};
