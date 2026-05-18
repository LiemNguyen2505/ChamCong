import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Users, Calendar, Banknote, Wallet, Settings2, MoreVertical, Save, RefreshCw, Undo2, Info, ChevronRight, FileText, Smartphone, Clock, X, Edit2, Trash2, StickyNote, SmartphoneNfc } from 'lucide-react';

const PenaltyPopover = ({ 
  label, 
  amount, 
  rawAmount, 
  quantityLabel, 
  quantityValue, 
  rawQuantityValue,
  onAmountChange, 
  onQuantityChange,
  onReset,
  unitRate,
  isEdited: isEditedProp,
  textColor,
  id
}: { 
  label: string; 
  amount: number; 
  rawAmount: number; 
  quantityLabel: string; 
  quantityValue: number; 
  rawQuantityValue: number;
  onAmountChange: (val: number) => void;
  onQuantityChange: (val: number) => void;
  onReset: () => void;
  unitRate?: number;
  isEdited?: boolean;
  textColor?: string;
  id: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isEdited = isEditedProp;
  
  return (
    <div className="relative inline-flex items-center gap-1 group/penalty">
      <div className="flex flex-col items-end">
        <span className={`text-[13px] font-bold tabular-nums ${isEdited ? 'text-amber-700' : (textColor || 'text-slate-700')}`}>
          {new Intl.NumberFormat('vi-VN').format(amount)}
        </span>
        <span className="text-[10px] text-slate-400 tabular-nums">({rawQuantityValue})</span>
      </div>

      <button 
        id={id}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-0.5 rounded-full transition-all ml-0.5 opacity-0 group-hover/penalty:opacity-100 ${isEdited ? 'text-amber-500 bg-amber-50 opacity-100' : 'text-slate-300 hover:text-sky-600 hover:bg-sky-50'}`}
      >
        <Info className="w-2.5 h-2.5" />
      </button>

      <PopoverPortal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorId={id}
        position="top"
        className="w-64"
      >
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-[11px] font-black text-rose-600 uppercase tracking-widest leading-none">{label}</h4>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-2">Hệ thống (Bảng chấm công)</div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">{rawQuantityValue} {quantityLabel}</span>
              <span className="text-sm font-bold text-slate-500">{new Intl.NumberFormat('vi-VN').format(rawAmount)}đ</span>
            </div>
          </div>

          <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
            <div className="text-[9px] font-black text-sky-500 uppercase mb-2">Quản lý điều chỉnh</div>
            <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-bold text-sky-700">{quantityLabel}:</span>
               <input 
                  type="number"
                  autoFocus
                  value={quantityValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    onQuantityChange(val);
                  }}
                  className="w-28 p-1.5 bg-white border border-sky-200 rounded text-sm font-bold text-sky-900 text-center outline-none focus:border-sky-400 transition-all font-mono"
               />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700">Tiền phạt:</span>
              <input 
                type="text"
                value={new Intl.NumberFormat('vi-VN').format(amount)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                  onAmountChange(val);
                }}
                className="w-28 p-1.5 bg-white border border-sky-200 rounded text-sm font-bold text-rose-600 text-center outline-none focus:border-sky-400 transition-all font-mono"
              />
            </div>
          </div>
          
          <button 
            onClick={() => { onReset(); setIsOpen(false); }}
            className="w-full mt-2 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
          >
            <Undo2 className="w-3.5 h-3.5" /> Khôi phục dữ liệu gốc
          </button>
        </div>
        <div className="absolute top-full right-4 border-8 border-transparent border-t-white" />
      </PopoverPortal>
    </div>
  );
};
import { format, parseISO } from 'date-fns';

const FieldNote = ({ 
  value, 
  onChange, 
  placeholder = "Nhập ghi chú..." 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const id = useMemo(() => 'field-note-' + Math.random().toString(36).substr(2, 9), []);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  return (
    <div className="relative inline-flex items-center ml-1">
      <button 
        id={id}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-0.5 rounded-full transition-colors ${value ? 'text-sky-600 bg-sky-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
        title={value || "Thêm ghi chú"}
      >
        <StickyNote className="w-3 h-3" />
      </button>

      <PopoverPortal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorId={id}
        position="top"
        className="w-48 p-2"
      >
        <textarea
          autoFocus
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            onChange(localValue);
            setIsOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onChange(localValue);
              setIsOpen(false);
            }
          }}
          className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:ring-1 focus:ring-sky-500 min-h-[60px]"
          placeholder={placeholder}
        />
        <div className="absolute top-full right-2 border-4 border-transparent border-t-white" />
      </PopoverPortal>
    </div>
  );
};

const PopoverPortal = ({ isOpen, onClose, anchorId, align = 'right', position = 'bottom', className = '', children }: any) => {
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, right: 0, width: 0 });

  useEffect(() => {
    const updateCoords = () => {
      if (isOpen) {
        const anchor = document.getElementById(anchorId);
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          setCoords({
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: window.innerWidth - rect.right,
            width: rect.width
          });
        }
      }
    };
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, anchorId]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[110]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : -5 }}
        style={{
          position: 'fixed',
          ...(position === 'bottom' ? { top: coords.bottom + 4 } : { top: coords.top - 8, transform: 'translateY(-100%)' }),
          ...(align === 'right' ? { right: coords.right } : { left: coords.left }),
          zIndex: 120
        }}
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 p-4 text-left ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </>,
    document.body
  );
};

export const PayrollComponent: React.FC<any> = ({
    nhanViens, filterMonth, setFilterMonth, payrollActiveBranch, calculateEmployeeSalaryStats,
    formatCurrency, localAdjustments, isSavingPayroll, handleSavePayroll, handleUndoPayroll,
    undoStack, BranchTabs, showMobileUtilities, setShowMobileUtilities, setShowHolidayConfig,
    setShowMaterialLossModal, setShowFinancialModal, showOtherDeductionsModal, setShowOtherDeductionsModal,
    showColumnConfig, setShowColumnConfig,
    visibleColumns, setVisibleColumns, columnWidths, handleResize, payrollAdjustments,
    setSelectedEmployeeForSalaryDetails, isSalaryDetailOpen,
    payrollTheme,
    handlePayrollChange, showDeductionDetails, setShowDeductionDetails,
    handlePrevMonth, handleNextMonth, formatDecimalHours,
    activeTab, currentAdmin, onEmployeeClick, checkEmployeeReview,
    isLoading
}) => {
    const isAdminSuper = currentAdmin?.role === 'SuperAdmin';
    // Add Cmd+S / Ctrl+S shortcut
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (Object.keys(localAdjustments).length > 0 && !isSavingPayroll) {
                    handleSavePayroll();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [localAdjustments, isSavingPayroll, handleSavePayroll]);

    const branchEmployees = useMemo(() => nhanViens.filter((emp: any) => 
        payrollActiveBranch === 'All' || 
        emp.locationId === payrollActiveBranch || 
        (Array.isArray(emp.locationIds) && emp.locationIds.includes(payrollActiveBranch))
    ), [nhanViens, payrollActiveBranch]);
    
    const roleOrders: Record<string, number> = {
      'QUẢN LÝ': 1,
      'QUẦY': 2,
      'PHA CHẾ': 2,
      'PV': 3,
      'PHỤC VỤ': 3,
      'TẠP VỤ': 4,
    };

    const groupedData = useMemo(() => {
      const employeesWithStats = branchEmployees.map((emp: any) => {
        const stats = calculateEmployeeSalaryStats(emp, filterMonth);
        const adjustment = payrollAdjustments.find((a: any) => (a.empId === emp.id || a.empId === emp.empId) && a.monthYear === filterMonth) || {};
        const localAdj = localAdjustments[emp.id] || {};
        const role = emp.defaultRole || 'PV';
        const roleGroup = role === 'PHA CHẾ' ? 'QUẦY' : (role === 'PHỤC VỤ' ? 'PV' : role);
        return { emp, stats, adjustment, localAdj, roleGroup };
      });

      // Maintain order within group
      const grouped = employeesWithStats.reduce((acc: any, curr: any) => {
        if (!acc[curr.roleGroup]) acc[curr.roleGroup] = { emps: [], totalCost: 0 };
        acc[curr.roleGroup].emps.push(curr);
        acc[curr.roleGroup].totalCost += curr.stats.actualSalary;
        return acc;
      }, {});

      // Sort emps within group by name
      Object.keys(grouped).forEach(key => {
        grouped[key].emps.sort((a: any, b: any) => a.emp.fullName.localeCompare(b.emp.fullName));
      });

      const sortedRoleGroups = Object.keys(grouped).sort((a, b) => (roleOrders[a] || 99) - (roleOrders[b] || 99));
      
      const totalBranchSalary = employeesWithStats.reduce((sum, item) => sum + item.stats.actualSalary, 0);

      return { sortedRoleGroups, grouped, totalBranchSalary };
    }, [branchEmployees, filterMonth, payrollAdjustments, localAdjustments, calculateEmployeeSalaryStats]);

    const { sortedRoleGroups, grouped, totalBranchSalary } = groupedData;

    const formatM = (val: number) => {
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
        return val.toString();
    };

    const formatK = (val: number) => {
        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
        return val.toString();
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-0 lg:p-6 pb-24 lg:pb-6"
        >
            <div className="px-4 mt-4 lg:hidden">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <BranchTabs fullWidth />
                </div>
                <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm font-black uppercase text-slate-700"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMobileUtilities(!showMobileUtilities)}
                            className="p-2 bg-stone-50 text-stone-600 rounded-lg flex items-center justify-center border border-stone-200"
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Actions (Desktop) */}
            <div className="hidden md:flex flex-col gap-4 mb-6 px-4 md:px-0 mt-4 relative">
                {isLoading && (
                    <div className="absolute -top-4 left-0 right-0 h-1 bg-emerald-100 overflow-hidden rounded-full">
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                            className="h-full w-1/3 bg-emerald-500"
                        />
                    </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-wrap flex-1">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">BẢNG LƯƠNG</h1>
                    <div className="relative w-[180px]">
                      <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm font-bold text-slate-700 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BranchTabs />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                       <button
                         onClick={() => setShowHolidayConfig(true)}
                         className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-md font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-[11px] uppercase tracking-wider shadow-sm active:scale-95"
                       >
                         <Calendar className="w-3.5 h-3.5 text-amber-500" />
                         <span>Ngày lễ</span>
                       </button>
                       <button
                         onClick={() => setShowOtherDeductionsModal(true)}
                         className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-md font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-[11px] uppercase tracking-wider shadow-sm active:scale-95"
                       >
                         <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                         <span>KHẤU TRỪ KHÁC</span>
                       </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowColumnConfig(!showColumnConfig)}
                        className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-md font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-[11px] uppercase tracking-wider shadow-sm active:scale-95"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cột hiển thị</span>
                      </button>
                      {showColumnConfig && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowColumnConfig(false)} />
                          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 text-left">
                            <h4 className="font-bold text-slate-900 mb-3">Hiển thị cột</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {Object.entries({
                              stt: 'STT', name: 'Tên', bank: 'Số TK ngân hàng', joinDate: 'Ngày vào làm',
                              hours: 'Tổng giờ', 
                              baseSalary: 'Lương CB (/h)', 
                              responsibility: 'Thưởng TN (% / Đơn giá)',
                              holiday: 'Thưởng Lễ', 
                              latePenalty: 'Phạt đi trễ',
                              phonePenalty: 'Sử dụng ĐT',
                              otherDeductions: 'Khấu trừ khác',
                              materialLoss: 'Khấu trừ dụng cụ',
                              extraAdditions: 'Thu nhập bổ sung',
                              actual: 'Tiền thực lãnh', note: 'Ghi chú'
                            }).map(([key, label]) => (
                              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns[key]}
                                  onChange={(e) => setVisibleColumns((prev: any) => ({ ...prev, [key]: e.target.checked }))}
                                  className="rounded text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-sm text-slate-700">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUndoPayroll}
                      disabled={undoStack.length === 0}
                      className={`p-2 rounded-lg transition-all flex items-center justify-center shadow-sm w-10 h-[38px] ${
                        undoStack.length > 0 ? 'bg-white text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50' : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                      }`}
                      title="Hoàn tác"
                    >
                      <Undo2 className="w-5 h-5 stroke-[1.5px]" />
                    </button>
                    <button
                      onClick={handleSavePayroll}
                      disabled={Object.keys(localAdjustments).length === 0 || isSavingPayroll}
                      className={`px-6 px-4 py-2 rounded-lg font-black transition-all flex items-center gap-2 text-sm shadow-sm uppercase tracking-wider ${
                        Object.keys(localAdjustments).length > 0 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200/50' 
                          : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                      }`}
                    >
                      {isSavingPayroll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={1.5} />}
                      <span>{isSavingPayroll ? 'Đang lưu...' : 'Lưu'}</span>
                    </button>
                  </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto overflow-y-visible bg-white rounded-xl shadow-sm border border-slate-200 ml-0 mr-0">
                <table className="w-full text-left border-separate border-spacing-0 whitespace-nowrap">
                  <thead className="sticky top-0 z-40">
                    <tr className="bg-slate-100 border-b border-slate-300 text-xs uppercase tracking-[0.1em]">
                      {visibleColumns.stt && (
                        <th style={{ width: 60 }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-center sticky left-0 bg-slate-100 z-50">
                          STT
                        </th>
                      )}
                      {visibleColumns.name && (
                        <th style={{ width: Math.max(columnWidths.name, 160) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-left sticky left-[40px] bg-slate-100 z-50 relative group">
                          Nhân viên
                          <div onMouseDown={(e) => handleResize('name', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.bank && (
                        <th style={{ width: Math.max(columnWidths.bank, 140) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-left relative group">
                          Tài khoản
                          <div onMouseDown={(e) => handleResize('bank', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.joinDate && (
                        <th style={{ width: Math.max(columnWidths.joinDate, 120) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-left relative group">
                          Ngày làm
                          <div onMouseDown={(e) => handleResize('joinDate', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.hours && (
                        <th style={{ width: Math.max(columnWidths.hours, 100) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          Tổng giờ
                          <div onMouseDown={(e) => handleResize('hours', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.baseSalary && (
                        <th style={{ width: Math.max(columnWidths.baseSalary, 120) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          Lương CB (/h)
                          <div onMouseDown={(e) => handleResize('baseSalary', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.responsibility && (
                        <th style={{ width: Math.max(columnWidths.responsibility, 220) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          Thưởng TN (% / Đơn giá)
                          <div onMouseDown={(e) => handleResize('responsibility', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.holiday && (
                        <th style={{ width: Math.max(columnWidths.holiday, 120) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          Thưởng Lễ
                          <div onMouseDown={(e) => handleResize('holiday', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.latePenalty && (
                        <th style={{ width: Math.max(columnWidths.latePenalty, 120) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          Đi trễ
                          <div onMouseDown={(e) => handleResize('latePenalty', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.phonePenalty && (
                        <th style={{ width: Math.max(columnWidths.phonePenalty, 120) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          Sử dụng ĐT
                          <div onMouseDown={(e) => handleResize('phonePenalty', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.otherDeductions && (
                        <th style={{ width: Math.max(columnWidths.otherDeductions, 140) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          KHẤU TRỪ KHÁC
                          <div onMouseDown={(e) => handleResize('otherDeductions', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.extraAdditions && (
                        <th style={{ width: Math.max(columnWidths.extraAdditions, 140) }} className="p-3 font-bold text-slate-500 border-r border-slate-300 text-right relative group">
                          Thu nhập BS
                          <div onMouseDown={(e) => handleResize('extraAdditions', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-sky-400 z-10" />
                        </th>
                      )}
                      {visibleColumns.actual && (
                        <th style={{ width: Math.max(columnWidths.actual, 150) }} className="p-3 font-bold text-white bg-[#764333] border-none text-right relative group">
                          Thực Lãnh
                          <div onMouseDown={(e) => handleResize('actual', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-[#5d3528] z-10" />
                        </th>
                      )}
                      {visibleColumns.note && (
                        <th style={{ width: Math.max(columnWidths.note, 150) }} className="p-3 font-bold text-slate-500 text-left relative group">
                          Ghi chú
                          <div onMouseDown={(e) => handleResize('note', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-emerald-400 z-10" />
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const visibleColsCount = Object.values(visibleColumns).filter(Boolean).length;
                      let globalRowIndex = 0;

                      return sortedRoleGroups.flatMap((roleKey, groupIndex) => {
                        const group = grouped[roleKey];
                        
                        return group.emps.map((item: any, empInGroupIndex: number) => {
                          const { emp, stats, localAdj } = item;
                          const overallIndex = globalRowIndex++;
                          const isFirstInGroup = empInGroupIndex === 0;
                          const isNewGroup = isFirstInGroup && groupIndex > 0;

                          const deductionItems = [];
                          if (stats.finalRetained > 0) deductionItems.push(`Giữ: ${formatCurrency(stats.finalRetained)}`);
                          if (stats.finalMaterialLoss > 0) deductionItems.push(`Ly: ${formatCurrency(stats.finalMaterialLoss)}`);
                          if (stats.finalAdvance > 0) deductionItems.push(`Ứng: ${formatCurrency(stats.finalAdvance)}`);
                          const deductionBrief = deductionItems.join(', ');

                          // Only show as edited if there's a LOCAL (unsaved) adjustment
                          const isEdited = (key: string) => localAdj[key] !== undefined;

                          return (
                            <tr 
                              key={emp.id} 
                              onDoubleClick={() => {
                                setSelectedEmployeeForSalaryDetails(emp);
                              }}
                              className={`
                                ${overallIndex % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'} 
                                ${isNewGroup ? 'border-t-2 border-slate-200 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.05)]' : ''}
                                hover:bg-sky-50/30 transition-colors group/row
                              `}
                            >
                              {visibleColumns.stt && (
                                <td className={`p-3 border-r border-slate-100 text-center text-xs font-bold text-slate-400 sticky left-0 z-30 transition-colors ${overallIndex % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'} group-hover/row:bg-sky-50`}>
                                  {overallIndex + 1}
                                </td>
                              )}
                              {visibleColumns.name && (
                                <td className={`p-3 border-r border-slate-100 sticky left-[40px] z-30 transition-colors ${overallIndex % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'} group-hover/row:bg-sky-50`}>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => {
                                        if (onEmployeeClick) onEmployeeClick(emp);
                                      }}
                                      className="text-left hover:text-sky-600 transition-colors font-bold text-slate-700 text-base whitespace-nowrap flex items-center gap-2"
                                    >
                                      {emp.fullName}
                                      {checkEmployeeReview && checkEmployeeReview(emp).needsReview && (
                                        <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded animate-pulse uppercase border border-red-200 shadow-sm leading-none shrink-0" title={`${checkEmployeeReview(emp).daysSince} ngày từ lần review cuối`}>Review lương</span>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              )}
                              {visibleColumns.bank && <td className="p-3 border-r border-slate-100 text-slate-500 text-sm font-medium text-left">{emp.bankAccount || '-'}</td>}
                              {visibleColumns.joinDate && <td className="p-3 border-r border-slate-100 text-slate-500 text-xs font-medium text-left">{emp.joinDate ? format(parseISO(emp.joinDate), 'dd/MM/yy') : '-'}</td>}
                              {visibleColumns.hours && <td className="p-3 font-bold text-emerald-600 border-r border-slate-100 text-right text-sm">{stats.totalHours.toFixed(1)}</td>}
                              {visibleColumns.baseSalary && (
                                <td className="p-3 border-r border-slate-100 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                          <input 
                                            type="text"
                                            value={stats.currentHourlyRate === 0 || stats.currentHourlyRate === null ? '' : stats.currentHourlyRate.toLocaleString('vi-VN')}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                              handlePayrollChange(emp.id, 'hourlyRate', val);
                                            }}
                                            className="w-[80px] p-1 bg-transparent border-transparent border rounded text-sm font-bold text-right outline-none hover:bg-white hover:border-slate-200 focus:bg-white focus:border-sky-300 focus:ring-1 focus:ring-sky-200 transition-all placeholder:text-slate-300"
                                            placeholder="0"
                                          />
                                    </div>
                                </td>
                              )}
                              {visibleColumns.responsibility && (
                                <td className="p-3 border-r border-slate-100 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <input 
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={stats.finalTtnPercentage ?? 0}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            handlePayrollChange(emp.id, 'overrideTtnPercentage', val);
                                          }}
                                          className="w-16 p-1 bg-transparent border-transparent border rounded text-sm font-black text-right outline-none hover:bg-white hover:border-slate-200 focus:bg-white focus:border-sky-300 transition-all font-mono"
                                        />
                                      <span className="text-[11px] text-slate-400 font-bold ml-1">%</span>
                                        <input 
                                          type="text"
                                          value={(stats.currentResponsibilityBonus === 0 || stats.currentResponsibilityBonus === null) ? '' : formatCurrency(stats.currentResponsibilityBonus)}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                            handlePayrollChange(emp.id, 'responsibilityBonus', val);
                                          }}
                                          className="w-[80px] p-1 ml-2 bg-transparent border-transparent border rounded text-sm font-bold text-right outline-none hover:bg-white hover:border-slate-200 focus:bg-white focus:border-sky-300 transition-all font-mono"
                                          placeholder="0"
                                        />
                                    </div>
                                </td>
                              )}
                              {visibleColumns.holiday && (
                                <td className="p-3 border-r border-slate-100 text-right text-emerald-600 font-bold text-sm">
                                  {stats.holidayBonusTotal > 0 ? formatCurrency(stats.holidayBonusTotal) : '-'}
                                </td>
                              )}
                              {visibleColumns.latePenalty && (
                                <td className="p-3 border-r border-slate-100 text-right">
                                  <PenaltyPopover 
                                    id={`late-penalty-${emp.id}`}
                                    label="Phạt đi trễ"
                                    amount={stats.latePenaltyTotal}
                                    rawAmount={stats.rawLatePenaltyTotal}
                                    quantityLabel="phút"
                                    quantityValue={stats.totalLatePenaltyMinutes}
                                    rawQuantityValue={stats.systemLatePenaltyMinutes}
                                    onAmountChange={(val) => handlePayrollChange(emp.id, 'overrideLatePenalty', val)}
                                    onQuantityChange={(val) => handlePayrollChange(emp.id, 'overrideLateMinutes', val)}
                                    unitRate={stats.currentHourlyRate / 60}
                                    isEdited={isEdited('overrideLatePenalty') || isEdited('overrideLateMinutes')}
                                    textColor="text-rose-500"
                                    onReset={() => {
                                      handlePayrollChange(emp.id, 'overrideLatePenalty', undefined);
                                      handlePayrollChange(emp.id, 'overrideLateMinutes', undefined);
                                    }}
                                  />
                                </td>
                              )}
                              {visibleColumns.phonePenalty && (
                                <td className="p-3 border-r border-slate-100 text-right">
                                  <PenaltyPopover 
                                    id={`phone-penalty-${emp.id}`}
                                    label="Sử dụng ĐT"
                                    amount={stats.phonePenaltyTotal}
                                    rawAmount={stats.rawPhonePenaltyTotal}
                                    quantityLabel="lần"
                                    quantityValue={stats.phonePenaltyCount}
                                    rawQuantityValue={stats.systemPhonePenaltyCount}
                                    onAmountChange={(val) => handlePayrollChange(emp.id, 'overridePhonePenalty', val)}
                                    onQuantityChange={(val) => handlePayrollChange(emp.id, 'overridePhoneCount', val)}
                                    unitRate={stats.systemPhonePenaltyCount > 0 ? stats.rawPhonePenaltyTotal / stats.systemPhonePenaltyCount : undefined}
                                    isEdited={isEdited('overridePhonePenalty') || isEdited('overridePhoneCount')}
                                    textColor="text-rose-500"
                                    onReset={() => {
                                      handlePayrollChange(emp.id, 'overridePhonePenalty', undefined);
                                      handlePayrollChange(emp.id, 'overridePhoneCount', undefined);
                                    }}
                                  />
                                </td>
                              )}
                                  {visibleColumns.otherDeductions && (
                                    <td className="p-3 border-r border-slate-100 text-right relative group/ded">
                                      <div className="flex items-center justify-end gap-2">
                                        <button 
                                          id={`deduction-btn-${emp.id}`}
                                          onClick={() => setShowDeductionDetails(showDeductionDetails === emp.id ? null : emp.id)}
                                          className="text-right hover:text-sky-600 transition-all font-medium flex flex-col items-end leading-none"
                                        >
                                          <span className={`text-sm font-bold ${stats.otherDeductionsTotal > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {formatCurrency(stats.otherDeductionsTotal)}
                                          </span>
                                        </button>
                                      </div>
                                      
                                       <PopoverPortal 
                                        isOpen={showDeductionDetails === emp.id} 
                                        onClose={() => setShowDeductionDetails(null)}
                                        anchorId={`deduction-btn-${emp.id}`}
                                        className="w-72"
                                      >
                                          <div className="flex justify-between items-center mb-0 pb-2 border-b border-slate-100">
                                            <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-wider">Khấu Trừ Khác</h4>
                                            <button onClick={() => setShowDeductionDetails(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>

                                          <div className="flex mt-2 mb-4 bg-slate-50 p-1 rounded-xl gap-1">
                                            {['retained', 'material', 'advance'].map((tab) => (
                                              <button
                                                key={tab}
                                                onClick={() => {
                                                  const nextTab = tab as any;
                                                  (window as any).activeDeductionSubTab = (window as any).activeDeductionSubTab || {};
                                                  (window as any).activeDeductionSubTab[emp.id] = nextTab;
                                                  setShowDeductionDetails(emp.id); // Triggers re-render
                                                }}
                                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${
                                                  ((window as any).activeDeductionSubTab?.[emp.id] || 'retained') === tab
                                                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                                  : 'text-slate-400 hover:bg-slate-100'
                                                }`}
                                              >
                                                {tab === 'retained' ? 'Giữ tạm' : tab === 'material' ? 'Hao hụt' : 'Ứng lương'}
                                              </button>
                                            ))}
                                          </div>

                                          <div className="space-y-4 min-h-[80px]">
                                              {((window as any).activeDeductionSubTab?.[emp.id] || 'retained') === 'retained' && (
                                                <div className="flex flex-col gap-1">
                                                   <div className="flex justify-between items-center px-0.5">
                                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiền Giữ Tạm</label>
                                                   </div>
                                                   <div className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-rose-600 font-bold">
                                                      {(stats.finalRetained === 0 || stats.finalRetained === null) ? '0 ₫' : `${formatCurrency(stats.finalRetained)} ₫`}
                                                   </div>
                                                   <p className="text-[9px] text-slate-400 italic mt-1 leading-tight">
                                                     Số tiền này được nhập từ quản lý Giữ Tạm.
                                                   </p>
                                                </div>
                                              )}

                                              {((window as any).activeDeductionSubTab?.[emp.id] || 'retained') === 'material' && (
                                                <div className="flex flex-col gap-3">
                                                  <div className="flex justify-between items-center px-0.5">
                                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Khấu Trừ Dụng Cụ</label>
                                                     <span className="text-xs font-black text-rose-600">{(stats.finalMaterialLoss === 0 || stats.finalMaterialLoss === null) ? '0 ₫' : `${formatCurrency(stats.finalMaterialLoss)} ₫`}</span>
                                                   </div>
                                                   
                                                   <div className="space-y-2">
                                                     <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                                       <div className="flex justify-between items-center mb-1">
                                                         <span className="text-[10px] font-bold text-blue-700 uppercase">Chia sẻ tập thể</span>
                                                         <span className="text-xs font-black text-blue-800">{formatCurrency(stats.finalMaterialLossShared)} ₫</span>
                                                       </div>
                                                       <div className="w-full h-1 bg-blue-200 rounded-full overflow-hidden">
                                                          <div className="h-full bg-blue-500" style={{ width: stats.finalMaterialLoss > 0 ? `${(stats.finalMaterialLossShared / stats.finalMaterialLoss) * 100}%` : '0%' }} />
                                                       </div>
                                                     </div>

                                                     <div className="p-2 bg-orange-50 border border-orange-100 rounded-lg">
                                                       <div className="flex justify-between items-center mb-1">
                                                         <span className="text-[10px] font-bold text-orange-700 uppercase">Đền bù cá nhân</span>
                                                         <span className="text-xs font-black text-orange-800">{formatCurrency(stats.finalMaterialLossIndividual)} ₫</span>
                                                       </div>
                                                       <div className="w-full h-1 bg-orange-200 rounded-full overflow-hidden">
                                                          <div className="h-full bg-orange-500" style={{ width: stats.finalMaterialLoss > 0 ? `${(stats.finalMaterialLossIndividual / stats.finalMaterialLoss) * 100}%` : '0%' }} />
                                                       </div>
                                                     </div>
                                                   </div>

                                                   <p className="text-[9px] text-slate-400 italic mt-1 leading-tight">
                                                     {stats.materialLossNote || 'Số tiền này được phân bổ từ quản lý Hao Hụt.'}
                                                   </p>
                                                </div>
                                              )}

                                              {((window as any).activeDeductionSubTab?.[emp.id] || 'retained') === 'advance' && (
                                                <div className="flex flex-col gap-1">
                                                  <div className="flex justify-between items-center px-0.5">
                                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ứng Lương</label>
                                                  </div>
                                                  <div className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-sky-600 font-bold">
                                                    {(stats.finalAdvance === 0 || stats.finalAdvance === null) ? '0 ₫' : `${formatCurrency(stats.finalAdvance)} ₫`}
                                                  </div>
                                                  <p className="text-[9px] text-slate-400 italic mt-1 leading-tight">
                                                    Nhân viên đã tạm ứng trong tháng.
                                                  </p>
                                                </div>
                                              )}
                                          </div>
                                      </PopoverPortal>
                                    </td>
                                  )}
                                  {visibleColumns.extraAdditions && (
                                    <td className="p-3 border-r border-slate-100 text-right">
                                      <div className="flex items-center justify-end gap-1 group/field">
                                        {isEdited('extraAdditions') && (
                                          <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                                            <button 
                                              onClick={() => handlePayrollChange(emp.id, 'extraAdditions', undefined)}
                                              className="absolute -left-6 p-0.5 opacity-0 group-hover/field:opacity-100 text-amber-600 hover:bg-amber-50 rounded transition-all z-10"
                                              title="Hoàn tác"
                                            >
                                              <Undo2 className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                        <input 
                                          type="text"
                                          value={(stats.finalExtraAdditions === 0 || stats.finalExtraAdditions === null) ? '' : formatCurrency(stats.finalExtraAdditions)}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                            handlePayrollChange(emp.id, 'extraAdditions', val);
                                          }}
                                          className="w-[90px] p-1 bg-transparent border-transparent border rounded text-sm font-bold text-right outline-none hover:bg-white hover:border-slate-200 focus:bg-white transition-all font-mono"
                                          placeholder="0"
                                        />
                                      </div>
                                    </td>
                                  )}
                                  {visibleColumns.actual && (
                                    <td className="p-3 border-r border-slate-100 text-right transition-colors">
                                      <div className="flex flex-col items-end">
                                        <span className={`text-base font-black tracking-tight ${stats.deductionExceeded ? 'text-rose-600' : 'text-emerald-500'}`}>
                                          {formatCurrency(stats.actualSalary)}
                                        </span>
                                      </div>
                                    </td>
                                  )}
                                  {visibleColumns.note && (
                                    <td className="p-3 min-w-[150px]">
                                      <div className="flex items-center justify-end px-2 group/field relative">
                                        {isEdited('note') && (
                                          <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                                            <button 
                                              onClick={() => handlePayrollChange(emp.id, 'note', undefined)}
                                              className="absolute -left-4 p-0.5 opacity-0 group-hover/field:opacity-100 text-amber-600 hover:bg-amber-50 rounded transition-all z-10"
                                              title="Hoàn tác"
                                            >
                                              <Undo2 className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                        <input 
                                          type="text"
                                          value={stats.finalNote}
                                          onChange={(e) => handlePayrollChange(emp.id, 'note', e.target.value)}
                                          className="w-full bg-transparent border-transparent border rounded p-1 text-xs text-slate-500 hover:bg-white hover:border-slate-200 focus:bg-white focus:border-sky-300 outline-none transition-all italic"
                                          placeholder="..."
                                        />
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          });
                        })()}
                  </tbody>
                </table>
            </div>

            {/* MOBILE MODERN CARD VIEW */}
            <div className="md:hidden px-4 pb-32">
                {['QUẦY', 'PV', 'BẾP', 'KHÁC'].map((role) => {
                  const roleEmployees = branchEmployees.filter((emp: any) => 
                    (emp.defaultRole === role || (!emp.defaultRole && role === 'PV'))
                  );

                  if (roleEmployees.length === 0) return null;

                  return (
                    <div key={role} className="mt-6">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-[12px] font-black text-[#764333] uppercase tracking-[0.2em]">
                          {role === 'QUẦY' ? 'QUẦY' : role === 'PV' ? 'PHỤC VỤ' : role} ({roleEmployees.length})
                        </h3>
                      </div>
                      
                      <div className="space-y-3">
                        {roleEmployees.map((emp: any, index: number) => {
                          const stats = calculateEmployeeSalaryStats(emp, filterMonth);
                          const isReducedPenalty = (stats.latePenaltyTotal < stats.rawLatePenaltyTotal);

                          return (
                            <motion.div 
                              key={emp.id} 
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setSelectedEmployeeForSalaryDetails(emp);
                              }}
                              className="bg-stone-50 rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-stone-100 flex flex-col gap-1.5 cursor-pointer active:bg-stone-100 transition-all"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="text-[14px] font-black text-[#764333] w-6">{(index + 1)}.</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onEmployeeClick) onEmployeeClick(emp);
                                    }}
                                    className="text-base font-bold text-slate-900 text-left truncate tracking-tight focus:outline-none hover:underline flex items-center gap-2"
                                  >
                                    {emp.fullName}
                                    {checkEmployeeReview && checkEmployeeReview(emp).needsReview && (
                                      <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded animate-pulse uppercase border border-red-200 shadow-sm leading-none shrink-0" title={`${checkEmployeeReview(emp).daysSince} ngày từ lần review cuối`}>Review lương</span>
                                    )}
                                  </button>
                                </div>
                                <div className="text-base font-bold text-[#764333] tracking-tight">
                                  {stats.actualSalary.toLocaleString('vi-VN')}đ
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between pt-1.5 border-t border-stone-100/60">
                                <div className="text-[12px] text-stone-600 font-medium tracking-tight flex items-center gap-1.5">
                                  <span className="text-emerald-700 font-black">{stats.totalHours.toFixed(1)}h</span>
                                  <span className="text-stone-300">•</span>
                                  Thưởng: <span className="text-emerald-700 font-black">{formatK(stats.holidayBonusTotal + stats.extraAdditionsTotal)}</span>
                                  <span className="text-stone-300">•</span>
                                  Phạt: 
                                  <span className={`font-black ${isReducedPenalty ? 'text-rose-500' : 'text-rose-600'}`}>
                                    {formatK(stats.latePenaltyTotal + stats.phonePenaltyTotal + stats.finalPenalty)}
                                  </span>
                                  {isReducedPenalty && (
                                    <span className="ml-1 text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                      Sếp đã giảm
                                    </span>
                                  )}
                                </div>
                                <ChevronRight className="w-3 h-3 text-stone-400" />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* MOBILE FLOATING ACTION BAR removed and moved to top toolbar */}
            {!isSalaryDetailOpen && null}

            {/* UTILITIES OVERLAY */}
            <AnimatePresence>
                {showMobileUtilities && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMobileUtilities(false)}
                            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[80] md:hidden"
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 pb-12 z-[90] md:hidden shadow-2xl"
                        >
                            <div className="w-12 h-1 bg-stone-100 rounded-full mx-auto mb-6" />
                            <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest text-center mb-6">Tiện ích bảng lương</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setShowHolidayConfig(true); setShowMobileUtilities(false); }} className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-2xl active:bg-amber-50 group transition-all">
                                    <div className="p-3 bg-amber-100 rounded-xl group-active:bg-amber-200"><Calendar className="w-5 h-5 text-amber-600" /></div>
                                    <span className="text-[10px] font-black text-stone-600 uppercase">Ngày lễ</span>
                                </button>
                                <button onClick={() => { setShowMaterialLossModal(true); setShowMobileUtilities(false); }} className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-2xl active:bg-indigo-50 group transition-all">
                                    <div className="p-3 bg-indigo-100 rounded-xl group-active:bg-indigo-200"><Banknote className="w-5 h-5 text-indigo-600" /></div>
                                    <span className="text-[10px] font-black text-stone-600 uppercase">Khấu trừ</span>
                                </button>
                                <button onClick={() => { setShowFinancialModal(true); setShowMobileUtilities(false); }} className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-2xl active:bg-emerald-50 group transition-all">
                                    <div className="p-3 bg-emerald-100 rounded-xl group-active:bg-emerald-200"><Wallet className="w-5 h-5 text-emerald-600" /></div>
                                    <span className="text-[10px] font-black text-stone-600 uppercase text-center">Lương giữ tạm</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

