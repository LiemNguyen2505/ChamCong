import React from 'react';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Employee } from '../../types/admin';

interface SmartScheduleDesktopProps {
  weekDays: Date[];
  groupedEmployees: Record<string, Employee[]>;
  activeBranch: string;
  moveEmployee: (empId: string, direction: 'up' | 'down') => void;
  renderCell: (emp: Employee, dateStr: string) => React.ReactNode;
  renderDailySummary: (dateStr: string) => React.ReactNode;
}

export const SmartScheduleDesktop: React.FC<SmartScheduleDesktopProps> = ({
  weekDays,
  groupedEmployees,
  activeBranch,
  moveEmployee,
  renderCell,
  renderDailySummary
}) => {
  return (
      <div className="hidden md:block overflow-auto flex-1 relative bg-white">
        <table className="w-full border-separate border-spacing-0 table-fixed">
          <thead>
            <tr className="bg-slate-50 shadow-sm sticky top-0 z-30">
              <th className="w-[160px] p-4 text-left text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 border-r border-r-slate-300 sticky left-0 z-40 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Nhân viên
              </th>
              {weekDays.map(day => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = isSameDay(day, new Date());
                return (
                  <th key={day.toISOString()} className={`p-2 border-b border-slate-200 border-r-2 border-r-slate-300 text-center transition-colors min-w-[120px] ${isToday ? 'bg-sky-50' : ''}`}>
                    <div className={`text-[9px] font-black uppercase tracking-widest ${isWeekend ? 'text-rose-500' : 'text-slate-400'}`}>
                      {format(day, 'EEEE', { locale: vi })}
                    </div>
                    <div className={`text-sm font-black ${isToday ? 'text-sky-600' : 'text-slate-900'}`}>
                      {format(day, 'dd/MM')}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {groupedEmployees.QUẦY.map(emp => (
              <tr key={emp.id} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3 border-b border-slate-200 border-r-2 border-r-slate-300 font-medium text-[13px] text-slate-800 sticky left-0 bg-white z-20 group-hover:bg-slate-50 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 group/emp" tabIndex={0}>
                      <span className="truncate tracking-tight flex-1" title={emp.fullName}>{emp.fullName}</span>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover/emp:opacity-100 group-focus/emp:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover/emp:pointer-events-auto group-focus/emp:pointer-events-auto focus-within:pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'up'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronUp size={12} strokeWidth={3} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'down'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronDown size={12} strokeWidth={3} /></button>
                      </div>
                    </div>
                    {activeBranch !== 'All' && emp.locationId !== activeBranch && (
                      <span className="text-[8px] text-rose-500 font-black italic tracking-tighter mt-0.5">❂ Hỗ trợ từ {emp.locationId}</span>
                    )}
                  </div>
                </td>
                {weekDays.map(day => (
                  <td key={day.toISOString()} className="p-0 border-b border-slate-200 border-r-2 border-r-slate-300 align-middle">
                    {renderCell(emp, format(day, 'yyyy-MM-dd'))}
                  </td>
                ))}
              </tr>
            ))}

            {/* Subtle Group Separator for PV */}
            {groupedEmployees.PV.length > 0 && groupedEmployees.QUẦY.length > 0 && (
              <tr className="h-1.5 bg-slate-100">
                <td colSpan={8} className="h-1.5 p-0 border-y border-slate-200 sticky left-0 z-20 bg-slate-200/50 shadow-sm">
                </td>
              </tr>
            )}
            {groupedEmployees.PV.map(emp => (
              <tr key={emp.id} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3 border-b border-slate-200 border-r-2 border-r-slate-300 font-medium text-[13px] text-slate-800 sticky left-0 bg-white z-20 group-hover:bg-slate-50 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 group/emp" tabIndex={0}>
                      <span className="truncate tracking-tight flex-1" title={emp.fullName}>{emp.fullName}</span>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover/emp:opacity-100 group-focus/emp:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover/emp:pointer-events-auto group-focus/emp:pointer-events-auto focus-within:pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'up'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronUp size={12} strokeWidth={3} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'down'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronDown size={12} strokeWidth={3} /></button>
                      </div>
                    </div>
                    {activeBranch !== 'All' && emp.locationId !== activeBranch && (
                      <span className="text-[8px] text-rose-500 font-black italic tracking-tighter mt-0.5">❂ Hỗ trợ từ {emp.locationId}</span>
                    )}
                  </div>
                </td>
                {weekDays.map(day => (
                  <td key={day.toISOString()} className="p-0 border-b border-slate-200 border-r-2 border-r-slate-300 align-middle">
                    {renderCell(emp, format(day, 'yyyy-MM-dd'))}
                  </td>
                ))}
              </tr>
            ))}
            
            {/* Add Employee Row */}
          </tbody>
          <tfoot className="sticky bottom-0 z-30 bg-white">
            <tr className="shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <td className="p-4 border-t border-slate-200 border-r-2 border-r-slate-300 bg-slate-50 font-black text-[10px] text-slate-400 uppercase tracking-widest sticky left-0 z-40 text-right shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                BỐ TRÍ:
              </td>
              {weekDays.map(day => (
                <td key={day.toISOString()} className="p-0 border-t border-slate-200 border-r-2 border-r-slate-300 bg-white align-top">
                  {renderDailySummary(format(day, 'yyyy-MM-dd'))}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
  );
};
