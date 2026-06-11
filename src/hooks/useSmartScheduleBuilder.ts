import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { format, startOfWeek, addDays, parseISO, addWeeks, subWeeks, subDays, isSameDay } from 'date-fns';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { vi } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Employee, WorkSchedule, ShiftTask } from '../types/admin';
import { SHIFT_PRESETS } from '../components/schedule/SmartScheduleConstants';
import { SmartScheduleBuilderProps } from '../components/SmartScheduleBuilder';

export function useSmartScheduleBuilder(props: SmartScheduleBuilderProps) {
  const {

  employees,
  schedules,
  currentBranchFilter,
  managedBranches,
  filterMonth,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onBatchDeleteShifts,
  onBatchSaveShifts,
  onSyncWeekShifts,
  onModalToggle,
  exportToCSV,
  theme,
  planningGoals = [],
  isReadOnly = false,
  onDateChange
  } = props;


  const activeBranch = currentBranchFilter;
  const [employeeOrder, setEmployeeOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smart_schedule_emp_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return employees ? employees.map(e => e.id) : [];
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
  const [currentDate, setCurrentDate] = useState(() => {
    if (filterMonth) {
      const [y, m] = filterMonth.split('-').map(Number);
      const now = new Date();
      if (y === now.getFullYear() && m === now.getMonth() + 1) {
        return now;
      }
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  useEffect(() => {
    if (filterMonth) {
      const [y, m] = filterMonth.split('-').map(Number);
      const now = new Date();
      if (y === now.getFullYear() && m === now.getMonth() + 1) {
        setCurrentDate(now);
      } else {
        setCurrentDate(new Date(y, m - 1, 1));
      }
    }
  }, [filterMonth]);
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

  const onDateChangeRef = useRef(onDateChange);
  useEffect(() => {
    onDateChangeRef.current = onDateChange;
  }, [onDateChange]);

  useEffect(() => {
    if (onDateChangeRef.current) {
      onDateChangeRef.current(mobileSelectedDate);
    }
  }, [mobileSelectedDate]);

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
      if (onSyncWeekShifts || onBatchSaveShifts) {
        
        const originalShiftIds = schedules.map(s => s.id);
        const localShiftIds = localSchedules.map(s => s.id);

        const idsToDelete = schedules.filter(s => !localShiftIds.includes(s.id)).map(s => s.id);

        const shiftsToSave = localSchedules.filter(s => {
            const original = schedules.find(orig => orig.id === s.id);
            if (!original) return true; // new
            return (
              original.startTime !== s.startTime ||
              original.endTime !== s.endTime ||
              original.locationId !== s.locationId ||
              original.isOff !== s.isOff ||
              original.taskNote !== s.taskNote ||
              original.notes !== s.notes ||
              original.colorLabel !== s.colorLabel ||
              original.roleInShift !== s.roleInShift ||
              JSON.stringify(original.tasks || []) !== JSON.stringify(s.tasks || [])
            );
        });

        if (onSyncWeekShifts) {
           await onSyncWeekShifts(shiftsToSave, idsToDelete);
        } else if (onBatchSaveShifts) {
           if (onBatchDeleteShifts && idsToDelete.length > 0) {
             await onBatchDeleteShifts(idsToDelete);
           }
           if (shiftsToSave.length > 0) {
             await onBatchSaveShifts(shiftsToSave);
           }
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

  // For keyboard shortcut Command+S
  const handleApplyChangesRef = useRef(handleApplyChanges);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const isSavingRef = useRef(isSaving);

  useEffect(() => {
    handleApplyChangesRef.current = handleApplyChanges;
    hasUnsavedChangesRef.current = hasUnsavedChanges;
    isSavingRef.current = isSaving;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isReadOnly) return;
        if (hasUnsavedChangesRef.current && !isSavingRef.current) {
          handleApplyChangesRef.current();
        } else if (!hasUnsavedChangesRef.current && !isSavingRef.current) {
          toast('Không có thay đổi nào để lưu', { icon: 'ℹ️', id: 'no-changes-toast' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLocalToggleShift = (empId: string, date: string, preset: typeof SHIFT_PRESETS[0]) => {
    const shiftId = getShiftDeterministicId(empId, date, preset.id);
    const existing = localSchedules.find(s => s.id === shiftId);

    if (existing) {
      if (activeBranch !== 'All' && existing.locationId !== activeBranch) {
        // The shift exists but is at another branch (hidden here). 
        // User clicked an "empty" cell, meaning they want to schedule here instead.
        // Update its location to the current active branch.
        setLocalSchedules(prev => prev.map(s => s.id === shiftId ? {
          ...s,
          locationId: activeBranch
        } : s));
      } else {
        // Shift is active in this branch, so we just remove it.
        setLocalSchedules(prev => prev.filter(s => s.id !== shiftId));
      }
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

      if (isReadOnly && e.key !== 'Escape') return;

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
  }, [selectedCells, copiedShift, focusedSubCell, localSchedules, handleExcelPaste, handleExcelDelete, editingShift, isReadOnly]);

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
    const defaultEmployees = employees.filter(e => activeBranch === 'All' || e.locationId === activeBranch || (e.locationIds && e.locationIds.includes(activeBranch)));
    
    // 2. Get support employees added to this view
    const manuallyAddedSupportEmployees = employees.filter(e => supportEmployees.find(se => se.empId === e.id));

    // 3. Get employees who have a shift at this branch in the current week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    
    const scheduledEmployees = employees.filter(e => {
      return localSchedules.some(s => 
        (s.empId === e.id || s.empId === e.empId) && 
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
          (s.empId === e.id || s.empId === e.empId) && 
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
          (s.empId === e.id || s.empId === e.empId) && 
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
        const indexA = employeeOrder?.indexOf ? employeeOrder.indexOf(a.id) : -1;
        const indexB = employeeOrder?.indexOf ? employeeOrder.indexOf(b.id) : -1;
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
      const confirmSplit = window.confirm(`Ca làm việc kéo dài ${duration.toFixed(2)}h (>= 7h). Hệ thống sẽ tự động tách thành 2 ca (Sáng/Trưa/Tối) theo quy định. Tiếp tục?`);
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
      // We must query the database because `schedules` is limited to the current week
      let existingNextWeekIds: string[] = [];
      const dbBaseQuery = query(
          collection(db, 'LichLamViec'), 
          where('date', '>=', nextWeekStartStr),
          where('date', '<=', nextWeekEndStr)
      );
      const snapshot = await getDocs(dbBaseQuery);
      
      snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (activeBranch === 'All' || data.locationId === activeBranch) {
             existingNextWeekIds.push(docSnap.id);
          }
      });

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

      if (onSyncWeekShifts) {
        await onSyncWeekShifts(clonedShifts, existingNextWeekIds);
      } else {
        if (existingNextWeekIds.length > 0) {
          if (onBatchDeleteShifts) {
            await onBatchDeleteShifts(existingNextWeekIds);
          } else {
            for (const id of existingNextWeekIds) {
              await onDeleteShift(id);
            }
          }
        }
        if (clonedShifts.length > 0) {
          if (onBatchSaveShifts) {
            await onBatchSaveShifts(clonedShifts);
          } else {
            for (const shift of clonedShifts) {
              await onAddShift(shift);
            }
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

  return {
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
  };
}
