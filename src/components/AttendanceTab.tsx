import React from 'react';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Plus, Download, Calendar, X, ChevronLeft, ChevronRight, CheckCircle2, Edit2, Trash2, Smartphone, Clock, AlertCircle, ChevronDown, FileCheck, Image as ImageIcon, MapPin, ArrowLeft, Save } from 'lucide-react';
import { MonthlyAttendanceTable } from './MonthlyAttendanceTable';
import { Employee, Timesheet, AdminAccount } from '../types/admin';
import { safeFormat, safeParseDate } from '../utils/dateUtils';
import { TABLE_COL_WIDTHS, formatMinutes, formatDecimalHours, getTimeStyle, calculateShifts, getLateMinutes, getLatePenaltyMinutes, getTotalHours } from '../utils/adminHelpers';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface AttendanceTabProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  filterBranch: string;
  filterMonth: string;
  nhanViens: Employee[];
  filteredChamCongs: Timesheet[];
  currentAdmin: AdminAccount | null;
  adminTheme: any;
  historyDay: string | null;
  setHistoryDay: (day: string | null) => void;
  historyEmployee: Employee | null;
  setHistoryEmployee: (emp: Employee | null) => void;
  mobileHistoryMode: 'day' | 'employee';
  setMobileHistoryMode: (mode: 'day' | 'employee') => void;
  showDatePickerGrid: boolean;
  setShowDatePickerGrid: (show: boolean) => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleApproveAttendance: (log: Timesheet) => void;
  handleDeleteAttendance: (log: Timesheet) => void;
  setShowEditAttendanceModal: (show: boolean) => void;
  setEditingAttendance: (log: any) => void;
  setShowManualCheckin: (show: boolean) => void;
  exportToCSV: () => void;
  checkEmployeeReview: (empId: string) => boolean;
  BranchTabs: React.FC<any>;
  isLoading?: boolean;
  admins: AdminAccount[];
  fetchInitialData?: (month?: string, force?: any) => Promise<any>;
  setFilterMonth?: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
const roundToUnit = (val: number) => Math.round(val / 1000) * 1000;

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  activeTab,
  setActiveTab,
  filterBranch,
  filterMonth,
  nhanViens,
  filteredChamCongs,
  currentAdmin,
  adminTheme,
  historyDay,
  setHistoryDay,
  historyEmployee,
  setHistoryEmployee,
  mobileHistoryMode,
  setMobileHistoryMode,
  showDatePickerGrid,
  setShowDatePickerGrid,
  handlePrevMonth,
  handleNextMonth,
  handleApproveAttendance,
  handleDeleteAttendance,
  setShowEditAttendanceModal,
  setEditingAttendance,
  setShowManualCheckin,
  exportToExcel,
  exportToCSV,
  checkEmployeeReview,
  BranchTabs,
  isLoading,
  admins,
  fetchInitialData,
  setFilterMonth
}) => {
  if (activeTab !== 'bangcongthang') return null;

  const getEmployeeForLog = (log: any) => {
    let emp = undefined;
    if (log.empId) {
      if (log.empId !== '') emp = nhanViens.find(nv => nv.empId === log.empId);
      if (!emp) emp = nhanViens.find(nv => nv.id === log.empId);
    }
    if (!emp && log.fullName) {
      emp = nhanViens.find(nv => nv.fullName === log.fullName);
    }
    return emp || { fullName: log.fullName || 'Unknown', hourlyRate: 0 };
  };

  const isSubjectAdmin = (empId: string) => {
    if (!empId) return false;
    if (empId.toUpperCase() === 'ADMIN') return true;
    const emp = nhanViens.find(e => (e.empId === empId && e.empId !== '') || e.id === empId);
    return emp ? admins.some((a: any) => a.email === emp.fullName) : false;
  };

  const [yyyy, mm] = filterMonth.split('-');
  const displayMonthYear = `${mm}-${yyyy}`;
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultMobileDay = filterMonth === format(new Date(), 'yyyy-MM') ? todayStr : `${filterMonth}-01`;
  const effectiveHistoryDay = historyDay || defaultMobileDay;

  const handlePrevDay = () => {
    const prevDay = format(subDays(parseISO(effectiveHistoryDay), 1), 'yyyy-MM-dd');
    setHistoryDay(prevDay);
    if (setFilterMonth && prevDay.substring(0, 7) !== filterMonth) {
      setFilterMonth(prevDay.substring(0, 7));
    }
  };

  const handleNextDay = () => {
    const nextDay = format(addDays(parseISO(effectiveHistoryDay), 1), 'yyyy-MM-dd');
    setHistoryDay(nextDay);
    if (setFilterMonth && nextDay.substring(0, 7) !== filterMonth) {
      setFilterMonth(nextDay.substring(0, 7));
    }
  };

  const [previewPhoto, setPreviewPhoto] = React.useState<{
    url: string;
    employeeName: string;
    time: string;
    location: string;
    gps?: { lat: number, lng: number } | null;
  } | null>(null);

  const isAdminOrSuperAdmin = currentAdmin?.role === 'SuperAdmin' || currentAdmin?.role === 'BranchAdmin';

  const [inlineEditingLogId, setInlineEditingLogId] = React.useState<string | null>(null);
  const [inlineEditingCheckIn, setInlineEditingCheckIn] = React.useState<string>('');
  const [inlineEditingCheckOut, setInlineEditingCheckOut] = React.useState<string>('');

  const handleSaveInlineEdit = async (log: Timesheet) => {
    try {
      let updates: any = {};
      
      const newCheckIn = inlineEditingCheckIn || log.checkInTime;
      const newCheckOut = inlineEditingCheckOut || log.checkOutTime;
      
      updates.checkInTime = newCheckIn;
      updates.checkOutTime = newCheckOut;
      
      if (newCheckIn && newCheckOut) {
         const getHM = (val: string) => {
            if (val.includes('T')) {
               const date = new Date(val);
               return [date.getHours(), date.getMinutes()];
            }
            return val.split(':').map(Number);
         };
         
         const [inH, inM] = getHM(newCheckIn);
         const [outH, outM] = getHM(newCheckOut);
         let diff = (outH + outM / 60) - (inH + inM / 60);
         if (diff < 0) diff += 24; // Handle overnight shift simply
         updates.totalHours = diff;
         
         // Calculate totalPay
         const employee = getEmployeeForLog(log);
         if (employee && employee.hourlyRate) {
           updates.totalPay = diff * employee.hourlyRate;
         }
      }
      
      await updateDoc(doc(db, 'timesheets', log.id), updates);
      toast.success('Đã cập nhật giờ công');
      setInlineEditingLogId(null);
      if (fetchInitialData) {
         await fetchInitialData(filterMonth, ['chamCongs']);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật giờ công');
    }
  };

  const PhotoPreviewModal = () => {
    if (!previewPhoto) return null;
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full relative"
        >
          <button 
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative overflow-hidden">
            <img 
              src={previewPhoto.url} 
              alt="Verification" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as any).src = 'https://placehold.co/600x400?text=Lỗi+tải+ảnh';
              }}
            />
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-none">{previewPhoto.employeeName}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">{previewPhoto.time}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl">
                <ImageIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <MapPin className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Tọa độ GPS</p>
                <p className="text-sm font-bold text-slate-700 tabular-nums">
                  {previewPhoto.gps ? `${previewPhoto.gps.lat.toFixed(6)}, ${previewPhoto.gps.lng.toFixed(6)}` : 'Không có tọa độ'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setPreviewPhoto(null)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              Đóng cửa sổ
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PhotoPreviewModal />
      {/* Attendance Header Controls */}
      <div className="attendance-header bg-white p-4 md:p-8 rounded-none md:rounded-3xl border-b border-slate-100 md:border md:border-stone-200 shadow-sm transition-all duration-300 relative">
        {/* Loading Bar for mobile/minimal UI */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden rounded-t-3xl">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="h-full w-1/3 bg-blue-500"
            />
          </div>
        )}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-6">
          <div className="space-y-4 flex-1">
            {/* Desktop Title */}
            <h2 className="hidden md:flex text-xl md:text-3xl font-black text-slate-900 tracking-tight items-center gap-3">
              {(historyDay || historyEmployee) && (
                <button
                  onClick={() => {
                    setHistoryDay(null);
                    setHistoryEmployee(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                  title="Quay lại"
                >
                  <ArrowLeft className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              )}
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              <span className="uppercase">Bảng Chấm Công</span>
            </h2>

            {/* Mobile Row 1: Title + Month-Year */}
            <div className="md:hidden flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {(historyDay || historyEmployee) && (
                  <button
                    onClick={() => {
                      setHistoryDay(null);
                      setHistoryEmployee(null);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-[15px] font-black text-slate-800 tracking-tight leading-none uppercase">
                  Bảng Chấm Công
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
                <button
                  onClick={handlePrevDay}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors active:scale-90"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowDatePickerGrid(true)}
                  className="px-2.5 py-1 bg-white rounded-lg shadow-sm border border-slate-200 min-w-[85px] text-center active:scale-95 transition-all outline-none"
                >
                  <span className="text-xs font-black text-slate-800 tabular-nums">{format(parseISO(effectiveHistoryDay), 'dd/MM/yyyy')}</span>
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-2">
                <BranchTabs />
            </div>

            {/* Desktop Month Selector */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl shadow-inner border border-slate-100">
                <button
                  onClick={handlePrevMonth}
                  className="p-2.5 hover:bg-white hover:text-blue-600 rounded-xl transition-all active:scale-90 text-slate-400 hover:shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-4 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 min-w-[120px] text-center">
                  <span className="text-sm font-black text-slate-700 tracking-tighter uppercase">{filterMonth}</span>
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2.5 hover:bg-white hover:text-blue-600 rounded-xl transition-all active:scale-90 text-slate-400 hover:shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full">
              {/* Back button removed as it's now an arrow in the header */}
              
              {/* Mobile Row 2: Selected Employee + ManualCheckin + Excel */}
              <div className="md:hidden w-full grid grid-cols-[1fr_auto_auto] items-center gap-2">
                <div className="relative">
                  <select
                    value={historyEmployee?.id || ''}
                    onChange={(e) => {
                      const emp = nhanViens.find(nv => nv.id === e.target.value);
                      if (emp) {
                        setHistoryEmployee(emp);
                        setHistoryDay(null);
                        setMobileHistoryMode('employee');
                      } else {
                        setHistoryEmployee(null);
                      }
                    }}
                    className={`w-full h-11 pl-4 pr-10 appearance-none ${adminTheme.accent} text-white rounded-2xl text-[11px] font-black uppercase tracking-wider outline-none shadow-md border-none transition-all active:scale-[0.98]`}
                  >
                    <option value="" className="text-slate-900 bg-white">TÊN NHÂN VIÊN</option>
                    {nhanViens
                      .filter(nv => filterBranch === 'All' || nv.locationId === filterBranch || (nv.locationIds && nv.locationIds.includes(filterBranch)) || filteredChamCongs.some(cc => cc.empId === nv.id || cc.empId === nv.empId))
                      .sort((a,b) => a.fullName.localeCompare(b.fullName))
                      .map(nv => (
                        <option key={nv.id} value={nv.id} className="text-slate-900 bg-white">
                          {nv.fullName.toUpperCase()}
                        </option>
                      ))
                    }
                  </select>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${adminTheme.text === 'text-white' ? 'text-white/80' : 'text-slate-400'} pointer-events-none`} />
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setShowManualCheckin(true); }}
                  className="w-11 h-11 flex items-center justify-center bg-[#8B4513] text-white rounded-2xl shadow-md active:scale-95 transition-all"
                  title="Chấm công hộ"
                >
                  <Plus className="w-5 h-5 text-orange-200" />
                </button>

            <button
               onClick={exportToCSV}
               className="w-11 h-11 flex items-center justify-center bg-emerald-600 text-white rounded-2xl shadow-md active:scale-95 transition-all text-white hover:bg-emerald-700"
               title="Xuất CSV"
             >
               <Download className="w-5 h-5" />
             </button>
           </div>

           {/* Desktop Actions */}
           <div className="hidden md:flex items-center gap-3">
             {!historyDay && !historyEmployee && (
               <>
                 <button
                   onClick={(e) => { e.stopPropagation(); setShowManualCheckin(true); }}
                   className="flex items-center gap-2 px-4 py-2.5 bg-[#8B4513] text-white rounded-xl text-sm font-bold hover:bg-[#6b3410] transition-all shadow-md active:scale-95"
                 >
                   <Plus className="w-4 h-4 text-orange-200" />
                   <span>Chấm công hộ</span>
                 </button>
                 <button
                   onClick={exportToCSV}
                   className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                 >
                   <Download className="w-4 h-4" />
                   <span>Xuất Báo Cáo CSV</span>
                 </button>
               </>
             )}
           </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Calendar Picker */}
      {showDatePickerGrid && (
          <div 
            className="calendar-overlay-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in md:hidden"
            onClick={(e) => {
               if (e.target === e.currentTarget) setShowDatePickerGrid(false);
            }}
          >
              <div className="modal-content w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                          <button onClick={() => { if (setFilterMonth) { const [y, m] = filterMonth.split('-').map(Number); setFilterMonth(format(new Date(y, m - 2, 1), 'yyyy-MM')); } }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <div className="text-center">
                              <h4 className="text-sm font-black text-slate-900 uppercase leading-none">Chọn ngày</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{filterMonth}</p>
                          </div>
                          <button onClick={() => { if (setFilterMonth) { const [y, m] = filterMonth.split('-').map(Number); setFilterMonth(format(new Date(y, m, 1), 'yyyy-MM')); } }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                      </div>
                      <button onClick={() => setShowDatePickerGrid(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                      {['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map(d => (
                          <div key={d} className="text-[8px] font-black text-slate-400 text-center py-2 uppercase tracking-tighter">{d}</div>
                      ))}
                      {(() => {
                          const [y, m] = filterMonth.split('-').map(Number);
                          const firstDay = new Date(y, m - 1, 1).getDay();
                          const lastDate = new Date(y, m, 0).getDate();
                          
                          const days = [];
                          for (let i = 0; i < firstDay; i++) {
                              days.push(<div key={`empty-${i}`} />);
                          }
                          for (let d = 1; d <= lastDate; d++) {
                              const dateStr = `${filterMonth}-${d.toString().padStart(2, '0')}`;
                              const isActive = historyDay === dateStr;
                              days.push(
                                  <button
                                      key={d}
                                      onClick={() => {
                                          setHistoryDay(dateStr);
                                          setHistoryEmployee(null);
                                          setShowDatePickerGrid(false);
                                      }}
                                      className={`aspect-square flex items-center justify-center text-xs font-black rounded-full transition-all active:scale-90 ${
                                          isActive ? `${adminTheme.accent} text-white shadow-lg ${adminTheme.shadow}` : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                  >
                                      {d}
                                  </button>
                              );
                          }
                          return days;
                      })()}
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                      <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              handlePrevMonth();
                          }} 
                          className="flex-1 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 flex items-center justify-center gap-2 active:bg-slate-50 transition-all"
                      >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Tháng trước
                      </button>
                      <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              handleNextMonth();
                          }} 
                          className="flex-1 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 flex items-center justify-center gap-2 active:bg-slate-50 transition-all"
                      >
                          Tháng sau
                          <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Optimized DESKTOP Navigation */}
      <div className="hidden md:block bg-white p-2 md:p-0 md:bg-transparent space-y-2 mb-2 animate-in fade-in slide-in-from-top-2 shadow-sm md:shadow-none">
        <div className="hidden md:flex flex-wrap items-center gap-2 mb-6">
          {historyDay && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl text-xs font-black uppercase tracking-wider border border-blue-100 flex items-center gap-2 animate-in slide-in-from-left-2 transition-all">
              <Calendar className="w-4 h-4" />
              LỊCH SỬ NGÀY: {historyDay}
            </div>
          )}
        </div>

        {/* Mobile Specific View Controls */}
        <div className="md:hidden">
          {mobileHistoryMode === 'employee' ? (
            <div className="px-2 -mt-1 mb-2">
              <select
                value={historyEmployee?.id || ''}
                onChange={(e) => {
                  const emp = nhanViens.find(nv => nv.id === e.target.value);
                  if (emp) {
                    setHistoryEmployee(emp);
                    setHistoryDay(null);
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-[12px] font-black text-slate-800 shadow-sm transition-all uppercase tracking-tight"
              >
                <option value="">DANH SÁCH NHÂN VIÊN</option>
                {nhanViens.filter(nv => filterBranch === 'All' || nv.locationId === filterBranch || (nv.locationIds && nv.locationIds.includes(filterBranch)) || filteredChamCongs.some(cc => cc.empId === nv.id || cc.empId === nv.empId)).sort((a,b) => a.fullName.localeCompare(b.fullName)).map(nv => (
                  <option key={nv.id} value={nv.id}>{nv.fullName.toUpperCase()}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden md:block">
        {(!historyDay && !historyEmployee) && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <MonthlyAttendanceTable 
              nhanViens={nhanViens} 
              attendanceData={filteredChamCongs}
              filterMonth={filterMonth} 
              filterBranch={filterBranch} 
              adminTheme={adminTheme} 
              onDayClick={(day) => {
                setHistoryDay(day);
                setHistoryEmployee(null);
                setMobileHistoryMode('day');
              }}
              onEmployeeClick={(emp) => {
                setHistoryEmployee(emp);
                setHistoryDay(null);
                setMobileHistoryMode('employee');
              }}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const defaultMobileDay = filterMonth === format(new Date(), 'yyyy-MM') ? todayStr : `${filterMonth}-01`;
        const effectiveHistoryDay = historyDay || defaultMobileDay;
        
        return (!historyEmployee) ? (
        <div className={`animate-in fade-in slide-in-from-bottom-2 space-y-4 ${!historyDay ? 'block md:hidden' : ''}`}>
          {(() => {
            const dayLogs = filteredChamCongs.filter(cc => cc.date === effectiveHistoryDay);
            const sortedLogs = [...dayLogs].sort((a, b) => {
              const nameA = getEmployeeForLog(a).fullName || '';
              const nameB = getEmployeeForLog(b).fullName || '';
              return nameA.localeCompare(nameB);
            });

            const totalLate = dayLogs.reduce((sum, log) => sum + getLateMinutes(log, isSubjectAdmin(log.empId || '')), 0);
            const totalPenalty = dayLogs.reduce((sum, log) => {
              const emp = getEmployeeForLog(log);
              const penaltyMins = getLatePenaltyMinutes(log, isSubjectAdmin(log.empId || ''), filteredChamCongs.filter(c => c.empId === log.empId));
              const penalty = penaltyMins > 0 ? roundToUnit(penaltyMins * ((emp?.hourlyRate || 0) / 60)) : 0;
              return sum + penalty;
            }, 0);
            const totalHours = dayLogs.filter(log => log.status !== 'pending_approval').reduce((sum, log) => sum + getTotalHours(log), 0);
            const pendingHours = dayLogs.filter(log => log.status === 'pending_approval').reduce((sum, log) => sum + getTotalHours(log), 0);

            return (
              <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative max-w-[1200px] mx-auto attendance-interactive ${!historyDay ? 'hidden md:block' : ''}`}>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar overflow-y-visible">
                  <table 
                    className="w-full text-left border-collapse table-fixed" 
                    style={{ width: `${TABLE_COL_WIDTHS.NAME + (TABLE_COL_WIDTHS.GIO * 2) + (isAdminOrSuperAdmin ? TABLE_COL_WIDTHS.PHOTO : 0) + TABLE_COL_WIDTHS.SD_DT + TABLE_COL_WIDTHS.PHAT_DT + TABLE_COL_WIDTHS.DI_TRE + TABLE_COL_WIDTHS.PHAT_TRE + TABLE_COL_WIDTHS.GIO_CONG + TABLE_COL_WIDTHS.ACTIONS}px` }}
                  >
                    <thead className="sticky top-0 z-[60]">
                      <tr className="bg-[#8B4513] shadow-md">
                        <th colSpan={isAdminOrSuperAdmin ? 4 : 3} className="p-[8px_16px] bg-[#8B4513] sticky left-0 z-30 border-r border-white/10">
                          <span className="font-black text-amber-50 text-[12px] uppercase truncate leading-none tracking-wider">
                            {safeFormat(effectiveHistoryDay, 'dd/MM/yyyy')}
                          </span>
                        </th>
                        <th className="p-[8px_12px] text-center border-l border-white/10">
                          <span className="text-[14px] font-black text-white tabular-nums">{formatMinutes(totalLate)}</span>
                        </th>
                        <th className="p-[8px_12px] text-center border-l border-white/10">
                          <span className="text-[14px] font-black text-white tabular-nums">{formatCurrency(totalPenalty)}</span>
                        </th>
                        <th className="p-[8px_12px] text-center border-l-2 border-emerald-400 bg-[#723a10]">
                           <div className="relative inline-block">
                             <span className="text-[15px] font-black text-emerald-300 tracking-tighter tabular-nums">{totalHours.toFixed(2)}</span>
                             {pendingHours > 0 && (
                               <div className="absolute -top-1.5 -right-3.5 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[7px] font-black border border-white shadow-sm" title={`Chưa duyệt: ${pendingHours.toFixed(2)}h`}>!</div>
                             )}
                           </div>
                        </th>
                        <th className="p-[8px_12px] bg-[#8B4513]"></th>
                      </tr>
                      <tr className="bg-slate-50 border-y border-[#e0e0e0]">
                        <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 sticky left-0 bg-slate-50 z-20" style={{ width: `${TABLE_COL_WIDTHS.NAME}px` }}>Nhân viên</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>Giờ vào</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>Giờ ra</th>
                        {isAdminOrSuperAdmin && (
                          <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 text-center" style={{ width: `${TABLE_COL_WIDTHS.PHOTO}px` }}>Ảnh xác thực</th>
                        )}
                        <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 text-center" style={{ width: `${TABLE_COL_WIDTHS.DI_TRE}px` }}>Đi trễ</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 text-center" style={{ width: `${TABLE_COL_WIDTHS.PHAT_TRE}px` }}>Phạt trễ</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 text-center text-slate-600" style={{ width: `${TABLE_COL_WIDTHS.GIO_CONG}px` }}>Giờ công</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] text-[10px] uppercase font-black text-slate-500 text-right" style={{ width: `${TABLE_COL_WIDTHS.ACTIONS}px` }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {sortedLogs.map((log, index) => {
                        const employee = getEmployeeForLog(log);
                        const canDelete = currentAdmin?.role === 'SuperAdmin' || (log.createdByAdminId && log.createdByAdminId === currentAdmin?.id);
                        const canEdit = ['SuperAdmin', 'BranchAdmin'].includes(currentAdmin?.role);
                        const showEmployeeName = index === 0 || sortedLogs[index - 1].empId !== log.empId;

                        return (
                          <tr key={log.id} className={`hover:bg-yellow-50 transition-colors even:bg-[#fdfcfb] ${log.status === 'pending_approval' ? 'bg-amber-50/30' : ''}`}>
                            <td 
                              className={`border border-[#e0e0e0] p-[8px_12px] text-[11px] font-bold sticky left-0 bg-inherit z-10`}
                              style={{ width: `${TABLE_COL_WIDTHS.NAME}px` }}
                            >
                              {showEmployeeName && (
                                <>
                                  <span className="text-slate-700 block text-xs truncate" title={employee?.fullName}>
                                    {employee?.fullName || 'Không rõ'}
                                  </span>
                                  {log.status === 'pending_approval' && (
                                    <span className="block text-[8px] font-black text-amber-600 uppercase mt-0.5 tracking-tighter">Chờ duyệt</span>
                                  )}
                                  {log.isAbandonedShift && (
                                    <span className="block text-[8px] font-black text-rose-600 uppercase mt-0.5 tracking-tighter">Bỏ ca</span>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="border border-[#e0e0e0] p-[6px_8px] text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>
                              <div className={`px-2 py-1.5 rounded-lg text-xs tabular-nums font-mono font-bold border ${getTimeStyle(log.checkInTime, log.date)}`}>
                                {log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '00:00', log.date) : '00:00'}
                              </div>
                            </td>
                            <td className="border border-[#e0e0e0] p-[6px_8px] text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>
                              <div className={`px-2 py-1.5 rounded-lg text-xs tabular-nums font-mono font-bold border ${getTimeStyle(log.checkOutTime, log.date)}`}>
                                {log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '00:00', log.date) : '00:00'}
                              </div>
                            </td>
                            {isAdminOrSuperAdmin && (
                              <td className="border border-[#e0e0e0] p-[6px_8px] text-center" style={{ width: `${TABLE_COL_WIDTHS.PHOTO}px` }}>
                                <div className="flex items-center justify-center gap-1.5">
                                  {(log.photoCheckIn || log.AnhVaoCa) ? (
                                    <button 
                                      onClick={() => setPreviewPhoto({
                                        url: log.photoCheckIn || log.AnhVaoCa!,
                                        employeeName: employee?.fullName || 'Không rõ',
                                        time: `Vào ca: ${log.checkInTime || '-'}`,
                                        location: log.locationId,
                                        gps: log.gpsIn
                                      })}
                                      className="relative group cursor-pointer active:scale-95 transition-all shadow-sm rounded-full overflow-hidden border border-slate-200 bg-white"
                                    >
                                      <img 
                                        src={log.photoCheckIn || log.AnhVaoCa!} 
                                        className="w-8 h-8 object-cover group-hover:scale-110 transition-transform duration-300 rounded-full"
                                        alt="In"
                                      />
                                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 flex items-center justify-center transition-all">
                                        <ImageIcon className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center" title="Không có ảnh vào">
                                      <ImageIcon className="w-3 h-3 text-slate-300" />
                                    </div>
                                  )}

                                  {(log.photoCheckOut || log.AnhRaCa) ? (
                                    <button 
                                      onClick={() => setPreviewPhoto({
                                        url: log.photoCheckOut || log.AnhRaCa!,
                                        employeeName: employee?.fullName || 'Không rõ',
                                        time: `Ra ca: ${log.checkOutTime || '-'}`,
                                        location: log.locationId,
                                        gps: log.gpsOut
                                      })}
                                      className="relative group cursor-pointer active:scale-95 transition-all shadow-sm rounded-full overflow-hidden border border-slate-200 bg-white"
                                    >
                                      <img 
                                        src={log.photoCheckOut || log.AnhRaCa!} 
                                        className="w-8 h-8 object-cover group-hover:scale-110 transition-transform duration-300 rounded-full"
                                        alt="Out"
                                      />
                                      <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/20 flex items-center justify-center transition-all">
                                        <ImageIcon className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center" title="Không có ảnh ra">
                                      <ImageIcon className="w-3 h-3 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-xs text-center font-mono" style={{ width: `${TABLE_COL_WIDTHS.DI_TRE}px` }}>
                              {getLateMinutes(log, isSubjectAdmin(log.empId || '')) > 0 ? (
                                <span className="text-rose-600 font-bold tabular-nums">
                                  {formatMinutes(getLateMinutes(log, isSubjectAdmin(log.empId || '')))}
                                </span>
                              ) : (
                                <span className="text-slate-200">-</span>
                              )}
                            </td>
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-xs text-center font-mono" style={{ width: `${TABLE_COL_WIDTHS.PHAT_TRE}px` }}>
                              {getLatePenaltyMinutes(log, isSubjectAdmin(log.empId || ''), filteredChamCongs.filter(c => c.empId === log.empId)) > 0 ? (
                                <span className="text-rose-600 font-bold tabular-nums">
                                  {formatCurrency(roundToUnit(getLatePenaltyMinutes(log, isSubjectAdmin(log.empId || ''), filteredChamCongs.filter(c => c.empId === log.empId)) * ((employee?.hourlyRate || 0) / 60)))}
                                </span>
                              ) : (
                                <span className="text-slate-200">-</span>
                              )}
                            </td>
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-center text-sm font-black tabular-nums text-emerald-700" style={{ width: `${TABLE_COL_WIDTHS.GIO_CONG}px` }}>
                              {getTotalHours(log) > 0 ? formatDecimalHours(getTotalHours(log)) : '0p'}
                            </td>
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-right" style={{ width: `${TABLE_COL_WIDTHS.ACTIONS}px` }}>
                              <div className="flex justify-end gap-1">
                                {log.status === 'pending_approval' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleApproveAttendance(log); }}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canEdit && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingAttendance({
                                          ...log,
                                          totalHours: log.totalHours,
                                          lateMinutes: log.lateMinutes,
                                          checkInTime: log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '', log.date) : '',
                                          checkOutTime: log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '', log.date) : ''
                                        });
                                        setShowEditAttendanceModal(true);
                                      }}
                                      className="p-1 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-sky-100"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(log); }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {dayLogs.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400 italic">Không có dữ liệu trong ngày này.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-8 px-3">
            {(() => {
              const dayLogs = filteredChamCongs.filter(cc => cc.date === effectiveHistoryDay);
              
              const sortedLogs = [...dayLogs].sort((a, b) => {
                const nameA = getEmployeeForLog(a).fullName || '';
                const nameB = getEmployeeForLog(b).fullName || '';
                return nameA.localeCompare(nameB);
              });
              
              const approvedHrs = dayLogs.filter(log => log.status !== 'pending_approval').reduce((sum, log) => sum + getTotalHours(log), 0);
              const pendingHrs = dayLogs.filter(log => log.status === 'pending_approval').reduce((sum, log) => sum + getTotalHours(log), 0);
              const lateMins = dayLogs.reduce((sum, log) => sum + getLateMinutes(log, isSubjectAdmin(log.empId || '')), 0);
              const lateLogsCount = dayLogs.filter(log => getLateMinutes(log, isSubjectAdmin(log.empId || '')) > 0).length;
              const totalLatePenalty = dayLogs.reduce((sum, log) => {
                const employee = getEmployeeForLog(log);
                const hourlyRate = employee?.hourlyRate || 0;
                const penaltyMins = getLatePenaltyMinutes(log, isSubjectAdmin(log.empId || ''), filteredChamCongs.filter(c => c.empId === log.empId));
                const penalty = penaltyMins > 0 ? roundToUnit(penaltyMins * (hourlyRate / 60)) : 0;
                return sum + penalty;
              }, 0);

              const getShiftTypes = (log: any) => {
                const types = new Set<string>();
                if (!log.checkInTime) return ['Ca Khác'];
                const dIn = safeParseDate(log.checkInTime, log.date);
                if (!dIn) return ['Ca Khác'];
                
                const timeIn = dIn.getHours() + dIn.getMinutes() / 60;
                const dOut = log.checkOutTime ? safeParseDate(log.checkOutTime, log.date) : null;
                let timeOut = dOut ? (dOut.getHours() + dOut.getMinutes() / 60) : timeIn;
                
                // If check-out is before check-in, assume it's on the next day
                if (timeOut < timeIn && dOut) timeOut += 24;

                let baseHour = timeIn;
                if (log.scheduledStartTime) {
                   const [h, m] = log.scheduledStartTime.split(':').map(Number);
                   baseHour = h + m / 60;
                }

                // Base shift from check-in time / scheduled time
                if (baseHour >= 4 && baseHour < 11.5) types.add('Ca Sáng');
                else if (baseHour >= 11.5 && baseHour < 17) types.add('Ca Trưa');
                else types.add('Ca Tối');

                // Check overlap with Ca Trưa (12 to 17)
                const overlapTrua = Math.max(0, Math.min(timeOut, 17) - Math.max(timeIn, 12));
                if (overlapTrua >= 2) types.add('Ca Trưa');

                // Check overlap with Ca Tối (17 to 24)
                const overlapToi = Math.max(0, Math.min(timeOut, 24) - Math.max(timeIn, 17));
                if (overlapToi >= 2) types.add('Ca Tối');

                // Check overlap with next day's Ca Sáng (29 to 36)
                const overlapSangNext = Math.max(0, Math.min(timeOut, 36) - Math.max(timeIn, 29));
                if (overlapSangNext >= 2) types.add('Ca Sáng');

                return Array.from(types);
              };
              
              const shifts = {
                'Ca Sáng': dayLogs.filter(log => getShiftTypes(log).includes('Ca Sáng')),
                'Ca Trưa': dayLogs.filter(log => getShiftTypes(log).includes('Ca Trưa')),
                'Ca Tối': dayLogs.filter(log => getShiftTypes(log).includes('Ca Tối')),
                'Ca Khác': dayLogs.filter(log => getShiftTypes(log).includes('Ca Khác'))
              };
              if (dayLogs.length === 0) return (
                <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic">
                  Không có dữ liệu chấm công cho ngày này.
                </div>
              );
              return (
                <>
                  {/* Summary Row - Compact & Right-Aligned Total per Request 9 */}
                  <div className="bg-slate-100/90 px-2.5 py-2 rounded-xl border border-slate-200 mx-1 mb-3 flex flex-col gap-1 text-[9px] font-black shadow-sm animate-in fade-in slide-in-from-top-1">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                       {Object.entries(shifts).map(([shiftName, logs]) => {
                         if (logs.length === 0) return null;
                         const shortName = shiftName.replace('Ca ', '');
                         return (
                           <div key={shiftName} className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">
                             <span className="text-slate-500 uppercase">{shortName}:</span>
                             <span className="text-slate-900">{new Set(logs.map((l: any) => l.empId)).size} NV</span>
                           </div>
                         );
                       })}
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                       <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                             <span className="text-slate-400 uppercase tracking-tighter">Trễ:</span>
                             <span className="text-rose-600 tabular-nums">{lateLogsCount} lần</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                             <span className="text-slate-400 uppercase tracking-tighter">Phạt:</span>
                             <span className="text-rose-600 tabular-nums">{formatCurrency(totalLatePenalty)}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-1">
                          <span className="text-slate-500 uppercase tracking-tighter">Tổng giờ:</span>
                          <span className="text-[12px] text-slate-800 tabular-nums">{approvedHrs.toFixed(2)}h</span>
                          {pendingHrs > 0 && <span className="text-amber-500 text-[10px] font-bold">(+{pendingHrs.toFixed(2)})</span>}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {sortedLogs.map((log, logIdx) => {
                      const employee = getEmployeeForLog(log);
                      const canDelete = currentAdmin?.role === 'SuperAdmin' || (log.createdByAdminId && log.createdByAdminId === currentAdmin?.id);
                      const canEdit = ['SuperAdmin', 'BranchAdmin'].includes(currentAdmin?.role || '');
                      return (
                        <div key={log.id} className="attendance-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${logIdx * 50}ms` }}>
                          <div className="p-2.5">
                            <div className="flex justify-between items-center mb-2">
                              <div className="cursor-pointer" onClick={() => {
                                if (employee) {
                                  setHistoryEmployee(employee);
                                  setHistoryDay(null);
                                  setMobileHistoryMode('employee');
                                }
                              }}>
                                <h4 className={`font-black ${adminTheme.text} text-sm uppercase leading-tight`}>{employee?.fullName || 'Không rõ'}</h4>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {log.status === 'pending_approval' && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase tracking-wider">Chờ duyệt</span>}
                                  {log.isAbandonedShift && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black rounded uppercase tracking-wider">Bỏ</span>}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <span className={`text-sm font-black ${adminTheme.text} tabular-nums mb-1`}>{getTotalHours(log) > 0 ? getTotalHours(log).toFixed(2) : '---'} <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">Giờ</span></span>
                                <div className="flex items-center gap-1">
                                  {getLateMinutes(log, isSubjectAdmin(log.empId || '')) > 0 && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded">
                                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter">Trễ: {formatMinutes(getLateMinutes(log, isSubjectAdmin(log.empId || '')))}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between gap-1 p-1.5 bg-slate-50/80 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                <div className="flex items-center gap-2 border-r border-slate-200 pr-3 min-w-0">
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Vào</span>
                                  {inlineEditingLogId === log.id ? (
                                    <input type="time" value={inlineEditingCheckIn} onChange={(e) => setInlineEditingCheckIn(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-16 bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 text-xs font-bold text-slate-700 tabular-nums" />
                                  ) : (
                                    <span className="text-xs font-bold text-slate-700">{log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '--:--', log.date) : '--:--'}</span>
                                  )}
                                  {isAdminOrSuperAdmin && (log.photoCheckIn || log.AnhVaoCa) && (
                                    <button 
                                      onClick={() => setPreviewPhoto({
                                        url: log.photoCheckIn || log.AnhVaoCa!,
                                        employeeName: employee?.fullName || 'Không rõ',
                                        time: `Vào ca: ${log.checkInTime || '-'}`,
                                        location: log.locationId,
                                        gps: log.gpsIn
                                      })}
                                      className="active:scale-95 transition-all flex-shrink-0 ml-1"
                                    >
                                      <img src={log.photoCheckIn || log.AnhVaoCa!} className="w-6 h-6 rounded-full object-cover border border-slate-200 ring-2 ring-white" alt="In" />
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Ra</span>
                                  {inlineEditingLogId === log.id ? (
                                    <input type="time" value={inlineEditingCheckOut} onChange={(e) => setInlineEditingCheckOut(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-16 bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 text-xs font-bold text-slate-700 tabular-nums" />
                                  ) : (
                                    <span className="text-xs font-bold text-slate-700">{log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '--:--', log.date) : '--:--'}</span>
                                  )}
                                  {isAdminOrSuperAdmin && (log.photoCheckOut || log.AnhRaCa) && (
                                    <button 
                                      onClick={() => setPreviewPhoto({
                                        url: log.photoCheckOut || log.AnhRaCa!,
                                        employeeName: employee?.fullName || 'Không rõ',
                                        time: `Ra ca: ${log.checkOutTime || '-'}`,
                                        location: log.locationId,
                                        gps: log.gpsOut
                                      })}
                                      className="active:scale-95 transition-all flex-shrink-0 ml-1"
                                    >
                                      <img src={log.photoCheckOut || log.AnhRaCa!} className="w-6 h-6 rounded-full object-cover border border-slate-200 ring-2 ring-white" alt="Out" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-end gap-1 shrink-0">
                                {log.status === 'pending_approval' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleApproveAttendance(log); }}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                )}
                                {canEdit && (
                                  inlineEditingLogId === log.id ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSaveInlineEdit(log); }}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 flex items-center justify-center"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInlineEditingLogId(log.id);
                                        setInlineEditingCheckIn(log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '', log.date) : '');
                                        setInlineEditingCheckOut(log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '', log.date) : '');
                                      }}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )
                                )}
                                {canDelete && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(log); }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null; })()}

      {historyEmployee && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 px-1 md:px-3">
          {(() => {
            const logs = filteredChamCongs.filter(cc => (cc.empId === historyEmployee.id || cc.empId === historyEmployee.empId) && cc.date.startsWith(filterMonth));
            const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
            const approvedLogs = logs.filter(cc => cc.status !== 'pending_approval');
            const pendingLogs = logs.filter(cc => cc.status === 'pending_approval');
            const totalHours = approvedLogs.reduce((sum, cc) => sum + getTotalHours(cc), 0);
            const pendingHours = pendingLogs.reduce((sum, cc) => sum + getTotalHours(cc), 0);
            const totalLate = logs.reduce((sum, l) => sum + getLateMinutes(l), 0);
            const totalLateLogs = logs.filter(l => getLateMinutes(l) > 0).length;
            const totalPenalty = logs.reduce((sum, l) => {
              const penaltyMins = getLatePenaltyMinutes(l, isSubjectAdmin(l.empId || ''), logs);
              const penalty = penaltyMins > 0 ? roundToUnit(penaltyMins * ((historyEmployee.hourlyRate || 0) / 60)) : 0;
              return sum + penalty;
            }, 0);

            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative max-w-[1200px] mx-auto attendance-interactive">
                <div className="hidden md:block overflow-x-auto custom-scrollbar overflow-y-visible">
                  <table 
                    className="w-full text-left border-collapse border border-[#e0e0e0] table-fixed"
                    style={{ width: `${TABLE_COL_WIDTHS.NGAY + (TABLE_COL_WIDTHS.GIO * 2) + (isAdminOrSuperAdmin ? TABLE_COL_WIDTHS.PHOTO : 0) + TABLE_COL_WIDTHS.SD_DT + TABLE_COL_WIDTHS.PHAT_DT + TABLE_COL_WIDTHS.DI_TRE + TABLE_COL_WIDTHS.PHAT_TRE + TABLE_COL_WIDTHS.GIO_CONG + TABLE_COL_WIDTHS.ACTIONS}px` }}
                  >
                    <thead className="sticky top-0 z-[60]">
                       <tr className="bg-[#8B4513] shadow-md">
                        <th colSpan={isAdminOrSuperAdmin ? 4 : 3} className="p-[8px_16px] bg-[#8B4513] sticky left-0 z-30 border-r border-white/10">
                          <span className="font-black text-amber-50 text-[12px] uppercase truncate leading-none tracking-wider">
                            {historyEmployee.fullName}
                          </span>
                        </th>
                        <th className="p-[8px_12px] text-center border-l border-white/10">
                          <span className="text-[14px] font-black text-white tabular-nums">{formatMinutes(totalLate)}</span>
                        </th>
                        <th className="p-[8px_12px] text-center border-l border-white/10">
                          <span className="text-[14px] font-black text-white tabular-nums">{formatCurrency(totalPenalty)}</span>
                        </th>
                        <th className="p-[8px_12px] text-center border-l-2 border-emerald-400 bg-[#723a10]">
                           <div className="relative inline-block">
                             <span className="text-[15px] font-black text-emerald-300 tracking-tighter tabular-nums">{totalHours.toFixed(2)}</span>
                             {pendingHours > 0 && (
                               <div className="absolute -top-1.5 -right-3.5 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[7px] font-black border border-white shadow-sm">!</div>
                             )}
                           </div>
                        </th>
                        <th className="p-[8px_12px] bg-[#8B4513]"></th>
                      </tr>
                      <tr className="bg-white border-b border-[#e0e0e0] text-[9px] uppercase tracking-widest text-slate-400">
                        <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-center" style={{ width: `${TABLE_COL_WIDTHS.NGAY}px` }}>Ngày</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>Giờ vào</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>Giờ ra</th>
                        {isAdminOrSuperAdmin && (
                          <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-center" style={{ width: `${TABLE_COL_WIDTHS.PHOTO}px` }}>Ảnh</th>
                        )}
                        <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-center" style={{ width: `${TABLE_COL_WIDTHS.DI_TRE}px` }}>Đi trễ</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-center" style={{ width: `${TABLE_COL_WIDTHS.PHAT_TRE}px` }}>Phạt trễ</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-center text-slate-600" style={{ width: `${TABLE_COL_WIDTHS.GIO_CONG}px` }}>Giờ công</th>
                        <th className="border border-[#e0e0e0] p-[8px_12px] font-black text-right text-slate-600" style={{ width: `${TABLE_COL_WIDTHS.ACTIONS}px` }}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {sortedLogs.map((log: any, index: number) => {
                        const showDate = index === 0 || sortedLogs[index - 1].date !== log.date;
                        const canDelete = currentAdmin?.role === 'SuperAdmin' || (log.createdByAdminId && log.createdByAdminId === currentAdmin?.id);
                        const canEdit = ['SuperAdmin', 'BranchAdmin'].includes(currentAdmin?.role || '');
                        
                        return (
                          <tr key={log.id} className="hover:bg-yellow-50 transition-colors even:bg-[#fdfcfb] h-auto text-[11px]">
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-slate-900 font-bold text-center" style={{ width: `${TABLE_COL_WIDTHS.NGAY}px` }}>
                              {showDate ? safeFormat(log.date, 'dd/MM') : ''}
                            </td>
                            <td className="border border-[#e0e0e0] p-[6px_8px] text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>
                              <div className={`px-2 py-1.5 rounded-lg text-xs tabular-nums font-mono font-bold border ${getTimeStyle(log.checkInTime, log.date)}`}>
                                {log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '00:00', log.date) : '00:00'}
                              </div>
                            </td>
                            <td className="border border-[#e0e0e0] p-[6px_8px] text-center" style={{ width: `${TABLE_COL_WIDTHS.GIO}px` }}>
                              <div className={`px-2 py-1.5 rounded-lg text-xs tabular-nums font-mono font-bold border ${getTimeStyle(log.checkOutTime, log.date)}`}>
                                {log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '00:00', log.date) : '00:00'}
                              </div>
                            </td>
                            {isAdminOrSuperAdmin && (
                              <td className="border border-[#e0e0e0] p-[6px_8px] text-center" style={{ width: `${TABLE_COL_WIDTHS.PHOTO}px` }}>
                                <div className="flex items-center justify-center gap-1.5">
                                  {(log.photoCheckIn || log.AnhVaoCa) ? (
                                    <button 
                                      onClick={() => setPreviewPhoto({
                                        url: log.photoCheckIn || log.AnhVaoCa!,
                                        employeeName: historyEmployee.fullName,
                                        time: `Vào ca: ${log.checkInTime || '-'}`,
                                        location: log.locationId,
                                        gps: log.gpsIn
                                      })}
                                      className="relative group cursor-pointer active:scale-95 transition-all shadow-sm rounded-lg overflow-hidden border border-slate-200 bg-white"
                                    >
                                      <img 
                                        src={log.photoCheckIn || log.AnhVaoCa!} 
                                        className="w-8 h-8 object-cover group-hover:scale-110 transition-transform duration-300"
                                        alt="In"
                                      />
                                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 flex items-center justify-center transition-all">
                                        <ImageIcon className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center" title="Không có ảnh vào">
                                      <ImageIcon className="w-3 h-3 text-slate-200" />
                                    </div>
                                  )}

                                  {(log.photoCheckOut || log.AnhRaCa) ? (
                                    <button 
                                      onClick={() => setPreviewPhoto({
                                        url: log.photoCheckOut || log.AnhRaCa!,
                                        employeeName: historyEmployee.fullName,
                                        time: `Ra ca: ${log.checkOutTime || '-'}`,
                                        location: log.locationId,
                                        gps: log.gpsOut
                                      })}
                                      className="relative group cursor-pointer active:scale-95 transition-all shadow-sm rounded-lg overflow-hidden border border-slate-200 bg-white"
                                    >
                                      <img 
                                        src={log.photoCheckOut || log.AnhRaCa!} 
                                        className="w-8 h-8 object-cover group-hover:scale-110 transition-transform duration-300"
                                        alt="Out"
                                      />
                                      <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/20 flex items-center justify-center transition-all">
                                        <ImageIcon className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center" title="Không có ảnh ra">
                                      <ImageIcon className="w-3 h-3 text-slate-200" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-center" style={{ width: `${TABLE_COL_WIDTHS.DI_TRE}px` }}>
                              {getLateMinutes(log, isSubjectAdmin(log.empId || '')) > 0 ? (
                                <span className="text-rose-600 font-bold font-mono whitespace-nowrap tabular-nums">
                                  {formatMinutes(getLateMinutes(log, isSubjectAdmin(log.empId || '')))}
                                </span>
                              ) : (
                                <span className="text-slate-200 font-mono">-</span>
                              )}
                            </td>
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-center font-mono" style={{ width: `${TABLE_COL_WIDTHS.PHAT_TRE}px` }}>
                              {getLatePenaltyMinutes(log, isSubjectAdmin(log.empId || ''), logs) > 0 ? (
                                <span className="text-rose-600 font-bold tabular-nums">
                                  {formatCurrency(roundToUnit(getLatePenaltyMinutes(log, isSubjectAdmin(log.empId || ''), logs) * ((historyEmployee.hourlyRate || 0) / 60)))}
                                </span>
                              ) : (
                                <span className="text-slate-200 font-light">-</span>
                              )}
                            </td>
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-center text-sm font-black tabular-nums text-emerald-700" style={{ width: `${TABLE_COL_WIDTHS.GIO_CONG}px` }}>
                              {getTotalHours(log) > 0 ? formatDecimalHours(getTotalHours(log)) : '0p'}
                            </td>
                            <td className="border border-[#e0e0e0] p-[8px_12px] text-right" style={{ width: `${TABLE_COL_WIDTHS.ACTIONS}px` }}>
                              <div className="flex justify-end gap-1">
                                {log.status === 'pending_approval' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleApproveAttendance(log); }}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canEdit && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingAttendance({
                                          ...log,
                                          totalHours: log.totalHours,
                                          lateMinutes: log.lateMinutes,
                                          checkInTime: log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '', log.date) : '',
                                          checkOutTime: log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '', log.date) : ''
                                        });
                                        setShowEditAttendanceModal(true);
                                      }}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(log); }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View - Grouped by Date */}
                <div className="md:hidden space-y-3 pb-8 px-1">
                  {(() => {
                    if (sortedLogs.length === 0) return (
                      <div className="p-8 text-center text-slate-400 italic">Không có dữ liệu chấm công.</div>
                    );

                    return (
                      <>
                        {/* Summary Row - Compact & Right-Aligned Total per Request 9 */}
                        <div className="bg-slate-100/90 px-2.5 py-1.5 rounded-xl border border-slate-200 mx-1 mb-3 flex flex-col gap-1 text-[9px] font-black shadow-sm animate-in fade-in slide-in-from-top-1">
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 min-w-0">
                             <div className="flex items-center gap-0.5">
                                <span className="text-slate-400 uppercase tracking-tighter">Trễ:</span>
                                <span className="text-rose-600 tabular-nums">{totalLateLogs} lần</span>
                             </div>
                             <div className="flex items-center gap-0.5">
                                <span className="text-slate-400 uppercase tracking-tighter">Phạt trễ:</span>
                                <span className="text-rose-600 tabular-nums">{formatCurrency(totalPenalty)}</span>
                             </div>
                          </div>
                          <div className="flex justify-end items-center gap-1 pt-1 border-t border-slate-200/50">
                             <span className="text-slate-500 uppercase tracking-tighter">Tổng giờ công:</span>
                             <span className="text-[12px] text-slate-800 tabular-nums">{totalHours.toFixed(2)}h</span>
                             {pendingHours > 0 && <span className="text-amber-500 text-[10px] font-bold">(+{pendingHours.toFixed(2)})</span>}
                          </div>
                        </div>

                        {(() => {
                          const groupedLogs: { [date: string]: any[] } = {};
                          sortedLogs.forEach(log => {
                            if (!groupedLogs[log.date]) groupedLogs[log.date] = [];
                            groupedLogs[log.date].push(log);
                          });

                          return Object.entries(groupedLogs).sort((a,b) => b[0].localeCompare(a[0])).map(([dateValue, logsInDay]) => {
                            const dayTotalHours = logsInDay.reduce((sum, l) => sum + (l.totalHours || 0), 0);
                            const dateObj = safeParseDate(dateValue);
                            const fullDayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                            const dayLabel = fullDayNames[dateObj.getDay()];
                            const shortDate = format(dateObj, 'dd/MM');

                            return (
                              <div key={dateValue} className="mx-1 attendance-card bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <div className="px-2 py-1.5 bg-slate-50/80 flex justify-between items-center border-b border-slate-100">
                                  <span className="text-[9px] font-black text-slate-900 uppercase">{dayLabel}, {shortDate}</span>
                                  <span className={`text-[10px] font-black ${adminTheme.text}`}>{dayTotalHours.toFixed(2)}h</span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                  {logsInDay.map((log) => (
                                    <div key={log.id} className="p-1.5 space-y-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center justify-between gap-1 p-1 bg-slate-50/50 rounded-lg border border-slate-100">
                                      <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                        <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 min-w-0">
                                          <span className="text-[9px] text-slate-400 font-black uppercase">Vào</span>
                                          {inlineEditingLogId === log.id ? (
                                            <input type="time" value={inlineEditingCheckIn} onChange={(e) => setInlineEditingCheckIn(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-16 bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 text-[11px] font-black text-slate-700 tabular-nums leading-none" />
                                          ) : (
                                            <span className="text-[11px] font-black text-slate-700 whitespace-nowrap leading-none">{log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '--:--', log.date) : '--:--'}</span>
                                          )}
                                          {isAdminOrSuperAdmin && (log.photoCheckIn || log.AnhVaoCa) && (
                                            <button 
                                              onClick={() => setPreviewPhoto({
                                                url: log.photoCheckIn || log.AnhVaoCa!,
                                                employeeName: historyEmployee.fullName,
                                                time: `Vào ca: ${log.checkInTime || '-'}`,
                                                location: log.locationId,
                                                gps: log.gpsIn
                                              })}
                                              className="active:scale-95 transition-all flex-shrink-0 ml-0.5"
                                            >
                                              <img src={log.photoCheckIn || log.AnhVaoCa!} className="w-6 h-6 rounded-lg object-cover border border-slate-200 shadow-sm" alt="In" />
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="text-[9px] text-slate-400 font-black uppercase leading-none">Ra</span>
                                          {inlineEditingLogId === log.id ? (
                                            <input type="time" value={inlineEditingCheckOut} onChange={(e) => setInlineEditingCheckOut(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-16 bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 text-[11px] font-black text-slate-700 tabular-nums leading-none" />
                                          ) : (
                                            <span className="text-[11px] font-black text-slate-700 whitespace-nowrap leading-none">{log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '--:--', log.date) : '--:--'}</span>
                                          )}
                                          {isAdminOrSuperAdmin && (log.photoCheckOut || log.AnhRaCa) && (
                                            <button 
                                              onClick={() => setPreviewPhoto({
                                                url: log.photoCheckOut || log.AnhRaCa!,
                                                employeeName: historyEmployee.fullName,
                                                time: `Ra ca: ${log.checkOutTime || '-'}`,
                                                location: log.locationId,
                                                gps: log.gpsOut
                                              })}
                                              className="active:scale-95 transition-all flex-shrink-0 ml-0.5"
                                            >
                                              <img src={log.photoCheckOut || log.AnhRaCa!} className="w-6 h-6 rounded-lg object-cover border border-slate-200 shadow-sm" alt="Out" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <span className={`text-[11px] font-black ${adminTheme.text} whitespace-nowrap bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100`}>{getTotalHours(log) > 0 ? getTotalHours(log).toFixed(2) : '---'}h</span>
                                    </div>
                                      <div className="flex flex-wrap items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-100/50">
                                        <div className="flex items-center gap-1">
                                          {getLateMinutes(log, isSubjectAdmin(log.empId || '')) > 0 && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[8px] font-black rounded-full border border-orange-100">TRỄ: {formatMinutes(getLateMinutes(log, isSubjectAdmin(log.empId || '')))}</span>}
                                        </div>
                                        <div className="flex justify-end gap-1">
                                          {log.status === 'pending_approval' && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleApproveAttendance(log); }}
                                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors border border-emerald-100"
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {['SuperAdmin', 'BranchAdmin'].includes(currentAdmin?.role || '') && (
                                            inlineEditingLogId === log.id ? (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleSaveInlineEdit(log); }}
                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors border border-emerald-100 flex items-center justify-center"
                                              >
                                                <Save className="w-3.5 h-3.5" />
                                              </button>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setInlineEditingLogId(log.id);
                                                  setInlineEditingCheckIn(log.checkInTime ? safeFormat(log.checkInTime, 'HH:mm', '', log.date) : '');
                                                  setInlineEditingCheckOut(log.checkOutTime ? safeFormat(log.checkOutTime, 'HH:mm', '', log.date) : '');
                                                }}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors border border-blue-100"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                            )
                                          )}
                                          {(currentAdmin?.role === 'SuperAdmin' || (log.createdByAdminId && log.createdByAdminId === currentAdmin?.id)) && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(log); }}
                                                className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors border border-rose-100"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
