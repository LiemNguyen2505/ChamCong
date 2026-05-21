import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Employee } from '../../types/admin';

interface SmartScheduleMobileProps {
  handlePrevDay: () => void;
  handleNextDay: () => void;
  mobileSelectedDate: string;
  setMobileSelectedDate: (val: string) => void;
  setCurrentDate: (val: Date) => void;
  renderDailySummary: (date: string, type: 'desktop' | 'mobile') => React.ReactNode;
  groupedEmployees: Record<string, Employee[]>;
  isReadOnly?: boolean;
  moveEmployee: (empId: string, direction: 'up' | 'down') => void;
  activeBranch: string;
  renderCell: (emp: Employee, dateStr: string) => React.ReactNode;
}

export const SmartScheduleMobile: React.FC<SmartScheduleMobileProps> = ({
  handlePrevDay,
  handleNextDay,
  mobileSelectedDate,
  setMobileSelectedDate,
  setCurrentDate,
  renderDailySummary,
  groupedEmployees,
  isReadOnly,
  moveEmployee,
  activeBranch,
  renderCell
}) => {
  return (
      <div className="md:hidden flex-1 overflow-y-auto bg-slate-50">
         <div className="bg-white rounded-t-xl shadow-sm border-t border-slate-100 overflow-hidden mb-2">
            <div className="px-1.5 py-2 border-b border-slate-50 bg-white flex items-center sticky top-0 z-10 shadow-sm gap-1.5">
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <button 
                    onClick={handlePrevDay} 
                    className="p-1 px-[2px] bg-slate-50 text-slate-400 rounded-lg active:bg-slate-100 transition-colors h-8 flex items-center justify-center outline-none"
                  >
                    <ChevronLeft size={20} strokeWidth={1.5} />
                  </button>
                  
                  <div className="flex-1 flex justify-center relative min-w-max">
                    <div className="text-center">
                      <span className="text-[12px] font-black text-slate-800 tracking-tight uppercase leading-none block">
                        {format(parseISO(mobileSelectedDate), 'dd/MM', { locale: vi })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">
                        {format(parseISO(mobileSelectedDate), 'EEEE', { locale: vi })}
                      </span>
                      <input 
                        type="date"
                        value={mobileSelectedDate}
                        onChange={(e) => {
                          setMobileSelectedDate(e.target.value);
                          setCurrentDate(parseISO(e.target.value));
                        }}
                        className="w-full h-full opacity-0 absolute inset-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleNextDay} 
                    className="p-1 px-[2px] bg-slate-50 text-slate-400 rounded-lg active:bg-slate-100 transition-colors h-8 flex items-center justify-center outline-none"
                  >
                    <ChevronRight size={20} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Daily Total Summary for Mobile - Aligned with shift columns */}
                <div className="w-[220px] flex-shrink-0 h-8 border-l border-slate-100 pl-1">
                   {renderDailySummary(mobileSelectedDate, 'mobile')}
                </div>
            </div>
            
            <div className="divide-y divide-slate-100 pb-12">
               {(Object.entries(groupedEmployees) as [string, Employee[]][]).map(([role, list]) => (
                 <React.Fragment key={role}>
                    {role === 'PV' && groupedEmployees.QUẦY && groupedEmployees.QUẦY.length > 0 && (
                      <div className="h-1.5 bg-slate-200 w-full shadow-inner border-y border-slate-100"></div>
                    )}
                    {list.map(emp => (
                      <div key={emp.id} tabIndex={0} className="group/mob px-1.5 py-1.5 flex items-center gap-1.5 bg-white hover:bg-slate-50 transition-all border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative active:bg-sky-50 focus:bg-slate-50 outline-none">
                        {!isReadOnly && (
                          <div className="flex flex-col gap-1 -ml-1 opacity-0 group-hover/mob:opacity-100 group-focus/mob:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover/mob:pointer-events-auto group-focus/mob:pointer-events-auto focus-within:pointer-events-auto w-5">
                            <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'up'); }} className="p-0.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded outline-none"><ChevronUp size={14} strokeWidth={2.5} /></button>
                            <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'down'); }} className="p-0.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded outline-none"><ChevronDown size={14} strokeWidth={2.5} /></button>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 truncate leading-tight tracking-tight">{emp.fullName}</p>
                          {activeBranch !== 'All' && emp.locationId !== activeBranch && (
                            <p className="text-[9px] text-rose-500 font-bold italic truncate tracking-tight uppercase mt-0.5">❂ TỪ {emp.locationId}</p>
                          )}
                        </div>
                        <div className="w-[220px] flex-shrink-0 h-[40px]">
                          {renderCell(emp, mobileSelectedDate)}
                        </div>
                      </div>
                    ))}
                 </React.Fragment>
               ))}
            </div>
         </div>
      </div>
  );
};
