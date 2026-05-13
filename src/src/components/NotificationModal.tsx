import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Info, AlertTriangle, DollarSign, CheckCircle2, Clock, Trash2, Check, ChevronLeft, MapPin, Calendar, FileText, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AppNotification } from '../types/admin';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  allowedBranches?: string[];
  selectedBranch?: string;
  onBranchChange?: (branchId: string) => void;
  adminTheme?: any;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  isSuperAdmin,
  allowedBranches = [],
  selectedBranch = 'All',
  onBranchChange,
  adminTheme
}) => {
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [relatedData, setRelatedData] = useState<any>(null);

  // Reset detail view when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedNotification(null);
        setRelatedData(null);
      }, 300); // Wait for exit animation
    }
  }, [isOpen]);

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'violation': return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'penalty': return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'salary': return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case 'shift': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'approval': return <CheckCircle2 className="w-5 h-5 text-amber-600" />;
      case 'support': return <Info className="w-5 h-5 text-indigo-600" />;
      case 'system': return <Bell className="w-5 h-5 text-stone-600" />;
      default: return <Bell className="w-5 h-5 text-stone-600" />;
    }
  };

  const getBgColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'violation': return 'bg-rose-50 border-rose-100';
      case 'penalty': return 'bg-rose-50 border-rose-100';
      case 'salary': return 'bg-emerald-50 border-emerald-100';
      case 'shift': return 'bg-blue-50 border-blue-100';
      case 'approval': return 'bg-amber-50 border-amber-100';
      case 'support': return 'bg-indigo-50 border-indigo-100';
      default: return 'bg-stone-50 border-stone-100';
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!isSuperAdmin || selectedBranch === 'All') return notifications;
    return notifications.filter(n => n.locationId === selectedBranch || n.locationId === 'All');
  }, [notifications, isSuperAdmin, selectedBranch]);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      onMarkAsRead(notif.id);
    }

    if (notif.type === 'approval' && notif.relatedId) {
      setSelectedNotification(notif);
      setLoadingDetail(true);
      setRelatedData(null);
      try {
        // Try to fetch as ApprovalRequest first
        const requestDoc = await getDoc(doc(db, 'ApprovalRequests', notif.relatedId));
        if (requestDoc.exists()) {
          setRelatedData({ type: 'request', ...requestDoc.data() });
        } else {
          // If not found, might be a Timesheet (Duyệt giờ công)
          const timesheetDoc = await getDoc(doc(db, 'timesheets', notif.relatedId));
          if (timesheetDoc.exists()) {
            setRelatedData({ type: 'timesheet', ...timesheetDoc.data() });
          }
        }
      } catch (err) {
        console.error("Error fetching notification detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    } else {
      // For other types, maybe just select it to show message in a larger view?
      setSelectedNotification(notif);
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'off_sudden': return 'Xin nghỉ phép';
      case 'shift_swap': return 'Đổi ca';
      case 'late_early': return 'Đi trễ / Về sớm';
      case 'forgot_check': return 'Quên chấm công';
      case 'feedback': return 'Góp ý';
      case 'salary_advance': return 'Ứng lương';
      default: return 'Yêu cầu';
    }
  };

  const renderDetail = () => {
    if (!selectedNotification) return null;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col min-h-0 bg-stone-50/30"
      >
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
            <div className={`w-14 h-14 rounded-2xl ${getBgColor(selectedNotification.type)} flex items-center justify-center mb-4`}>
              {getIcon(selectedNotification.type)}
            </div>
            <h3 className="text-xl font-black text-stone-800 uppercase tracking-tight mb-2">
              {selectedNotification.title}
            </h3>
            <p className="text-stone-600 font-medium leading-relaxed">
              {selectedNotification.message}
            </p>
          </div>

          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest">Đang tải chi tiết...</p>
            </div>
          ) : relatedData ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {relatedData.type === 'request' && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-50 pb-4">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Chi tiết yêu cầu</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      relatedData.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                      relatedData.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {relatedData.status === 'approved' ? 'Đã duyệt' : relatedData.status === 'rejected' ? 'Bị từ chối' : 'Đang chờ'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-stone-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Loại yêu cầu</p>
                        <p className="text-sm font-bold text-stone-800">{getRequestTypeLabel(relatedData.type)}</p>
                        {relatedData.type === 'salary_advance' && relatedData.details?.advanceAmount && (
                          <p className="text-lg font-black text-emerald-600 mt-1">
                            {relatedData.details.advanceAmount.toLocaleString()} VNĐ
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-stone-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Thời gian</p>
                        <p className="text-sm font-bold text-stone-800">
                          {relatedData.details?.requestDate ? format(new Date(relatedData.details.requestDate), 'dd/MM/yyyy') : 'N/A'}
                        </p>
                        {(relatedData.details?.requestTime || relatedData.details?.requestSubTime) && (
                          <p className="text-xs font-semibold text-stone-500 mt-0.5">
                            {relatedData.details.requestTime || ''} {relatedData.details.requestSubTime ? ` - ${relatedData.details.requestSubTime}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {relatedData.note && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
                          <Info className="w-5 h-5 text-stone-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Ghi chú của bạn</p>
                          <p className="text-sm font-medium text-stone-600 leading-relaxed italic">"{relatedData.note}"</p>
                        </div>
                      </div>
                    )}

                    {relatedData.adminId && (
                      <div className="flex items-start gap-4 pt-2 border-t border-stone-50">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                          <UserIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Người duyệt</p>
                          <p className="text-sm font-bold text-stone-800">{relatedData.adminId.split('@')[0]}</p>
                          {relatedData.processedAt && (
                            <p className="text-[10px] font-bold text-stone-400 mt-0.5">
                              {format(relatedData.processedAt.toDate(), 'HH:mm • dd/MM', { locale: vi })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {relatedData.type === 'timesheet' && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-50 pb-4">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Chi tiết giờ công</span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                      Đã duyệt
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Ngày</p>
                      <p className="text-sm font-bold text-stone-800">{relatedData.date}</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Tổng giờ công</p>
                      <p className="text-sm font-bold text-emerald-600">{relatedData.totalHours}h</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Vào ca</p>
                      <p className="text-sm font-bold text-stone-700">{relatedData.checkInTime || '--:--'}</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Ra ca</p>
                      <p className="text-sm font-bold text-stone-700">{relatedData.checkOutTime || '--:--'}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
             <div className="bg-white rounded-3xl p-8 text-center border border-stone-100">
               <Info className="w-12 h-12 text-stone-200 mx-auto mb-3" />
               <p className="text-stone-400 font-medium italic text-sm">Không tìm thấy thêm thông tin chi tiết</p>
             </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-stone-100"
          >
            {/* Header */}
            <div className={`px-6 py-5 border-b border-black/10 flex flex-col gap-3 ${adminTheme?.header || (adminTheme?.accent ? `${adminTheme.accent} text-white` : 'bg-stone-800 text-white')}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedNotification ? (
                    <button 
                      onClick={() => setSelectedNotification(null)}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all active:scale-95"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="p-2.5 bg-white/20 rounded-2xl shadow-lg">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">
                      {selectedNotification ? 'Chi tiết' : 'Thông báo'}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!selectedNotification && notifications.some(n => !n.isRead) && (
                    <button 
                      onClick={onMarkAllAsRead}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all mr-1"
                      title="Đánh dấu tất cả là đã đọc"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all active:scale-95 shadow-inner"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Super Admin Branch Filter */}
              {!selectedNotification && isSuperAdmin && allowedBranches.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  <button
                    onClick={() => onBranchChange?.('All')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      selectedBranch === 'All' 
                        ? 'bg-white text-stone-800 shadow-md' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Tất cả
                  </button>
                  {allowedBranches.map(branch => (
                    <button
                      key={branch}
                      onClick={() => onBranchChange?.(branch)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        selectedBranch === branch 
                          ? 'bg-white text-stone-800 shadow-md' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List or Detail */}
            <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${selectedNotification ? 'bg-stone-50/50' : 'bg-white'}`}>
              {selectedNotification ? (
                renderDetail()
              ) : (
                filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-stone-200" />
                    </div>
                    <p className="text-stone-400 font-medium italic">Không có thông báo nào</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative p-4 rounded-2xl border transition-all ${
                          notif.isRead 
                            ? 'bg-white border-stone-100 opacity-60' 
                            : `${getBgColor(notif.type)} shadow-sm`
                        } group cursor-pointer hover:shadow-md active:scale-[0.98]`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        {!notif.isRead && (
                          <div className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                        )}
                        <div className="flex gap-4">
                          <div className={`p-2.5 rounded-xl border h-fit ${notif.isRead ? 'bg-stone-50 border-stone-100' : 'bg-white border-stone-200 shadow-sm'}`}>
                            {getIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1 gap-2">
                               <h4 className={`text-sm font-black uppercase tracking-tight truncate ${
                                 notif.priority === 'high' ? 'text-orange-700' : 'text-stone-800'
                               }`}>
                                 {notif.title}
                               </h4>
                               <span className="text-[9px] font-bold text-stone-400 whitespace-nowrap shrink-0">
                                 {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'HH:mm • dd/MM', { locale: vi }) : ''}
                               </span>
                            </div>
                            <p className="text-[12px] text-stone-600 leading-relaxed font-medium">
                              {notif.message}
                            </p>
                            
                            {notif.priority === 'high' && !notif.isRead && (
                               <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-700/10 border border-orange-700/20">
                                 <div className="w-1 h-1 bg-orange-700 rounded-full animate-ping" />
                                 <span className="text-[8px] font-black uppercase text-orange-700 tracking-widest">Quan trọng</span>
                               </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
