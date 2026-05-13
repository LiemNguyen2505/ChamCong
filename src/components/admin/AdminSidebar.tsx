import React from 'react';
import { LayoutDashboard, CheckCircle2, Calendar, TableProperties, Users, DollarSign, AlertCircle, ShieldCheck, History as HistoryIcon, X, ChevronLeft, Bell, Mail, RefreshCw } from 'lucide-react';

export const AdminSidebar = ({
  isSidebarCollapsed,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  setIsSidebarCollapsed,
  activeTab,
  setActiveTab,
  adminTheme,
  currentAdmin,
  filteredChamCongs,
  pendingRequests,
  canhBaos,
  notifications,
  setShowNotifications,
  handleSendMonthlyReport,
  isSendingReport,
  SidebarItem
}: any) => {
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`
          ${isSidebarCollapsed ? 'md:w-20' : 'md:w-[260px]'} 
          w-[260px]
          bg-[#0f172a] text-white flex flex-col transition-all duration-300 shadow-2xl
          fixed md:relative h-full top-0 left-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${!isMobileSidebarOpen ? 'hidden md:flex' : 'flex'}
          z-[70] md:z-50
        `}
      >
        {/* Sidebar Header */}
        <div 
          onClick={() => {
            setActiveTab('dashboard');
            setIsMobileSidebarOpen(false);
          }}
          className="p-6 flex items-center gap-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className={`${adminTheme.accent} p-2 rounded-xl shadow-lg ${adminTheme.shadow} flex-shrink-0`}>
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {(!isSidebarCollapsed || isMobileSidebarOpen) && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-lg font-black tracking-tight leading-none">Cafe HR</h1>
              <p className={`text-[10px] uppercase tracking-[0.2em] ${adminTheme.text} font-bold mt-1`}>Admin Panel</p>
            </div>
          )}
          {isMobileSidebarOpen && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileSidebarOpen(false);
              }}
              className="ml-auto p-2 hover:bg-white/10 rounded-lg md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar">
          {/* Group: DASHBOARD */}
          <div className="space-y-2">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
          </div>

          {/* Group: QUẢN LÝ GIỜ CÔNG */}
          <div className="space-y-2">
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Quản lý giờ công</p>
            )}
            <SidebarItem 
              icon={CheckCircle2} 
              label="Chờ Duyệt" 
              active={activeTab === 'duyetgio'} 
              onClick={() => setActiveTab('duyetgio')}
              badge={pendingRequests.length}
            />
            <SidebarItem 
              icon={Calendar} 
              label="Lịch Làm Việc" 
              active={activeTab === 'lichlamviec'} 
              onClick={() => setActiveTab('lichlamviec')} 
            />
            <SidebarItem 
              icon={TableProperties} 
              label="Bảng Chấm Công" 
              active={activeTab === 'bangcongthang'} 
              onClick={() => setActiveTab('bangcongthang')} 
            />
          </div>

          {/* Group: NHÂN SỰ & LƯƠNG */}
          <div className="space-y-2">
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Nhân sự & Lương</p>
            )}
            <SidebarItem 
              icon={Users} 
              label="Nhân viên" 
              active={activeTab === 'nhanvien'} 
              onClick={() => setActiveTab('nhanvien')} 
            />
            <SidebarItem 
              icon={DollarSign} 
              label="Bảng Lương" 
              active={activeTab === 'bangluong'} 
              onClick={() => setActiveTab('bangluong')} 
            />
            <SidebarItem 
              icon={AlertCircle} 
              label="Vi phạm" 
              active={activeTab === 'vipham'} 
              onClick={() => setActiveTab('vipham')} 
            />
          </div>

          {/* Group: CẢNH BÁO & THÔNG BÁO */}
          <div className="space-y-2">
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Hệ thống & Cảnh báo</p>
            )}
            
            <button
              onClick={() => {
                setActiveTab('canhbao');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'canhbao' 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                  : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
              } ${(isSidebarCollapsed && !isMobileSidebarOpen) ? 'justify-center px-0' : ''}`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="text-sm whitespace-nowrap">Cảnh báo khẩn</span>}
              {(!isSidebarCollapsed || isMobileSidebarOpen) && canhBaos.length > 0 && (
                <span className="ml-auto bg-white text-red-600 py-0.5 px-2 rounded-full text-[10px] font-black">
                  {canhBaos.length}
                </span>
              )}
            </button>

            {(currentAdmin?.role === 'SuperAdmin') && (
              <button
                onClick={() => handleSendMonthlyReport()}
                disabled={isSendingReport}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isSendingReport 
                    ? 'bg-emerald-500/10 text-emerald-300 opacity-70 cursor-not-allowed' 
                    : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                } ${(isSidebarCollapsed && !isMobileSidebarOpen) ? 'justify-center px-0' : ''}`}
                title="Gửi Báo Cáo Tổng Hợp Về Email"
              >
                {isSendingReport ? (
                  <RefreshCw className="w-5 h-5 flex-shrink-0 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5 flex-shrink-0" />
                )}
                {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                  <span className="text-sm whitespace-nowrap">
                    {isSendingReport ? 'Đang gửi...' : 'Gửi Báo Cáo Email'}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Group: HỆ THỐNG (SuperAdmin) */}
          {currentAdmin?.role === 'SuperAdmin' && (
            <div className="space-y-2">
              {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Hệ thống</p>
              )}
              <SidebarItem 
                icon={ShieldCheck} 
                label="Quản lý Admin" 
                active={activeTab === 'admins'} 
                onClick={() => setActiveTab('admins')} 
              />
              <SidebarItem 
                icon={HistoryIcon} 
                label="Lịch sử hệ thống" 
                active={activeTab === 'lichsu'} 
                onClick={() => setActiveTab('lichsu')} 
              />
            </div>
          )}
        </div>

        {/* Sidebar Footer (Collapse Toggle) */}
        <div className="p-4 border-t border-white/5 space-y-2 md:block hidden">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            {!isSidebarCollapsed && <span className="text-sm font-bold">Thu gọn</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
