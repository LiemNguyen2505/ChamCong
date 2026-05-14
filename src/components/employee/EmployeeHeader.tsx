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
    <header className={`h-auto whitespace-nowrap ${theme.accent} flex flex-col px-4 md:px-8 flex-none z-40 shadow-md w-full left-0 transition-colors duration-500 pt-3 pb-3 md:pt-4 md:pb-4`}>
      {/* Row 1: Branch Name and Action Icons */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <h2 
            onClick={handleSecretTap}
            className="text-2xl md:text-3xl font-black text-white leading-normal truncate uppercase tracking-tight cursor-pointer active:scale-95 transition-transform"
          >
            {branchName}
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBranchReset();
            }}
            className="p-3 hover:bg-white/20 active:bg-white/30 rounded-xl transition-all flex items-center justify-center"
            title="Đổi quán"
          >
            <RefreshCw className="w-6 h-6 text-white" />
          </button>
        </div>

        {loggedInEmployee && (
          <div className="flex items-center gap-1">
            <button 
              onClick={onShowNotifications}
              className="p-2 hover:bg-white/10 rounded-xl transition-all relative"
              title="Thông báo"
            >
              <Bell className="w-5 h-5 text-white" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            <button 
              onClick={onShowChangePin}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
              title="Đổi mã PIN"
            >
              <KeyRound className="w-5 h-5 text-white" />
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

      {/* Row 2: Greeting and Clock Centered */}
      <div className="flex items-center justify-between w-full mt-2 relative">
        <div className="min-w-0">
          {loggedInEmployee ? (
            <span className="text-[14px] md:text-base font-medium text-white/90 italic">
              {`Chào ${loggedInEmployee.fullName.split(' ').slice(-1)[0]}!`}
            </span>
          ) : (
            <span className="text-[11px] md:text-sm font-semibold text-white/90 uppercase tracking-wider truncate block">
              HỆ THỐNG CHẤM CÔNG
            </span>
          )}
        </div>
        
        <div className={loggedInEmployee ? "absolute left-1/2 -translate-x-1/2 flex items-center" : "flex items-center"}>
          <EmployeeClock />
        </div>
        
        {loggedInEmployee && <div className="w-20" />} {/* Spacer */}
      </div>
    </header>
  );
};
