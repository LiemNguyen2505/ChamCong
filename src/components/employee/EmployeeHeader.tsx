import React from 'react';
import { RefreshCw, KeyRound, LogOut, Bell } from 'lucide-react';
import { EmployeeClock } from './EmployeeClock';

interface EmployeeHeaderProps {
  branchName: string;
  onBranchReset: () => void;
  loggedInEmployee: any;
  theme: any;
  onShowChangePin: () => void;
  onLogout: () => void;
  handleSecretTap: () => void;
  notifications?: any[];
  onShowNotifications?: () => void;
}

export const EmployeeHeader: React.FC<EmployeeHeaderProps> = ({
  branchName,
  onBranchReset,
  loggedInEmployee,
  theme,
  onShowChangePin,
  onLogout,
  handleSecretTap,
  notifications = [],
  onShowNotifications
}) => {
  return (
    <header className={`h-auto whitespace-nowrap ${theme.accent} flex items-center justify-between px-4 md:px-8 flex-none z-40 shadow-md w-full left-0 transition-colors duration-500 pt-2 pb-4 md:py-5`}>
      <div className="flex flex-col items-start justify-center min-w-0 py-1 gap-1">
        <div className="flex items-center gap-2">
          <h2 
            onClick={handleSecretTap}
            className="text-2xl md:text-3xl font-black text-white leading-normal truncate uppercase tracking-tight cursor-pointer active:scale-95 transition-transform"
          >
            {branchName}
          </h2>
          <button
            type="button"
            onClick={onBranchReset}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
            title="Đổi quán"
          >
            <RefreshCw className="w-4 h-4 text-white/80" />
          </button>
        </div>
        
        <div className="flex items-center gap-1.5 ml-0.5">
          {loggedInEmployee ? (
            <span className="text-[12px] md:text-sm font-medium text-white/90 italic">
              {`Chào ${loggedInEmployee.fullName.split(' ').slice(-1)[0]}!`}
            </span>
          ) : (
            <span className="text-[11px] md:text-sm font-semibold text-white/90 uppercase tracking-wider truncate block">
              HỆ THỐNG CHẤM CÔNG
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 md:gap-2 pr-6 text-white">
        <EmployeeClock />
        
        {loggedInEmployee && (
          <div className="flex items-center gap-1">
            <button 
              onClick={onShowNotifications}
              className="p-2 hover:bg-white/10 rounded-xl transition-all relative"
              title="Thông báo"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            <button 
              onClick={onShowChangePin}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
              title="Đổi mã PIN"
            >
              <KeyRound className="w-5 h-5" />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-white hover:text-red-300"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
