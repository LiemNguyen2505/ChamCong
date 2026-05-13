import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { calculateNetSalary } from '../utils/salaryCalculator';
import SalaryDetailContent from './SalaryDetailContent';

interface Props {
  employee: any;
  month: string;
  timesheets: any[];
  schedules: any[];
  adjustments: any[];
  holidays: any[];
  onClose: () => void;
  adminTheme?: any;
  localAdj: any;
  onSave: (empId: string, adj: any) => void;
  onAdjustmentChange?: (empId: string, key: string, value: any) => void;
  onMonthChange?: (month: string) => void;
  theme?: any;
  violations?: any[];
}

export default function EmployeeSalaryDetailModal({ 
  employee, month, timesheets = [], schedules = [], 
  adjustments = [], holidays = [], onClose, adminTheme, 
  localAdj, onSave, onAdjustmentChange, onMonthChange,
  theme, // Mantaining theme for internal checks if needed, but using adminTheme for UI
  violations = []
}: Props) {
  const isAdmin = theme?.isAdmin || false;
  const monthlyStats = useMemo(() => {
    return calculateNetSalary(employee, month, timesheets, adjustments, holidays, localAdj, violations);
  }, [timesheets, employee, holidays, adjustments, month, localAdj, violations]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className={`p-4 ${adminTheme?.header || 'bg-slate-800'} flex justify-between items-center relative overflow-hidden shrink-0`}>
          <div className="relative z-10">
            <h2 className="text-lg font-black text-white uppercase tracking-widest leading-none">CHI TIẾT LƯƠNG</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
             {/* <p className="text-[10px] font-bold text-white/70 uppercase">{employee?.fullName} • {month.split('-')[1]}/{month.split('-')[0]}</p> */}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <SalaryDetailContent 
            employee={employee} 
            month={month} 
            stats={monthlyStats} 
            theme={theme}
            adminTheme={adminTheme} 
            onSave={(id, adj) => onSave(id, adj)}
            onAdjustmentChange={onAdjustmentChange}
            onMonthChange={onMonthChange}
            localAdj={localAdj}
            timesheets={timesheets}
            adjustments={adjustments}
            holidays={holidays}
            violations={violations}
        />
      </div>
    </div>
  );
}
