import React from 'react';
import { motion } from 'motion/react';
import { KeyRound, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

interface ChangePinModalProps {
  showChangePinModal: boolean;
  setShowChangePinModal: (show: boolean) => void;
  loggedInEmployee: any;
  theme: any;
  handleChangePin: (e: React.FormEvent) => void;
  oldPin: string;
  setOldPin: (pin: string) => void;
  newPin: string;
  setNewPin: (pin: string) => void;
  confirmNewPin: string;
  setConfirmNewPin: (pin: string) => void;
  showOldPin: boolean;
  setShowOldPin: (show: boolean) => void;
  showNewPin: boolean;
  setShowNewPin: (show: boolean) => void;
  showConfirmPin: boolean;
  setShowConfirmPin: (show: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  showChangePinModal,
  setShowChangePinModal,
  loggedInEmployee,
  theme,
  handleChangePin,
  oldPin,
  setOldPin,
  newPin,
  setNewPin,
  confirmNewPin,
  setConfirmNewPin,
  showOldPin,
  setShowOldPin,
  showNewPin,
  setShowNewPin,
  showConfirmPin,
  setShowConfirmPin,
  error,
  setError
}) => {
  if (!showChangePinModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 ${theme.bg} ${theme.text} rounded-full flex items-center justify-center mx-auto mb-5`}>
            <KeyRound className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight">
            {loggedInEmployee?.isFirstLogin ? 'Thiết lập mã PIN mới' : 'Đổi mã PIN'}
          </h2>
          <p className="text-sm text-stone-500 mt-3 font-medium">
            {loggedInEmployee?.isFirstLogin ? (
              <>
                Đây là lần đăng nhập đầu tiên.<br/>
                Mã PIN hiện tại là <span className={`font-bold ${theme.text}`}>4 số cuối số điện thoại</span> của bạn.<br/>
              </>
            ) : (
              <>Vui lòng tạo mã PIN mới gồm 4 số.</>
            )}
          </p>
        </div>
        
        <form onSubmit={handleChangePin} className="space-y-5">
          {!loggedInEmployee?.isFirstLogin && (
            <div>
              <label className="block text-base font-bold text-stone-700 mb-2 ml-1">Mã PIN cũ</label>
              <div className="relative">
                <input
                  type={showOldPin ? "text" : "password"}
                  required
                  pattern="\d{4,6}"
                  maxLength={6}
                  value={oldPin}
                  onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-5 py-4 border border-stone-300 rounded-2xl focus:ring-2 ${theme.ring} outline-none text-center tracking-widest text-2xl font-black`}
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPin(!showOldPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showOldPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-base font-bold text-stone-700 mb-2 ml-1">Đặt lại mã PIN mới</label>
            <div className="relative">
              <input
                type={showNewPin ? "text" : "password"}
                required
                pattern="\d{4,6}"
                maxLength={6}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-5 py-4 border border-stone-300 rounded-2xl focus:ring-2 ${theme.ring} outline-none text-center tracking-widest text-2xl font-black`}
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showNewPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-base font-bold text-stone-700 mb-2 ml-1">Xác nhận mã PIN mới</label>
            <div className="relative">
              <input
                type={showConfirmPin ? "text" : "password"}
                required
                pattern="\d{4,6}"
                maxLength={6}
                value={confirmNewPin}
                onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-5 py-4 border border-stone-300 rounded-2xl focus:ring-2 ${theme.ring} outline-none text-center tracking-widest text-2xl font-black`}
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showConfirmPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="text-red-600 text-sm font-bold text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <div className="flex gap-4 mt-6">
            {!loggedInEmployee?.isFirstLogin && (
              <button
                type="button"
                onClick={() => {
                  setShowChangePinModal(false);
                  setNewPin('');
                  setConfirmNewPin('');
                  setError(null);
                }}
                className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all active:scale-[0.98] text-lg"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              className={`flex-[2] py-4 ${theme.button} text-white font-bold rounded-2xl shadow-lg ${theme.shadow} transition-all active:scale-[0.98] text-lg uppercase`}
            >
              XÁC NHẬN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ResetPinModalProps {
  showResetPinModal: boolean;
  setShowResetPinModal: (show: boolean) => void;
  theme: any;
  handleResetPin: (e: React.FormEvent) => void;
  resetEmpId: string;
  setResetEmpId: (id: string) => void;
  resetCccdLast4: string;
  setResetCccdLast4: (val: string) => void;
  resetNewPin: string;
  setResetNewPin: (pin: string) => void;
  resetConfirmPin: string;
  setResetConfirmPin: (pin: string) => void;
  showResetNewPin: boolean;
  setShowResetNewPin: (show: boolean) => void;
  showResetConfirmPin: boolean;
  setShowResetConfirmPin: (show: boolean) => void;
  isSubmitting: boolean;
}

export const ResetPinModal: React.FC<ResetPinModalProps> = ({
  showResetPinModal,
  setShowResetPinModal,
  theme,
  handleResetPin,
  resetEmpId,
  setResetEmpId,
  resetCccdLast4,
  setResetCccdLast4,
  resetNewPin,
  setResetNewPin,
  resetConfirmPin,
  setResetConfirmPin,
  showResetNewPin,
  setShowResetNewPin,
  showResetConfirmPin,
  setShowResetConfirmPin,
  isSubmitting
}) => {
  if (!showResetPinModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className={`p-6 ${theme.bg} text-white rounded-2xl mb-6`}>
          <h2 className="text-xl font-black uppercase tracking-tight">Khôi phục mã PIN</h2>
        </div>
        
        <form onSubmit={handleResetPin} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Số điện thoại</label>
            <input
              type="tel"
              required
              value={resetEmpId}
              onChange={e => setResetEmpId(e.target.value.replace(/\D/g, ''))}
              className={`w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-2 ${theme.ring} outline-none font-bold text-left text-lg`}
              placeholder="Nhập SĐT đăng ký"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">4 số cuối CCCD</label>
            <input
              type="text"
              required
              maxLength={4}
              value={resetCccdLast4}
              onChange={e => setResetCccdLast4(e.target.value.replace(/\D/g, ''))}
              className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-center tracking-[0.5em] text-2xl"
              placeholder="XXXX"
            />
          </div>
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Mã PIN mới</label>
            <div className="relative">
              <input
                type={showResetNewPin ? "text" : "password"}
                required
                maxLength={6}
                value={resetNewPin}
                onChange={e => setResetNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-center tracking-widest text-2xl"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowResetNewPin(!showResetNewPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showResetNewPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Xác nhận PIN mới</label>
            <div className="relative">
              <input
                type={showResetConfirmPin ? "text" : "password"}
                required
                maxLength={6}
                value={resetConfirmPin}
                onChange={e => setResetConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-center tracking-widest text-2xl"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowResetConfirmPin(!showResetConfirmPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showResetConfirmPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={() => {
                setShowResetPinModal(false);
                setResetEmpId('');
                setResetCccdLast4('');
                setResetNewPin('');
                setResetConfirmPin('');
              }}
              className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all text-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-4 ${theme.button} text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 text-lg`}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeviceSecurityModalProps {
  showDeviceError: boolean;
  setShowDeviceError: (show: boolean) => void;
  theme: any;
  handleConfirmDeviceChange: () => void;
  isSubmitting: boolean;
}

export const DeviceSecurityModal: React.FC<DeviceSecurityModalProps> = ({
  showDeviceError,
  setShowDeviceError,
  theme,
  handleConfirmDeviceChange,
  isSubmitting
}) => {
  if (!showDeviceError) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${theme.bg} rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-200`}
      >
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Lock className="w-12 h-12" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 text-center uppercase tracking-tight mb-5">Bảo mật thiết bị</h3>
        <p className="text-slate-500 text-lg text-center mb-10 leading-relaxed">
          Tài khoản của bạn đang được liên kết với một thiết bị khác. Nếu bạn đã đổi điện thoại hoặc thiết bị cũ bị hỏng, vui lòng xác nhận để cập nhật thiết bị mới.
        </p>
        
        <div className="space-y-5">
          <button
            onClick={handleConfirmDeviceChange}
            disabled={isSubmitting}
            className={`w-full py-5 ${theme.button} text-white font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 group`}
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-7 h-7 text-emerald-400" />
                <span className="text-xl">XÁC NHẬN ĐỔI THIẾT BỊ</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              setShowDeviceError(false);
            }}
            className="w-full py-4 text-slate-500 font-black text-base uppercase tracking-widest hover:text-slate-800 transition-colors"
          >
            Hủy bỏ
          </button>
        </div>
      </motion.div>
    </div>
  );
};
