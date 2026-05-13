import React from 'react';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import SalaryDetailContent from '../SalaryDetailContent';

interface EmployeeSalaryDetailsProps {
  showSalaryDetails: boolean;
  setShowSalaryDetails: (show: boolean) => void;
  loggedInEmployee: any;
  theme: any;
  monthlyStats: any;
  monthTimesheets: any[];
  payrollAdjustments: any[];
  holidays: any[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  fetchInitialData: (monthYear?: string) => Promise<any>;
  violations: any[];
}

export const EmployeeSalaryDetails: React.FC<EmployeeSalaryDetailsProps> = ({
  showSalaryDetails,
  setShowSalaryDetails,
  loggedInEmployee,
  theme,
  monthlyStats,
  monthTimesheets,
  payrollAdjustments,
  holidays,
  selectedMonth,
  setSelectedMonth,
  fetchInitialData,
  violations
}) => {
  if (!showSalaryDetails || !loggedInEmployee) return null;

  const navigateMonth = async (direction: 'prev' | 'next') => {
    const current = parseISO(selectedMonth + '-01');
    const target = direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1);
    const targetStr = format(target, 'yyyy-MM');
    
    setSelectedMonth(targetStr);
    await fetchInitialData(targetStr);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        <div className={`p-5 ${theme.accent} flex justify-between items-start relative overflow-hidden flex-shrink-0`}>
          <div className="relative z-10 w-full">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">CHI TIẾT LƯƠNG</h2>
              <button 
                onClick={() => setShowSalaryDetails(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all shadow-sm active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SalaryDetailContent 
            employee={loggedInEmployee} 
            month={selectedMonth} 
            stats={monthlyStats} 
            theme={{...theme, isAdmin: false}} 
            onSave={() => {}}
            onMonthChange={(m) => {
              setSelectedMonth(m);
              fetchInitialData(m);
            }}
            localAdj={{}}
            timesheets={monthTimesheets.filter((cc: any) => 
              (cc.empId === loggedInEmployee.id || cc.empId === loggedInEmployee.empId) && 
              cc.date.startsWith(selectedMonth)
            )}
            adjustments={payrollAdjustments}
            holidays={holidays}
            violations={violations.filter((v: any) => 
              (v.empId === loggedInEmployee.id || v.empId === loggedInEmployee.empId) && 
              v.date.startsWith(selectedMonth)
            )}
          />
        </div>
      </div>
    </div>
  );
};
