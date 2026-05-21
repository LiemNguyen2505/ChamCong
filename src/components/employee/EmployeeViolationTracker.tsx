import React from 'react';
import { format } from 'date-fns';
import { AlertCircle, Calendar, Info, ShieldAlert, History, CheckCircle, Clock, Phone, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Violation } from '../../types/admin';
import { db } from '../../firebase';
import { addDoc, collection, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { safeFormat } from '../../utils/dateUtils';
import { Employee } from '../../types/admin';

interface EmployeeViolationTrackerProps {
  violations: Violation[];
  theme: any;
  employeeInfo?: Employee | null;
  monthlyStats?: any;
  onRefresh?: () => void;
}

export const EmployeeViolationTracker: React.FC<EmployeeViolationTrackerProps> = ({
  violations,
  theme,
  employeeInfo,
  monthlyStats,
  onRefresh
}) => {
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [showRules, setShowRules] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = React.useState(false);
  const [selectedViolationToReject, setSelectedViolationToReject] = React.useState<Violation | null>(null);
  const count = violations.length;
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const allItems = [
    ...(monthlyStats?.lateDetails || []).map((ld: any, i: number) => ({
      id: `late-${i}-${ld.date}`,
      date: ld.date,
      type: ld.isAbandonedShift ? 'BỎ CA' : 'ĐI TRỄ',
      note: `${ld.shift}: trễ ${ld.minutes < 60 ? `${ld.minutes}p` : `${Math.floor(ld.minutes / 60)}h${ld.minutes % 60 > 0 ? `${ld.minutes % 60}p` : ''}`}${ld.penaltyMinutes > 0 ? ` (-${ld.penalty.toLocaleString()}đ)` : ''}`,
      isConfirmed: true,
      isLate: true
    })),
    ...violations.map(v => ({ ...v, isLate: false }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const todayItems = allItems.filter(item => item.date === todayStr);
  const olderItems = allItems.filter(item => item.date !== todayStr);

  const handleReject = (violation: Violation) => {
    setSelectedViolationToReject(violation);
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    if (!selectedViolationToReject) return;
    const violation = selectedViolationToReject;
    
    setIsProcessing(violation.id);
    try {
      await updateDoc(doc(db, 'Violations', violation.id), {
        isRejected: true,
        rejectedAt: serverTimestamp()
      });

      // Send notification to Admin and Super Admin
      await addDoc(collection(db, 'Notifications'), {
        recipientId: 'all_admins',
        locationId: violation.locationId || employeeInfo?.locationId || 'all',
        title: 'Nhân viên từ chối nhận lỗi',
        message: `Nhân viên ${employeeInfo?.fullName || 'Ẩn danh'} TỪ CHỐI NHẬN lỗi: ${violation.type} ngày ${safeFormat(violation.date, 'dd/MM')}. Vui lòng kiểm tra lại.`,
        type: 'support',
        priority: 'high',
        isRead: false,
        createdAt: serverTimestamp(),
        senderId: employeeInfo?.id || employeeInfo?.empId,
        relatedId: violation.id
      });

      toast.success('Đã gửi thông báo từ chối lỗi đến Quản lý');
      if (onRefresh) onRefresh();
      setShowRejectConfirm(false);
      setSelectedViolationToReject(null);
    } catch (error) {
      console.error('Error rejecting violation:', error);
      toast.error('Lỗi khi gửi phản hồi');
    } finally {
      setIsProcessing(null);
    }
  };

  const pendingViolations = violations.filter(v => !v.isConfirmed && !v.isRejected);
  const confirmedViolations = violations.filter(v => v.isConfirmed);

  const maxSteps = 10;
  
  const getStatusColor = (current: number) => {
    if (current >= 10) return 'bg-red-500 shadow-red-200';
    if (current >= 5) return 'bg-orange-500 shadow-orange-200';
    return 'bg-emerald-500 shadow-emerald-200';
  };

  const getStepColor = (step: number) => {
    const totalVips = (monthlyStats?.lateCount || 0) + count;
    const points = Math.max(0, 10 - totalVips);
    
    if (step > points) return 'bg-slate-200 opacity-50';
    if (points === 0) return 'bg-rose-500';
    if (points <= 5) return 'bg-orange-500';
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
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden text-slate-800 border border-slate-100">
        {/* Header Section - Compact */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`px-2 py-1 rounded-lg font-black text-xs ${(monthlyStats?.lateCount || 0) + count >= 10 ? 'bg-rose-100 text-rose-600' : (monthlyStats?.lateCount || 0) + count >= 5 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {monthlyStats?.finalTtnPercentage || 100}%
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Thưởng Trách Nhiệm</span>
          </div>
          <button 
            onClick={() => setShowRules(true)}
            className="p-2 bg-slate-200/50 rounded-xl text-slate-600 hover:bg-slate-200 transition-all active:scale-90"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Lateness & Phone Summary - 2 Col Compact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase">Đi trễ</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-slate-700">{monthlyStats?.lateCount || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">lần</span>
                <span className="text-lg font-black ml-auto text-slate-700">{monthlyStats?.totalLateMinutes || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">p</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Phạt trễ</span>
                <span className="text-xs font-black text-rose-500">-{(monthlyStats?.latePenaltyTotal || 0).toLocaleString()}đ</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase">Sử dụng ĐT</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-slate-700">{monthlyStats?.phonePenaltyCount || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">lần</span>
                <span className="text-lg font-black ml-auto text-slate-700">{monthlyStats?.phonePenaltyMinutes || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">p</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Phạt ĐT</span>
                <span className="text-xs font-black text-blue-500">-{(monthlyStats?.phonePenaltyTotal || 0).toLocaleString()}đ</span>
              </div>
            </div>
          </div>

          {/* Progress Bar - Compact */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trách Nhiệm</span>
              <span className={`text-[10px] font-black ${Math.max(0, 10 - ((monthlyStats?.lateCount || 0) + count)) <= 5 ? 'text-orange-500' : 'text-slate-400'}`}>
                {Math.max(0, 10 - ((monthlyStats?.lateCount || 0) + count))}/10
              </span>
            </div>
            
            <div className="flex gap-0.5 h-1.5">
              {Array.from({ length: maxSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`flex-1 rounded-sm transition-all duration-500 ${getStepColor(i + 1)}`}
                />
              ))}
            </div>
          </div>

          {/* Status Message & History - Adaptive */}
          {(!monthlyStats?.lateDetails?.length && !violations.length) ? (
            <div className="py-2 flex items-center justify-center gap-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center px-4">Tuyệt vời! Bạn là nhân viên có tinh thần trách nhiệm cao</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Alert for pending actions removed as requested (no red confirmation buttons) */}

              {/* Deduction Text Informant */}
              <div className={`px-4 py-2 rounded-xl text-center border ${
                (monthlyStats?.lateCount || 0) + count >= 10 ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                (monthlyStats?.lateCount || 0) + count >= 5 ? 'bg-orange-50 border-orange-100 text-orange-600' : 
                'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wide">{getDeductionText()}</p>
              </div>

              {/* History List - Modernized */}
              <div className="space-y-3">
                {/* Today's Violations */}
                <div className="space-y-2">
                  {todayItems.length > 0 ? (
                    todayItems.map((v, index) => {
                      const isNew = !v.isConfirmed && !v.isRejected && !v.isLate;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            backgroundColor: isNew ? ['rgba(241, 245, 249, 0.5)', 'rgba(255, 241, 242, 1)', 'rgba(241, 245, 249, 0.5)'] : 'rgba(248, 250, 252, 1)'
                          }}
                          transition={{ 
                            delay: index * 0.05,
                            backgroundColor: isNew ? { duration: 1.5, repeat: Infinity } : {}
                          }}
                          key={v.id} 
                          className={`flex items-center gap-3 p-2.5 rounded-xl border ${isNew ? 'border-rose-200' : 'border-slate-100'} shadow-sm relative overflow-hidden`}
                        >
                          {isNew && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 animate-pulse" />
                          )}
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-100 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] font-black text-slate-600">{safeFormat(v.date, 'dd/MM')}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase ${v.type === 'BỎ CA' ? 'text-rose-600' : 'text-slate-700'}`}>
                                {v.type}
                              </span>
                              {v.isConfirmed && <CheckCircle className="w-2.5 h-2.5 text-emerald-500 opacity-70" />}
                              {v.isRejected && <AlertCircle className="w-2.5 h-2.5 text-orange-500 opacity-70" title="Đang khiếu nại" />}
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium truncate italic">{v.note}</p>
                          </div>
                          {!v.isConfirmed && !v.isRejected && !v.isLate && (
                            <button
                              onClick={() => handleReject(v as Violation)}
                              disabled={isProcessing === v.id}
                              className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all active:scale-90"
                              title="Không thừa nhận lỗi này"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {v.isRejected && (
                             <span className="text-[8px] font-bold text-orange-500 uppercase italic">Đang khiếu nại</span>
                          )}
                        </motion.div>
                      );
                    })
                  ) : olderItems.length === 0 ? null : (
                    <div className="py-2 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase italic">Không có vi phạm hôm nay</span>
                    </div>
                  )}
                </div>

                {/* Toggle for Older Violations */}
                {olderItems.length > 0 && (
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Chi tiết vi phạm ({olderItems.length})
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: showHistory ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-300" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {showHistory && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-1.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar"
                        >
                          {olderItems.map((v, index) => (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              key={v.id} 
                              className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100"
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded bg-white border border-slate-100 flex items-center justify-center">
                                <span className="text-[10px] font-black text-slate-400">{safeFormat(v.date, 'dd/MM')}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black uppercase ${v.type === 'BỎ CA' ? 'text-rose-400' : 'text-slate-600'}`}>
                                    {v.type}
                                  </span>
                                  {v.isConfirmed && <CheckCircle className="w-2.5 h-2.5 text-emerald-400 opacity-50" />}
                                  {v.isRejected && <AlertCircle className="w-2.5 h-2.5 text-orange-500 opacity-50" />}
                                </div>
                                <p className="text-[8px] text-slate-400 truncate italic leading-relaxed">{v.note}</p>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
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
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className={`p-6 text-white flex justify-between items-center border-b border-slate-100`} style={{ backgroundColor: theme?.primary || '#1e293b' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Quy tắc Thưởng & Phạt</h3>
                </div>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                {/* Progress Bar Rules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ShieldAlert className="w-5 h-5 font-black" />
                    <span className="text-sm font-black uppercase tracking-wider">Quy tắc Thưởng Trách Nhiệm</span>
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
                        <span className="text-rose-600">Trừ vào Tiền lương:</span> Trễ dưới 10 phút sẽ nhắc nhở và ghi nhận vào số lần đi trễ. Nếu trễ từ 10 phút trở lên: <span className="text-rose-600">Tiền phạt trễ = Số phút đi trễ × 3 × (Lương giờ / 60)</span>.
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
                        Mất 100% TTN ngay lập tức nếu <span className="text-rose-600 font-bold">Bỏ ca</span> không lý do.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone Rules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Phone className="w-5 h-5 font-black" />
                    <span className="text-sm font-black uppercase tracking-wider">Quy tắc Sử dụng Điện thoại & Rời App</span>
                  </div>
                  <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        Hệ thống tự động ghi nhận việc rời khỏi ứng dụng hoặc tắt màn hình trong giờ làm việc (tính theo ca).
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        Ca làm việc bị tính là <strong>VI PHẠM</strong> lỗi điện thoại nếu rời app <strong className="text-blue-600">quá 3 lần</strong> HOẶC có 1 lần rời app liên tục <strong className="text-blue-600">quá 3 phút</strong>.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        <strong>Trừ tiền:</strong> Khi vi phạm, hệ thống tự động quy đổi thành Tiền Phạt: <strong className="text-blue-600">Tiền phạt = Tổng số phút rời app × 3 × (Lương giờ / 60)</strong>.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        <strong>Trừ TTN:</strong> Mỗi ca làm việc vi phạm lỗi điện thoại sẽ tự động bị tính <strong className="text-blue-600">1 gạch vi phạm</strong> (trừ 10% Thưởng Trách Nhiệm của tháng).
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

        {showRejectConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isProcessing) {
                  setShowRejectConfirm(false);
                  setSelectedViolationToReject(null);
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Từ chối vi phạm</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                Bạn vừa từ chối lỗi <span className="text-rose-600 font-bold">"{selectedViolationToReject?.type}"</span>. Thông báo sẽ được gửi cho Quản lý để kiểm tra lại.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setShowRejectConfirm(false);
                    setSelectedViolationToReject(null);
                  }}
                  disabled={!!isProcessing}
                  className="py-4 bg-slate-100 text-slate-500 font-black rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmReject}
                  disabled={!!isProcessing}
                  className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all uppercase tracking-widest text-xs flex justify-center items-center"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Xác nhận'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
