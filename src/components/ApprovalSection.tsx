import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { 
  FileCheck, 
  History as HistoryIcon, 
  Search, 
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  collection, 
  addDoc,
  where, 
  getDocs, 
  increment, 
  setDoc, 
  getDoc, 
  deleteField,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { Employee, AdminAccount, ApprovalRequest } from '../types/admin';
import { findEmployee } from '../utils/adminHelpers';

interface ApprovalSectionProps {
  adminTheme: any;
  approvalSubTab: 'pending' | 'history';
  setApprovalSubTab: (tab: 'pending' | 'history') => void;
  pendingRequests: ApprovalRequest[];
  historySearchTerm: string;
  setHistorySearchTerm: (term: string) => void;
  requestTypeFilter: string;
  setRequestTypeFilter: (filter: string) => void;
  currentAdmin: AdminAccount | null;
  nhanViens: Employee[];
  fetchInitialData: (monthYear?: string, force?: any, options?: any) => Promise<any>;
  logAction: (action: string, target: string, details: string) => Promise<void>;
  approvalHistory: ApprovalRequest[];
  openConfirmModal: (title: string, message: string, onConfirm: () => Promise<void>) => void;
  renderBranchTabs: () => React.ReactNode;
}

export const ApprovalSection: React.FC<ApprovalSectionProps> = ({
  adminTheme,
  approvalSubTab,
  setApprovalSubTab,
  pendingRequests,
  historySearchTerm,
  setHistorySearchTerm,
  requestTypeFilter,
  setRequestTypeFilter,
  currentAdmin,
  nhanViens,
  fetchInitialData,
  logAction,
  approvalHistory,
  openConfirmModal,
  renderBranchTabs
}) => {

  const getKeysToRefresh = (req: any) => {
    const keys = ['approvalRequests'];
    if (req.type === 'off') keys.push('xinNghiPheps');
    if (req.type === 'late_early' || req.type === 'forget_checkin_checkout' || req.type === 'checkin_early' || req.type === 'checkin_late' || req.type === 'checkout_different' || req.type === 'checkout_early' || req.type === 'extra_shift') keys.push('chamCongs');
    if (req.type === 'salary_advance') keys.push('salaryAdvanceRecords');
    return keys;
  };

  const safeFormat = (date: any, formatStr: string) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      return format(d, formatStr);
    } catch (e) {
      return '-';
    }
  };

  const getValidDate = (req: any) => {
    const ts = req.createdAt || req.timestamp;
    if (ts?.toDate) return ts.toDate();
    if (ts) {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const getValidProcDate = (req: any) => {
    const ts = req.processedAt;
    if (ts?.toDate) return ts.toDate();
    if (ts) {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const getRequestTypeLabel = (type: string) => {
    switch(type) {
      case 'checkin_early': return { label: 'Vào ca sớm', color: 'text-cyan-700 bg-cyan-50 border border-cyan-100' };
      case 'checkin_late': return { label: 'Vào ca trễ', color: 'text-amber-700 bg-amber-50 border border-amber-100' };
      case 'checkout_different': return { label: 'Ra ca khác giờ', color: 'text-blue-700 bg-blue-50 border border-blue-100' };
      case 'shift_swap': return { label: 'Đổi ca', color: 'text-purple-700 bg-purple-50 border border-purple-100' };
      case 'app_exit': return { label: 'Thoát Web App', color: 'text-slate-600 bg-slate-50 border border-slate-100' };
      case 'off_sudden': return { label: 'Nghỉ đột xuất', color: 'text-rose-700 bg-rose-50 border border-rose-100' };
      case 'late_early': return { label: 'ĐI TRỄ / VỀ SỚM', color: 'text-rose-700 bg-rose-50 border border-rose-100' };
      case 'forgot_check': return { label: 'QUÊN CHẤM CÔNG', color: 'text-emerald-700 bg-emerald-50 border border-emerald-100' };
      case 'emergency_checkin': return { label: 'Vào ca khẩn cấp', color: 'text-amber-800 bg-amber-100 border border-amber-200 font-black px-2' };
      case 'salary_advance': return { label: 'Ứng lương', color: 'text-emerald-800 bg-emerald-100 border border-emerald-200 font-black px-2' };
      case 'feedback': return { label: 'Góp ý', color: 'text-stone-600 bg-stone-50 border border-stone-100' };
      default: return { label: type, color: 'text-gray-600 bg-gray-50 border border-gray-100' };
    }
  };

  const getDetailTextColor = (req: any) => {
    if ((req.type === 'checkin_early' || req.type === 'checkin_late' || req.type === 'checkout_different' || req.type === 'checkout_early') && req.details?.actualTime && req.details?.scheduledTime) {
      try {
        const [aH, aM] = req.details.actualTime.split(':').map(Number);
        const [sH, sM] = req.details.scheduledTime.split(':').map(Number);
        const diffMinutes = Math.abs((aH * 60 + aM) - (sH * 60 + sM));
        if (diffMinutes > 30) return 'text-rose-600 font-black';
      } catch (e) {
        return 'text-slate-500';
      }
    }
    return 'text-slate-500';
  };

  const renderRequestDetails = (req: any) => {
    return (
      <div className="space-y-1">
        {req.type === 'checkout_different' && (
          <div>
            Lịch: {req.details?.scheduledEndTime} → Thực tế: {req.details?.actualEndTime}
          </div>
        )}
        {(req.type === 'checkin_late' || req.type === 'checkin_early') && (
          <div>
            Lịch: {req.details?.scheduledStartTime} → Thực tế: {req.details?.actualStartTime}
            {req.details?.lateMinutes > 0 && <span className="text-red-500 ml-1">(Trễ {req.details.lateMinutes < 60 ? `${req.details.lateMinutes}p` : `${Math.floor(req.details.lateMinutes / 60)}h${req.details.lateMinutes % 60 > 0 ? `${req.details.lateMinutes % 60}p` : ''}`})</span>}
          </div>
        )}
        {req.type === 'shift_swap' && (
          <div>
            Đổi với: {req.details?.swapWithEmpId} vào ngày {req.details?.requestDate || req.details?.swapDate}
            {req.details?.requestTime && <div className="font-bold">Ca: {req.details.requestTime}</div>}
          </div>
        )}
        {req.type === 'off_sudden' && (
          <div>
            Xin nghỉ ngày {req.details?.requestDate || 'hôm nay'}
            {req.details?.requestTime && <div className="font-bold">Ca: {req.details.requestTime}</div>}
          </div>
        )}
        {req.type === 'late_early' && (
          <div>
            Thời gian xin: <span className="font-bold">{req.details?.requestTime}</span> vào ngày {req.details?.requestDate}
          </div>
        )}
        {req.type === 'forgot_check' && (
          <div>
            Quên chấm công ngày {req.details?.requestDate}: 
            <div className="font-bold mt-0.5 text-emerald-700">
              Giờ vào: {req.details?.requestTime || '--:--'} → Giờ ra: {req.details?.requestSubTime || '--:--'}
            </div>
          </div>
        )}
        {req.type === 'emergency_checkin' && (
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
            <div className="font-black text-amber-700 uppercase text-[10px] mb-1">Xác nhận khẩn cấp</div>
            <div className="text-slate-700">
              Vào ca lúc: <span className="font-bold">{req.details?.actualStartTime}</span>
            </div>
            {req.note && (
              <div className="text-slate-600 text-[11px] mt-1 italic">
                {req.note}
              </div>
            )}
          </div>
        )}
        {req.type === 'salary_advance' && (
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
            <div className="font-black text-amber-700 uppercase text-[10px] mb-1">Yêu cầu ứng lương</div>
            <div className="text-slate-700 text-base font-bold">
              Số tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.details?.advanceAmount || 0)}
            </div>
          </div>
        )}
        {req.type === 'app_exit' && (
          <div>Xin thoát App sử dụng điện thoại</div>
        )}
        {req.note && req.type !== 'emergency_checkin' && req.type !== 'salary_advance' && (
          <div className="italic mt-1 text-slate-500">"{req.note}"</div>
        )}
      </div>
    );
  };

  return (
    <div className="pt-0 p-0 md:p-3" id="duyetgio-content">
      {/* Sticky Global Search Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-30 pt-0 pb-2 border-b border-stone-200 mb-2 md:mb-4 shadow-sm transition-all">
        <div className="px-4 md:px-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-end gap-1 py-1 mt-0">
            <div className="scale-90 md:scale-100 origin-right">
              {renderBranchTabs()}
            </div>
          </div>
          
          {/* Desktop Layout (Hidden on Mobile) */}
          <div className="hidden md:flex flex-col md:flex-row md:items-center gap-3">
            {/* Sub-Tabs Switcher - Shrunk */}
            <div className="flex bg-stone-100 p-1 rounded-xl w-fit border border-stone-200 shadow-inner shrink-0">
              <button
                onClick={() => {
                  setApprovalSubTab('pending');
                  document.getElementById('duyetgio-content')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 ${
                  approvalSubTab === 'pending'
                    ? `${adminTheme.header} text-white shadow-md scale-[1.02]`
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                }`}
              >
                <FileCheck className={`w-3.5 h-3.5 ${approvalSubTab === 'pending' ? 'text-amber-200' : 'text-stone-400'}`} />
                Chờ duyệt
                {pendingRequests.length > 0 && (
                  <motion.span 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className={`${approvalSubTab === 'pending' ? 'bg-white text-[#3d2b1f]' : 'bg-red-500 text-white'} px-1.5 py-0.5 rounded-full text-[9px] font-black min-w-[18px] text-center`}
                  >
                    {pendingRequests.length}
                  </motion.span>
                )}
              </button>
              <button
                onClick={() => {
                  setApprovalSubTab('history');
                  document.getElementById('duyetgio-content')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 ${
                  approvalSubTab === 'history'
                    ? `${adminTheme.header} text-white shadow-md scale-[1.02]`
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                }`}
              >
                <HistoryIcon className={`w-3.5 h-3.5 ${approvalSubTab === 'history' ? 'text-amber-200' : 'text-stone-400'}`} />
                Lịch sử
              </button>
            </div>

            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Tìm nhân viên..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3d2b1f]/10 focus:border-[#3d2b1f] transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Desktop Filter Chips (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap mr-1">Bộ lọc:</span>
            <div className="flex gap-2">
              {[
                { id: 'All', label: 'Tất cả' },
                { id: 'checkin_early', label: 'Vào sớm' },
                { id: 'checkout_different', label: 'Ra khác giờ' },
                { id: 'feedback', label: 'Góp ý' }
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setRequestTypeFilter(chip.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] whitespace-nowrap font-black uppercase tracking-tight transition-all border shadow-sm ${
                    requestTypeFilter === chip.id
                      ? `${adminTheme.header} text-white border-transparent`
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Layout (Hidden on Desktop) optimized */}
          <div className="md:hidden flex flex-col gap-1.5">
            {/* Row 1: Tab Switcher (Full Width) */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-200 shadow-inner">
              <button
                onClick={() => setApprovalSubTab('pending')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 ${
                  approvalSubTab === 'pending'
                    ? `${adminTheme.header} text-white shadow-md`
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>YÊU CẦU CHỜ DUYỆT</span>
                {pendingRequests.length > 0 && (
                  <span className={`${approvalSubTab === 'pending' ? 'bg-white text-slate-900 border border-slate-200' : 'bg-red-500 text-white'} px-1.5 py-0.5 rounded-full text-[9px] font-black min-w-[18px] text-center shadow-sm ml-1`}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setApprovalSubTab('history')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 border-l border-slate-200 ${
                  approvalSubTab === 'history'
                    ? `${adminTheme.header} text-white shadow-md border-transparent`
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                <span>LỊCH SỬ DUYỆT</span>
              </button>
            </div>

            {/* Row 2: Request Type Dropdown + Search Name */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="relative">
                <select
                  value={requestTypeFilter}
                  onChange={(e) => setRequestTypeFilter(e.target.value)}
                  className={`w-full h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-800 appearance-none outline-none shadow-sm uppercase tracking-tight`}
                >
                  <option value="All">CÁC YÊU CẦU</option>
                  <option value="checkin_early">Vào ca sớm</option>
                  <option value="checkin_late">Vào ca trễ</option>
                  <option value="checkout_different">Ra ca khác giờ</option>
                  <option value="shift_swap">Đổi ca</option>
                  <option value="off_sudden">Nghỉ đột xuất</option>
                  <option value="forgot_check">Quên chấm công</option>
                  <option value="salary_advance">Ứng lương</option>
                  <option value="feedback">Góp ý</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tên nhân viên..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-800 focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-0 md:mt-0">
     
    {/* Pending Requests Tab */}
    {approvalSubTab === 'pending' && (
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-md min-h-[500px] md:max-w-[1200px] md:ml-0 w-full relative">
        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm italic">
            Không có yêu cầu nào trùng khớp.
          </div>
        ) : (
          <>
            {/* Mobile View: Cards (High Density) */}
            <div className="md:hidden p-2 space-y-2 bg-stone-50/80">
              {pendingRequests.map(req => {
                const typeInfo = getRequestTypeLabel(req.type);
                const getValidDate = (req: any) => {
                  const ts = req.createdAt || req.timestamp;
                  if (ts?.toDate) return ts.toDate();
                  if (ts) return new Date(ts);
                  return null;
                };
                const reqTime = getValidDate(req);
                
                return (
                  <div key={req.id} className="bg-white px-3 py-3 rounded-xl border border-stone-200 shadow-sm relative overflow-hidden flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[13px] font-black text-stone-900 uppercase tracking-tight leading-relaxed truncate">{req.fullName}</span>
                        <div className={`text-[11px] font-medium leading-relaxed ${getDetailTextColor(req)}`}>
                          {renderRequestDetails(req)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${typeInfo.color} mb-1 shadow-sm`}>
                          {typeInfo.label}
                        </div>
                        <span className="text-[9px] text-stone-400 font-bold tracking-tighter">
                          {safeFormat(reqTime, 'HH:mm • dd/MM')}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={() => openConfirmModal(
                          'Xác nhận duyệt',
                          `Phê duyệt yêu cầu của ${req.fullName}?`,
                          async () => {
                            const loadingToast = toast.loading('Đang xử lý...');
                            try {
                              const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                              const firestoreId = targetEmp ? targetEmp.id : req.empId;

                              await updateDoc(doc(db, 'ApprovalRequests', req.id), {
                                status: 'approved',
                                adminId: currentAdmin?.email || 'admin',
                                processedAt: serverTimestamp()
                              });

                              // Create notification for employee
                              await addDoc(collection(db, 'Notifications'), {
                                recipientId: firestoreId,
                                locationId: req.locationId,
                                title: 'Yêu cầu được duyệt',
                                message: `Yêu cầu ${getRequestTypeLabel(req.type).label} của bạn đã được duyệt bởi ${currentAdmin?.email.split('@')[0]}.`,
                                type: 'approval',
                                priority: 'low',
                                isRead: false,
                                createdAt: serverTimestamp(),
                                senderId: currentAdmin?.id,
                                relatedId: req.id
                              });

                              // Clean up admin notifications for this request
                              const qNotif = query(
                                collection(db, 'Notifications'), 
                                where('relatedId', '==', req.id),
                                where('recipientId', '==', 'admin')
                              );
                              const notifSnap = await getDocs(qNotif);
                              const batchDel = writeBatch(db);
                              notifSnap.docs.forEach(d => batchDel.delete(d.ref));
                              await batchDel.commit();

                              // Type-specific processing logic
                              if (req.type === 'emergency_checkin' && req.details?.timesheetId) {
                                await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                  status: 'approved',
                                  checkinApprovedBy: currentAdmin?.email,
                                  checkinApprovedAt: serverTimestamp()
                                });
                              } else if (req.type === 'checkout_different' && req.details?.timesheetId) {
                                await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                  checkoutRequiresApproval: false,
                                  checkoutApprovedBy: currentAdmin?.email,
                                  checkoutApprovedAt: serverTimestamp()
                                });
                              } else if ((req.type === 'checkin_late' || req.type === 'checkin_early') && req.details?.timesheetId) {
                                await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                  isLateExcused: true,
                                  latePenaltyMinutes: 0,
                                  checkinApprovedBy: currentAdmin?.email,
                                  checkinApprovedAt: serverTimestamp()
                                });
                              } else if (req.type === 'off_sudden') {
                                const offDate = req.details?.requestDate || format(new Date(), 'yyyy-MM-dd');
                                const q = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', offDate));
                                const snap = await getDocs(q);
                                for (const d of snap.docs) {
                                  await updateDoc(doc(db, 'LichLamViec', d.id), { isOff: true });
                                }
                              } else if (req.type === 'shift_swap' && req.details?.swapWithEmpId && req.details?.swapDate) {
                                const dateStr = req.details.swapDate;
                                const q1 = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', dateStr));
                                const q2 = query(collection(db, 'LichLamViec'), where('empId', '==', req.details.swapWithEmpId), where('date', '==', dateStr));
                                const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                                for (const d of snap1.docs) await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.details.swapWithEmpId });
                                for (const d of snap2.docs) await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.empId });
                              } else if (req.type === 'salary_advance' && req.details?.advanceAmount) {
                                const reqDate = req.details.requestDate || format(new Date(), 'yyyy-MM-dd');
                                const monthYear = reqDate.substring(0, 7);
                                const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                                const firestoreId = targetEmp ? targetEmp.id : req.empId;
                                
                                // 1. Create record in SalaryAdvanceRecords for UI visibility in Tab TẠM ỨNG LƯƠNG
                                await addDoc(collection(db, 'SalaryAdvanceRecords'), {
                                  empId: firestoreId,
                                  fullName: req.fullName,
                                  amount: Number(req.details.advanceAmount),
                                  monthYear: monthYear,
                                  locationId: req.locationId,
                                  createdAt: serverTimestamp(),
                                  createdBy: currentAdmin?.email || 'admin'
                                });

                                // 2. Update PayrollAdjustment
                                const adjId = `${firestoreId}_${monthYear}`;
                                const adjRef = doc(db, 'PayrollAdjustments', adjId);
                                await setDoc(adjRef, {
                                  empId: firestoreId,
                                  monthYear: monthYear,
                                  advanceSalary: increment(req.details.advanceAmount),
                                  advanceSalaryNote: req.note || 'Ứng lương (Duyệt từ yêu cầu)'
                                }, { merge: true });
                              } else if (req.type === 'forgot_check' && req.details?.requestDate) {
                                // Create/Update timesheet for forgotten check-in/out
                                const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                                if (targetEmp) {
                                  const dateStr = req.details.requestDate;
                                  const startTime = req.details.requestTime || '08:00';
                                  const endTime = req.details.requestSubTime || '12:00';
                                  
                                  // Calculate total hours
                                  const [sH, sM] = startTime.split(':').map(Number);
                                  const [eH, eM] = endTime.split(':').map(Number);
                                  let duration = (eH + eM/60) - (sH + sM/60);
                                  if (duration < 0) duration += 24; 
                                  
                                  const totalPay = duration * (targetEmp.hourlyRate || 0);

                                  const q = query(collection(db, 'timesheets'), where('empId', '==', req.empId), where('date', '==', dateStr));
                                  const snap = await getDocs(q);
                                  
                                  if (!snap.empty) {
                                    await updateDoc(doc(db, 'timesheets', snap.docs[0].id), {
                                      checkInTime: startTime,
                                      checkOutTime: endTime,
                                      totalHours: duration,
                                      totalPay: totalPay,
                                      isManualEdit: true,
                                      status: 'approved',
                                      isAbandonedShift: false,
                                      approvedBy: currentAdmin?.email || 'admin',
                                      approvedAt: serverTimestamp()
                                    });
                                  } else {
                                    await addDoc(collection(db, 'timesheets'), {
                                      empId: req.empId,
                                      fullName: targetEmp.fullName,
                                      date: dateStr,
                                      checkInTime: startTime,
                                      checkOutTime: endTime,
                                      totalHours: duration,
                                      totalPay: totalPay,
                                      isManualEdit: true,
                                      locationId: req.locationId,
                                      status: 'approved',
                                      approvedBy: currentAdmin?.email || 'admin',
                                      approvedAt: serverTimestamp(),
                                      createdAt: serverTimestamp()
                                    });
                                  }
                                }
                              } else if (req.type === 'late_early' && req.details?.requestDate) {
                                const q = query(collection(db, 'timesheets'), where('empId', '==', req.empId), where('date', '==', req.details.requestDate));
                                const snap = await getDocs(q);
                                for (const d of snap.docs) {
                                  await updateDoc(doc(db, 'timesheets', d.id), {
                                    isLateExcused: true,
                                    latePenaltyMinutes: 0
                                  });
                                }
                              }
                              
                              await logAction('Duyệt yêu cầu', req.fullName, `Duyệt ${getRequestTypeLabel(req.type).label} cho ${req.fullName}`);
                              toast.success('Đã duyệt yêu cầu', { id: loadingToast });
                              await fetchInitialData(undefined, getKeysToRefresh(req), { exactDate: req.details?.requestDate });
                            } catch (error) {
                              toast.error('Lỗi khi duyệt', { id: loadingToast });
                            }
                          }
                        )}
                        className="flex-1 h-11 bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center"
                      >
                        DUYỆT
                      </button>
                      <button
                        onClick={() => openConfirmModal(
                          'Xác nhận từ chối',
                          `Từ chối yêu cầu của ${req.fullName}?`,
                          async () => {
                            const loadingToast = toast.loading('Đang xử lý...');
                            try {
                              const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                              const firestoreId = targetEmp ? targetEmp.id : req.empId;

                              await updateDoc(doc(db, 'ApprovalRequests', req.id), {
                                status: 'rejected',
                                adminId: currentAdmin?.email || 'admin',
                                processedAt: serverTimestamp()
                              });

                              // Create notification for employee
                              await addDoc(collection(db, 'Notifications'), {
                                recipientId: firestoreId,
                                locationId: req.locationId,
                                title: 'Yêu cầu bị từ chối',
                                message: `Yêu cầu ${getRequestTypeLabel(req.type).label} của bạn đã bị từ chối.`,
                                type: 'approval',
                                priority: 'medium',
                                isRead: false,
                                createdAt: serverTimestamp(),
                                senderId: currentAdmin?.id,
                                relatedId: req.id
                              });

                              // Clean up admin notifications for this request
                              const qNotif = query(
                                collection(db, 'Notifications'), 
                                where('relatedId', '==', req.id),
                                where('recipientId', '==', 'admin')
                              );
                              const notifSnap = await getDocs(qNotif);
                              const batchDel = writeBatch(db);
                              notifSnap.docs.forEach(d => batchDel.delete(d.ref));
                              await batchDel.commit();
                              
                              if (req.type === 'checkout_different' && req.details?.timesheetId) {
                                const tsDoc = await getDoc(doc(db, 'timesheets', req.details.timesheetId));
                                if (tsDoc.exists()) {
                                  const log = tsDoc.data();
                                  const emp = nhanViens.find(e => e.empId === log.empId);
                                  const checkInTime = new Date(log.paidStartTime || log.checkInTime);
                                  const [schedH, schedM] = (log.scheduledShiftEndTime || '00:00').split(':').map(Number);
                                  const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
                                  const schedMinutes = schedH * 60 + schedM;
                                  let actualDurationMinutes = schedMinutes - checkInMinutes;
                                  const totalHours = Math.max(0, actualDurationMinutes / 60);
                                  const totalPay = totalHours * (emp?.hourlyRate || 0);
                                  
                                  await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                    checkoutRequiresApproval: false,
                                    selectedShiftEndTime: log.scheduledShiftEndTime,
                                    isEndTimeModified: false,
                                    totalHours,
                                    totalPay,
                                    checkoutRejectedBy: currentAdmin?.email,
                                    checkoutRejectedAt: serverTimestamp()
                                  });
                                }
                              }
                              
                              await logAction('Từ chối yêu cầu', req.fullName, `Từ chối ${getRequestTypeLabel(req.type).label} cho ${req.fullName}`);
                              toast.success('Đã từ chối!', { id: loadingToast });
                              await fetchInitialData(undefined, getKeysToRefresh(req), { exactDate: req.details?.requestDate });
                            } catch (error) {
                              toast.error('Lỗi khi từ chối', { id: loadingToast });
                            }
                          }
                        )}
                        className="flex-1 h-11 bg-rose-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-rose-900/10 flex items-center justify-center"
                      >
                        TỪ CHỐI
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PC View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-[#3d2b1f]/5 border-b border-[#3d2b1f]/10">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-[#3d2b1f]/60 w-[50px] text-center">STT</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-[#3d2b1f]/60 min-w-[180px]">Nhân viên</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-[#3d2b1f]/60 w-[150px] text-center">Loại</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-[#3d2b1f]/60 w-[120px] text-right">Gửi lúc</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-[#3d2b1f]/60">Chi tiết</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-[#3d2b1f]/60 w-[180px] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req, index) => {
                    const typeInfo = getRequestTypeLabel(req.type);
                    const getValidDate = (req: any) => {
                      const ts = req.createdAt || req.timestamp;
                      if (ts?.toDate) return ts.toDate();
                      if (ts) return new Date(ts);
                      return null;
                    };
                    const reqTime = getValidDate(req);
                    
                    return (
                      <tr key={req.id} className={`border-b border-stone-100 hover:bg-[#3d2b1f]/5 transition-colors group ${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-400 text-center">{index + 1}</td>
                        <td className="px-4 py-3 truncate">
                          <p className="text-sm font-semibold text-slate-900">{req.fullName}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-slate-500 font-bold text-right">
                          {safeFormat(reqTime, 'HH:mm dd/MM')}
                        </td>
                        <td className={`px-4 py-3 text-xs font-medium ${getDetailTextColor(req)}`}>
                          {renderRequestDetails(req)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3 pr-1">
                            <button
                              onClick={() => openConfirmModal(
                                'Xác nhận duyệt',
                                `Phê duyệt yêu cầu của ${req.fullName}?`,
                                async () => {
                                  const loadingToast = toast.loading('Đang xử lý...');
                                  try {
                                    const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                                    const firestoreId = targetEmp ? targetEmp.id : req.empId;

                                    await updateDoc(doc(db, 'ApprovalRequests', req.id), {
                                      status: 'approved',
                                      adminId: currentAdmin?.email || 'admin',
                                      processedAt: serverTimestamp()
                                    });

                                    // Create notification for employee
                                    await addDoc(collection(db, 'Notifications'), {
                                      recipientId: firestoreId,
                                      locationId: req.locationId,
                                      title: 'Yêu cầu được duyệt',
                                      message: `Yêu cầu ${getRequestTypeLabel(req.type).label} của bạn đã được duyệt bởi ${currentAdmin?.email.split('@')[0]}.`,
                                      type: 'approval',
                                      priority: 'low',
                                      isRead: false,
                                      createdAt: serverTimestamp(),
                                      senderId: currentAdmin?.id,
                                      relatedId: req.id
                                    });

                                    // Clean up admin notifications
                                    const qNotif = query(
                                      collection(db, 'Notifications'), 
                                      where('relatedId', '==', req.id),
                                      where('recipientId', '==', 'admin')
                                    );
                                    const notifSnap = await getDocs(qNotif);
                                    const batchDel = writeBatch(db);
                                    notifSnap.docs.forEach(d => batchDel.delete(d.ref));
                                    await batchDel.commit();

                                    // Specific actions...
                                    if (req.type === 'emergency_checkin' && req.details?.timesheetId) {
                                      await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                        status: 'approved',
                                        checkinApprovedBy: currentAdmin?.email,
                                        checkinApprovedAt: serverTimestamp()
                                      });
                                    } else if (req.type === 'checkout_different' && req.details?.timesheetId) {
                                      await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                        checkoutRequiresApproval: false,
                                        checkoutApprovedBy: currentAdmin?.email,
                                        checkoutApprovedAt: serverTimestamp()
                                      });
                                    } else if ((req.type === 'checkin_late' || req.type === 'checkin_early') && req.details?.timesheetId) {
                                      await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                        isLateExcused: true,
                                        latePenaltyMinutes: 0,
                                        checkinApprovedBy: currentAdmin?.email,
                                        checkinApprovedAt: serverTimestamp()
                                      });
                                    } else if (req.type === 'off_sudden') {
                                      const offDate = req.details?.requestDate || format(new Date(), 'yyyy-MM-dd');
                                      const q = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', offDate));
                                      const snap = await getDocs(q);
                                      for (const d of snap.docs) {
                                        await updateDoc(doc(db, 'LichLamViec', d.id), { isOff: true });
                                      }
                                    } else if (req.type === 'shift_swap' && req.details?.swapWithEmpId && req.details?.swapDate) {
                                      const dateStr = req.details.swapDate;
                                      const q1 = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', dateStr));
                                      const q2 = query(collection(db, 'LichLamViec'), where('empId', '==', req.details.swapWithEmpId), where('date', '==', dateStr));
                                      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                                      for (const d of snap1.docs) await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.details.swapWithEmpId });
                                      for (const d of snap2.docs) await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.empId });
                                    } else if (req.type === 'salary_advance' && req.details?.advanceAmount) {
                                      const reqDate = req.details.requestDate || format(new Date(), 'yyyy-MM-dd');
                                      const monthYear = reqDate.substring(0, 7);
                                      const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                                      const firestoreId = targetEmp ? targetEmp.id : req.empId;

                                      // 1. Create record in SalaryAdvanceRecords for UI visibility in Tab TẠM ỨNG LƯƠNG
                                      await addDoc(collection(db, 'SalaryAdvanceRecords'), {
                                        empId: firestoreId,
                                        fullName: req.fullName,
                                        amount: Number(req.details.advanceAmount),
                                        monthYear: monthYear,
                                        locationId: req.locationId,
                                        createdAt: serverTimestamp(),
                                        createdBy: currentAdmin?.email || 'admin'
                                      });

                                      // 2. Update PayrollAdjustment
                                      const adjId = `${firestoreId}_${monthYear}`;
                                      const adjRef = doc(db, 'PayrollAdjustments', adjId);
                                      await setDoc(adjRef, {
                                        empId: firestoreId,
                                        monthYear: monthYear,
                                        advanceSalary: increment(req.details.advanceAmount),
                                        advanceSalaryNote: req.note || 'Ứng lương (Duyệt từ yêu cầu)'
                                      }, { merge: true });
                                    } else if (req.type === 'forgot_check' && req.details?.requestDate) {
                                      // Create/Update timesheet for forgotten check-in/out
                                      const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                                      if (targetEmp) {
                                        const dateStr = req.details.requestDate;
                                        const startTime = req.details.requestTime || '08:00';
                                        const endTime = req.details.requestSubTime || '12:00';
                                        
                                        // Calculate total hours
                                        const [sH, sM] = startTime.split(':').map(Number);
                                        const [eH, eM] = endTime.split(':').map(Number);
                                        let duration = (eH + eM/60) - (sH + sM/60);
                                        if (duration < 0) duration += 24; 
                                        
                                        const totalPay = duration * (targetEmp.hourlyRate || 0);

                                        const q = query(collection(db, 'timesheets'), where('empId', '==', req.empId), where('date', '==', dateStr));
                                        const snap = await getDocs(q);
                                        
                                        if (!snap.empty) {
                                          await updateDoc(doc(db, 'timesheets', snap.docs[0].id), {
                                            checkInTime: startTime,
                                            checkOutTime: endTime,
                                            totalHours: duration,
                                            totalPay: totalPay,
                                            isManualEdit: true,
                                            status: 'approved',
                                            isAbandonedShift: false, // Cập nhật lại không còn bỏ ca
                                            approvedBy: currentAdmin?.email || 'admin',
                                            approvedAt: serverTimestamp()
                                          });
                                        } else {
                                          await addDoc(collection(db, 'timesheets'), {
                                            empId: req.empId,
                                            fullName: targetEmp.fullName,
                                            date: dateStr,
                                            checkInTime: startTime,
                                            checkOutTime: endTime,
                                            totalHours: duration,
                                            totalPay: totalPay,
                                            isManualEdit: true,
                                            locationId: req.locationId,
                                            status: 'approved',
                                            approvedBy: currentAdmin?.email || 'admin',
                                            approvedAt: serverTimestamp(),
                                            createdAt: serverTimestamp()
                                          });
                                        }
                                      }
                                    } else if (req.type === 'late_early' && req.details?.requestDate) {
                                      const q = query(collection(db, 'timesheets'), where('empId', '==', req.empId), where('date', '==', req.details.requestDate));
                                      const snap = await getDocs(q);
                                      for (const d of snap.docs) {
                                        await updateDoc(doc(db, 'timesheets', d.id), {
                                          isLateExcused: true,
                                          latePenaltyMinutes: 0
                                        });
                                      }
                                    }
                                    
                                    await logAction('Duyệt yêu cầu', req.fullName, `Duyệt ${getRequestTypeLabel(req.type).label} cho ${req.fullName}`);
                                    toast.success('Đã duyệt thành công!', { id: loadingToast });
                                    await fetchInitialData(undefined, getKeysToRefresh(req), { exactDate: req.details?.requestDate });
                                  } catch (error) {
                                    toast.error('Lỗi khi duyệt', { id: loadingToast });
                                  }
                                }
                              )}
                              className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-[10px] font-black uppercase tracking-tight transition-all shadow-sm"
                            >
                              DUYỆT
                            </button>
                            <button
                              onClick={() => openConfirmModal(
                                'Xác nhận từ chối',
                                `Từ chối yêu cầu của ${req.fullName}?`,
                                async () => {
                                  const loadingToast = toast.loading('Đang xử lý...');
                                  try {
                                    const targetEmp = findEmployee(req.empId, req.fullName, nhanViens);
                                    const firestoreId = targetEmp ? targetEmp.id : req.empId;

                                    await updateDoc(doc(db, 'ApprovalRequests', req.id), {
                                      status: 'rejected',
                                      adminId: currentAdmin?.email || 'admin',
                                      processedAt: serverTimestamp()
                                    });

                                    // Create notification for employee
                                    await addDoc(collection(db, 'Notifications'), {
                                      recipientId: firestoreId,
                                      locationId: req.locationId,
                                      title: 'Yêu cầu bị từ chối',
                                      message: `Yêu cầu ${getRequestTypeLabel(req.type).label} của bạn đã bị từ chối.`,
                                      type: 'approval',
                                      priority: 'medium',
                                      isRead: false,
                                      createdAt: serverTimestamp(),
                                      senderId: currentAdmin?.id,
                                      relatedId: req.id
                                    });

                                    // Clean up admin notifications
                                    const qNotif = query(
                                      collection(db, 'Notifications'), 
                                      where('relatedId', '==', req.id),
                                      where('recipientId', '==', 'admin')
                                    );
                                    const notifSnap = await getDocs(qNotif);
                                    const batchDel = writeBatch(db);
                                    notifSnap.docs.forEach(d => batchDel.delete(d.ref));
                                    await batchDel.commit();
                                    
                                    // Rejection logic
                                    if (req.type === 'checkout_different' && req.details?.timesheetId) {
                                      const tsDoc = await getDoc(doc(db, 'timesheets', req.details.timesheetId));
                                      if (tsDoc.exists()) {
                                        const log = tsDoc.data();
                                        const emp = nhanViens.find(e => e.empId === log.empId);
                                        const checkInTime = new Date(log.paidStartTime || log.checkInTime);
                                        const [schedH, schedM] = (log.scheduledShiftEndTime || '00:00').split(':').map(Number);
                                        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
                                        const schedMinutes = schedH * 60 + schedM;
                                        let actualDurationMinutes = schedMinutes - checkInMinutes;
                                        const totalHours = Math.max(0, actualDurationMinutes / 60);
                                        const totalPay = totalHours * (emp?.hourlyRate || 0);
                                        
                                        await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                          checkoutRequiresApproval: false,
                                          selectedShiftEndTime: log.scheduledShiftEndTime,
                                          isEndTimeModified: false,
                                          totalHours,
                                          totalPay,
                                          checkoutRejectedBy: currentAdmin?.email,
                                          checkoutRejectedAt: serverTimestamp()
                                        });
                                      }
                                    }
                                    
                                    await logAction('Từ chối yêu cầu', req.fullName, `Từ chối yêu cầu cho ${req.fullName}`);
                                    toast.success('Đã từ chối!', { id: loadingToast });
                                    await fetchInitialData(undefined, getKeysToRefresh(req), { exactDate: req.details?.requestDate });
                                  } catch (error) {
                                    toast.error('Lỗi khi từ chối', { id: loadingToast });
                                  }
                                }
                              )}
                              className="px-2.5 py-1 bg-rose-800 text-white rounded-lg hover:bg-rose-900 text-[10px] font-black uppercase tracking-tight transition-all shadow-sm"
                            >
                              TỪ CHỐI
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    )}
      
      {/* Processed Requests (History) */}
      {approvalSubTab === 'history' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-md min-h-[500px] md:max-w-[1200px] md:ml-0 w-full relative">
          {approvalHistory.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Chưa có lịch sử phê duyệt.
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="md:hidden p-2 space-y-2 bg-stone-50/80">
                {approvalHistory.slice(0, 50).map(req => {
                  const getValidProcDate = (req: any) => {
                    const ts = req.processedAt;
                    if (ts?.toDate) return ts.toDate();
                    if (ts) return new Date(ts);
                    return null;
                  };
                  const procTime = getValidProcDate(req);
                  const typeInfo = getRequestTypeLabel(req.type);
                  return (
                    <div key={req.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm relative overflow-hidden flex flex-col gap-2">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                          <span className="text-[12px] font-black text-stone-900 uppercase tracking-tight leading-relaxed truncate">{req.fullName}</span>
                          <div className="text-[10px] text-stone-500 font-bold mt-0.5 leading-relaxed">{renderRequestDetails(req)}</div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                           <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${
                             req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                           }`}>{req.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}</div>
                           <div className="flex flex-col items-end mt-1 gap-0.5">
                             <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter">
                               Gửi: {safeFormat(req.timestamp?.toDate ? req.timestamp.toDate() : req.timestamp, 'HH:mm • dd/MM')}
                             </span>
                             <span className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">
                               Xử lý: {safeFormat(procTime, 'HH:mm • dd/MM')}
                             </span>
                           </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-1 pt-2 border-t border-stone-100">
                        <div className="flex flex-col gap-0.5">
                          <div className={`text-[9px] font-black uppercase tracking-widest ${typeInfo.color} px-1.5 py-0.5 rounded-md w-fit`}>
                            {typeInfo.label}
                          </div>
                          <div className="text-[8px] text-stone-400 font-bold uppercase truncate max-w-[150px]">Bởi: {req.adminId}</div>
                        </div>
                        <button
                          onClick={() => openConfirmModal('Hoàn tác', 'Về trạng thái Chờ duyệt?', async () => {
                            try {
                              await updateDoc(doc(db, 'ApprovalRequests', req.id), { status: 'pending', adminId: deleteField(), processedAt: deleteField() });
                              toast.success('Đã hoàn tác');
                              await fetchInitialData(undefined, getKeysToRefresh(req), { exactDate: req.details?.requestDate });
                            } catch (error) { toast.error('Lỗi'); }
                          })}
                          className="p-2 bg-stone-100 text-stone-600 rounded-lg active:scale-90 transition-all border border-stone-200"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left table-fixed">
                  <thead className="text-[10px] text-[#3d2b1f]/60 font-black uppercase bg-[#3d2b1f]/5 border-b border-[#3d2b1f]/10">
                    <tr>
                      <th className="px-4 py-3 w-[50px] text-center">STT</th>
                      <th className="px-4 py-3 min-w-[180px]">Nhân viên</th>
                      <th className="px-4 py-3 w-[150px] text-center">Loại</th>
                      <th className="px-4 py-3">Chi tiết</th>
                      <th className="px-4 py-3 text-emerald-600 text-right w-[120px]">Gửi lúc</th>
                      <th className="px-4 py-3 text-blue-600 text-right w-[100px]">Giờ duyệt</th>
                      <th className="px-4 py-3 w-[100px]">Kết quả</th>
                      <th className="px-4 py-3 w-[120px]">Người duyệt</th>
                      <th className="px-4 py-3 text-right w-[100px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalHistory.slice(0, 50).map((req, index) => {
                      const getValidDate = (req: any) => {
                        const ts = req.createdAt || req.timestamp;
                        if (ts?.toDate) return ts.toDate();
                        if (ts) return new Date(ts);
                        return null;
                      };
                      const getValidProcDate = (req: any) => {
                        const ts = req.processedAt;
                        if (ts?.toDate) return ts.toDate();
                        if (ts) return new Date(ts);
                        return null;
                      };
                      const reqTime = getValidDate(req);
                      const procTime = getValidProcDate(req);
                      return (
                        <tr key={req.id} className={`border-b border-stone-100 hover:bg-[#3d2b1f]/5 transition-colors group ${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                          <td className="px-4 py-3 text-gray-500 font-medium text-center">{index + 1}</td>
                          <td className="px-4 py-3 truncate font-semibold text-gray-800">{req.fullName}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${getRequestTypeLabel(req.type).color}`}>{getRequestTypeLabel(req.type).label}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 truncate">{renderRequestDetails(req)}</td>
                          <td className="px-4 py-3 text-[10px] font-bold text-emerald-700 text-right">{safeFormat(reqTime, 'HH:mm dd/MM')}</td>
                          <td className="px-4 py-3 text-[10px] font-black text-blue-700 text-right">{safeFormat(procTime, 'HH:mm')}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{req.status === 'approved' ? 'Duyệt' : 'Từ chối'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 truncate">{req.adminId}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openConfirmModal('Hoàn tác', 'Về trạng thái Chờ duyệt?', async () => {
                                try {
                                  await updateDoc(doc(db, 'ApprovalRequests', req.id), { status: 'pending', adminId: deleteField(), processedAt: deleteField() });
                                  toast.success('Đã hoàn tác');
                                  await fetchInitialData(undefined, getKeysToRefresh(req), { exactDate: req.details?.requestDate });
                                } catch (error) { toast.error('Lỗi'); }
                              })}
                              className="text-amber-600 hover:text-amber-700 text-[10px] font-bold flex items-center gap-1 justify-end ml-auto uppercase"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Hoàn tác
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
