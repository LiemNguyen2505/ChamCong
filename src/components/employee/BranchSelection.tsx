import React from 'react';
import { MapPin, Coffee, Settings, ChevronRight } from 'lucide-react';
import { getBranchTheme } from '../../utils/theme';

interface Branch {
  id: string;
  name: string;
}

interface BranchSelectionProps {
  branches: Branch[];
  kioskBranch: string;
  onSelectBranch: (branchId: string) => void;
  handleSecretTap: () => void;
  navigate: (path: string) => void;
  theme: any;
}

export const BranchSelection: React.FC<BranchSelectionProps> = ({
  branches,
  kioskBranch,
  onSelectBranch,
  handleSecretTap,
  navigate,
  theme
}) => {
  return (
    <div className={`h-[100dvh] w-full flex flex-col items-center justify-start pt-32 relative overflow-hidden ${theme.bg} font-sans`}>
      {/* Fresh decorative background elements */}
      <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[60%] ${theme.accent}/10 rounded-full blur-[120px]`} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-100/50 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-6">
        <div className="flex flex-col items-center gap-4 relative w-full">
          {/* Super Admin / Admin Entry Point */}
          <button 
            onClick={() => {
              localStorage.removeItem('currentAdmin');
              navigate('/admin');
            }}
            className="absolute -top-12 right-0 p-3 bg-white/30 backdrop-blur-md rounded-2xl text-slate-700 hover:bg-white/50 transition-all active:scale-90 shadow-sm border border-white/20"
            title="Cấu hình hệ thống"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div 
            onClick={handleSecretTap}
            className="w-20 h-20 bg-gradient-to-br from-[#6F4E37] to-[#3E2723] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#3E2723]/30 relative cursor-default transition-transform active:scale-95"
          >
            <div className="absolute inset-0 border-4 border-white/20 rounded-3xl" />
            <Coffee className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 text-center uppercase tracking-tight">Chọn chi nhánh</h2>
        </div>
        
        <div className="space-y-4 w-full">
          {branches.map((br) => {
            const brTheme = getBranchTheme(br.id);
            return (
              <button
                key={br.id}
                onClick={() => onSelectBranch(br.id)}
                className={`w-full py-5 px-6 text-white font-black rounded-2xl transition-all active:scale-[0.98] flex items-center justify-between group shadow-xl relative overflow-hidden bg-gradient-to-r ${brTheme.gradient} ${brTheme.accent}`}
              >
                {/* Button Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-white/20 p-2.5 rounded-xl group-hover:rotate-12 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-lg tracking-tight uppercase">{br.name}</span>
                </div>
                <ChevronRight className="w-6 h-6 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all relative z-10" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-6 w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-1 w-8 bg-[#6F4E37]/20 rounded-full" />
          <div className="h-1 w-1 bg-[#6F4E37]/40 rounded-full" />
          <div className="h-1 w-8 bg-emerald-500/20 rounded-full" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black flex items-center justify-center gap-1">
          Cafe HR Manager System <span className={`${theme.text} font-black`}>®</span>
        </p>
        <p className="text-[10px] text-slate-400 mt-1">Designed by Liem Nguyen</p>
      </div>
    </div>
  );
};
