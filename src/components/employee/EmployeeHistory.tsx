import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Clock, History, CheckCircle2, RefreshCw, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';

interface EmployeeHistoryProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  loggedInEmployee: any;
  theme: any;
  monthTimesheets: any[];
  monthlyStats: any;
  branchStats?: Record<string, any>;
  activeBranches?: string[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  fetchInitialData: (monthYear?: string, force?: any, options?: {empId?: string, docId?: string, onlyToday?: boolean}) => Promise<any>;
  isSubjectAdmin?: boolean;
}

export const EmployeeHistory: React.FC<EmployeeHistoryProps> = ({
  showHistory,
  setShowHistory,
  loggedInEmployee,
  theme,
  monthTimesheets,
  monthlyStats,
  branchStats = {},
  activeBranches = [],
  selectedMonth,
  setSelectedMonth,
  fetchInitialData,
  isSubjectAdmin = false
}) => {
  const branches = activeBranches.length > 0 ? activeBranches : [loggedInEmployee?.locationId || 'Góc Phố'];
  const [activeTab, setActiveTab] = useState<string>(branches[0]);
  
  // React to changes in activeBranches
  useEffect(() => {
    if (activeBranches && activeBranches.length > 0 && !activeBranches.includes(activeTab)) {
      setActiveTab(activeBranches[0]);
    }
  }, [activeBranches]);

  if (!showHistory || !loggedInEmployee) return null;

  const navigateMonth = async (direction: 'prev' | 'next') => {
    const current = parseISO(selectedMonth + '-01');
    const target = direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1);
    const targetStr = format(target, 'yyyy-MM');
    
    setSelectedMonth(targetStr);
    await fetchInitialData(targetStr, ['holidays', 'chamCongs', 'lichLamViecs', 'xinNghiPheps', 'payrollAdjustments', 'violations', 'salaryAdvanceRecords'], { empId: loggedInEmployee.empId, docId: loggedInEmployee.id });
  };
  
  const shouldUseTabs = branches.length > 1;
  const currentStats = (shouldUseTabs && branchStats[activeTab]) ? branchStats[activeTab] : monthlyStats;

  const filteredItems = monthTimesheets
    .filter((cc: any) => 
      (cc.empId === loggedInEmployee.id || cc.empId === loggedInEmployee.empId) && 
      cc.date.startsWith(selectedMonth) &&
      (!shouldUseTabs || cc.locationId === activeTab)
    )
    .sort((a: any, b: any) => b.date.localeCompare(a.date) || (a.checkInTime || '').localeCompare(b.checkInTime || ''));

  const groupedByDate = filteredItems.reduce((acc: Record<string, any[]>, curr: any) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});

  const dateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const getSafeDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isNaN(d.getTime())) return null;
      return d;
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[98vh] border border-slate-100"
      >
        <div className={`p-6 ${theme.accent} flex flex-col relative overflow-hidden flex-shrink-0`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="relative z-10 w-full mb-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">Lịch sử chấm công</h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all shadow-sm active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-white/10 rounded-2xl p-2.5 backdrop-blur-md">
              <button 
                onClick={() => navigateMonth('prev')}
                className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-xl text-white active:scale-90 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/80" />
                  <p className="text-sm font-black text-white uppercase tracking-[0.2em]">Tháng {(() => {
                    const d = getSafeDate(selectedMonth + '-01');
                    return d ? format(d, 'MM/yyyy') : '--/----';
                  })()}</p>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-white/50" />
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Tổng: <span className="text-emerald-300 font-black text-sm">{currentStats?.totalHours?.toFixed(2) || '0.00'}h</span></p>
                </div>
              </div>

              <button 
                onClick={() => navigateMonth('next')}
                className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-xl text-white active:scale-90 transition-all disabled:opacity-30 disabled:active:scale-100"
                disabled={selectedMonth === format(new Date(), 'yyyy-MM')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {shouldUseTabs && (
            <div className="flex bg-white/20 rounded-xl p-1 relative z-10">
              {branches.map(branch => (
                <button
                  key={branch}
                  onClick={() => setActiveTab(branch)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-bold transition-all ${
                    activeTab === branch
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {branch}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50 no-scrollbar">
          {dateKeys.map(dateStr => {
             const dayGroup = groupedByDate[dateStr];
             const d = getSafeDate(dateStr);
             return (
              <div key={dateStr} className="bg-white p-2.5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all flex gap-3 relative overflow-hidden">
                <div className={`w-14 h-14 rounded-xl ${theme.bg} ${theme.text} flex flex-col items-center justify-center border-2 ${theme.border} shrink-0 shadow-sm self-start sticky top-0`}>
                  <span className="text-[9px] font-black uppercase opacity-60 leading-none mb-0.5">
                    {d ? ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()] : '??'}
                  </span>
                  <span className="text-xl font-black leading-none">{d ? format(d, 'dd') : '??'}</span>
                </div>
                
                <div className="flex-1 flex flex-col gap-2 divide-y divide-stone-100/50">
                  {dayGroup.map((cc: any, idx: number) => {
                      const extractTimeStr = (t: string | undefined | null) => {
                        if (!t) return null;
                        return t.includes('T') ? t.split('T')[1].substring(0, 5) : (t.includes(' ') ? t.split(' ')[1].substring(0, 5) : t.substring(0, 5));
                      };
                      
                      const inTimeStr = extractTimeStr(cc.checkInTime);
                      const outTimeStr = extractTimeStr(cc.checkOutTime);
                      
                      let computedTotalHours = cc.totalHours || 0;
                      if (!computedTotalHours && inTimeStr && outTimeStr) {
                          const [inH, inM] = inTimeStr.split(':').map(Number);
                          const [outH, outM] = outTimeStr.split(':').map(Number);
                          let diff = (outH * 60 + outM) - (inH * 60 + inM);
                          if (diff < 0) diff += 24 * 60;
                          if (diff > 0) computedTotalHours = diff / 60;
                      }

                      let lateVal = cc.lateMinutes || (cc.latePenaltyMinutes ? cc.latePenaltyMinutes / 3 : 0);
                      if (isSubjectAdmin) {
                          lateVal = 0;
                      } else if (!lateVal && cc.scheduledStartTime && inTimeStr) {
                          const schTimeStr = extractTimeStr(cc.scheduledStartTime);
                          if (schTimeStr) {
                            const [schH, schM] = schTimeStr.split(':').map(Number);
                            const [inH, inM] = inTimeStr.split(':').map(Number);
                            let diff = (inH * 60 + inM) - (schH * 60 + schM);
                            if (diff < 0 && (24 - schH + inH) < 12) diff += 24 * 60;
                            if (diff > 0 && diff < 12 * 60) lateVal = diff;
                          }
                      }

                      const isLate = lateVal > 0;

                      return (
                         <div key={idx} className={`flex flex-col gap-1.5 ${idx > 0 ? 'pt-2' : ''}`}>
                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <div className="grid grid-cols-3 w-full items-center">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <div className="w-4 h-4 rounded-md bg-emerald-50 flex items-center justify-center">
                                        <ArrowRight className="w-3 h-3 text-emerald-600" />
                                      </div>
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="text-[10px] font-black text-stone-400 uppercase leading-none">Vào</span>
                                          {inTimeStr && (() => {
                                            const hour = parseInt(inTimeStr.split(':')[0]);
                                            let shift = '';
                                            let shiftColor = '';
                                            if (hour >= 5 && hour < 11) { shift = 'SÁNG'; shiftColor = 'text-[#166534] bg-emerald-50 border border-emerald-100'; }
                                            else if (hour >= 11 && hour < 17) { shift = 'TRƯA'; shiftColor = 'text-[#854d0e] bg-amber-50 border border-amber-100'; }
                                            else if (hour >= 17 || hour < 24 || (hour >= 0 && hour < 5)) { shift = 'TỐI'; shiftColor = 'text-[#475569] bg-slate-100 border border-slate-200'; }
                                            return shift ? <span className={`text-[8px] font-black ${shiftColor} px-1 rounded-sm tracking-tighter`}>{shift}</span> : null;
                                          })()}
                                        </div>
                                        <span className="text-sm font-black text-slate-700 leading-none">
                                          {inTimeStr || '--:--'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 border-stone-100">
                                      <div className="w-4 h-4 rounded-md bg-rose-50 flex items-center justify-center">
                                        <ArrowLeft className="w-3 h-3 text-rose-600 rotate-180" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-stone-400 uppercase leading-none mb-0.5">Ra</span>
                                        <span className="text-sm font-black text-slate-700 leading-none">
                                          {outTimeStr || '--:--'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col items-end border-l border-stone-100 pl-2">
                                      <span className="text-[10px] font-black text-stone-400 uppercase leading-none mb-0.5">Tổng</span>
                                      <span className={`text-[13px] font-black ${theme.text} leading-none whitespace-nowrap`}>
                                        {outTimeStr ? computedTotalHours.toFixed(2) + 'h' : '---'}
                                      </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                  {cc.checkOutTime ? (
                                    <div className="w-7 h-7 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center -mr-1">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center animate-pulse -mr-1">
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                                    </div>
                                  )}
                                </div>
                            </div>

                            {isLate && (
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="px-1.5 py-0.5 bg-orange-50 border border-orange-100 text-orange-600 text-[9px] font-black uppercase rounded-sm flex items-center gap-1 shadow-sm">
                                        <Clock className="w-2.5 h-2.5" /> Trễ {lateVal < 60 ? `${lateVal}p` : `${Math.floor(lateVal / 60)}h${lateVal % 60 > 0 ? `${lateVal % 60}p` : ''}`}
                                    </span>
                                </div>
                            )}
                         </div>
                      );
                  })}
                </div>
              </div>
             );
          })}
            
          {dateKeys.length === 0 && (
              <div className="py-16 text-center space-y-4">
                <div className="w-24 h-24 bg-stone-100 rounded-[2rem] flex items-center justify-center mx-auto grayscale opacity-30 shadow-inner">
                  <History className="w-12 h-12 text-stone-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">Trống lịch sử</p>
                  <p className="text-stone-300 text-[10px] font-bold uppercase">Tháng này chưa có dữ liệu chấm công</p>
                </div>
              </div>
            )}
        </div>

        <div className="p-4 bg-white border-t border-stone-100">
           <button 
            onClick={() => setShowHistory(false)}
            className={`w-full py-4 ${theme.button} text-white font-black rounded-2xl shadow-lg ${theme.shadow} active:scale-[0.98] transition-all uppercase tracking-widest text-sm`}
           >
             ĐÓNG
           </button>
        </div>
      </motion.div>
    </div>
  );
};

