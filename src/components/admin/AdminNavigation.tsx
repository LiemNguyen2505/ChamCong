import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, TableProperties, CheckCircle2, Calendar, DollarSign } from 'lucide-react';

export const BottomNav = ({ 
  adminTheme, 
  activeTab, 
  setActiveTab 
}: any) => {
  const navConfig = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: 'dashboard', isCenter: false, badgeCount: 0 },
    { id: 'bangcong', label: 'Chấm Công', icon: TableProperties, path: 'bangcongthang', isCenter: false, badgeCount: 0 },
    { id: 'lichlamviec', label: 'Lịch Làm Việc', icon: Calendar, path: 'lichlamviec', isCenter: true, badgeCount: 0 },
    { id: 'bangluong', label: 'Bảng lương', icon: DollarSign, path: 'bangluong', isCenter: false, badgeCount: 0 },
  ];

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 ${adminTheme.footer} h-20 flex items-center justify-around z-50 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] pb-safe transition-colors duration-500`}>
      {navConfig.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.path;
        
        if (item.isCenter) {
          return (
            <motion.button
              key={item.id}
              whileTap={{ 
                scale: 0.9,
                x: [0, -2, 2, -2, 2, 0],
                transition: { duration: 0.2 }
              }}
              onClick={() => setActiveTab(item.path as any)}
              className={`relative -top-2 flex flex-col items-center justify-center w-16 h-16 bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.3)] border-4 border-white/20 transition-all`}
            >
              <Icon className={`w-7 h-7 ${adminTheme.text}`} />
              <span className={`text-[8px] font-black mt-0.5 ${adminTheme.text} uppercase tracking-tighter`}>Chờ duyệt</span>
              {item.badgeCount > 0 && (
                <motion.span 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, -10, 10, -10, 10, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    repeatDelay: 1
                  }}
                  className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                >
                  {item.badgeCount}
                </motion.span>
              )}
            </motion.button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.path as any)}
            className={`relative flex flex-col items-center gap-1 transition-all w-16 ${isActive ? 'text-white scale-110' : 'text-white/40 hover:text-white/60'}`}
          >
            <Icon className="w-5 h-5" />
            <span className={`text-[10px] ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
            {item.badgeCount > 0 && (
              <motion.span 
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.5,
                }}
                className={`absolute -top-1 right-3 w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white`}
              >
                {item.badgeCount}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  badge, 
  variant,
  isSidebarCollapsed,
  setIsMobileSidebarOpen,
  isMobileSidebarOpen,
  adminTheme,
  filterBranch
}: any) => {
  const isRed = variant === 'danger';
  
  return (
    <button
      onClick={() => {
        onClick();
        setIsMobileSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all relative ${
        active 
          ? (isRed ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : `${adminTheme.accent} text-white shadow-lg ${adminTheme.shadow}`) 
          : (isRed ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-slate-400 hover:bg-white/5 hover:text-white')
      } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
    >
      <Icon strokeWidth={1.5} className="w-5 h-5 flex-shrink-0" />
      {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="text-sm whitespace-nowrap">{label}</span>}
      {(!isSidebarCollapsed || isMobileSidebarOpen) && badge > 0 && (
        <span className={`ml-auto ${isRed ? 'bg-white text-red-600' : (filterBranch === 'Phố Xanh' ? 'bg-[#D4AF37]' : 'bg-red-500')} text-white py-0.5 px-2 rounded-full text-[10px] font-black`}>
          {badge}
        </span>
      )}
      {(isSidebarCollapsed && !isMobileSidebarOpen) && badge > 0 && (
        <div className={`absolute top-2 right-2 w-2.5 h-2.5 ${isRed ? 'bg-white' : (filterBranch === 'Phố Xanh' ? 'bg-[#D4AF37]' : 'bg-red-500')} rounded-full border-2 border-[#0f172a]`} />
      )}
    </button>
  );
};
