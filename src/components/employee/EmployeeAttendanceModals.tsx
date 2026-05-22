import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, Clock, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

interface CheckoutSummaryModalProps {
  checkoutSummary: any;
  setCheckoutSummary: (summary: any) => void;
  theme: any;
}

export const CheckoutSummaryModal: React.FC<CheckoutSummaryModalProps> = ({
  checkoutSummary,
  setCheckoutSummary,
  theme
}) => {
  if (!checkoutSummary) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-stone-200"
      >
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-emerald-700 uppercase tracking-tight">Tóm tắt ca làm việc</h2>
        </div>

        <div className="space-y-5 mb-10">
          <div className="flex justify-between items-center p-5 bg-stone-50 rounded-2xl border border-stone-100">
            <span className="text-stone-500 font-black text-base uppercase tracking-wider">Tổng giờ công</span>
            <span className="text-2xl font-black text-emerald-600">{checkoutSummary.totalHours.toFixed(2)}h</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100 relative">
              <div className="flex items-center gap-1 mb-1">
                <span className="block text-stone-400 text-xs font-black uppercase">Đi trễ</span>
                <button type="button" className="group relative focus:outline-none">
                  <Info className="w-4 h-4 text-stone-400 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block group-focus:block w-56 p-3 bg-stone-800 text-white text-xs rounded-xl shadow-xl z-10 font-normal normal-case tracking-normal text-left">
                    Trễ dưới 10p không phạt. Trễ từ 10p trở lên phạt nhân 3 số phút trễ.
                    <div className="absolute top-full left-2 border-4 border-transparent border-t-stone-800"></div>
                  </div>
                </button>
              </div>
              <span className={`text-xl font-black ${checkoutSummary.lateMinutes > 0 ? theme.text : 'text-stone-400'}`}>
                {checkoutSummary.lateMinutes < 60 ? `${checkoutSummary.lateMinutes}p` : `${Math.floor(checkoutSummary.lateMinutes / 60)}h${checkoutSummary.lateMinutes % 60 > 0 ? `${checkoutSummary.lateMinutes % 60}p` : ''}`}
              </span>
            </div>
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="block text-stone-400 text-xs font-black uppercase mb-1">Phạt trễ</span>
              <span className={`text-xl font-black ${checkoutSummary.latePenaltyMinutes > 0 ? 'text-red-600' : 'text-stone-400'}`}>
                {checkoutSummary.latePenaltyMinutes < 60 ? `${checkoutSummary.latePenaltyMinutes}p` : `${Math.floor(checkoutSummary.latePenaltyMinutes / 60)}h${checkoutSummary.latePenaltyMinutes % 60 > 0 ? `${checkoutSummary.latePenaltyMinutes % 60}p` : ''}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100 relative">
              <div className="flex items-center gap-1 mb-1">
                <span className="block text-stone-400 text-xs font-black uppercase">Rời Web App</span>
                <button type="button" className="group relative focus:outline-none">
                  <Info className="w-4 h-4 text-stone-400 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block group-focus:block w-56 p-3 bg-stone-800 text-white text-xs rounded-xl shadow-xl z-10 font-normal normal-case tracking-normal text-left">
                    Rời app dưới 3 lần không phạt. Từ lần thứ 4 trở đi, mỗi lần rời app sẽ bị trừ 10 phút công.
                    <div className="absolute top-full left-2 border-4 border-transparent border-t-stone-800"></div>
                  </div>
                </button>
              </div>
              <span className={`text-xl font-black ${checkoutSummary.exitCount > 0 ? theme.text : 'text-stone-400'}`}>
                {checkoutSummary.exitCount} lần
              </span>
            </div>
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="block text-stone-400 text-xs font-black uppercase mb-1">Phạt rời app</span>
              <span className={`text-xl font-black ${checkoutSummary.exitCount > 3 ? 'text-red-600' : 'text-stone-400'}`}>
                {Math.max(0, (checkoutSummary.exitCount - 3) * 10) < 60 ? `${Math.max(0, (checkoutSummary.exitCount - 3) * 10)}p` : `${Math.floor(Math.max(0, (checkoutSummary.exitCount - 3) * 10) / 60)}h${Math.max(0, (checkoutSummary.exitCount - 3) * 10) % 60 > 0 ? `${Math.max(0, (checkoutSummary.exitCount - 3) * 10) % 60}p` : ''}`}
              </span>
            </div>
          </div>

          {checkoutSummary.incompleteTasks.length > 0 && (
            <div className={`p-5 ${theme.bg} rounded-2xl border ${theme.border}`}>
              <span className={`block ${theme.text} text-xs font-black uppercase mb-2`}>Nhiệm vụ chưa hoàn thành</span>
              <ul className="space-y-2">
                {checkoutSummary.incompleteTasks.map((task: string, i: number) => (
                  <li key={i} className={`text-sm ${theme.text} flex items-start gap-2 font-medium`}>
                    <span className={`mt-2 w-1.5 h-1.5 ${theme.accent} rounded-full shrink-0`} />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={() => setCheckoutSummary(null)}
          className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest text-lg"
        >
          Xác nhận
        </button>
      </motion.div>
    </div>
  );
};

interface CheckinWarningModalProps {
  checkinWarningStep: number;
  setCheckinWarningStep: (step: number) => void;
  selectedShiftTime: string;
  scheduledShiftTime: string;
  monthlyStats: any;
  theme: any;
  onConfirm: () => void;
}

export const CheckinWarningModal: React.FC<CheckinWarningModalProps> = ({
  checkinWarningStep,
  setCheckinWarningStep,
  selectedShiftTime,
  scheduledShiftTime,
  monthlyStats,
  theme,
  onConfirm
}) => {
  if (checkinWarningStep !== 1 && checkinWarningStep !== 2) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className={`w-20 h-20 ${checkinWarningStep === 2 ? 'bg-red-100/50 text-red-600' : `${theme.bg} ${theme.text}`} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <AlertTriangle className="w-10 h-10" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-4">{checkinWarningStep === 2 ? 'Xác nhận vào ca' : 'Xác nhận giờ vào ca'}</h2>
        <p className="text-stone-600 mb-8 font-medium text-lg leading-relaxed">
          {(() => {
            const [selH, selM] = selectedShiftTime.split(':').map(Number);
            const selTotal = selH * 60 + selM;

            if (checkinWarningStep === 1) {
              const [schH, schM] = (scheduledShiftTime || '00:00').split(':').map(Number);
              const schTotal = schH * 60 + schM;
              const diffMinutes = Math.abs(selTotal - schTotal);
              const diffH = Math.floor(diffMinutes / 60);
              const diffM = diffMinutes % 60;
              const diffText = diffH > 0 
                ? (diffM > 0 ? `${diffH}h${diffM}p` : `${diffH}h`)
                : `${diffM}p`;
              const diffType = selTotal < schTotal ? 'sớm hơn' : 'trễ hơn';
              const baseMsg = `Bạn đang vào ca lúc ${selectedShiftTime}, ${diffType} ${diffText} so với lịch làm việc là ${scheduledShiftTime}.`;
              const lateMsg = selTotal > schTotal ? ` Đây là lần đi trễ thứ ${monthlyStats.lateCount + 1} trong tháng.` : '';
              const extraMsg = selTotal < schTotal ? ` Giờ công được tính từ ${scheduledShiftTime}.` : '';
              return `${baseMsg}${lateMsg}${extraMsg} Xác nhận vào ca?`;
            } else {
              let msg = `Bạn đang vào ca lúc ${selectedShiftTime}.`;
              if (scheduledShiftTime) {
                const [schH, schM] = scheduledShiftTime.split(':').map(Number);
                const schTotal = schH * 60 + schM;
                if (selTotal > schTotal) {
                  const diff = selTotal - schTotal;
                  const diffH = Math.floor(diff / 60);
                  const diffM = diff % 60;
                  const diffText = diffH > 0 
                    ? (diffM > 0 ? `${diffH}h${diffM}p` : `${diffH}h`)
                    : `${diffM}p`;
                  const lateMsg = ` Đây là lần đi trễ thứ ${monthlyStats.lateCount + 1} trong tháng.`;
                  msg = `Bạn đang vào ca trễ ${diffText} (${selectedShiftTime} so với lịch ${scheduledShiftTime}).${lateMsg}`;
                }
              }
              return msg;
            }
          })()}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setCheckinWarningStep(0)}
            className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all text-lg"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 ${checkinWarningStep === 2 ? 'bg-red-600 hover:bg-red-700' : theme.button} text-white font-bold rounded-2xl transition-all text-lg`}
          >
            Xác nhận
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface OvertimeReasonModalProps {
  checkoutWarningStep: number;
  setCheckoutWarningStep: (step: number) => void;
  note: string;
  setNote: (note: string) => void;
  theme: any;
  onConfirm: () => void;
}

export const OvertimeReasonModal: React.FC<OvertimeReasonModalProps> = ({
  checkoutWarningStep,
  setCheckoutWarningStep,
  note,
  setNote,
  theme,
  onConfirm
}) => {
  if (checkoutWarningStep !== 4) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl"
      >
        <h2 className="text-2xl font-black text-stone-900 mb-4 text-center">Lý do tăng ca</h2>
        <p className="text-stone-600 mb-6 font-medium text-center">
          Vui lòng nhập lý do bạn ở lại làm thêm giờ:
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`w-full p-4 rounded-2xl border-2 border-stone-200 focus:ring-4 ${theme.ring} mb-6 min-h-[120px] text-lg`}
          placeholder="VD: Khách đông, A.Khoa nhờ ở lại..."
        />
        <div className="flex gap-4">
          <button
            onClick={() => setCheckoutWarningStep(0)}
            className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 ${theme.button} text-white font-bold rounded-2xl transition-all`}
          >
            Xác nhận
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface CheckoutWarningModalProps {
  checkoutWarningStep: number;
  setCheckoutWarningStep: (step: number) => void;
  selectedShiftTime: string;
  scheduledShiftTime: string;
  theme: any;
  onConfirm: () => void;
}

export const CheckoutWarningModal: React.FC<CheckoutWarningModalProps> = ({
  checkoutWarningStep,
  setCheckoutWarningStep,
  selectedShiftTime,
  scheduledShiftTime,
  theme,
  onConfirm
}) => {
  if (checkoutWarningStep !== 1) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className={`w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6`}>
          <AlertTriangle className="w-10 h-10" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-4">Xác nhận ra ca sớm</h2>
        <p className="text-stone-600 mb-8 font-medium text-lg leading-relaxed">
          {(() => {
            const [selH, selM] = selectedShiftTime.split(':').map(Number);
            const selTotal = selH * 60 + selM;
            const [schH, schM] = (scheduledShiftTime || '00:00').split(':').map(Number);
            const schTotal = schH * 60 + schM;
            const diffMinutes = Math.abs(schTotal - selTotal);
            const diffH = Math.floor(diffMinutes / 60);
            const diffM = diffMinutes % 60;
            const diffText = diffH > 0 
              ? (diffM > 0 ? `${diffH}h${diffM}p` : `${diffH}h`)
              : `${diffM}p`;
              
            return `Bạn đang ra ca lúc ${selectedShiftTime}, sớm hơn ${diffText} so với lịch làm việc là ${scheduledShiftTime}. Giờ công sẽ được tính đến ${selectedShiftTime}. Xác nhận ra ca?`;
          })()}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setCheckoutWarningStep(0)}
            className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all text-lg"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 ${theme.button} text-white font-bold rounded-2xl transition-all text-lg`}
          >
            Xác nhận
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface EmergencyCheckInModalProps {
  showEmergencyCheckInModal: boolean;
  setShowEmergencyCheckInModal: (show: boolean) => void;
  theme: any;
  emergencyManager: string;
  setEmergencyManager: (manager: string) => void;
  outsideScheduleReason: string;
  setOutsideScheduleReason: (reason: string) => void;
  admins: any[];
  kioskBranch: string | null;
  onConfirm: () => void;
}

export const EmergencyCheckInModal: React.FC<EmergencyCheckInModalProps> = ({
  showEmergencyCheckInModal,
  setShowEmergencyCheckInModal,
  theme,
  emergencyManager,
  setEmergencyManager,
  outsideScheduleReason,
  setOutsideScheduleReason,
  admins,
  kioskBranch,
  onConfirm
}) => {
  if (!showEmergencyCheckInModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={`bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${theme.border}`}>
        <div className="p-8 text-center">
          <div className={`w-24 h-24 ${theme.bg} rounded-full flex items-center justify-center mx-auto mb-6 border-4 ${theme.border} animate-pulse`}>
            <AlertCircle className={`w-12 h-12 ${theme.text}`} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 leading-tight uppercase tracking-tighter">Vào ca khẩn cấp!</h3>
          <p className="text-slate-600 font-bold mb-8 text-sm px-4">
            Bạn không có lịch tại chi nhánh này. Để vào ca, vui lòng xác nhận miệng với Quản lý và chụp ảnh selfie tại quán.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Chọn Quản lý xác nhận</label>
              <select
                value={emergencyManager}
                onChange={(e) => setEmergencyManager(e.target.value)}
                className={`w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:border-amber-500 focus:ring-4 ${theme.ring} transition-all outline-none appearance-none`}
              >
                <option value="">-- Chọn Quản lý --</option>
                {admins.filter(a => a.locationIds?.includes(kioskBranch || '')).map(admin => (
                  <option key={admin.id} value={admin.email}>{admin.email}</option>
                ))}
              </select>
            </div>

            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Lý do (không bắt buộc)</label>
              <textarea
                value={outsideScheduleReason}
                onChange={(e) => setOutsideScheduleReason(e.target.value)}
                placeholder="VD: Trực thay, Tăng ca đột xuất..."
                className={`w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:border-amber-500 focus:ring-4 ${theme.ring} transition-all outline-none min-h-[80px]`}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowEmergencyCheckInModal(false);
                setEmergencyManager('');
                setOutsideScheduleReason('');
              }}
              className="flex-1 py-5 rounded-2xl font-black text-slate-500 bg-slate-100 active:scale-95 transition-all uppercase tracking-wider text-sm"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              className={`flex-[2] py-5 rounded-2xl font-black text-white ${theme.button} shadow-xl ${theme.shadow} active:scale-95 transition-all uppercase tracking-wider text-sm`}
            >
              Xác nhận & Chụp ảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExtraSupportModalProps {
  showExtraSupportModal: boolean;
  setShowExtraSupportModal: (show: boolean) => void;
  theme: any;
  kioskBranch: string | null;
  BRANCHES: any[];
}

export const ExtraSupportModal: React.FC<ExtraSupportModalProps> = ({
  showExtraSupportModal,
  setShowExtraSupportModal,
  theme,
  kioskBranch,
  BRANCHES
}) => {
  if (!showExtraSupportModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={`bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border ${theme.border} text-center`}
      >
        <div className={`w-20 h-20 ${theme.bg} ${theme.text} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner`}>
          <Info className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Thông báo hỗ trợ</h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-8">
          Bạn đang hỗ trợ nhân sự <span className={`font-bold ${theme.text}`}>{BRANCHES.find(b => b.id === kioskBranch)?.name || kioskBranch}</span> ngoài lịch làm việc. 
          <br/><br/>
          Quản lý <span className={`font-bold ${theme.text}`}>{BRANCHES.find(b => b.id === kioskBranch)?.name || kioskBranch}</span> sẽ đối soát và duyệt giờ công!
        </p>
        <button
          onClick={() => setShowExtraSupportModal(false)}
          className={`w-full py-4 ${theme.button} text-white font-black rounded-2xl shadow-lg ${theme.shadow} active:scale-[0.98] transition-all uppercase tracking-widest text-sm`}
        >
          Đã hiểu
        </button>
      </motion.div>
    </div>
  );
};

interface OutsideScheduleModalProps {
  showOutsideScheduleModal: boolean;
  setShowOutsideScheduleModal: (show: boolean) => void;
  theme: any;
  outsideScheduleReason: string;
  setOutsideScheduleReason: (reason: string) => void;
  onConfirm: () => void;
}

export const OutsideScheduleModal: React.FC<OutsideScheduleModalProps> = ({
  showOutsideScheduleModal,
  setShowOutsideScheduleModal,
  theme,
  outsideScheduleReason,
  setOutsideScheduleReason,
  onConfirm
}) => {
  if (!showOutsideScheduleModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className={`w-20 h-20 ${theme.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <AlertCircle className={`w-10 h-10 ${theme.text}`} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight">Vào ca ngoài lịch!</h3>
          <p className="text-slate-600 font-medium mb-8">
            Bạn đang vào ca ngoài lịch làm việc! Quản lý sẽ đối soát để duyệt giờ công. Vui lòng nêu lý do:
          </p>
          
          <textarea
            value={outsideScheduleReason}
            onChange={(e) => setOutsideScheduleReason(e.target.value)}
            placeholder="Lý do vào ca (VD: Tăng ca, trực thay...)"
            className={`w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:ring-4 ${theme.ring} transition-all outline-none mb-6 min-h-[120px]`}
          />

          <div className="flex gap-4">
            <button
              onClick={() => setShowOutsideScheduleModal(false)}
              className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 active:scale-95 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              className={`flex-[2] py-4 rounded-2xl font-black text-white ${theme.button} shadow-lg ${theme.shadow} active:scale-95 transition-all`}
            >
              Xác nhận & Chụp ảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
