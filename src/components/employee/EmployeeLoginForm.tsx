import React from 'react';
import { Phone, Lock, EyeOff, Eye, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';

interface EmployeeLoginFormProps {
  theme: any;
  empIdInput: string;
  setEmpIdInput: (val: string) => void;
  pinInput: string;
  setPinInput: (val: string) => void;
  showPin: boolean;
  setShowPin: (val: boolean) => void;
  isSubmitting: boolean;
  error: string | null;
  showDeviceError: boolean;
  onLogin: (e: React.FormEvent) => void;
  setShowResetPinModal: (val: boolean) => void;
  kioskBranch: string;
}

export const EmployeeLoginForm: React.FC<EmployeeLoginFormProps> = ({
  theme,
  empIdInput,
  setEmpIdInput,
  pinInput,
  setPinInput,
  showPin,
  setShowPin,
  isSubmitting,
  error,
  showDeviceError,
  onLogin,
  setShowResetPinModal,
  kioskBranch
}) => {
  return (
    <div className="w-full max-w-[380px] mx-auto flex flex-col gap-6">
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <p className="text-sm text-stone-600 font-medium italic opacity-80">
          "Chúc bạn một ngày làm việc năng lượng tại {kioskBranch}!"
        </p>
      </div>
      <form onSubmit={onLogin} className={`w-full bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-white/50 relative z-10 flex flex-col items-center transition-all duration-500`}>
        
        {/* Title Block */}
        <div className="flex flex-col items-center mb-10 w-full">
          <h2 className={`text-xl sm:text-[22px] font-bold ${theme.text} tracking-tight leading-none mb-1 transition-colors duration-500 text-center uppercase whitespace-nowrap`}>
            ĐĂNG NHẬP CHẤM CÔNG
          </h2>
        </div>
        
        <div className="w-full space-y-6">
          <div>
            <label className={`block text-sm font-semibold ${theme.text} opacity-80 mb-3 ml-1`}>
              Số điện thoại
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-500 transition-colors z-10">
                <Phone strokeWidth={2} className="w-5 h-5" />
              </div>
              <input 
                type="tel"
                required
                placeholder=""
                value={empIdInput}
                onChange={(e) => setEmpIdInput(e.target.value)}
                className={`w-full px-4 h-[52px] pl-12 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 ${theme.ring.replace('focus:ring-', 'focus:ring-').replace(']', ']/20')} focus:${theme.accent.replace('bg-', 'border-')} text-base font-bold ${theme.text} transition-all outline-none`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold ${theme.text} opacity-80 mb-3 ml-1`}>
              Mã PIN bảo mật
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-500 transition-colors z-10">
                <Lock strokeWidth={2} className="w-5 h-5" />
              </div>
              <input 
                type={showPin ? "text" : "password"}
                required
                placeholder=""
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className={`w-full px-4 h-[52px] pl-12 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 ${theme.ring.replace('focus:ring-', 'focus:ring-').replace(']', ']/20')} focus:${theme.accent.replace('bg-', 'border-')} text-left text-lg ${theme.text} transition-all font-black outline-none`}
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 ${theme.text} opacity-60 hover:opacity-100 transition-all z-10`}
              >
                {showPin ? <EyeOff strokeWidth={2} className="w-6 h-6" /> : <Eye strokeWidth={2} className="w-6 h-6" />}
              </button>
            </div>
            {error && !showDeviceError && (
              <p className="text-red-500 text-xs font-bold mt-2 ml-1 animate-in fade-in slide-in-from-top-1 flex items-center gap-1.5">
                <AlertCircle strokeWidth={2} className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`group relative w-full ${theme.accent} text-white h-[52px] rounded-2xl font-black text-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] disabled:opacity-50 active:scale-[0.97] active:shadow-inner transition-all overflow-hidden flex items-center justify-center gap-2 mt-4`}
          >
            {/* Glossy effect */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none" />
            
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin relative z-10" />
                <span className="relative z-10">ĐANG XÁC THỰC...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">ĐĂNG NHẬP</span>
                <ChevronRight className="w-4 h-4 relative z-10" />
              </>
            )}
          </button>

          {(!localStorage.getItem('hasLoggedInBefore')) ? (
            <div className="text-center mt-4">
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                <span className={`${theme.text} opacity-70`}>Lần đầu đăng nhập:</span> mã PIN là 4 số cuối SĐT
              </p>
            </div>
          ) : (
            <div className="text-center mt-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="text-stone-400">Quên mã PIN? </span>
              <button
                type="button"
                onClick={() => setShowResetPinModal(true)}
                className={`${theme.text} hover:underline transition-all`}
              >
                Reset tại đây!
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
