import React from 'react';
import { Key, Eye, EyeOff, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChangePinModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  pinChangeData: { currentPin: string; newPin: string; confirmPin: string };
  setPinChangeData: (data: any) => void;
  adminTheme: any;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  show,
  onClose,
  onSubmit,
  pinChangeData,
  setPinChangeData,
  adminTheme,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[110] backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className={`p-6 border-b border-white/10 flex items-center justify-between ${adminTheme.header} mb-6`}>
           <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight uppercase tracking-tight">Đổi mã PIN</h2>
              <p className="text-[10px] font-medium text-white/70 uppercase">Bảo mật tài khoản</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mã PIN hiện tại</label>
            <input
              type="password"
              required
              value={pinChangeData.currentPin}
              onChange={e => setPinChangeData({ ...pinChangeData, currentPin: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-mono"
              placeholder="••••"
              maxLength={6}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mã PIN mới (4 số)</label>
            <input
              type="password"
              required
              value={pinChangeData.newPin}
              onChange={e => setPinChangeData({ ...pinChangeData, newPin: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-mono"
              placeholder="••••"
              maxLength={4}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Xác nhận mã PIN mới</label>
            <input
              type="password"
              required
              value={pinChangeData.confirmPin}
              onChange={e => setPinChangeData({ ...pinChangeData, confirmPin: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-mono"
              placeholder="••••"
              maxLength={4}
            />
          </div>
          <button
            type="submit"
            className={`w-full py-3 ${adminTheme.button} text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg active:scale-[0.98] mt-2`}
          >
            Cập nhật mã PIN
          </button>
        </form>
      </motion.div>
    </div>
  );
};

interface ChangeAdminPinModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  oldAdminPin: string;
  setOldAdminPin: (val: string) => void;
  newAdminPin: string;
  setNewAdminPin: (val: string) => void;
  confirmNewAdminPin: string;
  setConfirmNewAdminPin: (val: string) => void;
  showOldAdminPin: boolean;
  setShowOldAdminPin: (val: boolean) => void;
  showNewAdminPin: boolean;
  setShowNewAdminPin: (val: boolean) => void;
  showConfirmAdminPin: boolean;
  setShowConfirmAdminPin: (val: boolean) => void;
  adminPinError: string;
  adminTheme: any;
}

export const ChangeAdminPinModal: React.FC<ChangeAdminPinModalProps> = ({
  show,
  onClose,
  onSubmit,
  oldAdminPin,
  setOldAdminPin,
  newAdminPin,
  setNewAdminPin,
  confirmNewAdminPin,
  setConfirmNewAdminPin,
  showOldAdminPin,
  setShowOldAdminPin,
  showNewAdminPin,
  setShowNewAdminPin,
  showConfirmAdminPin,
  setShowConfirmAdminPin,
  adminPinError,
  adminTheme,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className={`p-6 border-b border-white/10 flex items-center justify-between ${adminTheme.header} mb-6`}>
           <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-3xl bg-white/20 flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">PIN Quản trị</h2>
              <p className="text-xs font-medium text-white/70">Mã bảo mật hệ thống</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-5">
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2 ml-1">Mã PIN cũ</label>
            <div className="relative">
              <input
                type={showOldAdminPin ? "text" : "password"}
                required
                pattern="\d{4}"
                maxLength={4}
                value={oldAdminPin}
                onChange={e => setOldAdminPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-widest text-2xl font-black"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowOldAdminPin(!showOldAdminPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showOldAdminPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-base font-bold text-gray-700 mb-2 ml-1">Đặt lại mã PIN mới</label>
            <div className="relative">
              <input
                type={showNewAdminPin ? "text" : "password"}
                required
                pattern="\d{4}"
                maxLength={4}
                value={newAdminPin}
                onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-widest text-2xl font-black"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowNewAdminPin(!showNewAdminPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewAdminPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-base font-bold text-gray-700 mb-2 ml-1">Xác nhận mã PIN mới</label>
            <div className="relative">
              <input
                type={showConfirmAdminPin ? "text" : "password"}
                required
                pattern="\d{4}"
                maxLength={4}
                value={confirmNewAdminPin}
                onChange={e => setConfirmNewAdminPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-widest text-2xl font-black"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmAdminPin(!showConfirmAdminPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmAdminPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {adminPinError && (
            <div className="text-red-600 text-sm font-bold text-center animate-in fade-in slide-in-from-top-1">
              {adminPinError}
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className={`flex-1 py-4 ${adminTheme.button} text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg active:scale-95`}
            >
              Lưu mã PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  show: boolean;
  config: { title: string; message: string; onConfirm: () => void };
  onClose: () => void;
  adminTheme: any;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ show, config, onClose, adminTheme }) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className={`p-6 border-b border-white/10 flex items-center justify-center ${adminTheme.header} mb-6`}>
              <h3 className="text-xl font-black text-white leading-tight uppercase tracking-widest text-center">
                {config.title}
              </h3>
            </div>
            
            <div className="flex flex-col items-center text-center px-8 pb-8">
              <div className={`w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 rotate-3 border border-slate-100`}>
                <AlertTriangle className={`w-10 h-10 ${adminTheme.text} -rotate-3`} />
              </div>
              
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                {config.message}
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    config.onConfirm();
                    onClose();
                  }}
                  className={`flex-1 px-6 py-4 rounded-2xl ${adminTheme.button} text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg active:scale-95`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
