import React from 'react';
import { format } from 'date-fns';
import { AlertCircle, Calendar, Info, ShieldAlert, History, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Violation } from '../../types/admin';
import { db } from '../../firebase';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { safeFormat } from '../../utils/dateUtils';

interface EmployeeViolationTrackerProps {
  violations: Violation[];
  theme: any;
  onRefresh?: () => void;
}

export const EmployeeViolationTracker: React.FC<EmployeeViolationTrackerProps> = ({
  violations,
  theme,
  onRefresh
}) => {
  const [isConfirming, setIsConfirming] = React.useState<string | null>(null);
  const count = violations.length;
  
  const handleConfirm = async (violationId: string) => {
    setIsConfirming(violationId);
    try {
      await updateDoc(doc(db, 'Violations', violationId), {
        isConfirmed: true,
        confirmedAt: serverTimestamp()
      });
      toast.success('Đã xác nhận lỗi vi phạm');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error confirming violation:', error);
      toast.error('Lỗi khi xác nhận');
    } finally {
      setIsConfirming(null);
    }
  };

  const pendingViolations = violations.filter(v => !v.isConfirmed);
  const confirmedViolations = violations.filter(v => v.isConfirmed);

  const maxSteps = 8;
  
  const getStatusColor = (current: number) => {
    if (current >= 8) return 'bg-red-500 shadow-red-200';
    if (current >= 5) return 'bg-orange-500 shadow-orange-200';
    return 'bg-emerald-500 shadow-emerald-200';
  };

  const getStepColor = (step: number) => {
    if (step > count) return 'bg-slate-100';
    if (step >= 8) return 'bg-red-500';
    if (step >= 5) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  const getDeductionText = () => {
    if (count >= 8) return 'Khấu trừ 100% Thưởng Trách Nhiệm';
    if (count >= 5) return 'Khấu trừ 50% Thưởng Trách Nhiệm';
    return 'Chưa bị khấu trừ thưởng';
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className={`p-6 ${theme.accent} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none mb-1">THEO DÕI NHẮC NHỞ</h3>
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Tính theo tháng hiện tại</span>
              </div>
            </div>
            <div className={`px-4 py-2 bg-white rounded-2xl shadow-lg flex items-center gap-2`}>
              <span className={`text-2xl font-black ${count >= 8 ? 'text-red-500' : count >= 5 ? 'text-orange-500' : 'text-emerald-500'}`}>
                {count}
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase">Lần</span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến trình vi phạm</span>
              <span className={`text-[11px] font-black uppercase tracking-wider ${count >= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                {count}/{maxSteps} Nấc cảnh báo
              </span>
            </div>
            
            <div className="flex gap-1.5 h-3">
              {Array.from({ length: maxSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-500 ${getStepColor(i + 1)} ${i + 1 <= count ? 'shadow-sm scale-y-110' : ''}`}
                />
              ))}
            </div>

            <div className="flex justify-between px-1">
              <span className="text-[9px] font-bold text-emerald-500 uppercase">An toàn</span>
              <span className="text-[9px] font-bold text-orange-500 uppercase">-50% Thưởng</span>
              <span className="text-[9px] font-bold text-red-500 uppercase">-100% Thưởng</span>
            </div>
          </div>

          {/* Status Message */}
          <div className={`p-4 rounded-2xl flex items-center gap-4 border ${
            count >= 8 ? 'bg-red-50 border-red-100 text-red-700' : 
            count >= 5 ? 'bg-orange-50 border-orange-100 text-orange-700' : 
            'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            <Info className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-black uppercase tracking-wide leading-relaxed">
              {getDeductionText()}
            </p>
          </div>

          {/* History List */}
          <div className="space-y-4 pt-2">
            {pendingViolations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Cần xác nhận ngay ({pendingViolations.length})</span>
                </div>
                {pendingViolations.map((v) => (
                  <div 
                    key={v.id} 
                    className="p-4 bg-red-50 rounded-2xl border-2 border-red-200 space-y-3 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center border border-red-100 shrink-0">
                           <span className="text-[8px] font-black text-slate-400 uppercase leading-none">{safeFormat(v.date, 'MMM')}</span>
                           <span className="text-base font-black text-slate-800 leading-none">{safeFormat(v.date, 'dd')}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-red-700 uppercase tracking-tight">{v.type}</span>
                          <span className="text-[10px] text-red-600/70 font-medium italic leading-tight">{v.note || 'Quản lý đã ghi nhận lỗi này'}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirm(v.id)}
                      disabled={isConfirming === v.id}
                      className="w-full py-2.5 bg-red-600 text-white font-black rounded-xl text-[10px] shadow-lg shadow-red-200 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {isConfirming === v.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          TÔI ĐÃ HIỂU & XÁC NHẬN
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 px-1 text-slate-400">
              <History className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Lịch sử nhắc nhở chi tiết</span>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {violations.length > 0 ? (
                violations.map((v, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={v.id} 
                    className={`flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors ${!v.isConfirmed ? 'opacity-50' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center bg-white w-12 h-12 rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                        {safeFormat(v.date, 'MMM')}
                      </span>
                      <span className="text-lg font-black text-slate-900 leading-none">
                        {safeFormat(v.date, 'dd')}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 uppercase truncate">{v.type}</span>
                        {v.isConfirmed ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium italic truncate">{v.note || 'Không có ghi chú'}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-emerald-50/30 border border-dashed border-emerald-100 rounded-2xl py-6 flex flex-col items-center justify-center gap-2 opacity-60">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center px-4">
                    Thật tuyệt vời! Bạn chưa có nhắc nhở nào trong tháng này.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
