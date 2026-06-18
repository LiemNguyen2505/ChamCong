import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, auth } from '../firebase';
import { useAdminAuth } from './useAdminAuth';
import { useAdminAttendance } from './useAdminAttendance';
import { useAdminViolations } from './useAdminViolations';
import { useAdminPayroll } from './useAdminPayroll';
import { useAdminReport } from './useAdminReport';
import { useAdminMaterialLoss } from './useAdminMaterialLoss';
import { useAdminTableColumns } from './useAdminTableColumns';
import { collection, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, where, deleteField, getDoc, setDoc, increment, limit, writeBatch } from 'firebase/firestore';
import { format, differenceInMonths, parseISO, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { Employee, AdminAccount, ApprovalRequest, PlanningGoal, SalaryHistory, AuditLog, Timesheet, ShiftTask, WorkSchedule, LeaveRequest, Alert, AppNotification, PayrollAdjustment, HolidayConfig } from '../types/admin';
import { toast } from 'react-hot-toast';
import { safeFormat, safeParseDate } from '../utils/dateUtils';
import { calculateNetSalary, calculateTtnPenalty, getPreviousMonthRates, roundToUnit } from '../utils/salaryCalculator';
import { LayoutDashboard, CheckCircle2, Calendar, DollarSign, TableProperties, ShieldCheck, Users, AlertCircle, History as HistoryIcon, X, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

import { formatCurrency } from '../utils/currency';
import { matchSchedulesForTimesheet, findEmployee } from '../utils/adminHelpers';

// Removed local formatCurrency
const OWNER_EMAIL = 'nguyen.thanh.liem2505@gmail.com';

export function useAdminLogic(globalData: any, fetchInitialData: any, isLoading: boolean) {
  const navigate = useNavigate();
    const [filterBranch, setFilterBranch] = useState<string>(() => {
    const saved = localStorage.getItem('adminFilterBranch');
    
    // Strict RBAC: If we already have a session, enforce the branch restriction immediately
    const storedAdmin = localStorage.getItem('currentAdmin');
    if (storedAdmin) {
      try {
        const admin = JSON.parse(storedAdmin);
        if (admin.role !== 'SuperAdmin' && admin.locationIds && admin.locationIds.length > 0) {
          if (saved && admin.locationIds.includes(saved)) return saved;
          return admin.locationIds[0];
        }
      } catch (e) {
        console.error("Failed to parse stored admin", e);
      }
    }

    if (saved && saved !== 'All') return saved;
    return 'Góc Phố';
  });

  const [payrollActiveBranch, setPayrollActiveBranch] = useState<string>(() => {
    const saved = localStorage.getItem('adminFilterBranch');
    const storedAdmin = localStorage.getItem('currentAdmin');
    let admin = null;
    if (storedAdmin) {
      try { admin = JSON.parse(storedAdmin) } catch(e){}
    }
    if (admin?.role !== 'SuperAdmin' && admin?.locationIds && admin.locationIds.length > 0) {
      if (saved && admin.locationIds.includes(saved)) return saved;
      return admin.locationIds[0];
    }
    if (saved && saved !== 'All') return saved;
    return 'Góc Phố';
  });

  const {
    isAuthenticated, setIsAuthenticated,
    currentAdmin, setCurrentAdmin,
    password, setPassword,
    adminLoginId, setAdminLoginId,
    showLoginPin, setShowLoginPin,
    loginIdError, setLoginIdError,
    pinError, setPinError,
    showChangeAdminPinModal, setShowChangeAdminPinModal,
    oldAdminPin, setOldAdminPin,
    newAdminPin, setNewAdminPin,
    confirmNewAdminPin, setConfirmNewAdminPin,
    showOldAdminPin, setShowOldAdminPin,
    showNewAdminPin, setShowNewAdminPin,
    showConfirmAdminPin, setShowConfirmAdminPin,
    adminPinError, setAdminPinError,
    loading, setLoading,
    handleLogin,
    handleGoogleLogin,
    handleChangeAdminPin,
    handleLogout
  } = useAdminAuth({ globalData, setFilterBranch, setPayrollActiveBranch });

  const [openMenuEmpId, setOpenMenuEmpId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'nhanvien' | 'lichlamviec' | 'admins' | 'canhbao' | 'lichsu' | 'bangluong' | 'vipham' | 'bangcongthang'>('dashboard');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [initializedTabs, setInitializedTabs] = useState<string[]>([]);
  const [historyDay, setHistoryDay] = useState<string | null>(null);

  // LOGIC DỌN DẸP, ARCHIVE & AUTO-REPORT
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [mobileHistoryMode, setMobileHistoryMode] = useState<'day' | 'employee'>('day');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showCompactActionMenu, setShowCompactActionMenu] = useState(false);
  const [showDatePickerGrid, setShowDatePickerGrid] = useState(false);
  
  // GLOBAL DESELECT & CLICK OUTSIDE LOGIC
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (activeTab !== 'bangcongthang') return;
      
      const target = e.target as HTMLElement;
      
      // 1. Closest checks to identify if click is inside protected areas
      const isProtected = target.closest('button') || 
                          target.closest('select') || 
                          target.closest('input') || 
                          target.closest('.attendance-interactive') ||
                          target.closest('.attendance-card') ||
                          target.closest('.attendance-header') ||
                          target.closest('.branch-tabs-container') ||
                          target.closest('.modal-content') ||
                          target.closest('[role="dialog"]');

      // 2. Handle specifically the Calendar Overlay Backdrop
      if (target.classList.contains('calendar-overlay-backdrop')) {
        setShowDatePickerGrid(false);
        return;
      }

      // 3. If tapped on "Empty Space"
      if (!isProtected) {
        setShowCompactActionMenu(false);
        setShowDatePickerGrid(false);
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [activeTab, historyEmployee, historyDay]);

  useEffect(() => {
    if (!isAuthenticated || !currentAdmin || (window as any).hasCleanedUp) return;
    
    const performCleanup = async () => {
      (window as any).hasCleanedUp = true;
      
      const now = new Date();
      const currentMonthYear = format(now, 'yyyy-MM');
      const isFirstDayOfMonth = now.getDate() === 1;
      
      try {
        // 0. Kiểm tra Auto-Report (Ngày 1 hàng tháng)
        if (isFirstDayOfMonth) {
          const lastMonth = format(addMonths(now, -1), 'yyyy-MM');
          const reportId = `MonthlyReport_${lastMonth}`;
          const reportRef = doc(db, 'ReportStatus', reportId);
          const reportSnap = await getDoc(reportRef);
          
          if (!reportSnap.exists()) {
            console.log(`[AUTO-REPORT] Đang chuẩn bị báo cáo cho tháng ${lastMonth}...`);
            // Trigger logic gửi email (Giả lập bằng cách lưu vào DB để Backend/Cloud Function xử lý)
            await setDoc(reportRef, {
              monthYear: lastMonth,
              subject: `[Goc Pho Coffee] - Bao cao chi tiet nhan su - Thang ${lastMonth}`,
              triggeredAt: serverTimestamp(),
              status: 'pending_email' 
            });
            toast.success(`Đã khởi tạo báo cáo tháng ${lastMonth}!`, { icon: '📧' });
          }
        }

        const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        const thirteenMonthsAgo = addMonths(now, -13);
        const thirteenMonthsAgoStr = format(thirteenMonthsAgo, 'yyyy-MM-dd');
        
        // 1. Xóa thông báo cũ (> 15 ngày)
        const oldNotifsQuery = query(
          collection(db, 'Notifications'), 
          where('createdAt', '<', fifteenDaysAgo)
        );
        const oldNotifsSnap = await getDocs(oldNotifsQuery);
        if (!oldNotifsSnap.empty) {
          const batch = writeBatch(db);
          oldNotifsSnap.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }

        // 2. Archive Lịch làm việc & Bảng lương (> 13 tháng)
        // ĐIỀU KIỆN: Chỉ archive sau khi đã có báo cáo tháng đó 
        const oldSchedulesQuery = query(
          collection(db, 'LichLamViec'),
          where('date', '<', thirteenMonthsAgoStr)
        );
        const oldSchedulesSnap = await getDocs(oldSchedulesQuery);
        
        if (!oldSchedulesSnap.empty) {
          const batch = writeBatch(db);
          const archiveRef = doc(collection(db, 'archives'));
          batch.set(archiveRef, {
            type: 'WorkSchedule_Archive',
            archivedAt: serverTimestamp(),
            count: oldSchedulesSnap.size,
            data: oldSchedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          });
          oldSchedulesSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }

        const olderMonthYear = format(thirteenMonthsAgo, 'yyyy-MM');
        const oldPayrollQuery = query(
          collection(db, 'PayrollAdjustments'),
          where('monthYear', '<', olderMonthYear)
        );
        const oldPayrollSnap = await getDocs(oldPayrollQuery);
        
        if (!oldPayrollSnap.empty) {
          const batch = writeBatch(db);
          const archiveRef = doc(collection(db, 'archives'));
          batch.set(archiveRef, {
            type: 'Payroll_Archive',
            archivedAt: serverTimestamp(),
            count: oldPayrollSnap.size,
            data: oldPayrollSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          });
          oldPayrollSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }

        // 3. Archive Chấm công (> 13 tháng)
        const oldTimesheetsQuery = query(
          collection(db, 'timesheets'),
          where('date', '<', thirteenMonthsAgoStr)
        );
        const oldTimesheetsSnap = await getDocs(oldTimesheetsQuery);
        if (!oldTimesheetsSnap.empty) {
          const batch = writeBatch(db);
          const archiveRef = doc(collection(db, 'archives'));
          batch.set(archiveRef, {
            type: 'Timesheet_Archive',
            archivedAt: serverTimestamp(),
            count: oldTimesheetsSnap.size,
            data: oldTimesheetsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          });
          oldTimesheetsSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }

      } catch (err) {
        console.error("[CLEANUP ERROR]", err);
      }
    };

    performCleanup();
  }, [isAuthenticated, currentAdmin]);

  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('All');
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'history'>('pending');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const loadedKeysRef = useRef<Set<string>>(new Set());

  // STABILIZER: Cô lập fetch data vào 1 useEffect duy nhất, load theo Tab để giảm số lượng read database
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const keysToLoad = new Set<string>();
    
    // Always load these globally required ones (small static tables)
    keysToLoad.add('nhanViens');
    keysToLoad.add('admins');
    
    // Load based on active Tab
    if (activeTab === 'dashboard') {
       // OPTIMIZATION: Do not fetch entire month `chamCongs` and `lichLamViecs` on dashboard
       // as that consumes thousands of reads on first load! We only fetch today's data for active shift tracking.
       fetchInitialData(filterMonth, false, { targetedKeys: ['chamCongs', 'lichLamViecs'], onlyToday: true })
         .catch(e => console.error("Error fetching today dashboard data:", e));
    }
    else if (activeTab === 'bangluong' || activeTab === 'bangcongthang') {
       keysToLoad.add('chamCongs');
       keysToLoad.add('lichLamViecs');
       keysToLoad.add('payrollAdjustments');
       keysToLoad.add('violations');
       keysToLoad.add('holidays');
    }
    else if (activeTab === 'lichlamviec') {
       // lichLamViecs will be fetched via onDateChange week by week!
       keysToLoad.add('planningGoals');
    }
    else if (activeTab === 'vipham') {
       keysToLoad.add('violations');
    }
    else if (activeTab === 'canhbao') {
       keysToLoad.add('canhBaos');
    }
    else if (activeTab === 'lichsu') {
       keysToLoad.add('auditLogs');
    }

    const newKeysToFetch = Array.from(keysToLoad).filter(key => 
       !loadedKeysRef.current.has(`${filterMonth}-${key}`)
    );

    if (newKeysToFetch.length > 0) {
      newKeysToFetch.forEach(k => loadedKeysRef.current.add(`${filterMonth}-${k}`));
      
      const loadData = async () => {
        try {
          await fetchInitialData(filterMonth, false, { targetedKeys: newKeysToFetch });
        } catch (err) {
          console.error("Failed to load data for keys:", newKeysToFetch, err);
        }
      };

      loadData();
    }
  }, [filterMonth, filterBranch, isAuthenticated, activeTab, fetchInitialData]);

  const isLoadingRef = useRef('');

  const handlePrevMonth = () => {
    const [y, m] = filterMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    setFilterMonth(format(date, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [y, m] = filterMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    setFilterMonth(format(date, 'yyyy-MM'));
  };

  // Use globalData from props instead of local state
  const nhanViens = useMemo(() => {
    const raw = globalData.nhanViens;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    
    const employeesWithShifts = new Set();
    globalData.lichLamViecs?.forEach((s: any) => {
      if (adminLocations.includes(s.locationId)) {
        employeesWithShifts.add(s.empId);
      }
    });

    return raw.filter((nv: any) => 
      (nv.locationId && adminLocations.includes(nv.locationId)) || 
      (nv.locationIds && nv.locationIds.some((id: string) => adminLocations.includes(id))) ||
      employeesWithShifts.has(nv.id) ||
      employeesWithShifts.has(nv.empId)
    );
  }, [globalData.nhanViens, globalData.lichLamViecs, currentAdmin]);

  // Get current admin display name
  const adminDisplayName = useMemo(() => {
    if (!currentAdmin) return '';
    if (currentAdmin.role === 'SuperAdmin') return 'Chào Sếp lớn!';
    
    // Attempt to find the full name in nhanViens by checking if email matches phone/empId or full name
    const adminEmp = nhanViens.find((emp: any) => 
      emp.phone === currentAdmin.email || 
      emp.empId === currentAdmin.email || 
      emp.fullName === currentAdmin.email
    );
    
    const fullName = adminEmp?.fullName || currentAdmin.email.split('@')[0];
    
    if (fullName.toLowerCase().includes('khoa')) {
      return 'Chào sếp Khoa!';
    }
    if (fullName.toLowerCase().includes('diệu')) {
      return 'Chào sếp Diệu xinh đẹp!';
    }
    
    return `Chào ${fullName}`;
  }, [currentAdmin, nhanViens]);

  const chamCongs = useMemo(() => {
    const raw = globalData.chamCongs;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(cc => adminLocations.includes(cc.locationId));
  }, [globalData.chamCongs, currentAdmin]);

  const lichLamViecs = useMemo(() => {
    const raw = globalData.lichLamViecs;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(s => adminLocations.includes(s.locationId));
  }, [globalData.lichLamViecs, currentAdmin]);

  const admins = useMemo(() => {
    const raw = globalData.admins;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    // Managers can only see themselves or their branch admins? 
    // Usually Managers shouldn't see Admin list, but if they do, filter by branch.
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(ad => 
      ad.id === currentAdmin?.id || 
      (ad.locationIds && ad.locationIds.some((id: string) => adminLocations.includes(id)))
    );
  }, [globalData.admins, currentAdmin]);

  const canhBaos = useMemo(() => {
    const raw = globalData.canhBaos;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(c => adminLocations.includes(c.locationId));
  }, [globalData.canhBaos, currentAdmin]);

  const notifications = useMemo(() => {
    const raw = globalData.notifications;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(n => n.locationId === 'All' || adminLocations.includes(n.locationId));
  }, [globalData.notifications, currentAdmin]);

  const payrollAdjustments = useMemo(() => {
    const raw = globalData.payrollAdjustments;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    // Adjustments are linked to employees, filter by examining the employee's branch
    return raw.filter(adj => {
      const emp = findEmployee(adj.empId, undefined, globalData.nhanViens);
      return emp && adminLocations.includes(emp.locationId);
    });
  }, [globalData.payrollAdjustments, globalData.nhanViens, currentAdmin]);

  const violations = useMemo(() => {
    const raw = globalData.violations || [];
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(v => {
      const emp = findEmployee(v.empId, undefined, globalData.nhanViens);
      return emp && adminLocations.includes(emp.locationId);
    });
  }, [globalData.violations, globalData.nhanViens, currentAdmin]);

  const salaryHistories = useMemo(() => {
    const raw = globalData.salaryHistories;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(sh => {
      const empFound = findEmployee(sh.empId, undefined, globalData.nhanViens);
      return empFound && adminLocations.includes(empFound.locationId);
    });
  }, [globalData.salaryHistories, globalData.nhanViens, currentAdmin]);

  const auditLogs = globalData.auditLogs;
  const holidays = globalData.holidays;
  const materialItems = globalData.materialItems;
  const planningGoals = useMemo(() => {
    const raw = globalData.planningGoals || [];
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter((pg: any) => adminLocations.includes(pg.branchId));
  }, [globalData.planningGoals, currentAdmin]);

  const [localGoals, setLocalGoals] = useState<{[key: string]: string}>({});

  // Sync local goals when planningGoals prop changes
  useEffect(() => {
    if (planningGoals.length === 0) return;
    const goals: {[key: string]: string} = {};
    planningGoals.forEach(g => {
      const goalId = `${g.branchId}_${g.position}`;
      goals[goalId] = String(g.goalShifts);
    });
    setLocalGoals(prev => ({ ...goals, ...prev }));
  }, [planningGoals]);

  const handleUpdatePlanningGoal = async (position: 'QUẦY' | 'PV', goalShifts: number) => {
    if (filterBranch === 'All') return;
    const goalId = `${filterBranch}_${position}`;
    const loadingToast = toast.loading(`Đang cập nhật mục tiêu ${position}...`);
    try {
      await setDoc(doc(db, 'PlanningGoals', goalId), {
        branchId: filterBranch,
        position,
        goalShifts: Number(goalShifts)
      }, { merge: true });
      await fetchInitialData(filterMonth, true, { targetedKeys: ['planningGoals'] });
      toast.success('Đã cập nhật mục tiêu', { id: loadingToast });
    } catch (error) {
      console.error('Error updating planning goal:', error);
      toast.error('Lỗi khi cập nhật mục tiêu', { id: loadingToast });
    }
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [headerTapCount, setHeaderTapCount] = useState(0);
  const headerTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleHeaderTap = () => {
    setHeaderTapCount(prev => prev + 1);
    if (headerTapTimeoutRef.current) clearTimeout(headerTapTimeoutRef.current);
    headerTapTimeoutRef.current = setTimeout(() => setHeaderTapCount(0), 1000);
  };

  useEffect(() => {
    if (headerTapCount >= 3) {
      setHeaderTapCount(0);
      
      const email = currentAdmin?.email || '';
      // Check if this admin is one of the designated "privileged" admins who use the employee view as well
      const isPrivilegedAdmin = 
        email === OWNER_EMAIL || 
        adminDisplayName.toLowerCase().includes('khoa') || 
        adminDisplayName.toLowerCase().includes('diệu') ||
        (currentAdmin?.role === 'SuperAdmin');

      if (isPrivilegedAdmin) {
        navigate('/');
        toast.success('Đang quay lại giao diện Nhân viên...');
      } else {
        // Just refresh data for others
        fetchInitialData(filterMonth, true);
        toast.success('Đã cập nhật dữ liệu mới nhất!', { icon: '🔄' });
      }
    }
  }, [headerTapCount, currentAdmin, adminDisplayName, navigate, OWNER_EMAIL, fetchInitialData, filterMonth]);
  const getAllowedBranches = () => {
    if (currentAdmin?.role === 'SuperAdmin') return ['Góc Phố', 'Phố Xanh'];
    return (currentAdmin?.locationIds || []).filter(id => id !== 'All');
  };
  const currentAdminRef = useRef(currentAdmin);
  const filterBranchRef = useRef(filterBranch);
  const filterMonthRef = useRef(filterMonth);
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    currentAdminRef.current = currentAdmin;
    filterBranchRef.current = filterBranch;
    filterMonthRef.current = filterMonth;
    isAuthenticatedRef.current = isAuthenticated;
  }, [currentAdmin, filterBranch, filterMonth, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('adminFilterBranch', filterBranch);
  }, [filterBranch]);

  const filteredChamCongs = useMemo(() => {
    let result = chamCongs;
    if (filterBranch !== 'All') {
      result = chamCongs.filter(cc => cc.locationId === filterBranch);
    }
    
    return result.map(cc => {
      const emp = findEmployee(cc.empId, cc.fullName, nhanViens);
      const possibleIds = emp ? [emp.id, emp.empId].filter(Boolean) : [cc.empId, cc.id];
      const daySchedules = lichLamViecs.filter(s => s.date === cc.date && possibleIds.includes(s.empId) && !s.isOff);
      return matchSchedulesForTimesheet(cc, daySchedules);
    });
  }, [chamCongs, filterBranch, lichLamViecs]);

  const filteredLichLamViecs = useMemo(() => {
    if (filterBranch === 'All') return lichLamViecs;
    return lichLamViecs.filter(s => s.locationId === filterBranch);
  }, [lichLamViecs, filterBranch]);

  const historySearchTermLower = useMemo(() => removeAccents(historySearchTerm), [historySearchTerm]);

// Moved helpers to components where applicable or kept as utility props

  const logAction = async (action: string, target: string, details: string) => {
    if (!currentAdmin) return;
    try {
      await addDoc(collection(db, 'AuditLogs'), {
        action,
        target,
        details,
        adminId: currentAdmin?.id || 'unknown',
        adminEmail: currentAdmin.email,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const { handleAddViolation, handleDeleteViolation } = useAdminViolations({
    currentAdmin,
    nhanViens,
    filterMonth,
    fetchInitialData,
    logAction
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getBranchTheme = (branchId: string | null) => {
    const woodTheme = {
      bg: 'bg-[#FDFBF7]', 
      accent: 'bg-[#764333]', // Roast Cocoa / Mild Chocolate
      text: 'text-[#764333]',
      header: 'bg-[#764333] text-white',
      footer: 'bg-[#764333] text-white/70',
      footerActive: 'text-white',
      border: 'border-[#764333]/20',
      gradient: 'from-[#764333] to-[#4A2A20]',
      button: 'bg-[#764333] hover:bg-[#5D3428]',
      card: 'bg-white border-[#764333]/10',
      shadow: 'shadow-[#764333]/10',
      ring: 'focus:ring-[#764333]',
      badge: 'bg-[#764333] text-white'
    };

    const forestTheme = {
      bg: 'bg-[#F8FAF8]', // Fresher light moss mist
      accent: 'bg-[#4F6F52]', // Fresh Stone Moss
      text: 'text-[#4F6F52]',
      header: 'bg-[#4F6F52] text-white',
      footer: 'bg-[#4F6F52] text-white/70',
      footerActive: 'text-white',
      border: 'border-[#4F6F52]/20',
      gradient: 'from-[#4F6F52] to-[#3D5640]',
      button: 'bg-[#4F6F52] hover:bg-[#3D5640]',
      card: 'bg-white border-[#4F6F52]/10',
      shadow: 'shadow-[#4F6F52]/10',
      ring: 'focus:ring-[#4F6F52]',
      badge: 'bg-[#4F6F52] text-white'
    };

    const superTheme = {
      bg: 'bg-slate-100', // Brighter background
      accent: 'bg-slate-600', // Lighter accent
      text: 'text-slate-700',
      header: 'bg-slate-600 text-white',
      footer: 'bg-slate-600 text-white/70',
      footerActive: 'text-white',
      border: 'border-slate-300',
      gradient: 'from-slate-600 to-slate-700',
      button: 'bg-slate-600 hover:bg-slate-700',
      card: 'bg-white border-slate-200',
      shadow: 'shadow-slate-400/20',
      ring: 'focus:ring-slate-500',
      badge: 'bg-slate-600 text-white'
    };

    if (branchId === 'Phố Xanh') return forestTheme;
    if (!branchId || branchId === 'All') return superTheme;
    return woodTheme;
  };

  const currentThemeBranch = activeTab === 'bangluong' ? payrollActiveBranch : filterBranch;
  const adminTheme = getBranchTheme(currentThemeBranch);
  const [showHolidayConfig, setShowHolidayConfig] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showMobileUtilities, setShowMobileUtilities] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<PayrollAdjustment | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const {
    visibleColumns,
    setVisibleColumns,
    showColumnConfig,
    setShowColumnConfig,
    columnWidths,
    setColumnWidths,
    handleResize
  } = useAdminTableColumns();

  const [showDeductionDetails, setShowDeductionDetails] = useState<string | null>(null);

  const {
    localAdjustments,
    setLocalAdjustments,
    undoStack,
    setUndoStack,
    isSavingPayroll,
    setIsSavingPayroll,
    handlePayrollChange,
    handleUndoPayroll,
    handleSavePayroll,
    checkEmployeeReview
  } = useAdminPayroll({
    nhanViens,
    payrollAdjustments,
    filterMonth,
    fetchInitialData,
    logAction,
    currentAdmin,
    payrollActiveBranch
  });

  const allEmployeeSalaryStatsMap = useMemo(() => {
    const statsMap: Record<string, any> = {};
    nhanViens.forEach(emp => {
      const empTimesheets = chamCongs.filter(cc => {
          if (!cc.date.startsWith(filterMonth)) return false;
          const matched = findEmployee(cc.empId, cc.fullName, nhanViens);
          return matched && matched.id === emp.id;
      });
      const empSchedules = lichLamViecs.filter(s => {
          if (!s.date.startsWith(filterMonth) || s.isOff) return false;
          const matched = findEmployee(s.empId, s.fullName, nhanViens);
          return matched && matched.id === emp.id;
      });

      const adjustedTimesheets = empTimesheets.map(cc => {
        const daySchedules = empSchedules.filter(s => s.date === cc.date);
        return matchSchedulesForTimesheet(cc, daySchedules);
      });

      const isSubjectAdmin = emp.empId?.toUpperCase() === 'ADMIN' || admins.some((a: any) => a.email === emp.fullName);
      statsMap[emp.id] = calculateNetSalary(emp, filterMonth, adjustedTimesheets, payrollAdjustments, holidays, localAdjustments[emp.id] || {}, violations.filter(v => (v.empId === emp.id || v.empId === emp.empId) && v.monthYear === filterMonth), isSubjectAdmin);
    });
    return statsMap;
  }, [nhanViens, chamCongs, lichLamViecs, payrollAdjustments, holidays, localAdjustments, filterMonth, violations]);

  const calculateEmployeeSalaryStats = useCallback((emp: Employee, month: string) => {
    if (month === filterMonth && allEmployeeSalaryStatsMap[emp.id]) {
        return allEmployeeSalaryStatsMap[emp.id];
    }
    // Very fallback logic if called for different month
    const isSubjectAdmin = emp.empId?.toUpperCase() === 'ADMIN' || admins.some((a: any) => a.email === emp.fullName);
    return calculateNetSalary(emp, month, [], payrollAdjustments, holidays, localAdjustments[emp.id] || {}, violations.filter(v => (v.empId === emp.id || v.empId === emp.empId) && v.monthYear === month), isSubjectAdmin);
  }, [allEmployeeSalaryStatsMap, filterMonth, payrollAdjustments, holidays, localAdjustments, violations]);

  useEffect(() => {
    if (currentAdmin && currentAdmin.locationIds && currentAdmin.locationIds.length > 0) {
      if (!currentAdmin.locationIds.includes(payrollActiveBranch)) {
        setPayrollActiveBranch(currentAdmin.locationIds[0]);
      }
    }
  }, [currentAdmin]);

  // Salary Review Notifications
  const [salaryReviewNotifications, setSalaryReviewNotifications] = useState<{empId: string, fullName: string, nextReviewDate: string}[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // If we have a local session, trust it first, then sync with Firebase/Firestore
      // IF Firebase Auth user state is pending or logged out, preserve local session if it exists to avoid annoying logouts.
      if (!user) {
         // Only clear if no local session
         if (!localStorage.getItem('currentAdmin')) {
            setCurrentAdmin(null);
            setIsAuthenticated(false);
         }
         return;
      }

      // If user exists in Firebase Auth but NO local session exists, do NOT auto-login!
      // This prevents the security hole where a user logged out of EmployeeView triple-clicks
      // and gets auto-logged in just because the browser kept their Google Auth session alive.
      if (!localStorage.getItem('currentAdmin')) {
         return;
      }

      if (user && user.email === OWNER_EMAIL) {
        setCurrentAdmin({
          id: 'super',
          email: user.email || 'admin',
          pin: '******',
          role: 'SuperAdmin',
          locationIds: ['Góc Phố', 'Phố Xanh']
        });
        setIsAuthenticated(true);
        setFilterBranch('Góc Phố');
      } else if (user) {
        const q = query(collection(db, 'Admins'), where('email', '==', user.email));
        console.log("🔥 ĐANG ĐỌC DATABASE (Admin - Auth State Check)...");
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const adminData = { 
            id: snapshot.docs[0].id, 
            ...data,
            locationIds: Array.isArray(data.locationIds) ? data.locationIds : (data.locationId ? [data.locationId] : [])
          } as AdminAccount;
          setCurrentAdmin(adminData);
          setIsAuthenticated(true);
          setFilterBranch('Góc Phố');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const hasCheckedSalaryRef = useRef(false);
  // Salary Review Notification Logic - Runs only once per session when nhanViens is loaded
  useEffect(() => {
    if (!isAuthenticated || nhanViens.length === 0 || hasCheckedSalaryRef.current) return;

    const checkSalaryReviews = async () => {
      const today = new Date();
      // Only run on the 3rd of the month as per original logic
      if (today.getDate() !== 3) {
        hasCheckedSalaryRef.current = true;
        return;
      }

      // Check if we already checked this month in localStorage
      const lastCheck = localStorage.getItem('lastSalaryReviewCheck');
      const currentMonth = format(today, 'yyyy-MM');
      if (lastCheck === currentMonth) {
        hasCheckedSalaryRef.current = true;
        return;
      }

      try {
        for (const nv of nhanViens) {
          const lastReviewDate = nv.lastSalaryReviewDate ? new Date(nv.lastSalaryReviewDate.toDate()) : new Date(nv.joinDate);
          const monthsSinceReview = differenceInMonths(today, lastReviewDate);
          if (monthsSinceReview >= 3) {
            await addDoc(collection(db, 'AppNotifications'), {
              empId: nv.empId,
              fullName: nv.fullName,
              locationId: 'All',
              type: 'check_in', // Using existing type for now
              timestamp: serverTimestamp(),
              message: `Nhân viên ${nv.fullName} đã đến hạn xem xét tăng lương.`
            });
          }
        }
        localStorage.setItem('lastSalaryReviewCheck', currentMonth);
        hasCheckedSalaryRef.current = true;
      } catch (error) {
        console.error('Error checking salary reviews:', error);
      }
    };
    checkSalaryReviews();
  }, [isAuthenticated, nhanViens.length]);

  // Employee Details Modal State
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);
  const [selectedEmployeeForSalaryDetails, setSelectedEmployeeForSalaryDetails] = useState<Employee | null>(null);

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmAction({title, message, onConfirm});
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };


  const {
    showManualCheckin, setShowManualCheckin,
    manualCheckinData, setManualCheckinData,
    showEditAttendanceModal, setShowEditAttendanceModal,
    editingAttendance, setEditingAttendance,
    manualAttendance, setManualAttendance,
    handleManualAttendance,
    handleUpdateAttendance,
    handleApproveAttendance,
    handleDeleteAttendance
  } = useAdminAttendance({
    nhanViens,
    currentAdmin,
    fetchInitialData,
    filterMonth,
    logAction,
    openConfirmModal
  });

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [newEndTime, setNewEndTime] = useState('');

  // ESC key handler for modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isAuthenticated) {
          navigate(-1);
          return;
        }
        
        setShowCompactActionMenu(false);
        setShowDatePickerGrid(false);
        setShowNotifications(false);
        setShowHolidayConfig(false);
        setShowFinancialModal(false);
        setShowMobileUtilities(false);
        setShowMaterialLossModal(false);
        setShowColumnConfig(false);
        setShowConfirmModal(false);
        setShowAdjustModal(false);
        setShowEditAttendanceModal(false);
        setShowChangePinModal(false);
        setShowChangeAdminPinModal(false);
        
        if (openMenuEmpId) setOpenMenuEmpId(null);
        if (showDeductionDetails) setShowDeductionDetails(null);
        if (selectedEmployeeForDetails) setSelectedEmployeeForDetails(null);
        if (selectedEmployeeForSalaryDetails) setSelectedEmployeeForSalaryDetails(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [navigate, isAuthenticated, openMenuEmpId, showDeductionDetails, selectedEmployeeForDetails, selectedEmployeeForSalaryDetails]);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;
    
    if (pinChangeData.newPin !== pinChangeData.confirmNewPin) {
      toast.error('Mã PIN mới không khớp');
      return;
    }

    if (pinChangeData.newPin.length < 4) {
      toast.error('Mã PIN phải có ít nhất 4 chữ số');
      return;
    }

    const loadingToast = toast.loading('Đang đổi mã PIN...');
    try {
      const adminDoc = await getDoc(doc(db, 'Admins', currentAdmin.id));
      if (!adminDoc.exists() && currentAdmin.id === 'super') {
        // Handle case where super doc might not exist yet but was set in local memory
        await setDoc(doc(db, 'Admins', 'super'), {
          email: 'admin',
          pin: pinChangeData.newPin,
          role: 'SuperAdmin',
          locationIds: ['Góc Phố', 'Phố Xanh']
        });
      } else if (adminDoc.exists()) {
        const realPin = adminDoc.data()?.pin;
        if (realPin !== pinChangeData.currentPin) {
          toast.error('Mã PIN hiện tại không chính xác', { id: loadingToast });
          return;
        }
        await updateDoc(doc(db, 'Admins', currentAdmin.id), {
          pin: pinChangeData.newPin
        });
      } else {
        toast.error('Không tìm thấy tài khoản admin', { id: loadingToast });
        return;
      }
      
      toast.success('Đã đổi mã PIN thành công!', { id: loadingToast });
      setShowChangePinModal(false);
      setPinChangeData({ currentPin: '', newPin: '', confirmNewPin: '' });
      
      const updatedAdmin = {...currentAdmin, pin: pinChangeData.newPin};
      setCurrentAdmin(updatedAdmin);
      localStorage.setItem('currentAdmin', JSON.stringify(updatedAdmin));
      
    } catch (error) {
      console.error("Change PIN error:", error);
      toast.error('Lỗi khi đổi mã PIN', { id: loadingToast });
    }
  };

  const handleAdjustShift = async () => {
    if (!selectedShift) return;
    const loadingToast = toast.loading('Đang cập nhật giờ ra ca...');
    try {
      await updateDoc(doc(db, 'LichLamViec', selectedShift.id), {
        plannedEndTime: newEndTime
      });
      toast.success('Đã cập nhật giờ ra ca dự kiến!', { id: loadingToast });
      await fetchInitialData(filterMonth, true, { targetedKeys: ['lichLamViecs'], exactDate: selectedShift.date }); // Force refresh cache
      setShowAdjustModal(false);
    } catch (error) {
      toast.error('Lỗi khi cập nhật giờ ra ca', { id: loadingToast });
    }
  };
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  const [pinChangeData, setPinChangeData] = useState({
    currentPin: '',
    newPin: '',
    confirmNewPin: ''
  });

  const handleRefresh = async () => {
    try {
      await fetchInitialData(filterMonth, true);
      toast.success('Dữ liệu đã được làm mới');
    } catch (error) {
      toast.error('Lỗi khi cập nhật dữ liệu');
    }
  };

  // 1. Removed initial essential data load (Now handled by App.tsx)
  
  // 2. Removed load on demand based on Tab (User wants manual refresh)
  
  // 3. Removed re-fetch when month changes (User wants manual refresh)
  
  useEffect(() => {
    if (nhanViens.length === 0) return;
    
    const reviews: {empId: string, fullName: string, nextReviewDate: string}[] = [];
    const now = new Date();
    
    nhanViens.forEach(emp => {
      const baseDate = emp.lastSalaryReviewDate ? new Date(emp.lastSalaryReviewDate) : new Date(emp.joinDate);
      const nextReviewDate = addMonths(baseDate, 3);
      
      if (now >= nextReviewDate) {
        reviews.push({
          empId: emp.empId,
          fullName: emp.fullName,
          nextReviewDate: format(nextReviewDate, 'dd/MM/yyyy')
        });
      }
    });
    
    setSalaryReviewNotifications(reviews);
  }, [nhanViens]);

  useEffect(() => {
    if (filterBranch) {
      setPayrollActiveBranch(filterBranch);
    }
  }, [filterBranch]);

  // 4. Removed real-time notifications for ApprovalRequests (Minimize reads/auto-fetch)



  const {
    exportToCSV,
    sendToGoogleScript,
    handleSendMonthlyReport,
    isSendingReport,
    setIsSendingReport
  } = useAdminReport({
    currentAdmin,
    chamCongs,
    nhanViens,
    allEmployeeSalaryStatsMap,
    filterMonth,
    filterBranch,
    filterBranchRef
  });

  const {
    showMaterialLossModal,
    setShowMaterialLossModal,
    showOtherDeductionsModal,
    setShowOtherDeductionsModal,
    lossType,
    setLossType,
    itemType,
    setItemType,
    originalPrice,
    setOriginalPrice,
    deductionPrice,
    setDeductionPrice,
    quantity,
    setQuantity,
    totalLossAmount,
    setTotalLossAmount,
    totalLossItems,
    setTotalLossItems,
    isProcessingLoss,
    setIsProcessingLoss,
    weightedEmployees,
    setWeightedEmployees,
    handleSelectItemType,
    handleProcessMaterialLoss
  } = useAdminMaterialLoss({
    nhanViens,
    payrollActiveBranch,
    filterMonth,
    allEmployeeSalaryStatsMap,
    currentAdmin,
    fetchInitialData
  });

  const toggleNotifications = async () => {
    if (!currentAdmin || !currentAdmin.id || currentAdmin.id === 'super') return;
    
    const newSettings = {
      enabled: !(currentAdmin.notificationSettings?.enabled ?? true),
      filterEmpId: currentAdmin.notificationSettings?.filterEmpId || ''
    };

    const loadingToast = toast.loading('Đang cập nhật...');
    try {
      await updateDoc(doc(db, 'Admins', currentAdmin.id), {
        notificationSettings: newSettings
      });
      setCurrentAdmin({ ...currentAdmin, notificationSettings: newSettings });
      toast.success(`Đã ${newSettings.enabled ? 'bật' : 'tắt'} thông báo`, { id: loadingToast });
      await fetchInitialData(filterMonth, true, { targetedKeys: ['admins'] });
    } catch (error) {
      toast.error('Lỗi khi cập nhật cài đặt', { id: loadingToast });
    }
  };

  const setNotificationFilter = async (empId: string) => {
    if (!currentAdmin || !currentAdmin.id || currentAdmin.id === 'super') return;
    
    const newSettings = {
      enabled: currentAdmin.notificationSettings?.enabled ?? true,
      filterEmpId: empId
    };

    try {
      await updateDoc(doc(db, 'Admins', currentAdmin.id), {
        notificationSettings: newSettings
      });
      setCurrentAdmin({ ...currentAdmin, notificationSettings: newSettings });
      toast.success(empId ? 'Đã lọc thông báo theo nhân viên' : 'Đã bỏ lọc thông báo');
    } catch (error) {
      toast.error('Lỗi khi cập nhật cài đặt');
    }
  };



  return {
    navigate,
    openMenuEmpId,
    setOpenMenuEmpId,
    isAuthenticated,
    setIsAuthenticated,
    currentAdmin,
    setCurrentAdmin,
    password,
    setPassword,
    adminLoginId,
    setAdminLoginId,
    showLoginPin,
    setShowLoginPin,
    loginIdError,
    setLoginIdError,
    pinError,
    setPinError,
    activeTab,
    setActiveTab,
    historyDay,
    setHistoryDay,
    historyEmployee,
    setHistoryEmployee,
    mobileHistoryMode,
    setMobileHistoryMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    showCompactActionMenu,
    setShowCompactActionMenu,
    showDatePickerGrid,
    setShowDatePickerGrid,
    filterBranch,
    setFilterBranch,
    filterMonth,
    setFilterMonth,
    initializedTabs,
    setInitializedTabs,
    historySearchTerm,
    setHistorySearchTerm,
    showNotifications,
    setShowNotifications,
    headerTapCount,
    setHeaderTapCount,
    loading,
    setLoading,
    successMsg,
    setSuccessMsg,
    payrollActiveBranch,
    setPayrollActiveBranch,
    showHolidayConfig,
    setShowHolidayConfig,
    showFinancialModal,
    setShowFinancialModal,
    showOtherDeductionsModal,
    setShowOtherDeductionsModal,
    showMobileUtilities,
    setShowMobileUtilities,
    editingAdjustment,
    setEditingAdjustment,
    showMaterialLossModal,
    setShowMaterialLossModal,
    isScheduleModalOpen,
    setIsScheduleModalOpen,
    totalLossAmount,
    setTotalLossAmount,
    totalLossItems,
    setTotalLossItems,
    isProcessingLoss,
    setIsProcessingLoss,
    itemType,
    setItemType,
    lossType,
    setLossType,
    originalPrice,
    setOriginalPrice,
    deductionPrice,
    setDeductionPrice,
    quantity,
    setQuantity,
    weightedEmployees,
    setWeightedEmployees,
    visibleColumns,
    setVisibleColumns,
    showColumnConfig,
    setShowColumnConfig,
    columnWidths,
    setColumnWidths,
    showDeductionDetails,
    setShowDeductionDetails,
    localAdjustments,
    setLocalAdjustments,
    undoStack,
    setUndoStack,
    isSavingPayroll,
    setIsSavingPayroll,
    salaryReviewNotifications,
    setSalaryReviewNotifications,
    showChangeAdminPinModal,
    setShowChangeAdminPinModal,
    oldAdminPin,
    setOldAdminPin,
    newAdminPin,
    setNewAdminPin,
    confirmNewAdminPin,
    setConfirmNewAdminPin,
    showOldAdminPin,
    setShowOldAdminPin,
    showNewAdminPin,
    setShowNewAdminPin,
    showConfirmAdminPin,
    setShowConfirmAdminPin,
    adminPinError,
    setAdminPinError,
    selectedEmployeeForDetails,
    setSelectedEmployeeForDetails,
    selectedEmployeeForSalaryDetails,
    setSelectedEmployeeForSalaryDetails,
    showConfirmModal,
    setShowConfirmModal,
    confirmAction,
    setConfirmAction,
    showManualCheckin,
    setShowManualCheckin,
    manualCheckinData,
    setManualCheckinData,
    showAdjustModal,
    setShowAdjustModal,
    selectedShift,
    setSelectedShift,
    newEndTime,
    setNewEndTime,
    showEditAttendanceModal,
    setShowEditAttendanceModal,
    showChangePinModal,
    setShowChangePinModal,
    pinChangeData,
    setPinChangeData,
    editingAttendance,
    setEditingAttendance,
    manualAttendance,
    setManualAttendance,
    removeAccents,
    handlePrevMonth,
    handleNextMonth,
    handleHeaderTap,
    getAllowedBranches,
    handleSelectItemType,
    handleProcessMaterialLoss,
    logAction,
    getBranchTheme,
    handleResize,
    openConfirmModal,
    closeConfirmModal,
    handleChangePin,
    handleAdjustShift,
    checkEmployeeReview,
    handlePayrollChange,
    handleSavePayroll,
    handleUndoPayroll,
    violations,
    handleAddViolation,
    handleLogin,
    handleGoogleLogin,
    handleChangeAdminPin,
    handleRefresh,
    exportToCSV,
    sendToGoogleScript,
    handleSendMonthlyReport,
    isSendingReport,
    handleManualAttendance,
    handleUpdateAttendance,
    handleApproveAttendance,
    handleDeleteAttendance,
    handleDeleteViolation,
    toggleNotifications,
    setNotificationFilter,
    localGoals,
    setLocalGoals,
    handleUpdatePlanningGoal,
    headerTapTimeoutRef,
    currentAdminRef,
    filterBranchRef,
    filterMonthRef,
    isAuthenticatedRef,
    hasCheckedSalaryRef,
    nhanViens,
    adminDisplayName,
    chamCongs,
    lichLamViecs,
    admins,
    canhBaos,
    notifications,
    payrollAdjustments,
    salaryHistories,
    planningGoals,
    filteredChamCongs,
    filteredLichLamViecs,
    historySearchTermLower,
    allEmployeeSalaryStatsMap,
    adminTheme,
    calculateEmployeeSalaryStats,
    auditLogs,
    materialLossLogs: globalData.materialLossLogs || [],
    retainedSalaryRecords: globalData.retainedSalaryRecords || [],
    materialItems,
    holidays
  };
}
