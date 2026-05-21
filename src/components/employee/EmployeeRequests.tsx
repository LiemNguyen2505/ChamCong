import React from 'react';
import { X, CalendarX, RefreshCw, User, Fingerprint, Banknote, MessageSquare, ChevronRight } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';

interface EmployeeRequestsProps {
  showRequestModal: boolean;
  setShowRequestModal: (show: boolean) => void;
  loggedInEmployee: any;
  requestType: 'off_sudden' | 'shift_swap' | 'late_early' | 'forgot_check' | 'feedback' | 'salary_advance' | null;
  setRequestType: (type: 'off_sudden' | 'shift_swap' | 'late_early' | 'forgot_check' | 'feedback' | 'salary_advance' | null) => void;
  theme: any;
  kioskBranch: string;
  employees: any[];
  allSchedules: any[];
  requestDate: string;
  setRequestDate: (date: string) => void;
  requestTime: string;
  setRequestTime: (time: string) => void;
  requestSubTime: string;
  setRequestSubTime: (time: string) => void;
  swapWithEmpId: string;
  setSwapWithEmpId: (id: string) => void;
  advanceAmount: string;
  setAdvanceAmount: (amount: string) => void;
  requestNote: string;
  setRequestNote: (note: string) => void;
}

export const EmployeeRequests: React.FC<EmployeeRequestsProps> = ({
  showRequestModal,
  setShowRequestModal,
  loggedInEmployee,
  requestType,
  setRequestType,
  theme,
  kioskBranch,
  employees,
  allSchedules,
  requestDate,
  setRequestDate,
  requestTime,
  setRequestTime,
  requestSubTime,
  setRequestSubTime,
  swapWithEmpId,
  setSwapWithEmpId,
  advanceAmount,
  setAdvanceAmount,
  requestNote,
  setRequestNote
}) => {
  if (!showRequestModal || !loggedInEmployee) return null;

  const getRequestTypeConfig = (typeId: string) => {
    switch (typeId) {
      case 'off_sudden': return { color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-500', ring: 'focus:ring-rose-500', activeBg: 'bg-rose-50/50', btnBg: 'bg-rose-500' };
      case 'shift_swap': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500', ring: 'focus:ring-amber-500', activeBg: 'bg-amber-50/50', btnBg: 'bg-amber-500' };
      case 'late_early': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500', ring: 'focus:ring-amber-500', activeBg: 'bg-amber-50/50', btnBg: 'bg-amber-500' };
      case 'forgot_check': return { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-500', ring: 'focus:ring-emerald-500', activeBg: 'bg-emerald-50/50', btnBg: 'bg-emerald-500' };
      case 'feedback': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500', ring: 'focus:ring-amber-500', activeBg: 'bg-amber-50/50', btnBg: 'bg-amber-500' };
      case 'salary_advance': return { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-500', ring: 'focus:ring-emerald-500', activeBg: 'bg-emerald-50/50', btnBg: 'bg-emerald-500' };
      default: return { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-500', ring: 'focus:ring-slate-500', activeBg: 'bg-slate-50/50', btnBg: 'bg-slate-500' };
    }
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmitRequest = async () => {
    if (!loggedInEmployee) {
      toast.error('Lỗi: Không tìm thấy thông tin nhân viên');
      return;
    }

    if (!requestType) {
      toast.error('Vui lòng chọn loại yêu cầu');
      return;
    }

    if (isSubmitting) return;

    if (requestType === 'shift_swap') {
      if (!swapWithEmpId) { toast.error('Vui lòng chọn nhân viên muốn đổi'); return; }
      if (!requestTime.trim() || !requestSubTime.trim()) { toast.error('Vui lòng chọn đủ ca muốn đổi'); return; }
    }

    if (requestType === 'salary_advance' && (!advanceAmount || isNaN(Number(advanceAmount)) || Number(advanceAmount) <= 0)) {
      toast.error('Vui lòng nhập số tiền ứng hợp lệ');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest = await addDoc(collection(db, 'ApprovalRequests'), {
        empId: loggedInEmployee.empId,
        fullName: loggedInEmployee.fullName,
        locationId: kioskBranch,
        type: requestType,
        status: 'pending',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        details: {
          requestDate,
          requestTime,
          requestSubTime,
          swapWithEmpId: requestType === 'shift_swap' ? swapWithEmpId : null,
          advanceAmount: requestType === 'salary_advance' ? Number(advanceAmount) : null
        },
        note: requestNote
      });

      const requestLabels: Record<string, string> = {
        'off_sudden': 'Xin nghỉ phép',
        'shift_swap': 'Đổi ca',
        'late_early': 'Đi trễ / Về sớm',
        'forgot_check': 'Quên chấm công',
        'feedback': 'Góp ý',
        'salary_advance': 'Ứng lương'
      };

      const requestLabel = requestLabels[requestType] || 'Yêu cầu';

      // Create notification for Admins (Both Branch and Super Admin)
      // The single document with locationId + recipientId='admin' works with useNotifications readBy logic
      // to ensure Super Admin reading it doesn't affect Branch Manager's unread status.
      await addDoc(collection(db, 'Notifications'), {
        recipientId: 'admin',
        locationId: kioskBranch,
        title: `Yêu cầu ${requestLabel}`,
        message: `Nhân viên ${loggedInEmployee.fullName} thuộc quán ${kioskBranch} đã gửi một yêu cầu ${requestLabel}.`,
        type: requestType === 'feedback' ? 'support' : 'approval',
        priority: requestType === 'off_sudden' ? 'high' : 'medium',
        isRead: false,
        createdAt: serverTimestamp(),
        senderId: loggedInEmployee.id || loggedInEmployee.empId,
        relatedId: newRequest.id
      });

      toast.success('Gửi yêu cầu thành công! Chờ quản lý duyệt.');
      setShowRequestModal(false);
      setRequestType(null);
      setRequestNote('');
      setAdvanceAmount('');
      setSwapWithEmpId('');
      setRequestTime('');
      setRequestSubTime('');
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error('Lỗi khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col">
        <div className={`relative p-6 pb-4 ${theme.accent} border-b border-white/10 shrink-0`}>
          <div className={`absolute top-0 right-0 w-32 h-32 ${theme.accent} rounded-full -mr-16 -mt-16 blur-2xl opacity-50`} />
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-0.5">
              <h3 className="font-black text-xl uppercase tracking-tight text-white drop-shadow-sm">
                YÊU CẦU & HỖ TRỢ
              </h3>
              <div className="h-1 w-10 bg-white rounded-full shadow-sm" />
            </div>
            <button 
              onClick={() => {
                if (requestType) {
                  setRequestType(null);
                } else {
                  setShowRequestModal(false);
                }
              }} 
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all shadow-sm hover:shadow-md active:scale-90"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {!requestType ? (
            <div className="space-y-2 pb-4">
              {[
                { id: 'off_sudden', label: 'XIN NGHỈ PHÉP', icon: CalendarX, color: 'text-rose-600', bg: 'bg-rose-50' },
                { id: 'shift_swap', label: 'ĐỔI CA', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' },
                { id: 'late_early', label: 'ĐI TRỄ / VỀ SỚM', icon: User, color: 'text-amber-600', bg: 'bg-amber-50' },
                { id: 'forgot_check', label: 'QUÊN CHẤM CÔNG', icon: Fingerprint, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { id: 'salary_advance', label: 'ỨNG LƯƠNG', icon: Banknote, color: 'text-amber-700', bg: 'bg-amber-50' },
                { id: 'feedback', label: 'GÓP Ý', icon: MessageSquare, color: 'text-teal-600', bg: 'bg-teal-50' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setRequestType(type.id as any)}
                  className={`w-full p-3 rounded-2xl border border-slate-100 transition-all flex items-center gap-4 ${theme.bg} hover:bg-slate-50 active:scale-[0.98] group shadow-sm`}
                >
                  <div className={`w-10 h-10 rounded-xl ${type.bg} flex items-center justify-center ${type.color} shadow-sm group-hover:scale-110 transition-transform`}>
                    <type.icon className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-sm font-bold text-slate-700 text-left uppercase tracking-tight">
                    {type.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 pb-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1 h-full ${getRequestTypeConfig(requestType).btnBg}`} />
                <div className={`w-10 h-10 rounded-xl ${getRequestTypeConfig(requestType).bg} flex items-center justify-center ${getRequestTypeConfig(requestType).color} shadow-sm`}>
                  {(() => {
                    const Icon = [CalendarX, RefreshCw, User, Fingerprint, Banknote, MessageSquare][['off_sudden', 'shift_swap', 'late_early', 'forgot_check', 'salary_advance', 'feedback'].indexOf(requestType)];
                    return <Icon className="w-5 h-5" />;
                  })()}
                </div>
                <span className={`font-bold ${getRequestTypeConfig(requestType).color} text-base uppercase tracking-tight`}>
                  {['XIN NGHỈ PHÉP', 'ĐỔI CA', 'ĐI TRỄ / VỀ SỚM', 'QUÊN CHẤM CÔNG', 'ỨNG LƯƠNG', 'GÓP Ý'][['off_sudden', 'shift_swap', 'late_early', 'forgot_check', 'salary_advance', 'feedback'].indexOf(requestType)]}
                </span>
              </div>

              <div key={requestType} className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {requestType === 'shift_swap' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đổi với nhân viên</label>
                      <select
                        value={swapWithEmpId}
                        onChange={(e) => setSwapWithEmpId(e.target.value)}
                        className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      >
                        <option value="">-- Chọn nhân viên --</option>
                        {employees
                          .filter(e => e.empId !== loggedInEmployee.empId && (e.locationId === kioskBranch))
                          .map(emp => (
                            <option key={emp.id} value={emp.empId}>{emp.fullName}</option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ngày Đổi</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={requestTime}
                        onChange={(e) => setRequestTime(e.target.value)}
                        className={`flex-1 p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      >
                        <option value="">Chọn ca</option>
                        <option value="Ca sáng">Ca sáng</option>
                        <option value="Ca trưa">Ca trưa</option>
                        <option value="Ca tối">Ca tối</option>
                      </select>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">đổi với</span>
                      <select
                        value={requestSubTime}
                        onChange={(e) => setRequestSubTime(e.target.value)}
                        className={`flex-1 p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      >
                        <option value="">Chọn ca</option>
                        <option value="Ca sáng">Ca sáng</option>
                        <option value="Ca trưa">Ca trưa</option>
                        <option value="Ca tối">Ca tối</option>
                      </select>
                    </div>
                  </>
                )}

                {requestType === 'late_early' && (
                   <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NGÀY</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-[0.6] space-y-1">
                        <select
                          value={requestSubTime}
                          onChange={(e) => setRequestSubTime(e.target.value)}
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        >
                          <option value="Đi Trễ">Đi Trễ</option>
                          <option value="Về Sớm">Về Sớm</option>
                        </select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Giờ</label>
                        <input
                          type="time"
                          value={requestTime}
                          onChange={(e) => setRequestTime(e.target.value)}
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        />
                      </div>
                    </div>
                  </>
                )}

                {requestType === 'forgot_check' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giờ vào</label>
                        <input
                          type="time"
                          value={requestTime}
                          onChange={(e) => setRequestTime(e.target.value)}
                          className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all cursor-pointer`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giờ ra</label>
                        <input
                          type="time"
                          value={requestSubTime}
                          onChange={(e) => setRequestSubTime(e.target.value)}
                          className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all cursor-pointer`}
                        />
                      </div>
                    </div>
                  </>
                )}

                {requestType === 'off_sudden' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày off</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ca off</label>
                      <select
                        value={requestTime}
                        onChange={(e) => setRequestTime(e.target.value)}
                        className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      >
                        <option value="">Chọn ca muốn nghỉ</option>
                        <option value="Ca sáng">Ca sáng</option>
                        <option value="Ca trưa">Ca trưa</option>
                        <option value="Ca tối">Ca tối</option>
                        <option value="Cả ngày">Cả ngày</option>
                      </select>
                    </div>
                  </>
                )}

                {requestType === 'salary_advance' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày đề xuất</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Số tiền muốn ứng</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                          placeholder="Ví dụ: 500000"
                          className={`w-full p-3 pl-10 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        />
                        <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VNĐ</span>
                      </div>
                    </div>
                  </>
                )}

                {requestType === 'feedback' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NGÀY</label>
                    <input
                      type="date"
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                    />
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder={
                    requestType === 'shift_swap' 
                      ? "Ghi chú đổi ca (không bắt buộc)..." 
                      : requestType === 'off_sudden'
                      ? "Ghi chú nghỉ (không bắt buộc)..."
                      : "Ghi chú lý do (không bắt buộc)..."
                  }
                  className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 ${requestType ? getRequestTypeConfig(requestType).ring : theme.ring} transition-all min-h-[100px] resize-none font-medium shadow-inner`}
                />
                {requestType === 'feedback' && (
                  <p className="text-[10px] text-slate-400 italic mt-1 px-1">
                    *Mọi góp ý của bạn luôn được ghi nhận để giúp quán tốt hơn mỗi ngày
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 pt-2 border-t border-slate-100 shrink-0">
          <button
            onClick={handleSubmitRequest}
            disabled={!requestType || isSubmitting}
            className={`w-full py-4 ${requestType ? getRequestTypeConfig(requestType).btnBg : theme.accent} hover:opacity-95 hover:shadow-lg hover:-translate-y-0.5 text-white font-black rounded-2xl shadow-md active:scale-[0.98] active:translate-y-0 transition-all text-lg uppercase tracking-widest disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-3`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              requestType === 'feedback' ? 'GỞI GÓP Ý' : 'GỬI CHO QUẢN LÝ'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
