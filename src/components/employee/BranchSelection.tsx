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
    <div className={`h-[100dvh] w-full flex flex-col items-center justify-start pt-16 relative overflow-hidden ${theme.bg} font-sans`}>
      {/* Fresh decorative background elements */}
      <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[60%] ${theme.accent}/10 rounded-full blur-[120px]`} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-100/50 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm px-8">
        <div className="flex flex-col items-center gap-6 relative w-full">
          <div 
            onClick={handleSecretTap}
            className="w-28 h-28 bg-[#5D4037] rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-[#5D4037]/40 relative cursor-default transition-all active:scale-95 group"
          >
            <div className="absolute inset-0 border-[6px] border-white/10 rounded-[2.5rem] group-hover:border-white/20 transition-colors" />
            <div className="w-16 h-16 flex items-center justify-center bg-white/5 rounded-2xl">
              <Coffee className="w-12 h-12 text-white" />
            </div>
            
            {/* Steam animation - optional but nice */}
            <div className="absolute -top-4 flex gap-1 animate-bounce">
              <div className="w-1.5 h-4 bg-white/40 rounded-full blur-[1px]" />
              <div className="w-1.5 h-6 bg-white/40 rounded-full blur-[1px] delay-75" />
              <div className="w-1.5 h-4 bg-white/40 rounded-full blur-[1px] delay-150" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-black text-center uppercase tracking-normal mt-2">CHỌN QUÁN CHẤM CÔNG</h2>
        </div>
        
        <div className="space-y-6 w-full mt-4">
          {branches.map((br) => {
            const brTheme = getBranchTheme(br.id);
            const isGocPho = br.id === 'Góc Phố';
            
            return (
              <button
                key={br.id}
                onClick={() => onSelectBranch(br.id)}
                className={`w-full py-6 px-8 text-white font-black rounded-[2.5rem] transition-all active:scale-[0.97] flex items-center justify-between group shadow-2xl relative overflow-hidden ${isGocPho ? 'bg-[#764333]' : 'bg-[#4F6F52]'} border-b-4 ${isGocPho ? 'border-[#4A2A20]' : 'border-[#3D5640]'}`}
              >
                {/* Button Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className="bg-white/15 p-3.5 rounded-2xl group-hover:bg-white/25 transition-colors">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[1.3rem] tracking-tight uppercase font-black">{br.name}</span>
                </div>
                <ChevronRight className="w-7 h-7 opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all relative z-10" />
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
