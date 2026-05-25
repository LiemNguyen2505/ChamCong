import React from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronUp, ChevronDown, CheckCircle2, FileSpreadsheet, Download, X, ChevronLeft, ChevronRight, CopyPlus, UserPlus, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SmartScheduleShiftModal } from './schedule/SmartScheduleShiftModal';
import { SmartScheduleMobile } from './schedule/SmartScheduleMobile';
import { SmartScheduleContextMenu } from './schedule/SmartScheduleContextMenu';
import { SmartScheduleDesktop } from './schedule/SmartScheduleDesktop';
import { SHIFT_PRESETS } from './schedule/SmartScheduleConstants';
import { Employee, WorkSchedule, ShiftTask } from '../types/admin';
import { useSmartScheduleBuilder } from '../hooks/useSmartScheduleBuilder';

export interface SmartScheduleBuilderProps {
  employees: Employee[];
  schedules: WorkSchedule[];
  currentBranchFilter: string;
  managedBranches: string[];
  filterMonth?: string;
  onAddShift: (shift: Omit<WorkSchedule, 'id'>) => Promise<void>;
  onUpdateShift: (id: string, shift: Partial<WorkSchedule>) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  onBatchDeleteShifts?: (ids: string[]) => Promise<void>;
  onBatchSaveShifts?: (shifts: any[]) => Promise<void>;
  onSyncWeekShifts?: (shiftsToSave: any[], idsToDelete: string[]) => Promise<void>;
  onModalToggle?: (isOpen: boolean) => void;
  exportToCSV?: () => void;
  theme?: any;
  planningGoals?: any[];
  isReadOnly?: boolean;
}

export const SmartScheduleBuilder: React.FC<SmartScheduleBuilderProps> = (props) => {
  const hookState = useSmartScheduleBuilder(props);
  const { theme, isReadOnly, managedBranches, onAddShift, onDeleteShift, exportToCSV, employees } = props;
  const { schedules } = props; // for ContextMenu

  const {
    activeBranch,
    employeeOrder,
    moveEmployee,
    currentDate,
    setCurrentDate,
    mobileSelectedDate,
    setMobileSelectedDate,
    weekDays,
    groupedEmployees,
    selectedCell,
    setSelectedCell,
    editingShift,
    setEditingShift,
    showModal,
    setShowModal,
    isCloning,
    setIsCloning,
    isSaving,
    setIsSaving,
    activePopupCell,
    setActivePopupCell,
    focusedSubCell,
    setFocusedSubCell,
    getShiftDeterministicId,
    handleToggleShift,
    isQuickEditMode,
    setIsQuickEditMode,
    selectedQuickShift,
    setSelectedQuickShift,
    localSchedules,
    hasUnsavedChanges,
    handleApplyChanges,
    handleLocalToggleShift,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    locationId,
    setLocationId,
    roleInShift,
    setRoleInShift,
    isOff,
    setIsOff,
    notes,
    taskNote,
    setTaskNote,
    colorLabel,
    setColorLabel,
    tasks,
    selectedCells,
    setSelectedCells,
    copiedShift,
    setCopiedShift,
    copiedIndicator,
    handleExcelPaste,
    handleExcelDelete,
    handlePrevWeek,
    handleNextWeek,
    handlePrevDay,
    handleNextDay,
    pendingNavigation,
    setPendingNavigation,
    handleCellClick,
    handleDoubleClick,
    handleDoubleCellClick,
    handleSaveShift,
    handleDeleteShift,
    showCloneConfirm,
    setShowCloneConfirm,
    handleCopyToNextWeek,
    handleDọnRácTứcThì,
    formatTimeLabel,
    longPressTimer,
    weekStart,
    showSupportModal,
    setShowSupportModal,
    supportEmployees,
    setSupportEmployees,
    confirmNavigation,
    setLocalSchedules,
    setHasUnsavedChanges
  } = hookState;

  const renderCell = (emp: Employee, dateStr: string) => {
    const dayShifts = localSchedules.filter(s => s.empId === emp.id && s.date === dateStr);

    const handleSubCellDoubleClick = async (presetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isReadOnly || isQuickEditMode) return;

      const shiftId = getShiftDeterministicId(emp.id, dateStr, presetId);
      const shift = localSchedules.find(s => s.id === shiftId);
      
      if (shift) {
        handleDoubleClick(shift);
      } else {
        const preset = SHIFT_PRESETS.find(p => p.id === presetId)!;
        handleLocalToggleShift(emp.id, dateStr, preset);
      }
    };

    const onSubCellPressStart = (presetId: string, e: React.MouseEvent | React.TouchEvent) => {
      if (isReadOnly) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      
      longPressTimer.current = setTimeout(() => {
        setActivePopupCell({ empId: emp.id, date: dateStr, presetId, x: clientX, y: clientY });
        longPressTimer.current = null;
      }, 1000); // 1 second long press
    };

    const onSubCellPressEnd = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

  const handleSubCellClick = async (presetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isReadOnly) return;

      if (isQuickEditMode && selectedQuickShift) {
        const presets: any = {
           'Sáng': { isOff: false, startTime: '06:00', endTime: '11:00', presetId: 'sang' },
           'Trưa': { isOff: false, startTime: '12:00', endTime: '17:00', presetId: 'trua' },
           'Tối': { isOff: false, startTime: '17:00', endTime: '22:00', presetId: 'toi' },
           'OFF': { isOff: true, startTime: '00:00', endTime: '00:00', presetId: 'off' }
        };
        const p = presets[selectedQuickShift];
        
        const targetPresetId = selectedQuickShift === 'OFF' ? presetId : p.presetId;
        const shiftId = getShiftDeterministicId(emp.id, dateStr, targetPresetId);
        const existing = localSchedules.find(s => s.id === shiftId);

        setLocalSchedules(prev => {
           let next = [...prev];
           if (existing) {
              const currentType = existing.isOff ? 'OFF' : 
                             existing.startTime < '12:00' ? 'Sáng' :
                             existing.startTime < '17:00' ? 'Trưa' : 'Tối';
              if (currentType === selectedQuickShift) {
                next = next.filter(s => s.id !== existing.id);
              } else {
                next = next.map(s => s.id === existing.id ? { ...s, isOff: p.isOff, startTime: p.startTime, endTime: p.endTime } : s);
              }
           } else {
              next.push({
                id: shiftId,
                empId: emp.id,
                date: dateStr,
                locationId: activeBranch === 'All' ? (emp.locationId || 'Góc Phố') : activeBranch,
                startTime: p.startTime,
                endTime: p.endTime,
                isOff: p.isOff
              });
           }
           return next;
        });
        setHasUnsavedChanges(true);
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isShift) {
        // Find origin point
        const originPoint = (selectedCells.length > 0 ? selectedCells[selectedCells.length - 1] : focusedSubCell);
        if (!originPoint) {
           setFocusedSubCell({ empId: emp.id, date: dateStr, presetId });
           return;
        }

        const allRowsIds = [...groupedEmployees.QUẦY, ...groupedEmployees.PV].map(e => e.id);
        const allColsDates = weekDays.map(d => format(d, 'yyyy-MM-dd'));
        const SLOT_KEYS = ['sang', 'trua', 'toi'];

        const r1 = allRowsIds.indexOf(originPoint.empId);
        const r2 = allRowsIds.indexOf(emp.id);
        const c1 = allColsDates.indexOf(originPoint.date) * 3 + SLOT_KEYS.indexOf((originPoint as any).slotIndex || (originPoint as any).presetId);
        const c2 = allColsDates.indexOf(dateStr) * 3 + SLOT_KEYS.indexOf(presetId);

        if (r1 !== -1 && r2 !== -1 && c1 !== -1 && c2 !== -1) {
          const minRow = Math.min(r1, r2);
          const maxRow = Math.max(r1, r2);
          const minCol = Math.min(c1, c2);
          const maxCol = Math.max(c1, c2);

          const newSelection = [];
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const dIndex = Math.floor(c / 3);
              const sIndex = c % 3;
              newSelection.push({ empId: allRowsIds[r], date: allColsDates[dIndex], slotIndex: SLOT_KEYS[sIndex] });
            }
          }
          
          if (isCtrl) {
            // merge uniqueness
            const existingSet = new Set(selectedCells.map(c => `${c.empId}_${c.date}_${c.slotIndex}`));
            const merged = [...selectedCells];
            newSelection.forEach(item => {
              const key = `${item.empId}_${item.date}_${item.slotIndex}`;
              if (!existingSet.has(key)) {
                merged.push(item);
                existingSet.add(key);
              }
            });
            setSelectedCells(merged);
          } else {
            setSelectedCells(newSelection);
          }
          setFocusedSubCell(null);
        }
      } else if (isCtrl) {
        setSelectedCells(prev => {
          const exists = prev.some(c => c.empId === emp.id && c.date === dateStr && c.slotIndex === presetId);
          if (exists) {
            return prev.filter(c => !(c.empId === emp.id && c.date === dateStr && c.slotIndex === presetId));
          } else {
            return [...prev, { empId: emp.id, date: dateStr, slotIndex: presetId }];
          }
        });
        setFocusedSubCell(null); 
      } else {
        setFocusedSubCell({ empId: emp.id, date: dateStr, presetId });
        if (selectedCells.length > 0) {
          setSelectedCells([]); 
        }
        // Do not clear copiedIndicator here, let it persist until Escape or new Copy
      }
    };

    const getPositionLabel = (shiftLocId: string | undefined, empLocId: string | undefined, role?: string) => {
      let roleLabel = '';
      if (role === 'QUẦY') roleLabel = 'Q';
      if (role === 'PV') roleLabel = 'PV';
      if (role === 'BOTH') roleLabel = 'PV & Q';

      let locLabel = '';
      if (shiftLocId && activeBranch !== 'All' && shiftLocId !== activeBranch) {
         // Emphasize shifts happening at another branch (if not hiding them)
         locLabel = shiftLocId.split(' ').map(w => w[0]).join('').toUpperCase();
      } else if (shiftLocId && empLocId && shiftLocId !== empLocId && shiftLocId !== 'All') {
         // Create abbr: "Góc Phố" -> "GP"
         locLabel = empLocId.split(' ').map(w => w[0]).join('').toUpperCase();
      }

      if (locLabel && roleLabel) return `${locLabel}-${roleLabel}`;
      if (locLabel) return locLabel;
      return roleLabel;
    };

    return (
      <div className="h-full w-full flex items-center p-0.5 gap-0.5 bg-white group select-none relative">
        {SHIFT_PRESETS.map((preset) => {
          const shiftId = getShiftDeterministicId(emp.id, dateStr, preset.id);
          const shift = localSchedules.find(s => s.id === shiftId);
          
          let isShiftVisible = false;
          if (shift) {
             isShiftVisible = activeBranch === 'All' || shift.locationId === activeBranch;
          }

          const isActive = isShiftVisible;
          const isOffSlot = shift?.isOff;
          const isHighlighted = focusedSubCell?.empId === emp.id && 
                              focusedSubCell?.date === dateStr && 
                              focusedSubCell?.presetId === preset.id;
          const isPopupOpen = activePopupCell?.empId === emp.id && 
                            activePopupCell?.date === dateStr && 
                            activePopupCell?.presetId === preset.id;
          const isMultiSelected = selectedCells.some(c => c.empId === emp.id && c.date === dateStr && c.slotIndex === preset.id);
          const isCopied = copiedIndicator?.empId === emp.id && copiedIndicator?.date === dateStr && copiedIndicator?.slotIndex === preset.id;
          
          return (
            <div
              key={preset.id}
              onMouseDown={(e) => onSubCellPressStart(preset.id, e)}
              onMouseUp={onSubCellPressEnd}
              onMouseLeave={onSubCellPressEnd}
              onTouchStart={(e) => onSubCellPressStart(preset.id, e)}
              onTouchEnd={onSubCellPressEnd}
              onClick={(e) => handleSubCellClick(preset.id, e)}
              onDoubleClick={(e) => handleSubCellDoubleClick(preset.id, e)}
              style={{ 
                backgroundColor: isOffSlot ? '#fee2e2' : (isActive ? (shift.colorLabel ? '' : preset.color) : 'transparent'),
              }}
              className={`flex-1 h-9 flex flex-col items-center justify-center rounded-sm transition-all border relative ${
                isActive 
                  ? `${shift.colorLabel && !isOffSlot ? `bg-${shift.colorLabel}-500 text-white` : ''} ${isOffSlot ? 'border-red-200 text-red-600' : 'border-black/5 shadow-sm'}` 
                  : `bg-transparent hover:bg-slate-50 border-dashed border-slate-200`
              } ${isHighlighted || isPopupOpen || isMultiSelected ? 'ring-2 ring-sky-500 ring-offset-1 z-10' : ''} ${isCopied ? 'ring-2 ring-dashed ring-sky-500 ring-offset-1 animate-pulse z-20' : ''} cursor-pointer active:scale-95`}
            >
               {!isActive && (
                 <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
                 </div>
               )}
              {isActive && isOffSlot && (
                <span className="text-[12px] font-bold tracking-tighter">OFF</span>
              )}
              {isActive && !isOffSlot && (
                <div className="flex flex-col items-center justify-center leading-none">
                  <span 
                    className="text-[11px] font-bold tracking-tight" 
                    style={{ color: shift.colorLabel ? '#fff' : preset.textColor }}
                  >
                    {formatTimeLabel(shift.startTime)}-{formatTimeLabel(shift.endTime)}
                  </span>
                  <span 
                    className="text-[10px] font-bold opacity-90 scale-90" 
                    style={{ color: shift.colorLabel ? '#fff' : preset.textColor }}
                  >
                    {getPositionLabel(shift.locationId, emp.locationId, shift.roleInShift)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDailySummary = (dateStr: string, mode: 'grid' | 'mobile' = 'grid') => {
    const allVisibleEmployees = [...groupedEmployees.QUẦY, ...groupedEmployees.PV];
    
    let sangCount = 0;
    let truaCount = 0;
    let toiCount = 0;

    allVisibleEmployees.forEach(emp => {
      SHIFT_PRESETS.forEach(preset => {
        const shiftId = getShiftDeterministicId(emp.id, dateStr, preset.id);
        const shift = localSchedules.find(s => s.id === shiftId);
        
        if (shift && !shift.isOff) {
          if (activeBranch === 'All' || shift.locationId === activeBranch) {
            if (preset.id === 'sang') sangCount++;
            else if (preset.id === 'trua') truaCount++;
            else if (preset.id === 'toi') toiCount++;
          }
        }
      });
    });

    const goal = 3; 

    return (
      <div className={`text-[10px] text-center font-black ${mode === 'grid' ? 'bg-slate-50 border-t border-slate-200' : 'w-full h-full'}`}>
        <div className={`flex items-center ${mode === 'grid' ? 'justify-around py-1.5 px-0.5' : 'gap-0.5 h-full p-0.5'}`}>
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="text-[6px] text-emerald-600 font-bold uppercase leading-none mb-0.5">Sáng</span>
            <span className={sangCount < goal ? 'text-rose-600' : 'text-slate-700'}>{sangCount}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="text-[6px] text-amber-600 font-bold uppercase leading-none mb-0.5">Trưa</span>
            <span className={truaCount < goal ? 'text-rose-600' : 'text-slate-700'}>{truaCount}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="text-[6px] text-slate-500 font-bold uppercase leading-none mb-0.5">Tối</span>
            <span className={toiCount < goal ? 'text-rose-600' : 'text-slate-700'}>{toiCount}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-t-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
      {/* Header & Quick Edit Toolbar */}
      <div className="pt-0.5 px-2 pb-1 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex justify-between items-center gap-1 mb-0.5">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight whitespace-nowrap">
              LỊCH LÀM VIỆC
            </h2>
            
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg scale-90 md:scale-100 transform-gpu">
              <button onClick={handlePrevWeek} className="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-black text-slate-700 min-w-[100px] md:min-w-[130px] text-center text-[13px] md:text-xs uppercase tracking-tight py-1 px-1 leading-none flex items-center justify-center">
                {format(weekStart, 'dd/MM')} - {format(weekDays[6], 'dd/MM/yyyy')}
              </span>
              <button onClick={handleNextWeek} className="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {!isReadOnly && (
              <button 
                onClick={() => setShowCloneConfirm(true)} 
                disabled={isCloning}
                title="Copy tuần"
                className="flex items-center justify-center p-2 text-amber-900 bg-white hover:bg-amber-50 rounded-md border border-amber-200 transition-all active:scale-95 disabled:opacity-50"
              >
                <CopyPlus className="w-4 h-4" />
              </button>
            )}
            {!isReadOnly && (
              <button 
                onClick={() => setShowSupportModal(true)} 
                title="Thêm nhân viên hỗ trợ từ chi nhánh khác"
                className="hidden md:flex items-center justify-center p-2 text-sky-700 bg-white hover:bg-sky-50 rounded-md border border-sky-200 transition-all active:scale-95 flex-shrink-0 gap-1 lg:px-3"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden lg:inline text-xs font-bold">Thêm NV hỗ trợ</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button 
                onClick={handleApplyChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 transition-all font-sans"
              >
                LƯU
              </button>
            )}
            <button 
              onClick={exportToCSV} 
              title="Xuất Báo Cáo CSV"
              className="hidden md:flex items-center justify-center p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-md border border-emerald-500 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex flex-col md:flex-row md:items-center gap-3 mt-1.5 bg-slate-50/50 p-2 rounded-xl border border-dashed border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-slate-100">Chọn nhanh:</span>
            <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
              {(['Sáng', 'Trưa', 'Tối', 'OFF'] as const).map(s => (
                <button 
                  key={s}
                  onClick={() => {
                    if (selectedQuickShift === s) {
                      setIsQuickEditMode(false);
                      setSelectedQuickShift(null);
                    } else {
                      setIsQuickEditMode(true);
                      setSelectedQuickShift(s);
                    }
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${selectedQuickShift === s ? 'bg-sky-600 text-white shadow-lg shadow-sky-200 scale-105' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${s === 'OFF' ? 'bg-rose-400' : (selectedQuickShift === s ? 'bg-white' : 'bg-slate-300')}`} />
                  {s}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowSupportModal(true)} 
              title="Thêm nhân viên hỗ trợ"
              className="md:hidden flex items-center justify-center px-4 py-2 text-sky-700 bg-white hover:bg-sky-50 rounded-xl border border-sky-200 transition-all active:scale-95 flex-shrink-0"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:inline">GHI CHÚ:</span>
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="VD: Dọn kho, kiểm kê cuối tháng..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {showCloneConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCloneConfirm(false); }}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight text-center">Xác nhận Copy</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium text-center">Bạn có muốn Copy lịch làm việc qua tuần sau không?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCloneConfirm(false)}
                className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black transition-all text-xs"
              >
                HỦY
              </button>
              <button
                onClick={handleCopyToNextWeek}
                className="flex-1 py-3 bg-sky-600 text-white rounded-2xl font-black hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/20 text-xs"
              >
                XÁC NHẬN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PC View: Week Grid */}
      <SmartScheduleDesktop
        weekDays={weekDays}
        groupedEmployees={groupedEmployees}
        activeBranch={activeBranch}
        moveEmployee={moveEmployee}
        renderCell={renderCell}
        renderDailySummary={renderDailySummary}
      />

      {/* View Mobile (Daily Management) */}
      <SmartScheduleMobile
        handlePrevDay={handlePrevDay}
        handleNextDay={handleNextDay}
        mobileSelectedDate={mobileSelectedDate}
        setMobileSelectedDate={setMobileSelectedDate}
        setCurrentDate={setCurrentDate}
        renderDailySummary={renderDailySummary}
        groupedEmployees={groupedEmployees}
        isReadOnly={isReadOnly}
        moveEmployee={moveEmployee}
        activeBranch={activeBranch}
        renderCell={renderCell}
      />

      {/* Mini Popup for OFF/Copy/Paste/Delete */}
      <SmartScheduleContextMenu
        activePopupCell={activePopupCell}
        setActivePopupCell={setActivePopupCell}
        schedules={schedules}
        onAddShift={onAddShift}
        onDeleteShift={onDeleteShift}
        activeBranch={activeBranch}
        copiedShift={copiedShift}
        setCopiedShift={setCopiedShift}
        getShiftDeterministicId={getShiftDeterministicId}
        SHIFT_PRESETS={SHIFT_PRESETS}
      />

      {/* Modal */}
      <SmartScheduleShiftModal
        showModal={showModal}
        selectedCell={selectedCell}
        editingShift={editingShift}
        theme={theme}
        isSaving={isSaving}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        isOff={isOff}
        setIsOff={setIsOff}
        locationId={locationId}
        setLocationId={setLocationId}
        roleInShift={roleInShift}
        setRoleInShift={setRoleInShift}
        managedBranches={managedBranches}
        colorLabel={colorLabel}
        setColorLabel={setColorLabel}
        taskNote={taskNote}
        setTaskNote={setTaskNote}
        handleDeleteShift={handleDeleteShift}
        handleSaveShift={handleSaveShift}
        setShowModal={setShowModal}
        setSelectedCell={setSelectedCell}
        setEditingShift={setEditingShift}
      />

      {pendingNavigation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingNavigation(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-6">
            <h3 className="font-bold text-lg text-slate-900 mb-2">Chưa lưu thay đổi</h3>
            <p className="text-sm text-slate-600 mb-6">Bạn có thay đổi chưa lưu. Rời khỏi tuần này sẽ mất các thay đổi. Tiếp tục?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPendingNavigation(null)} className="px-4 py-2 font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200">
                Hủy
              </button>
              <button onClick={confirmNavigation} className="px-4 py-2 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600">
                Chuyển tuần
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Employee Selection Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSupportModal(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className={`p-4 border-b border-white/10 flex justify-between items-center ${theme?.header || 'bg-slate-800'}`}>
              <h3 className="font-bold text-lg text-white">Thêm NV hỗ trợ</h3>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="p-1 hover:bg-white/10 rounded-full text-white/70"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <p className="text-sm text-slate-500 mb-4">Chọn NV từ nhánh khác hỗ trợ {activeBranch}:</p>
              <div className="space-y-2">
                {employees
                  .filter(e => e.locationId !== activeBranch && !(e.locationIds && e.locationIds.includes(activeBranch)) && !supportEmployees.find(se => se.empId === e.id))
                  .map(emp => (
                    <div 
                      key={emp.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-sky-300 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{emp.fullName}</div>
                        <div className="text-xs text-slate-500">{emp.locationId}</div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          title="Hỗ trợ QUẦY"
                          onClick={() => {
                            setSupportEmployees(prev => [...prev, { empId: emp.id, role: 'QUẦY' }]);
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors border border-sky-200"
                        >
                          + QUẦY
                        </button>
                        <button 
                          title="Hỗ trợ PHỤC VỤ (PV)"
                          onClick={() => {
                            setSupportEmployees(prev => [...prev, { empId: emp.id, role: 'PV' }]);
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200"
                        >
                          + PV
                        </button>
                      </div>
                    </div>
                  ))}
                {employees.filter(e => e.locationId !== activeBranch && !(e.locationIds && e.locationIds.includes(activeBranch)) && !supportEmployees.find(se => se.empId === e.id)).length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic">Không còn người nào khác.</div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

