import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Plus, AlertTriangle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Copy, CopyPlus, UserPlus, Info, MessageSquare, Trash2, XCircle, Circle, FileSpreadsheet, Download } from 'lucide-react';
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
  taskNote?: string;
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
  onBatchDeleteShifts?: (ids: string[]) => Promise<void>;
  onBatchSaveShifts?: (shifts: any[]) => Promise<void>;
  onModalToggle?: (isOpen: boolean) => void;
  exportToCSV?: () => void;
  theme?: any;
  planningGoals?: any[];
}

const SHIFT_PRESETS = [
  { id: 'sang', label: 'Sáng', startTime: '06:00', endTime: '11:00', color: '#dcfce7', text: 'Sáng', textColor: '#166534' },
  { id: 'trua', label: 'Trưa', startTime: '12:00', endTime: '17:00', color: '#fef9c3', text: 'Trưa', textColor: '#854d0e' },
  { id: 'toi', label: 'Tối', startTime: '17:00', endTime: '22:00', color: '#e2e8f0', text: 'Tối', textColor: '#475569' },
];

export const SmartScheduleBuilder: React.FC<SmartScheduleBuilderProps> = ({
  employees,
  schedules,
  currentBranchFilter,
  managedBranches,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onBatchDeleteShifts,
  onBatchSaveShifts,
  onModalToggle,
  exportToCSV,
  theme,
  planningGoals = []
}) => {
  const activeBranch = currentBranchFilter;
  const [employeeOrder, setEmployeeOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smart_schedule_emp_order');
      if (saved) return JSON.parse(saved);
    } catch {}
    return employees.map(e => e.id);
  });

  useEffect(() => {
    localStorage.setItem('smart_schedule_emp_order', JSON.stringify(employeeOrder));
  }, [employeeOrder]);

  const moveEmployee = (empId: string, direction: 'up' | 'down') => {
    setEmployeeOrder(prev => {
      let current = [...prev];
      if (!current.includes(empId)) current.push(empId);
      const idx = current.indexOf(empId);
      if (direction === 'up' && idx > 0) {
        let temp = current[idx - 1];
        current[idx - 1] = current[idx];
        current[idx] = temp;
      } else if (direction === 'down' && idx < current.length - 1) {
        let temp = current[idx + 1];
        current[idx + 1] = current[idx];
        current[idx] = temp;
      }
      return current;
    });
  };

  const [supportEmployees, setSupportEmployees] = useState<{empId: string, role: string}[]>([]);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ empId: string; date: string } | null>(null);
  const [editingShift, setEditingShift] = useState<WorkSchedule | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (onModalToggle) {
      onModalToggle(showModal);
    }
  }, [showModal, onModalToggle]);
  
  // Interaction states
  const [activePopupCell, setActivePopupCell] = useState<{ empId: string; date: string; presetId: string; x: number; y: number } | null>(null);
  const [focusedSubCell, setFocusedSubCell] = useState<{ empId: string; date: string; presetId: string } | null>(null);
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActivePopupCell(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const getSlotIdFromTime = (time: string) => {
    if (!time) return 'sang';
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 4 && hour < 12) return 'sang';
    if (hour >= 12 && hour < 17) return 'trua';
    return 'toi';
  };

  const getShiftDeterministicId = (empId: string, date: string, slotId: string) => {
    return `shift_${empId}_${date}_${slotId}`;
  };

  const handleToggleShift = async (empId: string, date: string, preset: typeof SHIFT_PRESETS[0]) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const shiftId = getShiftDeterministicId(empId, date, preset.id);
      
      const existing = schedules.find(s => s.id === shiftId);

      if (existing) {
        await onDeleteShift(shiftId);
      } else {
        await onAddShift({
          id: shiftId,
          empId,
          date,
          startTime: preset.startTime,
          endTime: preset.endTime,
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          isOff: false
        } as any);
      }
    } catch (error) {
      console.error("Error toggling shift:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Quick Edit Mode state
  const [isQuickEditMode, setIsQuickEditMode] = useState(false);
  const [selectedQuickShift, setSelectedQuickShift] = useState<'Sáng' | 'Trưa' | 'Tối' | 'OFF' | null>(null);
  const [mobileSelectedDate, setMobileSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Local state for batch saving
  const [localSchedules, setLocalSchedules] = useState<WorkSchedule[]>(schedules);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // Only update local if not dirty, or if explicitly needed
    if (!hasUnsavedChanges) {
      setLocalSchedules(schedules);
    }
  }, [schedules, hasUnsavedChanges]);

  const handleApplyChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const loadingToast = toast.loading('Đang lưu thay đổi...');
    try {
      if (onBatchSaveShifts) {
        const currentWeekStartStr = format(weekStart, 'yyyy-MM-dd');
        const currentWeekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
        
        const localShiftsInWeek = localSchedules.filter(s => {
          return s.date >= currentWeekStartStr && s.date <= currentWeekEndStr;
        });

        const originalShiftsInWeek = schedules.filter(s => {
          return s.date >= currentWeekStartStr && s.date <= currentWeekEndStr;
        });

        if (onBatchSaveShifts) {
           const idsToDelete = originalShiftsInWeek.map(s => s.id);
           if (onBatchDeleteShifts && idsToDelete.length > 0) {
             await onBatchDeleteShifts(idsToDelete);
           }
           
           await onBatchSaveShifts(localShiftsInWeek);
        }
      }
      setHasUnsavedChanges(false);
      toast.success('Lưu lịch thành công!', { id: loadingToast });
    } catch (error) {
      console.error('Error batch saving:', error);
      toast.error('Lỗi khi lưu lịch', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocalToggleShift = (empId: string, date: string, preset: typeof SHIFT_PRESETS[0]) => {
    const shiftId = getShiftDeterministicId(empId, date, preset.id);
    const existing = localSchedules.find(s => s.id === shiftId);

    if (existing) {
      setLocalSchedules(prev => prev.filter(s => s.id !== shiftId));
    } else {
      setLocalSchedules(prev => [
        ...prev,
        {
          id: shiftId,
          empId,
          date,
          startTime: preset.startTime,
          endTime: preset.endTime,
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          isOff: false
        }
      ]);
    }
    setHasUnsavedChanges(true);
  };

  // Form state
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('11:00');
  const [locationId, setLocationId] = useState(currentBranchFilter === 'All' ? (managedBranches[0] || 'Góc Phố') : currentBranchFilter);
  const [roleInShift, setRoleInShift] = useState<'QUẦY' | 'PV' | 'BOTH' | undefined>(undefined);
  const [isOff, setIsOff] = useState(false);
  const [notes, setNotes] = useState('');
  const [taskNote, setTaskNote] = useState('');
  const [colorLabel, setColorLabel] = useState('');
  const [tasks, setTasks] = useState<ShiftTask[]>([]);

  // Excel-like Clipboard and selection state
  const [selectedCells, setSelectedCells] = useState<{empId: string, date: string, slotIndex: string}[]>([]);
  const [copiedShift, setCopiedShift] = useState<Partial<WorkSchedule> | null>(null);
  const [copiedIndicator, setCopiedIndicator] = useState<{empId: string, date: string, slotIndex: string} | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setActivePopupCell(null);
        setSelectedCells([]);
        setFocusedSubCell(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTimeLabel = (time: string | null | undefined) => {
    if (!time) return '00:00';
    try {
      const parts = time.split(':');
      if (parts.length < 2) return '00:00';
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1] || '0');
      if (isNaN(h)) return '00:00';
      if (m === 0) return `${h}h`;
      return `${h}h${m.toString().padStart(2, '0')}`;
    } catch (e) {
      return '00:00';
    }
  };

  const handleExcelPaste = React.useCallback(async () => {
    const targets = selectedCells.length > 0 ? selectedCells : (focusedSubCell ? [{ empId: focusedSubCell.empId, date: focusedSubCell.date, slotIndex: focusedSubCell.presetId }] : []);
    
    if (!copiedShift || !copiedIndicator || targets.length === 0) return;

    const shiftsToAdd: any[] = [];
    let skippedCount = 0;

    targets.forEach(cell => {
      if (cell.slotIndex !== copiedIndicator.slotIndex) {
        skippedCount++;
        return;
      }

      const deterministicId = getShiftDeterministicId(cell.empId, cell.date, cell.slotIndex);
      
      shiftsToAdd.push({
        ...copiedShift,
        id: deterministicId,
        empId: cell.empId,
        date: cell.date,
        startTime: copiedShift.startTime,
        endTime: copiedShift.endTime,
        locationId: copiedShift.locationId || (activeBranch === 'All' ? employees.find(e => e.id === cell.empId)?.locationId || 'Góc Phố' : activeBranch),
        isOff: copiedShift.isOff || false
      });
    });

    if (shiftsToAdd.length > 0) {
      setLocalSchedules(prev => {
        let next = [...prev];
        shiftsToAdd.forEach(shift => {
          const idx = next.findIndex(s => s.id === shift.id);
          if (idx >= 0) {
            next[idx] = shift;
          } else {
            next.push(shift);
          }
        });
        return next;
      });
      setHasUnsavedChanges(true);
    } else if (skippedCount > 0) {
      toast.error('Chỉ được dán vào cùng loại ca (Sáng vào Sáng, Trưa vào Trưa...)');
    }

    setSelectedCells([]); // clear selection after paste
    setFocusedSubCell(null);
  }, [copiedShift, copiedIndicator, selectedCells, focusedSubCell, activeBranch, employees]);

  const handleExcelDelete = React.useCallback(async () => {
    const targets = selectedCells.length > 0 ? selectedCells : (focusedSubCell ? [{ empId: focusedSubCell.empId, date: focusedSubCell.date, slotIndex: focusedSubCell.presetId }] : []);
    if (targets.length === 0) return;
    
    const idsToDelete = targets.map(cell => getShiftDeterministicId(cell.empId, cell.date, cell.slotIndex));
    
    setLocalSchedules(prev => prev.filter(s => !idsToDelete.includes(s.id)));
    setHasUnsavedChanges(true);

    setSelectedCells([]);
    setFocusedSubCell(null);
  }, [selectedCells, focusedSubCell]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent deleting if they are typing in an input field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === 'c') {
        if (selectedCells.length > 0 || focusedSubCell) {
          e.preventDefault();
          const targetCell = focusedSubCell || selectedCells[selectedCells.length - 1];
          const detId = getShiftDeterministicId(targetCell.empId, targetCell.date, targetCell.presetId || (targetCell as any).slotIndex);
          const shiftData = localSchedules.find(s => s.id === detId);
          
          if (shiftData) {
            const { id, empId, date, empName, shiftName, status, createdAt, updatedAt, ...rest } = shiftData as any;
            setCopiedShift(rest);
            setCopiedIndicator({ empId: targetCell.empId, date: targetCell.date, slotIndex: targetCell.presetId || (targetCell as any).slotIndex });
            toast.success(`Đã copy ca ngày ${format(parseISO(targetCell.date), 'dd/MM')}`);
          }
        }
      }
      
      if (isCtrl && e.key === 'v') {
        if (copiedShift && (selectedCells.length > 0 || focusedSubCell)) {
          e.preventDefault();
          handleExcelPaste();
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingShift) return;
        if (selectedCells.length > 0 || focusedSubCell) {
          e.preventDefault();
          handleExcelDelete();
        }
      }

      if (e.key === 'Escape') {
        setSelectedCells([]);
        setCopiedShift(null);
        setCopiedIndicator(null);
        setSelectedCell(null);
        setFocusedSubCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, copiedShift, focusedSubCell, localSchedules, handleExcelPaste, handleExcelDelete, editingShift]);

  useEffect(() => {
    setLocationId(activeBranch === 'All' ? (managedBranches[0] || 'Góc Phố') : activeBranch);
  }, [activeBranch, managedBranches]);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  const [pendingNavigation, setPendingNavigation] = useState<'prev' | 'next' | null>(null);

  const handlePrevWeek = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation('prev');
      return;
    }
    const newDate = subWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setMobileSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };
  
  const handleNextWeek = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation('next');
      return;
    }
    const newDate = addWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setMobileSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  const confirmNavigation = () => {
    setHasUnsavedChanges(false);
    if (pendingNavigation === 'prev') {
      const newDate = subWeeks(currentDate, 1);
      setCurrentDate(newDate);
      setMobileSelectedDate(format(newDate, 'yyyy-MM-dd'));
    } else if (pendingNavigation === 'next') {
      const newDate = addWeeks(currentDate, 1);
      setCurrentDate(newDate);
      setMobileSelectedDate(format(newDate, 'yyyy-MM-dd'));
    }
    setPendingNavigation(null);
  };

  const handlePrevDay = () => {
    const newDate = subDays(parseISO(mobileSelectedDate), 1);
    setMobileSelectedDate(format(newDate, 'yyyy-MM-dd'));
    setCurrentDate(newDate); // Sync current week view
  };

  const handleNextDay = () => {
    const newDate = addDays(parseISO(mobileSelectedDate), 1);
    setMobileSelectedDate(format(newDate, 'yyyy-MM-dd'));
    setCurrentDate(newDate); // Sync current week view
  };

  // Group employees by default role and branch
  const groupedEmployees = useMemo(() => {
    // 1. Get default employees for this branch (or all if 'All')
    const defaultEmployees = employees.filter(e => activeBranch === 'All' || e.locationId === activeBranch);
    
    // 2. Get support employees added to this view
    const manuallyAddedSupportEmployees = employees.filter(e => supportEmployees.find(se => se.empId === e.id));

    // 3. Get employees who have a shift at this branch in the current week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    
    const scheduledEmployees = employees.filter(e => {
      return localSchedules.some(s => 
        s.empId === e.id && 
        (activeBranch === 'All' || s.locationId === activeBranch) && 
        s.date >= weekStartStr && 
        s.date <= weekEndStr
      );
    });

    // Combine and remove duplicates
    const allVisibleEmployees = Array.from(new Map([...defaultEmployees, ...manuallyAddedSupportEmployees, ...scheduledEmployees].map(e => [e.id, e])).values());

    const quay = allVisibleEmployees.filter(e => {
      // First check if manually supported with a role
      if (activeBranch !== 'All') {
        const manualSupport = supportEmployees.find(se => se.empId === e.id);
        if (manualSupport) return manualSupport.role === 'QUẦY' || manualSupport.role === 'BOTH';
        
        // Next, check their shifts in this branch this week to see if there's a role override
        const activeBranchShifts = localSchedules.filter(s => 
          s.empId === e.id && 
          s.locationId === activeBranch &&
          s.date >= weekStartStr && 
          s.date <= weekEndStr
        );
        if (activeBranchShifts.length > 0) {
           const hasQuayShift = activeBranchShifts.some(s => s.roleInShift === 'QUẦY' || s.roleInShift === 'BOTH');
           const hasPvShift = activeBranchShifts.some(s => s.roleInShift === 'PV');
           if (hasQuayShift && !hasPvShift) return true;
           if (!hasQuayShift && hasPvShift) return false;
        }
      }
      return e.defaultRole === 'QUẦY';
    });
    
    const pv = allVisibleEmployees.filter(e => {
      if (activeBranch !== 'All') {
        const manualSupport = supportEmployees.find(se => se.empId === e.id);
        if (manualSupport) return manualSupport.role === 'PV' || manualSupport.role === 'BOTH';
        
        const activeBranchShifts = localSchedules.filter(s => 
          s.empId === e.id && 
          s.locationId === activeBranch &&
          s.date >= weekStartStr && 
          s.date <= weekEndStr
        );
        if (activeBranchShifts.length > 0) {
           const hasQuayShift = activeBranchShifts.some(s => s.roleInShift === 'QUẦY' || s.roleInShift === 'BOTH');
           const hasPvShift = activeBranchShifts.some(s => s.roleInShift === 'PV');
           if (!hasQuayShift && hasPvShift) return true;
           if (hasQuayShift && !hasPvShift) return false;
        }
      }
      return e.defaultRole !== 'QUẦY';
    });
    
    const sortFn = (a: Employee, b: Employee) => {
        const indexA = employeeOrder.indexOf(a.id);
        const indexB = employeeOrder.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
    };

    return { QUẦY: quay.sort(sortFn), PV: pv.sort(sortFn) };
  }, [employees, activeBranch, supportEmployees, localSchedules, currentDate, employeeOrder]);

  const handleCellClick = (empId: string, date: string, existingShift?: WorkSchedule, e?: React.MouseEvent) => {
    if (isQuickEditMode && selectedQuickShift) {
      if (existingShift) {
        // If clicking existing shift in quick mode, maybe do nothing or remove?
        // Let's toggle: if same type, remove. If different, update.
        const currentType = existingShift.isOff ? 'OFF' : 
                          existingShift.startTime < '12:00' ? 'Sáng' :
                          existingShift.startTime < '17:00' ? 'Trưa' : 'Tối';
        
        if (currentType === selectedQuickShift) {
           onDeleteShift(existingShift.id);
           // toast.success('Đã xóa ca');
        } else {
           const presets: any = {
             'Sáng': { isOff: false, startTime: '06:00', endTime: '11:00' },
             'Trưa': { isOff: false, startTime: '12:00', endTime: '17:00' },
             'Tối': { isOff: false, startTime: '17:00', endTime: '22:00' },
             'OFF': { isOff: true, startTime: '00:00', endTime: '00:00' }
           };
           onUpdateShift(existingShift.id, presets[selectedQuickShift]);
           // toast.success(`Đã cập nhật -> ${selectedQuickShift}`);
        }
      } else {
        // Add new shift with preset
        const presets: any = {
          'Sáng': { isOff: false, startTime: '06:00', endTime: '11:00' },
          'Trưa': { isOff: false, startTime: '12:00', endTime: '17:00' },
          'Tối': { isOff: false, startTime: '17:00', endTime: '22:00' },
          'OFF': { isOff: true, startTime: '00:00', endTime: '00:00' }
        };
        const p = presets[selectedQuickShift];
        onAddShift({
          empId,
          date,
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          ...p
        });
        // toast.success(`Gán ca ${selectedQuickShift}`);
      }
      return;
    }

    const isMulti = e?.ctrlKey || e?.metaKey || e?.shiftKey;
    
    if (existingShift) {
      if (isMulti) {
        // removed setSelectedShifts multi logic, using cell-based UI now
      } else {
        setSelectedCell({ empId, date });
      }
    } else {
      setSelectedCell({ empId, date });
    }
  };

  const handleDoubleClick = (shift: WorkSchedule) => {
    const emp = employees.find(e => e.id === shift.empId);
    setEditingShift(shift);
    setStartTime(shift.startTime || '08:00');
    setEndTime(shift.endTime || '17:00');
    setLocationId(shift.locationId || activeBranch);
    setRoleInShift(shift.roleInShift);
    setIsOff(!!shift.isOff);
    setNotes(shift.notes || '');
    setTaskNote(shift.taskNote || '');
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
    setRoleInShift(undefined);
    setIsOff(false);
    setNotes('');
    setTaskNote('');
    setColorLabel('');
    setTasks([]);
    setShowModal(true);
  };

  const calculateDuration = (start: string, end: string) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // Handle overnight
    return diff / 60;
  };

  const handleSaveShift = async () => {
    if (isSaving) return;
    const normalizeTime = (t: string) => {
      if (!t) return '00:00';
      const [h, m] = t.split(':');
      return `${h.padStart(2, '0')}:${m?.padStart(2, '0') || '00'}`;
    };

    const finalStartTime = normalizeTime(startTime);
    const finalEndTime = normalizeTime(endTime);
    const duration = calculateDuration(finalStartTime, finalEndTime);

    const empId = editingShift ? editingShift.empId : selectedCell?.empId;
    const date = editingShift ? editingShift.date : selectedCell?.date;

    if (!empId || !date) return;

    if (!isOff && duration >= 7) {
      const confirmSplit = window.confirm(`Ca làm việc kéo dài ${duration.toFixed(1)}h (>= 7h). Hệ thống sẽ tự động tách thành 2 ca (Sáng/Trưa/Tối) theo quy định. Tiếp tục?`);
      if (!confirmSplit) return;

      const startSlotId = getSlotIdFromTime(finalStartTime);
      
      const newShifts: WorkSchedule[] = [];
      if (startSlotId === 'trua' && finalEndTime > '17:00') {
        newShifts.push({
          id: getShiftDeterministicId(empId, date, 'trua'),
          empId, date, startTime: finalStartTime, endTime: '17:00',
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          isOff: false,
          ...(roleInShift ? { roleInShift } : {})
        } as any);
        newShifts.push({
          id: getShiftDeterministicId(empId, date, 'toi'),
          empId, date, startTime: '17:00', endTime: finalEndTime,
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          isOff: false,
          ...(roleInShift ? { roleInShift } : {})
        } as any);
      } else if (startSlotId === 'sang' && finalEndTime > '12:00') {
        newShifts.push({
          id: getShiftDeterministicId(empId, date, 'sang'),
          empId, date, startTime: finalStartTime, endTime: '12:00',
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          isOff: false,
          ...(roleInShift ? { roleInShift } : {})
        } as any);
        newShifts.push({
          id: getShiftDeterministicId(empId, date, 'trua'),
          empId, date, startTime: '12:00', endTime: finalEndTime,
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          isOff: false,
          ...(roleInShift ? { roleInShift } : {})
        } as any);
      } else {
        newShifts.push({
          id: getShiftDeterministicId(empId, date, startSlotId),
          empId, date, startTime: finalStartTime, endTime: finalEndTime,
          locationId: activeBranch === 'All' ? employees.find(e => e.id === empId)?.locationId || 'Góc Phố' : activeBranch,
          isOff: !!isOff,
          ...(roleInShift ? { roleInShift } : {})
        } as any);
      }

      setLocalSchedules(prev => {
        let next = [...prev];
        if (editingShift) {
          next = next.filter(s => s.id !== editingShift.id);
        }
        const newIds = newShifts.map(s => s.id);
        next = next.filter(s => !newIds.includes(s.id));
        return [...next, ...newShifts];
      });
      setHasUnsavedChanges(true);
      setShowModal(false);
      setEditingShift(null);
      return;
    }

    const slotId = getSlotIdFromTime(finalStartTime);
    const deterministicId = getShiftDeterministicId(empId, date, slotId);

    const baseShiftData: any = {
      id: deterministicId,
      startTime: finalStartTime,
      endTime: finalEndTime,
      taskNote: taskNote || '',
      isOff: !!isOff,
      notes: notes || '',
      colorLabel: colorLabel || '',
      tasks: tasks || [],
    };

    if (roleInShift) {
      baseShiftData.roleInShift = roleInShift;
    }

    const finalLocationId = (locationId === 'All' || !locationId) 
      ? (employees.find(e => e.id === empId)?.locationId || 'Góc Phố')
      : locationId;

    setLocalSchedules(prev => {
      let next = [...prev];
      if (editingShift && editingShift.id !== deterministicId) {
        next = next.filter(s => s.id !== editingShift.id);
      }
      next = next.filter(s => s.id !== deterministicId);
      return [...next, { ...baseShiftData, empId, date, locationId: finalLocationId }];
    });
    
    setHasUnsavedChanges(true);
    setEditingShift(null);
    setSelectedCell(null);
    setShowModal(false);
  };

  const handleDeleteShift = async () => {
    if (editingShift) {
      setLocalSchedules(prev => prev.filter(s => s.id !== editingShift.id));
      setHasUnsavedChanges(true);
      setEditingShift(null);
      setShowModal(false);
    }
  };

  const [showCloneConfirm, setShowCloneConfirm] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        else if (showCloneConfirm) setShowCloneConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal, showCloneConfirm]);

  const handleDọnRácTứcThì = async () => {
    const confirmed = window.confirm("HỆ THỐNG SẼ XOÁ TOÀN BỘ CÁC CA LỖI/CA TRÙNG TRONG TUẦN NÀY ĐỂ TRẢ LẠI TRẠNG THÁI TRỐNG. TIẾP TỤC?");
    if (!confirmed) return;
    
    setIsSaving(true);
    toast.loading("Đang thực hiện thanh trừng dữ liệu lỗi...", { id: 'purge' });
    
    try {
      const currentWeekStartStr = format(weekStart, 'yyyy-MM-dd');
      const currentWeekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      
      const currentWeekShifts = localSchedules.filter(s => {
        return s.date >= currentWeekStartStr && s.date <= currentWeekEndStr;
      });

      // Clear all non-deterministic shifts in one go
      for (const s of currentWeekShifts) {
        const slotId = getSlotIdFromTime(s.startTime);
        const detId = getShiftDeterministicId(s.empId, s.date, slotId);
        
        // If it's a legacy ID OR there's more than one for this slot, wipe it
        const duplicates = currentWeekShifts.filter(other => 
          other.empId === s.empId && 
          other.date === s.date && 
          getSlotIdFromTime(other.startTime) === slotId
        );

        if (s.id !== detId || duplicates.length > 1) {
          await onDeleteShift(s.id);
        }
      }
      toast.success("Hệ thống đã sạch sẽ!", { id: 'purge' });
    } catch (e) {
      toast.error("Lỗi khi dọn dẹp", { id: 'purge' });
    } finally {
      setIsSaving(false);
    }
  };
  const handleCopyToNextWeek = async () => {
    setIsCloning(true);
    toast.loading("Đang chuẩn bị dữ liệu tuần mới...", { id: 'clone' });
    try {
      const nextWeekStart = addWeeks(weekStart, 1);
      const nextWeekEnd = addDays(nextWeekStart, 6);
      const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
      const nextWeekEndStr = format(nextWeekEnd, 'yyyy-MM-dd');

      // 1. Find and clear ALL existing shifts in the TARGET week for the current scope
      const nextWeekShiftsToDelete = schedules.filter(s => {
        return s.date >= nextWeekStartStr && s.date <= nextWeekEndStr && (activeBranch === 'All' || s.locationId === activeBranch);
      });

      if (nextWeekShiftsToDelete.length > 0) {
        if (onBatchDeleteShifts) {
          await onBatchDeleteShifts(nextWeekShiftsToDelete.map(s => s.id));
        } else {
          for (const shift of nextWeekShiftsToDelete) {
            await onDeleteShift(shift.id);
          }
        }
      }

      // 2. Get shifts from CURRENT week
      const currentWeekStartStr = format(weekStart, 'yyyy-MM-dd');
      const currentWeekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      
      const currentWeekShifts = localSchedules.filter(s => {
        return s.date >= currentWeekStartStr && s.date <= currentWeekEndStr && (activeBranch === 'All' || s.locationId === activeBranch);
      });

      // 3. Clone them to next week
      const clonedShifts = currentWeekShifts.map(shift => {
        const nextWeekDate = format(addWeeks(parseISO(shift.date), 1), 'yyyy-MM-dd');
        const slotId = getSlotIdFromTime(shift.startTime);
        const deterministicId = getShiftDeterministicId(shift.empId, nextWeekDate, slotId);
        
        return {
          id: deterministicId,
          empId: shift.empId,
          date: nextWeekDate,
          startTime: shift.startTime,
          endTime: shift.endTime,
          locationId: shift.locationId,
          taskNote: shift.taskNote || '',
          isOff: !!shift.isOff,
          notes: shift.notes || '',
          colorLabel: shift.colorLabel || '',
          tasks: shift.tasks || [],
          ...(shift.roleInShift ? { roleInShift: shift.roleInShift } : {})
        };
      });

      if (clonedShifts.length > 0) {
        if (onBatchSaveShifts) {
          await onBatchSaveShifts(clonedShifts);
        } else {
          for (const shift of clonedShifts) {
            await onAddShift(shift);
          }
        }
      }
      
      // Jump view to next week
      setHasUnsavedChanges(false);
      const newDate = addWeeks(currentDate, 1);
      setCurrentDate(newDate);
      setMobileSelectedDate(format(newDate, 'yyyy-MM-dd'));
      toast.success("Đã copy lịch qua tuần mới thành công!", { id: 'clone' });
    } catch (error) {
      console.error('Error cloning schedule:', error);
      toast.error("Lỗi khi copy lịch. Vui lòng thử lại.", { id: 'clone' });
    } finally {
      setIsCloning(false);
      setShowCloneConfirm(false);
    }
  };

  const renderCell = (emp: Employee, dateStr: string) => {
    const dayShifts = localSchedules.filter(s => s.empId === emp.id && s.date === dateStr);

    const handleSubCellDoubleClick = async (presetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isQuickEditMode) return;

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
      if (shiftLocId && empLocId && shiftLocId !== empLocId && shiftLocId !== 'All') {
         // Create abbr: "Phố Xanh" -> "PX"
         locLabel = shiftLocId.split(' ').map(w => w[0]).join('').toUpperCase();
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
          
          const isActive = !!shift;
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

            <button 
              onClick={() => setShowCloneConfirm(true)} 
              disabled={isCloning}
              title="Copy tuần"
              className="flex items-center justify-center p-2 text-amber-900 bg-white hover:bg-amber-50 rounded-md border border-amber-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <CopyPlus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowSupportModal(true)} 
              title="Thêm nhân viên hỗ trợ từ chi nhánh khác"
              className="hidden md:flex items-center justify-center p-2 text-sky-700 bg-white hover:bg-sky-50 rounded-md border border-sky-200 transition-all active:scale-95 flex-shrink-0 gap-1 lg:px-3"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden lg:inline text-xs font-bold">Thêm NV hỗ trợ</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleApplyChanges}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 transition-all font-sans"
            >
              LƯU
            </button>
            <button 
              onClick={exportToCSV} 
              title="Xuất Báo Cáo CSV"
              className="flex items-center justify-center p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-md border border-emerald-500 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

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
      <div className="hidden md:block overflow-auto flex-1 relative bg-white">
        <table className="w-full border-separate border-spacing-0 table-fixed">
          <thead>
            <tr className="bg-slate-50 shadow-sm sticky top-0 z-30">
              <th className="w-[160px] p-4 text-left text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 border-r border-r-slate-300 sticky left-0 z-40 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Nhân viên
              </th>
              {weekDays.map(day => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = isSameDay(day, new Date());
                return (
                  <th key={day.toISOString()} className={`p-2 border-b border-slate-200 border-r-2 border-r-slate-300 text-center transition-colors min-w-[120px] ${isToday ? 'bg-sky-50' : ''}`}>
                    <div className={`text-[9px] font-black uppercase tracking-widest ${isWeekend ? 'text-rose-500' : 'text-slate-400'}`}>
                      {format(day, 'EEEE', { locale: vi })}
                    </div>
                    <div className={`text-sm font-black ${isToday ? 'text-sky-600' : 'text-slate-900'}`}>
                      {format(day, 'dd/MM')}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {groupedEmployees.QUẦY.map(emp => (
              <tr key={emp.id} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3 border-b border-slate-200 border-r-2 border-r-slate-300 font-medium text-[13px] text-slate-800 sticky left-0 bg-white z-20 group-hover:bg-slate-50 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 group/emp" tabIndex={0}>
                      <span className="truncate tracking-tight flex-1" title={emp.fullName}>{emp.fullName}</span>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover/emp:opacity-100 group-focus/emp:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover/emp:pointer-events-auto group-focus/emp:pointer-events-auto focus-within:pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'up'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronUp size={12} strokeWidth={3} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'down'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronDown size={12} strokeWidth={3} /></button>
                      </div>
                    </div>
                    {activeBranch !== 'All' && emp.locationId !== activeBranch && (
                      <span className="text-[8px] text-rose-500 font-black italic tracking-tighter mt-0.5">❂ Hỗ trợ từ {emp.locationId}</span>
                    )}
                  </div>
                </td>
                {weekDays.map(day => (
                  <td key={day.toISOString()} className="p-0 border-b border-slate-200 border-r-2 border-r-slate-300 align-middle">
                    {renderCell(emp, format(day, 'yyyy-MM-dd'))}
                  </td>
                ))}
              </tr>
            ))}

            {/* Subtle Group Separator for PV */}
            {groupedEmployees.PV.length > 0 && groupedEmployees.QUẦY.length > 0 && (
              <tr className="h-1.5 bg-slate-100">
                <td colSpan={8} className="h-1.5 p-0 border-y border-slate-200 sticky left-0 z-20 bg-slate-200/50 shadow-sm">
                </td>
              </tr>
            )}
            {groupedEmployees.PV.map(emp => (
              <tr key={emp.id} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3 border-b border-slate-200 border-r-2 border-r-slate-300 font-medium text-[13px] text-slate-800 sticky left-0 bg-white z-20 group-hover:bg-slate-50 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 group/emp" tabIndex={0}>
                      <span className="truncate tracking-tight flex-1" title={emp.fullName}>{emp.fullName}</span>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover/emp:opacity-100 group-focus/emp:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover/emp:pointer-events-auto group-focus/emp:pointer-events-auto focus-within:pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'up'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronUp size={12} strokeWidth={3} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'down'); }} className="p-0 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 leading-none outline-none"><ChevronDown size={12} strokeWidth={3} /></button>
                      </div>
                    </div>
                    {activeBranch !== 'All' && emp.locationId !== activeBranch && (
                      <span className="text-[8px] text-rose-500 font-black italic tracking-tighter mt-0.5">❂ Hỗ trợ từ {emp.locationId}</span>
                    )}
                  </div>
                </td>
                {weekDays.map(day => (
                  <td key={day.toISOString()} className="p-0 border-b border-slate-200 border-r-2 border-r-slate-300 align-middle">
                    {renderCell(emp, format(day, 'yyyy-MM-dd'))}
                  </td>
                ))}
              </tr>
            ))}
            
            {/* Add Employee Row */}
          </tbody>
          <tfoot className="sticky bottom-0 z-30 bg-white">
            <tr className="shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <td className="p-4 border-t border-slate-200 border-r-2 border-r-slate-300 bg-slate-50 font-black text-[10px] text-slate-400 uppercase tracking-widest sticky left-0 z-40 text-right shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                BỐ TRÍ:
              </td>
              {weekDays.map(day => (
                <td key={day.toISOString()} className="p-0 border-t border-slate-200 border-r-2 border-r-slate-300 bg-white align-top">
                  {renderDailySummary(format(day, 'yyyy-MM-dd'))}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* View Mobile (Daily Management) */}
      <div className="md:hidden flex-1 overflow-y-auto bg-slate-50">
         <div className="bg-white rounded-t-xl shadow-sm border-t border-slate-100 overflow-hidden mb-2">
            <div className="px-1.5 py-2 border-b border-slate-50 bg-white flex items-center sticky top-0 z-10 shadow-sm gap-1.5">
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <button 
                    onClick={handlePrevDay} 
                    className="p-1 px-[2px] bg-slate-50 text-slate-400 rounded-lg active:bg-slate-100 transition-colors h-8 flex items-center justify-center outline-none"
                  >
                    <ChevronLeft size={20} strokeWidth={1.5} />
                  </button>
                  
                  <div className="flex-1 flex justify-center relative min-w-max">
                    <div className="text-center">
                      <span className="text-[12px] font-black text-slate-800 tracking-tight uppercase leading-none block">
                        {format(parseISO(mobileSelectedDate), 'dd/MM', { locale: vi })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">
                        {format(parseISO(mobileSelectedDate), 'EEEE', { locale: vi })}
                      </span>
                      <input 
                        type="date"
                        value={mobileSelectedDate}
                        onChange={(e) => {
                          setMobileSelectedDate(e.target.value);
                          setCurrentDate(parseISO(e.target.value));
                        }}
                        className="w-full h-full opacity-0 absolute inset-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleNextDay} 
                    className="p-1 px-[2px] bg-slate-50 text-slate-400 rounded-lg active:bg-slate-100 transition-colors h-8 flex items-center justify-center outline-none"
                  >
                    <ChevronRight size={20} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Daily Total Summary for Mobile - Aligned with shift columns */}
                <div className="w-[180px] flex-shrink-0 h-8 border-l border-slate-100 pl-1">
                   {renderDailySummary(mobileSelectedDate, 'mobile')}
                </div>
            </div>
            
            <div className="divide-y divide-slate-100 pb-12">
               {(Object.entries(groupedEmployees) as [string, Employee[]][]).map(([role, list]) => (
                 <React.Fragment key={role}>
                    {role === 'PV' && groupedEmployees.QUẦY.length > 0 && (
                      <div className="h-1.5 bg-slate-200 w-full shadow-inner border-y border-slate-100"></div>
                    )}
                    {list.map(emp => (
                      <div key={emp.id} tabIndex={0} className="group/mob px-1.5 py-1.5 flex items-center gap-1.5 bg-white hover:bg-slate-50 transition-all border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative active:bg-sky-50 focus:bg-slate-50 outline-none">
                        <div className="flex flex-col gap-1 -ml-1 opacity-0 group-hover/mob:opacity-100 group-focus/mob:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover/mob:pointer-events-auto group-focus/mob:pointer-events-auto focus-within:pointer-events-auto w-5">
                          <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'up'); }} className="p-0.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded outline-none"><ChevronUp size={14} strokeWidth={2.5} /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveEmployee(emp.id, 'down'); }} className="p-0.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded outline-none"><ChevronDown size={14} strokeWidth={2.5} /></button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 truncate leading-tight tracking-tight">{emp.fullName}</p>
                          {activeBranch !== 'All' && emp.locationId !== activeBranch && (
                            <p className="text-[9px] text-rose-500 font-bold italic truncate tracking-tight uppercase mt-0.5">❂ TỪ {emp.locationId}</p>
                          )}
                        </div>
                        <div className="w-[180px] flex-shrink-0 h-[40px]">
                          {renderCell(emp, mobileSelectedDate)}
                        </div>
                      </div>
                    ))}
                 </React.Fragment>
               ))}
            </div>
         </div>
      </div>

      {/* Mini Popup for OFF/Copy/Paste/Delete */}
      {activePopupCell && (
        <div 
          className="fixed z-[150] bg-white border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-2xl p-1 flex gap-0.5 animate-in fade-in zoom-in duration-200"
          style={{ top: activePopupCell.y - 60, left: Math.min(window.innerWidth - 140, Math.max(10, activePopupCell.x - 60)) }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={async () => {
              const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
              const existing = schedules.filter(s => s.empId === activePopupCell.empId && s.date === activePopupCell.date && s.startTime === preset.startTime);
              for (const s of existing) await onDeleteShift(s.id);
              
              await onAddShift({
                empId: activePopupCell.empId,
                date: activePopupCell.date,
                startTime: preset.startTime,
                endTime: preset.endTime,
                locationId: activeBranch === 'All' ? 'Góc Phố' : activeBranch,
                isOff: true
              });
              // toast.success("Đã đặt OFF");
              setActivePopupCell(null);
            }}
            className="p-2.5 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors font-black text-[10px]"
            title="OFF"
          >
            OFF
          </button>
          <button 
            onClick={async () => {
              const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
              const shift = schedules.find(s => s.empId === activePopupCell.empId && s.date === activePopupCell.date && s.startTime === preset.startTime);
              if (shift) {
                // Omit id, date, empId for clipboard
                const { id, date, empId, ...cleanShift } = shift as any;
                setCopiedShift({ ...cleanShift, sourceType: preset.id });
                // toast.success("Đã copy ca");
              } else {
                // toast.error("Vị trí này không có ca để copy");
              }
              setActivePopupCell(null);
            }}
            className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button 
            onClick={async () => {
              if (copiedShift) {
                const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
                const item = copiedShift as any;
                
                // Restriction: Check if source type matches target type
                if (item.sourceType && item.sourceType !== preset.id) {
                  setActivePopupCell(null);
                  return;
                }

                // 1. Delete existing shifts in this slot
                const existing = schedules.filter(s => s.empId === activePopupCell.empId && s.date === activePopupCell.date && s.startTime === preset.startTime);
                for (const s of existing) await onDeleteShift(s.id);

                // 2. Add the copied shift config to the new target
                await onAddShift({
                  ...item,
                  empId: activePopupCell.empId,
                  date: activePopupCell.date,
                  // Ensure times match the target slot's preset if it's a cross-copy (though we restricted it now)
                  startTime: preset.startTime,
                  endTime: preset.endTime
                } as any);
                // toast.success("Đã dán ca");
              } else {
                // toast.error("Bộ nhớ đệm trống");
              }
              setActivePopupCell(null);
            }}
            className="p-2.5 hover:bg-sky-50 text-sky-600 rounded-xl transition-colors"
            title="Paste"
          >
            <CopyPlus className="w-4 h-4" />
          </button>
          <button 
            onClick={async () => {
              const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
              
              const shiftId = getShiftDeterministicId(activePopupCell.empId, activePopupCell.date, preset.id);
              await onDeleteShift(shiftId);
              setActivePopupCell(null);
            }}
            className="p-2.5 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (selectedCell || editingShift) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform transition-all scale-100">
            <div className={`p-4 border-b border-white/10 flex justify-between items-center ${theme?.header || 'bg-slate-800'}`}>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {editingShift ? (
                  <><Info className="w-5 h-5 text-white/80" /> Chỉnh sửa ca</>
                ) : (
                  <><Plus className="w-5 h-5 text-white/80" /> Tạo ca mới</>
                )}
              </h3>
              <button 
                onClick={() => { setShowModal(false); setSelectedCell(null); setEditingShift(null); }}
                className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-3 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Group 1: Time & Presets */}
                <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 bg-sky-600 rounded-full"></div>
                    <span className="text-xs font-black text-sky-800 uppercase tracking-wider">Thời gian và Ca mặc định</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {[
                      { label: 'Sáng', start: '06:00', end: '11:00', color: 'emerald' }, // Greenish for morning
                      { label: 'Trưa', start: '12:00', end: '17:00', color: 'sky' },
                      { label: 'Tối', start: '17:00', end: '22:00', color: 'slate' } // Dark gray for evening
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

                {/* Group 2: Branch & Role Selection */}
                {!isOff && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-4 bg-slate-600 rounded-full"></div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Chi nhánh & Vị trí</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Làm việc tại chi nhánh</label>
                        <div className="flex flex-wrap gap-2">
                          {managedBranches.map(branch => (
                            <button
                              key={branch}
                              onClick={() => setLocationId(branch)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${locationId === branch ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                              {branch}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Vai trò trong ca</label>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={roleInShift === 'QUẦY' || roleInShift === 'BOTH'} 
                              onChange={e => {
                                const isChecked = e.target.checked;
                                if (isChecked) {
                                  setRoleInShift(roleInShift === 'PV' ? 'BOTH' : 'QUẦY');
                                } else {
                                  setRoleInShift(roleInShift === 'BOTH' ? 'PV' : undefined);
                                }
                              }}
                              className="w-5 h-5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                            />
                            <span className={`text-sm transition-colors ${roleInShift === 'QUẦY' || roleInShift === 'BOTH' ? 'text-sky-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                              QUẦY
                            </span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={roleInShift === 'PV' || roleInShift === 'BOTH'} 
                              onChange={e => {
                                const isChecked = e.target.checked;
                                if (isChecked) {
                                  setRoleInShift(roleInShift === 'QUẦY' ? 'BOTH' : 'PV');
                                } else {
                                  setRoleInShift(roleInShift === 'BOTH' ? 'QUẦY' : undefined);
                                }
                              }}
                              className="w-5 h-5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                            />
                            <span className={`text-sm transition-colors ${roleInShift === 'PV' || roleInShift === 'BOTH' ? 'text-sky-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                              PHỤC VỤ (PV)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Group 3: Labels & Notes */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3 shadow-sm">
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Ghi chú Vệ sinh / Công việc (TaskNote)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={taskNote}
                      onChange={e => setTaskNote(e.target.value)}
                      placeholder="VD: Dọn kho, vệ sinh tủ lạnh..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm shadow-inner"
                    />
                    <span className="absolute right-3 top-3 text-lg">🧹</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
              <div>
                {editingShift && (
                  <button 
                    onClick={handleDeleteShift}
                    disabled={isSaving}
                    className="px-4 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 border border-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    XOÁ CA
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setSelectedCell(null); setEditingShift(null); setShowModal(false); }}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                >
                  HỦY
                </button>
                <button 
                  onClick={handleSaveShift}
                  disabled={isSaving}
                  className={`px-8 py-2.5 ${theme?.button || 'bg-sky-600'} text-white font-black rounded-xl hover:opacity-90 hover:shadow-lg active:translate-y-0.5 transition-all shadow-md disabled:opacity-50 disabled:grayscale`}
                >
                  {isSaving ? 'ĐANG LƯU...' : 'LƯU'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  .filter(e => e.locationId !== activeBranch && !supportEmployees.find(se => se.empId === e.id))
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
                {employees.filter(e => e.locationId !== activeBranch && !supportEmployees.find(se => se.empId === e.id)).length === 0 && (
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

