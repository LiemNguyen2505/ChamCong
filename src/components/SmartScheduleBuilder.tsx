import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Plus, AlertTriangle, ChevronLeft, ChevronRight, X, Copy, CopyPlus, UserPlus, Info, MessageSquare, Trash2, XCircle, Circle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Employee {
  id: string;
  fullName: string;
  defaultRole?: 'QUẦY' | 'PV';
  locationId?: string;
}

export interface ShiftTask {
  id: string;
  content: string;
  isCompleted: boolean;
  createdBy: 'manager' | 'employee';
  isHandover?: boolean;
  handoverApproved?: boolean;
}

interface WorkSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  empId: string;
  locationId: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  roleInShift?: 'QUẦY' | 'PV' | 'BOTH';
  isOff?: boolean;
  notes?: string;
  colorLabel?: string;
  tasks?: ShiftTask[];
}

interface SmartScheduleBuilderProps {
  employees: Employee[];
  schedules: WorkSchedule[];
  currentBranchFilter: string;
  managedBranches: string[];
  onAddShift: (shift: Omit<WorkSchedule, 'id'>) => Promise<void>;
  onUpdateShift: (id: string, shift: Partial<WorkSchedule>) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
}

export const SmartScheduleBuilder: React.FC<SmartScheduleBuilderProps> = ({
  employees,
  schedules,
  currentBranchFilter,
  managedBranches,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
}) => {
  const [activeBranch, setActiveBranch] = useState(currentBranchFilter === 'All' ? (managedBranches[0] || 'Góc Phố') : currentBranchFilter);
  const [supportEmployeeIds, setSupportEmployeeIds] = useState<string[]>([]);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ empId: string; date: string } | null>(null);
  const [editingShift, setEditingShift] = useState<WorkSchedule | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  
  // Form state
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('11:00');
  const [locationId, setLocationId] = useState(currentBranchFilter === 'All' ? (managedBranches[0] || 'Góc Phố') : currentBranchFilter);
  const [roleInShift, setRoleInShift] = useState<'QUẦY' | 'PV' | 'BOTH'>('PV');
  const [isOff, setIsOff] = useState(false);
  const [notes, setNotes] = useState('');
  const [colorLabel, setColorLabel] = useState('');
  const [tasks, setTasks] = useState<ShiftTask[]>([]);

  // Clipboard and selection state
  const [clipboard, setClipboard] = useState<Omit<WorkSchedule, 'id' | 'date' | 'empId'>[]>([]);
  const [copiedShiftIds, setCopiedShiftIds] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);

  const checkOverlap = React.useCallback((empId: string, date: string, start: string, end: string, excludeId?: string) => {
    const dayShifts = schedules.filter(s => s.empId === empId && s.date === date && s.id !== excludeId && !s.isOff);
    
    return dayShifts.some(s => {
      const sStart = s.startTime;
      const sEnd = s.endTime;
      return (start < sEnd && end > sStart);
    });
  }, [schedules]);

  const hasOffShift = React.useCallback((empId: string, date: string) => {
    return schedules.some(s => s.empId === empId && s.date === date && s.isOff);
  }, [schedules]);

  const handleDeleteMultiple = React.useCallback(async () => {
    const count = selectedShifts.length;
    if (count === 0) return;
    
    for (const id of selectedShifts) {
      await onDeleteShift(id);
    }
    setSelectedShifts([]);
    toast.success(`Đã xóa ${count} ca đã chọn`);
  }, [selectedShifts, onDeleteShift]);

  const handlePaste = React.useCallback(async () => {
    if (!selectedCell || clipboard.length === 0) return;

    let pastedCount = 0;
    for (const item of clipboard) {
      if (item.isOff) {
        // Check if day already has shifts
        const existing = schedules.filter(s => s.empId === selectedCell.empId && s.date === selectedCell.date);
        if (existing.length > 0) {
          toast.error('Không thể dán ca OFF vì ngày này đã có ca làm việc!');
          continue;
        }
      } else {
        if (hasOffShift(selectedCell.empId, selectedCell.date)) {
          toast.error('Ngày này đã có ca OFF, không thể thêm ca làm việc!');
          continue;
        }
        if (checkOverlap(selectedCell.empId, selectedCell.date, item.startTime, item.endTime)) {
          toast.error(`Ca làm việc ${item.startTime}-${item.endTime} bị trùng lặp!`);
          continue;
        }
      }

      await onAddShift({
        ...item,
        empId: selectedCell.empId,
        date: selectedCell.date,
      });
      pastedCount++;
    }
    
    if (pastedCount > 0) {
      toast.success(`Đã dán ${pastedCount} ca làm việc`);
    }
    // Don't reset selectedCell, allow multiple pastes like Excel
  }, [selectedCell, clipboard, schedules, onAddShift, hasOffShift, checkOverlap]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === 'c') {
        if (selectedShifts.length > 0) {
          const toCopy = schedules
            .filter(s => selectedShifts.includes(s.id))
            .map(({ id, date, empId, ...rest }) => rest);
          setClipboard(toCopy);
          setCopiedShiftIds(selectedShifts);
          toast.success(`Đã copy ${toCopy.length} ca làm việc`);
        }
      }
      
      if (isCtrl && e.key === 'v') {
        if (clipboard.length > 0 && selectedCell) {
          handlePaste();
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingShift) return; // Don't delete while editing in modal

        if (selectedShifts.length > 0) {
          handleDeleteMultiple();
        } else if (selectedCell) {
          // Clear cell content if cell is selected but no specific shifts are
          const shiftsInCell = schedules.filter(s => s.empId === selectedCell.empId && s.date === selectedCell.date);
          if (shiftsInCell.length > 0) {
            shiftsInCell.forEach(s => onDeleteShift(s.id));
            toast.success(`Đã xóa ${shiftsInCell.length} ca trong ô`);
          }
        }
      }

      if (e.key === 'Escape') {
        setSelectedShifts([]);
        setCopiedShiftIds([]);
        setSelectedCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShifts, clipboard, selectedCell, schedules, handlePaste, handleDeleteMultiple, editingShift, onDeleteShift]);

  useEffect(() => {
    setLocationId(activeBranch);
  }, [activeBranch]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  // Group employees by default role and branch
  const groupedEmployees = useMemo(() => {
    // 1. Get default employees for this branch
    const defaultEmployees = employees.filter(e => e.locationId === activeBranch);
    
    // 2. Get support employees added to this view
    const supportEmployees = employees.filter(e => supportEmployeeIds.includes(e.id));
    
    // 3. Get employees who have a shift at this branch in the current week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    
    const scheduledEmployees = employees.filter(e => {
      return schedules.some(s => 
        s.empId === e.id && 
        s.locationId === activeBranch && 
        s.date >= weekStartStr && 
        s.date <= weekEndStr
      );
    });

    // Combine and remove duplicates
    const allVisibleEmployees = Array.from(new Map([...defaultEmployees, ...supportEmployees, ...scheduledEmployees].map(e => [e.id, e])).values());

    const quay = allVisibleEmployees.filter(e => e.defaultRole === 'QUẦY');
    const pv = allVisibleEmployees.filter(e => e.defaultRole !== 'QUẦY');
    return { QUẦY: quay, PV: pv };
  }, [employees, activeBranch, supportEmployeeIds, schedules, currentDate]);

  const handleCellClick = (empId: string, date: string, existingShift?: WorkSchedule, e?: React.MouseEvent) => {
    const isMulti = e?.ctrlKey || e?.metaKey || e?.shiftKey;
    
    if (existingShift) {
      if (isMulti) {
        setSelectedShifts(prev => 
          prev.includes(existingShift.id) 
            ? prev.filter(id => id !== existingShift.id)
            : [...prev, existingShift.id]
        );
      } else {
        setSelectedShifts([existingShift.id]);
        setSelectedCell({ empId, date });
      }
    } else {
      setSelectedCell({ empId, date });
      setSelectedShifts([]);
    }
  };

  const handleDoubleClick = (shift: WorkSchedule) => {
    const emp = employees.find(e => e.id === shift.empId);
    setEditingShift(shift);
    setStartTime(shift.startTime || '08:00');
    setEndTime(shift.endTime || '17:00');
    setLocationId(shift.locationId || activeBranch);
    setRoleInShift(shift.roleInShift || emp?.defaultRole || 'PV');
    setIsOff(!!shift.isOff);
    setNotes(shift.notes || '');
    setColorLabel(shift.colorLabel || '');
    setTasks(shift.tasks || []);
    setSelectedCell(null);
    setShowModal(true);
  };

  const handleDoubleCellClick = (empId: string, date: string, defaultStartTime?: string) => {
    const emp = employees.find(e => e.id === empId);
    setEditingShift(null);
    setSelectedCell({ empId, date });
    setStartTime(defaultStartTime || '08:00');
    setEndTime(defaultStartTime ? (parseInt(defaultStartTime.split(':')[0]) + 5).toString().padStart(2, '0') + ':00' : '17:00');
    setLocationId(activeBranch);
    setRoleInShift(emp?.defaultRole || 'PV');
    setIsOff(false);
    setNotes('');
    setColorLabel('');
    setTasks([]);
    setSelectedShifts([]);
    setShowModal(true);
  };

  const handleSaveShift = async () => {
    if (!isOff) {
      const empId = editingShift ? editingShift.empId : selectedCell?.empId;
      const date = editingShift ? editingShift.date : selectedCell?.date;
      if (empId && date) {
        if (checkOverlap(empId, date, startTime, endTime, editingShift?.id)) {
          toast.error('Ca làm việc bị trùng lặp!');
          return;
        }
      }
    }

      if (editingShift) {
        await onUpdateShift(editingShift.id, {
          startTime,
          endTime,
          locationId,
          roleInShift,
          isOff,
          notes,
          colorLabel,
          tasks,
        });
        setEditingShift(null);
        setShowModal(false);
      } else if (selectedCell) {
        await onAddShift({
          empId: selectedCell.empId,
          date: selectedCell.date,
          startTime,
          endTime,
          locationId,
          roleInShift,
          isOff,
          notes,
          colorLabel,
          tasks,
        });
        setSelectedCell(null);
        setShowModal(false);
      }
    };

    const handleDeleteShift = async () => {
      if (editingShift) {
        await onDeleteShift(editingShift.id);
        setEditingShift(null);
        setShowModal(false);
      }
    };

    const handleCopyShift = (e: React.MouseEvent, shift: WorkSchedule) => {
      e.stopPropagation();
      const { id, date, empId, ...rest } = shift;
      setClipboard([rest]);
      setCopiedShiftIds([shift.id]);
      toast.success('Đã copy ca làm việc. Chọn ô khác và nhấn Ctrl+V để dán.');
    };

  const handleCloneLastWeek = async () => {
    if (!window.confirm('Bạn có chắc muốn nhân bản toàn bộ lịch của tuần trước sang tuần này?')) return;
    
    setIsCloning(true);
    try {
      const lastWeekStart = subWeeks(weekStart, 1);
      const lastWeekEnd = addDays(lastWeekStart, 6);
      
      const lastWeekShifts = schedules.filter(s => {
        const d = parseISO(s.date);
        return d >= lastWeekStart && d <= lastWeekEnd;
      });

      for (const shift of lastWeekShifts) {
        const nextWeekDate = format(addWeeks(parseISO(shift.date), 1), 'yyyy-MM-dd');
        await onAddShift({
          empId: shift.empId,
          date: nextWeekDate,
          startTime: shift.startTime,
          endTime: shift.endTime,
          locationId: shift.locationId,
          roleInShift: shift.roleInShift,
        });
      }
      alert('Đã nhân bản lịch tuần trước thành công!');
    } catch (error) {
      console.error('Error cloning schedule:', error);
      alert('Có lỗi xảy ra khi nhân bản lịch.');
    } finally {
      setIsCloning(false);
    }
  };

  const renderCell = (emp: Employee, dateStr: string) => {
    const shifts = schedules.filter(s => s.empId === emp.id && s.date === dateStr);
    
    const sangShift = shifts.find(s => s.startTime < '12:00');
    const truaShift = shifts.find(s => s.startTime >= '12:00' && s.startTime < '17:00');
    const toiShift = shifts.find(s => s.startTime >= '17:00');

    const renderShiftSlot = (shift: WorkSchedule | undefined, defaultStartTime: string) => {
      if (!shift) {
        return (
          <div 
            className={`w-full h-8 rounded border border-dashed border-transparent hover:border-sky-300 flex items-center justify-center cursor-pointer transition-colors ${selectedCell?.empId === emp.id && selectedCell?.date === dateStr ? 'bg-sky-50/50 border-sky-200' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleCellClick(emp.id, dateStr); }}
            onDoubleClick={(e) => { e.stopPropagation(); handleDoubleCellClick(emp.id, dateStr, defaultStartTime); }}
          >
            <Plus className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
          </div>
        );
      }

      const isCrossBranch = shift.locationId !== emp.locationId;
      const isCurrentBranch = shift.locationId === activeBranch;
      const isSelected = selectedShifts.includes(shift.id);
      const isCopied = copiedShiftIds.includes(shift.id);
      
      let bgColor = 'bg-slate-50 border-slate-200 text-slate-700';
      if (shift.isOff) {
        bgColor = 'bg-rose-50 border-rose-200 text-rose-700';
      } else if (shift.colorLabel) {
        const colors: Record<string, string> = {
          slate: 'bg-slate-100 border-slate-400 text-slate-900',
          gray: 'bg-gray-100 border-gray-400 text-gray-900',
          zinc: 'bg-zinc-100 border-zinc-400 text-zinc-900',
          neutral: 'bg-neutral-100 border-neutral-400 text-neutral-900',
          stone: 'bg-stone-100 border-stone-400 text-stone-900',
          red: 'bg-red-100 border-red-400 text-red-900',
          orange: 'bg-orange-100 border-orange-400 text-orange-900',
          amber: 'bg-amber-100 border-amber-400 text-amber-900',
          yellow: 'bg-yellow-100 border-yellow-400 text-yellow-900',
          lime: 'bg-lime-100 border-lime-400 text-lime-900',
          green: 'bg-green-100 border-green-400 text-green-900',
          emerald: 'bg-emerald-100 border-emerald-400 text-emerald-900',
          teal: 'bg-teal-100 border-teal-400 text-teal-900',
          cyan: 'bg-cyan-100 border-cyan-400 text-cyan-900',
          sky: 'bg-sky-100 border-sky-400 text-sky-900',
          blue: 'bg-blue-100 border-blue-400 text-blue-900',
          indigo: 'bg-indigo-100 border-indigo-400 text-indigo-900',
          violet: 'bg-violet-100 border-violet-400 text-violet-900',
          purple: 'bg-purple-100 border-purple-400 text-purple-900',
          fuchsia: 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900',
          pink: 'bg-pink-100 border-pink-400 text-pink-900',
          rose: 'bg-rose-100 border-rose-400 text-rose-900',
        };
        bgColor = colors[shift.colorLabel] || bgColor;
      } else {
        if (shift.startTime < '12:00') {
          bgColor = 'bg-orange-50 border-orange-200 text-orange-800'; // Sáng
        } else if (shift.startTime < '17:00') {
          bgColor = 'bg-sky-50 border-sky-200 text-sky-800'; // Trưa
        } else {
          bgColor = 'bg-indigo-50 border-indigo-200 text-indigo-800'; // Tối
        }
      }

      const isRoleChanged = shift.roleInShift && shift.roleInShift !== (emp.defaultRole || 'PV');

      return (
        <div 
          key={shift.id}
          className={`w-full h-8 p-1 cursor-pointer border rounded shadow-sm hover:shadow-md transition-all ${bgColor} flex flex-col justify-center relative group/shift 
            ${!isCurrentBranch ? 'opacity-50 hover:opacity-100 grayscale-[0.5]' : ''}
            ${isCrossBranch && isCurrentBranch ? 'ring-2 ring-rose-400 ring-offset-1' : ''} 
            ${isSelected ? 'ring-2 ring-sky-600 ring-offset-1 z-10' : ''}
            ${isCopied ? 'border-2 border-dashed border-sky-500 animate-pulse' : ''}`}
          onClick={(e) => { e.stopPropagation(); handleCellClick(emp.id, dateStr, shift, e); }}
          onDoubleClick={() => handleDoubleClick(shift)}
        >
          {shift.isOff ? (
            <div className="text-[9px] font-black text-center tracking-widest">OFF</div>
          ) : (
            <>
              <div className="text-[9px] font-bold text-center leading-none">{shift.startTime} - {shift.endTime}</div>
              {(isCrossBranch || shift.roleInShift === 'BOTH') && (
                <div className="text-[8px] text-center opacity-80 mt-0.5 font-medium leading-none">
                  {isCrossBranch && <span className="text-rose-600 font-bold">(M)</span>}
                  {shift.roleInShift === 'BOTH' && <span className="ml-1 text-sky-700 font-bold bg-sky-100 px-0.5 rounded">Q&P</span>}
                </div>
              )}
            </>
          )}
          
          {shift.notes && (
            <div className="absolute top-0.5 left-0.5 text-[8px] group/note">
              <MessageSquare className="w-2 h-2 opacity-60" />
              <div className="absolute left-0 top-full mt-1 w-32 bg-slate-800 text-white text-[10px] p-2 rounded shadow-xl opacity-0 group-hover/note:opacity-100 pointer-events-none z-50 transition-opacity">
                {shift.notes}
              </div>
            </div>
          )}

          {isRoleChanged && !shift.isOff && (
            <div className="absolute top-0.5 right-0.5" title={`Vị trí: ${shift.roleInShift}`}>
              <AlertTriangle className="w-2 h-2 text-rose-500" />
            </div>
          )}
          <button
            onClick={(e) => handleCopyShift(e, shift)}
            className="absolute bottom-0.5 right-0.5 p-0.5 bg-white/50 hover:bg-white rounded opacity-0 group-hover/shift:opacity-100 transition-opacity"
            title="Copy"
          >
            <Copy className="w-2 h-2 text-slate-600" />
          </button>
        </div>
      );
    };

    return (
      <div className="h-full w-full min-h-[110px] relative group p-1 flex flex-col gap-1 justify-between">
        {renderShiftSlot(sangShift, '06:00')}
        {renderShiftSlot(truaShift, '12:00')}
        {renderShiftSlot(toiShift, '17:00')}
      </div>
    );
  };

  const renderDailySummary = (dateStr: string) => {
    const dailyShifts = schedules.filter(s => s.date === dateStr && !s.isOff && s.locationId === activeBranch);
    
    // Get unique employees for the day at this branch
    const uniqueEmpIds = new Set(dailyShifts.map(s => s.empId));
    const totalEmployees = uniqueEmpIds.size;

    const getShiftCounts = (shifts: WorkSchedule[]) => {
      let quay = 0;
      let pv = 0;
      shifts.forEach(s => {
        const emp = employees.find(e => e.id === s.empId);
        const role = s.roleInShift || emp?.defaultRole || 'PV';
        if (role === 'QUẦY') quay += 1;
        else if (role === 'PV') pv += 1;
        else if (role === 'BOTH') {
          quay += 0.5;
          pv += 0.5;
        }
      });
      return { quay, pv };
    };

    const sangShifts = dailyShifts.filter(s => s.startTime < '12:00');
    const truaShifts = dailyShifts.filter(s => s.startTime >= '12:00' && s.startTime < '17:00');
    const toiShifts = dailyShifts.filter(s => s.startTime >= '17:00');

    const sangCounts = getShiftCounts(sangShifts);
    const truaCounts = getShiftCounts(truaShifts);
    const toiCounts = getShiftCounts(toiShifts);

    const totalQuay = sangCounts.quay + truaCounts.quay + toiCounts.quay;
    const totalPV = sangCounts.pv + truaCounts.pv + toiCounts.pv;

    return (
      <div className="text-[10px] text-center font-medium text-slate-600 bg-slate-50 border-t border-slate-200 divide-y divide-slate-100">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <div className="py-1">
            <div className="text-orange-600 font-bold mb-0.5">Sáng</div>
            <div className="text-slate-500">{sangCounts.quay}Q - {sangCounts.pv}P</div>
          </div>
          <div className="py-1">
            <div className="text-sky-600 font-bold mb-0.5">Trưa</div>
            <div className="text-slate-500">{truaCounts.quay}Q - {truaCounts.pv}P</div>
          </div>
          <div className="py-1">
            <div className="text-indigo-600 font-bold mb-0.5">Tối</div>
            <div className="text-slate-500">{toiCounts.quay}Q - {toiCounts.pv}P</div>
          </div>
        </div>
        <div className="py-1.5 bg-slate-100/50">
          <div className="text-sky-800 font-bold text-xs">Tổng: {totalEmployees} NV</div>
          <div className="text-slate-500">{totalQuay} QUẦY - {totalPV} PV</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
      {/* Branch Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-100 h-[48px] flex-shrink-0 justify-between items-center pr-4">
        <div className="flex h-full">
          {managedBranches.map(branch => {
            const isGocPho = branch === 'Góc Phố';
            const isActive = activeBranch === branch;
            
            let activeClass = '';
            if (isActive) {
              activeClass = isGocPho 
                ? 'bg-amber-600 text-white border-b-4 border-b-amber-800' 
                : 'bg-emerald-600 text-white border-b-4 border-b-emerald-800';
            } else {
              activeClass = 'text-slate-500 hover:bg-slate-200';
            }

            return (
              <button
                key={branch}
                onClick={() => {
                  setActiveBranch(branch);
                  setSupportEmployeeIds([]); 
                }}
                className={`px-8 py-3 text-sm font-bold transition-all border-r border-slate-200 h-full ${activeClass}`}
              >
                {branch.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col gap-2 bg-slate-50 h-[100px] flex-shrink-0">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-lg font-bold text-slate-800 uppercase">Bảng Xếp Lịch Tuần {activeBranch}</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCloneLastWeek} 
              disabled={isCloning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <CopyPlus className="w-4 h-4" />
              {isCloning ? 'Đang nhân bản...' : 'Nhân bản tuần trước'}
            </button>
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
              <button onClick={handlePrevWeek} className="p-1 rounded hover:bg-slate-100 text-slate-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-slate-700 min-w-[180px] text-center">
                {format(weekStart, 'dd/MM/yyyy')} - {format(weekDays[6], 'dd/MM/yyyy')}
              </span>
              <button onClick={handleNextWeek} className="p-1 rounded hover:bg-slate-100 text-slate-600">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic font-medium">
          * Giờ ra ca được sắp tương đối. Quản lý sẽ điều phối giờ ra ca thực tế dựa trên tình hình khách tại quán.
        </p>
      </div>

      {/* Grid */}
      <div className="overflow-auto flex-1 relative bg-slate-50/30">
        {clipboard.length > 0 && (
          <div className="absolute top-2 right-4 z-20 bg-sky-600 text-white text-[10px] px-2 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1">
            <Copy className="w-3 h-3" />
            Đã copy {clipboard.length} ca (Ctrl+V để dán)
          </div>
        )}
        <table className="w-full border-collapse table-fixed min-w-[1020px]">
          <thead>
            <tr className="h-[60px]">
              <th className="w-[180px] p-3 border-b border-r border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-700 sticky left-0 z-20">
                Nhân viên
              </th>
              {weekDays.map(day => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <th key={day.toISOString()} className="w-[120px] p-2 border-b border-r border-slate-200 bg-slate-50 text-center sticky top-0 z-10">
                    <div className={`text-sm font-bold ${isWeekend ? 'text-rose-600' : 'text-slate-800'}`}>{format(day, 'EEEE', { locale: vi })}</div>
                    <div className={`text-xs ${isWeekend ? 'text-rose-500' : 'text-slate-500'}`}>{format(day, 'dd/MM')}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {/* Pha Chế Group */}
            {groupedEmployees.QUẦY.length > 0 && (
              <tr>
                <td colSpan={8} className="p-2.5 bg-sky-50/80 text-sky-900 font-bold text-sm border-b-2 border-slate-200 sticky left-0 z-20 tracking-wide">
                  PHA CHẾ (QUẦY)
                </td>
              </tr>
            )}
            {groupedEmployees.QUẦY.map(emp => (
              <tr key={emp.id} className="border-b border-slate-200 hover:bg-slate-50/50 h-[120px] transition-colors">
                <td className="p-3 border-r border-slate-200 font-medium text-sm text-slate-800 sticky left-0 bg-white z-10 overflow-hidden shadow-[1px_0_0_0_#e2e8f0]">
                  <div className="flex flex-col">
                    <span className="truncate">{emp.fullName}</span>
                    {emp.locationId !== activeBranch && (
                      <span className="text-[10px] text-rose-500 font-bold italic truncate">Hỗ trợ từ {emp.locationId}</span>
                    )}
                  </div>
                </td>
                {weekDays.map(day => (
                  <td key={day.toISOString()} className="p-0 border-r border-slate-200 align-top h-[120px]">
                    {renderCell(emp, format(day, 'yyyy-MM-dd'))}
                  </td>
                ))}
              </tr>
            ))}

            {/* Phục Vụ Group */}
            {groupedEmployees.PV.length > 0 && (
              <tr>
                <td colSpan={8} className="p-2.5 bg-violet-50/80 text-violet-900 font-bold text-sm border-b-2 border-slate-200 sticky left-0 z-20 tracking-wide">
                  PHỤC VỤ
                </td>
              </tr>
            )}
            {groupedEmployees.PV.map(emp => (
              <tr key={emp.id} className="border-b border-slate-200 hover:bg-slate-50/50 h-[120px] transition-colors">
                <td className="p-3 border-r border-slate-200 font-medium text-sm text-slate-800 sticky left-0 bg-white z-10 overflow-hidden shadow-[1px_0_0_0_#e2e8f0]">
                  <div className="flex flex-col">
                    <span className="truncate">{emp.fullName}</span>
                    {emp.locationId !== activeBranch && (
                      <span className="text-[10px] text-rose-500 font-bold italic truncate">Hỗ trợ từ {emp.locationId}</span>
                    )}
                  </div>
                </td>
                {weekDays.map(day => (
                  <td key={day.toISOString()} className="p-0 border-r border-slate-200 align-top h-[120px]">
                    {renderCell(emp, format(day, 'yyyy-MM-dd'))}
                  </td>
                ))}
              </tr>
            ))}

            {/* Add Support Employee Button */}
            <tr>
              <td colSpan={8} className="p-3 bg-slate-50 border-b border-slate-200 sticky left-0 z-10">
                <button 
                  onClick={() => setShowSupportModal(true)}
                  className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-800 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  + Thêm nhân viên hỗ trợ từ chi nhánh khác
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="h-[80px]">
              <td className="p-3 border-t border-r border-slate-200 bg-slate-100 font-bold text-sm text-slate-700 sticky left-0 z-10 text-right">
                Tổng kết ngày:
              </td>
              {weekDays.map(day => (
                <td key={day.toISOString()} className="p-0 border-t border-r border-slate-200 bg-slate-50 align-top h-[80px]">
                  {renderDailySummary(format(day, 'yyyy-MM-dd'))}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modal */}
      {showModal && (selectedCell || editingShift) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform transition-all scale-100">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-sky-50 to-white">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                {editingShift ? (
                  <><Info className="w-5 h-5 text-sky-600" /> Chỉnh sửa ca</>
                ) : (
                  <><Plus className="w-5 h-5 text-sky-600" /> Tạo ca mới</>
                )}
              </h3>
              <button 
                onClick={() => { setShowModal(false); setSelectedCell(null); setEditingShift(null); }}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Group 1: Time & Presets */}
                <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 bg-sky-600 rounded-full"></div>
                    <span className="text-xs font-black text-sky-800 uppercase tracking-wider">Thời gian và Ca mặc định</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {[
                      { label: 'Sáng', start: '06:00', end: '11:00', color: 'orange' },
                      { label: 'Trưa', start: '12:00', end: '17:00', color: 'sky' },
                      { label: 'Tối', start: '17:00', end: '22:00', color: 'indigo' }
                    ].map(preset => (
                      <button 
                        key={preset.label}
                        onClick={() => { setIsOff(false); setStartTime(preset.start); setEndTime(preset.end); }}
                        className={`flex-1 py-2.5 bg-white border ${!isOff && startTime === preset.start && endTime === preset.end ? `border-${preset.color}-500 ring-2 ring-${preset.color}-200` : `border-${preset.color}-200`} text-${preset.color}-700 rounded-lg hover:shadow-md active:translate-y-0.5 font-bold text-xs transition-all`}
                      >
                        Ca {preset.label}
                      </button>
                    ))}
                    <button 
                      onClick={() => setIsOff(!isOff)}
                      className={`flex-1 py-2.5 bg-white border ${isOff ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50' : 'border-rose-200 hover:border-rose-300'} text-rose-700 rounded-lg hover:shadow-md active:translate-y-0.5 font-bold text-xs transition-all flex items-center justify-center gap-1`}
                    >
                      {isOff ? <><XCircle className="w-3 h-3" /> Đang OFF</> : <><Circle className="w-3 h-3" /> Đặt OFF</>}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Giờ vào</label>
                      <input 
                        type="time" 
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Giờ ra</label>
                      <input 
                        type="time" 
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm font-medium"
                      />
                    </div>
                  </div>
                  {isOff && (
                    <div className="p-2 bg-rose-50 rounded-lg border border-dashed border-rose-200 flex items-center justify-center text-rose-600">
                      <p className="text-[10px] text-center font-medium italic">Ca này được đánh dấu là OFF (Nghỉ)</p>
                    </div>
                  )}
                </div>

                {/* Group 2: Location & Role */}
                {!isOff && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-4 bg-slate-600 rounded-full"></div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Chi nhánh & Vị trí</span>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Chi nhánh</label>
                        <div className="space-y-2">
                          {managedBranches.map(branch => (
                            <label key={branch} className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="radio" 
                                name="locationId" 
                                value={branch} 
                                checked={locationId === branch} 
                                onChange={e => setLocationId(e.target.value)}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                              />
                              <span className={`text-sm transition-colors ${locationId === branch ? 'text-sky-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                {branch}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Vị trí</label>
                        <div className="space-y-2">
                          {[
                            { value: 'QUẦY', label: 'QUẦY' },
                            { value: 'PV', label: 'PV' },
                            { value: 'BOTH', label: 'QUẦY & PV (50/50)' }
                          ].map(role => (
                            <label key={role.value} className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="radio" 
                                name="roleInShift" 
                                value={role.value} 
                                checked={roleInShift === role.value} 
                                onChange={e => setRoleInShift(e.target.value as 'QUẦY' | 'PV' | 'BOTH')}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                              />
                              <span className={`text-sm transition-colors ${roleInShift === role.value ? 'text-sky-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                {role.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Group 3: Labels & Notes */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 bg-violet-600 rounded-full"></div>
                  <span className="text-xs font-black text-violet-800 uppercase tracking-wider">Nhãn & Ghi chú</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Màu sắc đánh dấu</label>
                  <div className="grid grid-cols-8 gap-2 px-1">
                    {[
                      '', 'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange',
                      'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky',
                      'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
                    ].map(color => {
                      const colorMap: Record<string, string> = {
                        '': 'bg-white border-slate-200',
                        'slate': 'bg-slate-600 border-slate-700',
                        'gray': 'bg-gray-600 border-gray-700',
                        'zinc': 'bg-zinc-600 border-zinc-700',
                        'neutral': 'bg-neutral-600 border-neutral-700',
                        'stone': 'bg-stone-600 border-stone-700',
                        'red': 'bg-red-600 border-red-700',
                        'orange': 'bg-orange-600 border-orange-700',
                        'amber': 'bg-amber-600 border-amber-700',
                        'yellow': 'bg-yellow-600 border-yellow-700',
                        'lime': 'bg-lime-600 border-lime-700',
                        'green': 'bg-green-600 border-green-700',
                        'emerald': 'bg-emerald-600 border-emerald-700',
                        'teal': 'bg-teal-600 border-teal-700',
                        'cyan': 'bg-cyan-600 border-cyan-700',
                        'sky': 'bg-sky-600 border-sky-700',
                        'blue': 'bg-blue-600 border-blue-700',
                        'indigo': 'bg-indigo-600 border-indigo-700',
                        'violet': 'bg-violet-600 border-violet-700',
                        'purple': 'bg-purple-600 border-purple-700',
                        'fuchsia': 'bg-fuchsia-600 border-fuchsia-700',
                        'pink': 'bg-pink-600 border-pink-700',
                        'rose': 'bg-rose-600 border-rose-700',
                      };
                      return (
                        <button
                          key={color}
                          onClick={() => setColorLabel(color)}
                          className={`w-full aspect-square rounded-lg border transition-all shadow-sm ${colorMap[color]} ${colorLabel === color ? 'ring-2 ring-sky-500 ring-offset-1 scale-110 z-10' : 'hover:scale-105'}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Ghi chú nội bộ</label>
                  <div className="relative">
                    <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="VD: Trễ có xin phép, đổi ca..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm resize-none shadow-inner"
                      rows={3}
                    />
                    <MessageSquare className="absolute bottom-3 right-3 w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
              {editingShift ? (
                <button 
                  onClick={handleDeleteShift}
                  className="flex items-center gap-2 px-4 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              ) : <div></div>}
              
              <div className="flex gap-3">
                <button 
                  onClick={() => { setSelectedCell(null); setEditingShift(null); }}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                >
                  HỦY
                </button>
                <button 
                  onClick={handleSaveShift}
                  className="px-8 py-2.5 bg-sky-600 text-white font-black rounded-xl hover:bg-sky-700 hover:shadow-lg active:translate-y-0.5 transition-all shadow-md"
                >
                  LƯU CA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Employee Selection Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Chọn nhân viên hỗ trợ</h3>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <p className="text-sm text-slate-500 mb-4">Danh sách nhân viên từ chi nhánh khác có thể mượn sang {activeBranch}:</p>
              <div className="space-y-2">
                {employees
                  .filter(e => e.locationId !== activeBranch && !supportEmployeeIds.includes(e.id))
                  .map(emp => (
                    <div 
                      key={emp.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-sky-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSupportEmployeeIds(prev => [...prev, emp.id]);
                        setShowSupportModal(false);
                      }}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{emp.fullName}</div>
                        <div className="text-xs text-slate-500">{emp.locationId} - {emp.defaultRole}</div>
                      </div>
                      <Plus className="w-5 h-5 text-sky-600" />
                    </div>
                  ))}
                {employees.filter(e => e.locationId !== activeBranch && !supportEmployeeIds.includes(e.id)).length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic">Không còn nhân viên nào khác để thêm.</div>
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

