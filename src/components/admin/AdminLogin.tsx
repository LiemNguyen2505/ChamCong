import React from 'react';
import { Eye, EyeOff, LayoutDashboard, ChevronRight, RefreshCw, X } from 'lucide-react';

interface AdminLoginProps {
  adminLoginId: string;
  setAdminLoginId: (val: string) => void;
  loginIdError: string;
  showLoginPin: boolean;
  setShowLoginPin: (val: boolean) => void;
  password: string;
  setPassword: (val: string) => void;
  pinError: string;
  loading: boolean;
  handleLogin: (e: React.FormEvent) => void;
  handleGoogleLogin: () => void;
  navigate: (path: string | number) => void;
  adminTheme: any;
  filterBranch: string;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  adminLoginId, setAdminLoginId, loginIdError,
  showLoginPin, setShowLoginPin,
  password, setPassword, pinError,
  loading, handleLogin, handleGoogleLogin,
  navigate, adminTheme, filterBranch
}) => {
  return (
    <div className={`min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 font-sans`}>
      <div className="absolute inset-0 bg-slate-900/40 z-0" />

      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${adminTheme.accent.replace('bg-', 'bg-').replace(']', ']/10')} rounded-full blur-[120px] transition-colors duration-500 z-1`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${adminTheme.accent.replace('bg-', 'bg-').replace(']', ']/10')} rounded-full blur-[120px] transition-colors duration-500 z-1`} />
      
      {filterBranch === 'Phố Xanh' && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900 to-transparent z-1" />
      )}

      <div className={`bg-white/95 backdrop-blur-2xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${adminTheme.shadow.replace('/10', '/30')} p-7 md:p-8 w-full max-w-[420px] border border-white/60 relative z-10 flex flex-col items-center transition-all duration-500 -translate-y-24 md:-translate-y-12`}>
        
        <button 
          onClick={() => navigate(-1)}
          className={`absolute top-3.5 right-4 p-1.5 rounded-full bg-white/20 text-white shadow-sm hover:bg-white/30 transition-all active:scale-95 z-30 backdrop-blur-md border border-white/20`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`w-[calc(100%+56px)] md:w-[calc(100%+64px)] -mt-7 md:-mt-8 -mx-7 md:-mx-8 mb-8 md:mb-10 py-10 md:py-12 ${adminTheme.accent} rounded-t-[1.5rem] flex flex-col items-center justify-center gap-1 shadow-sm relative text-center`}>
         
          <h2 className="text-[16px] md:text-[18px] font-medium text-white/90 uppercase tracking-[0.1em] leading-tight flex flex-col items-center">
            <span>Hệ Thống</span>
            <span className="font-black text-[20px] md:text-[22px] text-white tracking-widest mt-1">Quản Trị Nhân Sự</span>
          </h2>
        
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-5 md:space-y-6" noValidate>
          <div>
            <p className={`text-[13px] font-black ${adminTheme.text} opacity-70 uppercase tracking-[0.2em] mb-2 px-4`}>Số điện thoại / Họ tên</p>
            <div className="relative group">
              <input
                type="text"
                value={adminLoginId}
                onChange={(e) => setAdminLoginId(e.target.value)}
                className={`w-full px-6 py-4 rounded-[1.8rem] bg-slate-50 border ${loginIdError ? 'border-red-300 focus:ring-red-100' : 'border-slate-100'} focus:ring-4 ${adminTheme.ring.replace('focus:ring-', 'focus:ring-').replace(']', ']/10')} focus:bg-white text-sm font-bold ${adminTheme.text} transition-all outline-none shadow-sm`}
                placeholder="Nhập SĐT hoặc Họ & Tên..."
                required
              />
            </div>
            {loginIdError && (
              <p className="mt-1.5 px-4 text-[11px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1 duration-300">
                {loginIdError}
              </p>
            )}
          </div>

          <div>
            <p className={`text-[13px] font-black ${adminTheme.text} opacity-70 uppercase tracking-[0.2em] mb-2 px-4`}>Mã PIN truy cập</p>
            <div className="relative group">
              <input
                type={showLoginPin ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-6 py-4 rounded-[1.8rem] bg-slate-50 border ${pinError ? 'border-red-300 focus:ring-red-100' : 'border-slate-100'} focus:ring-4 ${adminTheme.ring.replace('focus:ring-', 'focus:ring-').replace(']', ']/10')} focus:bg-white text-left text-lg tracking-[0.2em] ${adminTheme.text} transition-all placeholder:text-slate-200 font-bold outline-none shadow-sm`}
                placeholder="••••••"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowLoginPin(!showLoginPin)}
                className={`absolute right-6 top-1/2 -translate-y-1/2 p-2 ${adminTheme.text} opacity-20 hover:opacity-100 transition-all`}
              >
                {showLoginPin ? <EyeOff strokeWidth={2.5} className="w-5 h-5" /> : <Eye strokeWidth={2.5} className="w-5 h-5" />}
              </button>
            </div>
            {pinError && (
              <p className="mt-1.5 px-4 text-[11px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1 duration-300 text-left">
                {pinError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`group relative w-full ${adminTheme.accent} text-white py-5 rounded-[2rem] font-black text-sm shadow-xl ${adminTheme.shadow} disabled:opacity-50 active:scale-[0.97] transition-all overflow-hidden flex items-center justify-center gap-3`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin relative z-10" />
                <span className="relative z-10 tracking-widest uppercase text-xs">Xác thực...</span>
              </>
            ) : (
              <>
                <span className="relative z-10 tracking-[0.2em] text-sm uppercase">Đăng nhập</span>
                <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="w-full flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className={`text-[10px] ${adminTheme.text} opacity-30 font-black uppercase tracking-widest`}>Hoặc</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        <div className="w-full mt-8">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full bg-white border border-slate-100 ${adminTheme.text} py-4 rounded-[1.8rem] font-black text-xs flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-[0.97] opacity-60 hover:opacity-100 uppercase tracking-[0.1em] shadow-sm`}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
            Google Login
          </button>
        </div>
      </div>
    </div>
  );
};
