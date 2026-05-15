import React from 'react';
import { format } from 'date-fns';
import { AlertCircle, Calendar, Info, ShieldAlert, History, CheckCircle, Clock, Phone, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Violation } from '../../types/admin';
import { db } from '../../firebase';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { safeFormat } from '../../utils/dateUtils';

interface EmployeeViolationTrackerProps {
  violations: Violation[];
  theme: any;
  monthlyStats?: any;
  onRefresh?: () => void;
}

export const EmployeeViolationTracker: React.FC<EmployeeViolationTrackerProps> = ({
  violations,
  theme,
  monthlyStats,
  onRefresh
}) => {
  const [isConfirming, setIsConfirming] = React.useState<string | null>(null);
  const [showRules, setShowRules] = React.useState(false);
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

  const maxSteps = 10;
  
  const getStatusColor = (current: number) => {
    if (current >= 10) return 'bg-red-500 shadow-red-200';
    if (current >= 5) return 'bg-orange-500 shadow-orange-200';
    return 'bg-emerald-500 shadow-emerald-200';
  };

  const getStepColor = (step: number) => {
    const totalVips = (monthlyStats?.lateCount || 0) + count;
    if (step > totalVips) return 'bg-slate-100';
    if (step >= 10) return 'bg-red-500';
    if (step >= 5) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  const getDeductionText = () => {
    const lateCount = monthlyStats?.lateCount || 0;
    const totalLateMinutes = monthlyStats?.totalLateMinutes || 0;
    const skipShift = (monthlyStats?.lateDetails || []).some((ld: any) => ld.isAbandonedShift);

    if (skipShift) return 'Khấu trừ 100% TTN do BỎ CA (Trễ > 300p)';
    if (lateCount >= 10 || count >= 8) return 'Khấu trừ 100% Thưởng Trách Nhiệm';
    if (lateCount >= 5 || count >= 5) return 'Khấu trừ 50% Thưởng Trách Nhiệm';
    return 'Chưa bị khấu trừ thưởng trách nhiệm';
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[#1E293B] rounded-[2rem] shadow-2xl overflow-hidden text-[#E2E8F0]">
        {/* Header Section - Compact */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className={`px-2 py-1 rounded-lg font-black text-xs ${(monthlyStats?.lateCount || 0) + count >= 10 ? 'bg-rose-500/20 text-rose-400' : (monthlyStats?.lateCount || 0) + count >= 5 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {monthlyStats?.finalTtnPercentage || 100}%
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#E2E8F0]/80">Thưởng Trách Nhiệm</span>
          </div>
          <button 
            onClick={() => setShowRules(true)}
            className="p-2 bg-white/10 rounded-xl text-[#E2E8F0] hover:bg-white/20 transition-all active:scale-90"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Lateness & Phone Summary - 2 Col Compact */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#2D3748] p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 opacity-60">
                <Clock className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase">Đi trễ</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black">{monthlyStats?.lateCount || 0}</span>
                <span className="text-[10px] font-bold opacity-40 uppercase">lần</span>
                <span className="text-lg font-black ml-auto">{monthlyStats?.totalLateMinutes || 0}</span>
                <span className="text-[10px] font-bold opacity-40 uppercase">p</span>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-bold opacity-40 uppercase">Phạt trễ</span>
                <span className="text-xs font-black text-rose-400">-{(monthlyStats?.latePenaltyTotal || 0).toLocaleString()}đ</span>
              </div>
            </div>
            
            <div className="bg-[#2D3748] p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 opacity-60">
                <Phone className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase">Sử dụng ĐT</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black">{monthlyStats?.phonePenaltyCount || 0}</span>
                <span className="text-[10px] font-bold opacity-40 uppercase">lần</span>
                <span className="text-lg font-black ml-auto">{monthlyStats?.phonePenaltyMinutes || 0}</span>
                <span className="text-[10px] font-bold opacity-40 uppercase">p</span>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-bold opacity-40 uppercase">Phạt ĐT</span>
                <span className="text-xs font-black text-blue-400">-{(monthlyStats?.phonePenaltyTotal || 0).toLocaleString()}đ</span>
              </div>
            </div>
          </div>

          {/* Progress Bar - Compact */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">Vi phạm & Trễ tháng</span>
              <span className={`text-[10px] font-black ${(monthlyStats?.lateCount || 0) + count >= 5 ? 'text-rose-400' : 'text-[#E2E8F0]/40'}`}>
                {(monthlyStats?.lateCount || 0) + count}/10
              </span>
            </div>
            
            <div className="flex gap-0.5 h-1.5">
              {Array.from({ length: maxSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`flex-1 rounded-sm transition-all duration-500 ${getStepColor(i + 1)} ${i + 1 <= (monthlyStats?.lateCount || 0) + count ? 'shadow-sm' : 'opacity-10'}`}
                />
              ))}
            </div>
          </div>

          {/* Status Message & History - Adaptive */}
          {(!monthlyStats?.lateDetails?.length && !violations.length) ? (
            <div className="py-2 flex items-center justify-center gap-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tuyệt vời! Không có vi phạm</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Alert for pending confirmations */}
              {pendingViolations.length > 0 && (
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Cần xác nhận ngay ({pendingViolations.length})</span>
                  </div>
                  {pendingViolations.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleConfirm(v.id)}
                      disabled={isConfirming === v.id}
                      className="w-full p-2.5 bg-rose-600 text-white font-black rounded-xl text-[9px] active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {isConfirming === v.id ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        `XÁC NHẬN: ${v.type}`
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Deduction Text Informant */}
              <div className={`px-4 py-2 rounded-xl text-center border ${
                (monthlyStats?.lateCount || 0) + count >= 10 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 
                (monthlyStats?.lateCount || 0) + count >= 5 ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 
                'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wide">{getDeductionText()}</p>
              </div>

              {/* Collapsible History - Compact List */}
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {[
                  ...(monthlyStats?.lateDetails || []).map((ld: any, i: number) => ({
                    id: `late-${i}-${ld.date}`,
                    date: ld.date,
                    type: ld.isAbandonedShift ? 'BỎ CA' : 'ĐI TRỄ',
                    note: `${ld.shift}: trễ ${ld.minutes}p${ld.penaltyMinutes > 0 ? ` (-${ld.penalty.toLocaleString()}đ)` : ''}`,
                    isConfirmed: true,
                    isLate: true
                  })),
                  ...violations.map(v => ({ ...v, isLate: false }))
                ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((v, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={v.id} 
                    className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-black opacity-40">{safeFormat(v.date, 'dd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase ${v.type === 'BỎ CA' ? 'text-rose-400' : 'text-[#E2E8F0]'}`}>
                          {v.type}
                        </span>
                        {v.isConfirmed && <CheckCircle className="w-2.5 h-2.5 text-emerald-400 opacity-50" />}
                      </div>
                      <p className="text-[9px] text-[#E2E8F0]/40 font-medium truncate italic">{v.note}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Rules Popup */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRules(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Info className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Quy tắc Phạt & Thưởng</h3>
                </div>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Progress Bar Rules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ShieldAlert className="w-5 h-5 font-black" />
                    <span className="text-sm font-black uppercase tracking-wider">Các nấc Thưởng Trách Nhiệm</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex flex-col items-center text-center">
                      <span className="text-[10px] font-black text-emerald-600 uppercase">Dưới 5 lần</span>
                      <span className="text-base font-black text-emerald-700">100%</span>
                      <span className="text-[8px] font-bold text-emerald-500 uppercase">Thưởng</span>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex flex-col items-center text-center">
                      <span className="text-[10px] font-black text-orange-600 uppercase">5-9 lần</span>
                      <span className="text-base font-black text-orange-700">50%</span>
                      <span className="text-[8px] font-bold text-orange-500 uppercase">Thưởng</span>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex flex-col items-center text-center">
                      <span className="text-[10px] font-black text-rose-600 uppercase">10+ lần</span>
                      <span className="text-base font-black text-rose-700">0%</span>
                      <span className="text-[8px] font-bold text-rose-500 uppercase">Thưởng</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 italic text-center">
                    * Tổng hợp bao gồm số lần Đi trễ và các Nhắc nhở vi phạm khác.
                  </p>
                </div>

                {/* Lateness Rules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-600">
                    <Clock className="w-5 h-5 font-black" />
                    <span className="text-sm font-black uppercase tracking-wider">Quy tắc Phạt đi trễ</span>
                  </div>
                  <div className="space-y-3 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        <span className="text-rose-600">Trừ vào Tiền lương:</span> Tiền phạt trễ = Số phút trễ bị phạt × (Lương giờ / 60).
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        Lưu ý: Chỉ những phút trễ không được quản lý xác nhận mới bị tính phạt.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        Mất 100% TTN ngay lập tức nếu <span className="text-rose-600 font-bold">Bỏ ca</span> (trễ {'>'} 300p không lý do).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone Rules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Phone className="w-5 h-5 font-black" />
                    <span className="text-sm font-black uppercase tracking-wider">Quy tắc Phạt Sử dụng Điện thoại</span>
                  </div>
                  <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        Hệ thống ghi nhận việc rời khỏi ứng dụng trong giờ làm việc để tính vào thưởng trách nhiệm và một phần lương.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        Số tiền trừ sẽ được tính dựa trên dữ liệu thực tế mà app ghi nhận được trong từng ca làm việc (Phạt Điện thoại).
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4">
                  Dữ liệu được hệ thống tự động đồng bộ
                </p>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowRules(false)}
                  className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest"
                >
                  ĐÃ HIỂU QUY ĐỊNH
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
