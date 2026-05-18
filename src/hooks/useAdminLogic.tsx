import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, where, deleteField, getDoc, setDoc, increment, limit, writeBatch } from 'firebase/firestore';
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

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
const OWNER_EMAIL = 'nguyen.thanh.liem2505@gmail.com';

export function useAdminLogic(globalData: any, fetchInitialData: any, isLoading: boolean) {
  const navigate = useNavigate();
    const [openMenuEmpId, setOpenMenuEmpId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('currentAdmin') !== null;
  });
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(() => {
    const saved = localStorage.getItem('currentAdmin');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [password, setPassword] = useState('');
  const [adminLoginId, setAdminLoginId] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginIdError, setLoginIdError] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'nhanvien' | 'lichlamviec' | 'xinnghiphep' | 'admins' | 'canhbao' | 'lichsu' | 'duyetgio' | 'bangluong' | 'vipham' | 'bangcongthang'>('dashboard');
  const [historyDay, setHistoryDay] = useState<string | null>(null);
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
        
        // Reset state to default (Bảng Chấm Công Overview)
        if (historyEmployee || historyDay) {
          setHistoryEmployee(null);
          setHistoryDay(null);
          setMobileHistoryMode('employee'); // Default back to employee list view
        }
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [activeTab, historyEmployee, historyDay]);
  
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

  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [initializedTabs, setInitializedTabs] = useState<string[]>([]);

  // LOGIC DỌN DẸP, ARCHIVE & AUTO-REPORT
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

  // STABILIZER: Cô lập fetch data vào 1 useEffect duy nhất
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Prevent redundant fetches for the same month/branch in the same cycle
    if (isLoadingRef.current === `${filterMonth}-${filterBranch}`) return;
    isLoadingRef.current = `${filterMonth}-${filterBranch}`;

    const loadData = async () => {
      try {
        await fetchInitialData(filterMonth, true);
      } catch (err) {
        console.error("Failed to load data for month:", filterMonth, err);
      } finally {
        // App.tsx uses its own locks so this is just a local safety guard
      }
    };

    loadData();
  }, [filterMonth, filterBranch, isAuthenticated, fetchInitialData]);

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
    return raw.filter(nv => 
      (nv.locationId && adminLocations.includes(nv.locationId)) || 
      (nv.locationIds && nv.locationIds.some((id: string) => adminLocations.includes(id)))
    );
  }, [globalData.nhanViens, currentAdmin]);

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

  const xinNghiPheps = useMemo(() => {
    const raw = globalData.xinNghiPheps;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(r => adminLocations.includes(r.locationId));
  }, [globalData.xinNghiPheps, currentAdmin]);

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

  const approvalRequests = useMemo(() => {
    const raw = globalData.approvalRequests;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(r => adminLocations.includes(r.locationId));
  }, [globalData.approvalRequests, currentAdmin]);

  const payrollAdjustments = useMemo(() => {
    const raw = globalData.payrollAdjustments;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    // Adjustments are linked to employees, filter by examining the employee's branch
    return raw.filter(adj => {
      const emp = globalData.nhanViens.find((e: any) => e.id === adj.empId || e.empId === adj.empId);
      return emp && adminLocations.includes(emp.locationId);
    });
  }, [globalData.payrollAdjustments, globalData.nhanViens, currentAdmin]);

  const violations = useMemo(() => {
    const raw = globalData.violations || [];
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(v => {
      const emp = globalData.nhanViens.find((e: any) => e.id === v.empId || e.empId === v.empId);
      return emp && adminLocations.includes(emp.locationId);
    });
  }, [globalData.violations, globalData.nhanViens, currentAdmin]);

  const salaryHistories = useMemo(() => {
    const raw = globalData.salaryHistories;
    if (currentAdmin?.role === 'SuperAdmin') return raw;
    const adminLocations = currentAdmin?.locationIds || [];
    return raw.filter(sh => {
      const empFound = globalData.nhanViens.find((e: any) => e.id === sh.empId || e.empId === sh.empId);
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
      await fetchInitialData(filterMonth, true);
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
      // Already in Admin, maybe refresh data?
      fetchInitialData(filterMonth, true);
      toast.success('Đã cập nhật dữ liệu mới nhất!', { icon: '🔄' });
    }
  }, [headerTapCount]);
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
    if (filterBranch === 'All') return chamCongs;
    return chamCongs.filter(cc => cc.locationId === filterBranch);
  }, [chamCongs, filterBranch]);

  const filteredLichLamViecs = useMemo(() => {
    if (filterBranch === 'All') return lichLamViecs;
    return lichLamViecs.filter(s => s.locationId === filterBranch);
  }, [lichLamViecs, filterBranch]);

  const filteredXinNghiPheps = useMemo(() => {
    if (filterBranch === 'All') return xinNghiPheps;
    return xinNghiPheps.filter(r => r.locationId === filterBranch);
  }, [xinNghiPheps, filterBranch]);

  const filteredApprovalRequests = useMemo(() => {
    let requests = approvalRequests;
    if (filterBranch !== 'All') {
      requests = requests.filter(r => r.locationId === filterBranch);
    }
    
    if (requestTypeFilter !== 'All') {
      requests = requests.filter(r => r.type === requestTypeFilter);
    }
    
    return requests;
  }, [approvalRequests, filterBranch, requestTypeFilter]);

  const historySearchTermLower = useMemo(() => removeAccents(historySearchTerm), [historySearchTerm]);

  const approvalHistory = useMemo(() => {
    let filtered = filteredApprovalRequests.filter(r => r.status !== 'pending');
    
    if (historySearchTermLower) {
      filtered = filtered.filter(r => 
        removeAccents(r.fullName || '').includes(historySearchTermLower) || 
        removeAccents(r.adminId || '').includes(historySearchTermLower)
      );
    }

    return filtered.sort((a: any, b: any) => {
        const createA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0));
        const createB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0));
        return createB - createA;
      });
  }, [filteredApprovalRequests, historySearchTermLower]);

  const pendingRequests = useMemo(() => {
    let filtered = filteredApprovalRequests.filter(r => r.status === 'pending');

    if (historySearchTermLower) {
      filtered = filtered.filter(r => 
        removeAccents(r.fullName || '').includes(historySearchTermLower)
      );
    }

    return filtered.sort((a: any, b: any) => {
        const createA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0));
        const createB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0));
        return createA - createB;
      });
  }, [filteredApprovalRequests, historySearchTermLower]);

// Moved helpers to components where applicable or kept as utility props

  const handleSelectItemType = (name: string) => {
    setItemType(name);
    const item = materialItems.find(i => i.name === name);
    if (item) {
      setOriginalPrice(item.price.toString());
    }
  };

  const handleProcessMaterialLoss = async () => {
    if (!itemType) {
      toast.error('Vui lòng nhập tên dụng cụ');
      return;
    }
    if (!totalLossAmount || isNaN(Number(totalLossAmount)) || Number(totalLossAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const activeWeightedEmployees = weightedEmployees.filter(e => e.checked);
    if (activeWeightedEmployees.length === 0) {
      toast.error('Vui lòng chọn ít nhất một nhân viên để khấu trừ');
      return;
    }

    setIsProcessingLoss(true);
    const loadingToast = toast.loading('Đang xử lý khấu trừ dụng cụ...');
    try {
      const totalHours = activeWeightedEmployees.reduce((sum, e) => sum + e.totalHours, 0);
      const amountPerHour = totalHours > 0 ? Number(totalLossAmount) / totalHours : 0;

      // Determine loss type automatically
      const currentLossType = activeWeightedEmployees.length === 1 ? 'individual' : 'general';

      // Save/Update Material Item Price
      await setDoc(doc(db, 'MaterialItems', itemType), {
        name: itemType,
        price: Number(originalPrice),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Save to Logs for History
      await addDoc(collection(db, 'MaterialLossLogs'), {
        itemType,
        originalPrice: Number(originalPrice),
        deductionPrice: Math.round(Number(originalPrice) * 0.7),
        quantity: Number(quantity),
        totalAmount: Number(totalLossAmount),
        type: currentLossType, // "general" or "individual"
        branch: payrollActiveBranch || 'all',
        monthYear: filterMonth,
        processedAt: serverTimestamp(),
        affectedEmployeeCount: activeWeightedEmployees.length,
        affectedEmployees: activeWeightedEmployees.map(e => e.fullName)
      });

      const batchPromises = activeWeightedEmployees.map(async (emp) => {
        let deductionForEmp = 0;
        let note = '';
        let message = '';
        const isIndividual = currentLossType === 'individual';
        
        if (!isIndividual) {
            deductionForEmp = Math.round(amountPerHour * emp.totalHours);
            note = `Khấu trừ chung ${itemType} x${quantity} (Dựa trên ${emp.totalHours.toFixed(2)} giờ công làm việc)`;
            message = `Ghi nhận khấu trừ dụng cụ ${itemType} - Số lượng ${quantity}. Tổng giá trị chia sẻ của bạn tháng này là ${formatCurrency(deductionForEmp)} VNĐ.`;
        } else {
            deductionForEmp = Math.round(Number(totalLossAmount));
            note = `Khấu trừ riêng ${itemType} x${quantity}`;
            message = `Ghi nhận khấu trừ riêng dụng cụ ${itemType} - Số lượng ${quantity}. Tổng giá trị khấu trừ là ${formatCurrency(deductionForEmp)} VNĐ.`;
        }

        const adjId = `${emp.id}_${filterMonth}`;
        const adjRef = doc(db, 'PayrollAdjustments', adjId);
        
        await setDoc(adjRef, {
          empId: emp.id,
          monthYear: filterMonth,
          materialLoss: increment(deductionForEmp),
          materialLossShared: increment(!isIndividual ? deductionForEmp : 0),
          materialLossIndividual: increment(isIndividual ? deductionForEmp : 0),
          materialLossNote: note
        }, { merge: true });

        await addDoc(collection(db, 'Notifications'), {
          recipientId: emp.id,
          locationId: payrollActiveBranch || 'all',
          title: 'Khấu trừ vật tư',
          message: message,
          type: 'penalty',
          priority: 'medium',
          isRead: false,
          createdAt: serverTimestamp(),
          senderId: currentAdmin?.id,
          relatedId: adjId
        });
      });

      await Promise.all(batchPromises);

      toast.success('Đã xử lý khấu hao vật tư thành công!', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
      setShowMaterialLossModal(false);
      setItemType('');
      setOriginalPrice('');
      setQuantity('');
    } catch (error) {
      console.error('Error processing material loss:', error);
      toast.error('Lỗi khi xử lý khấu hao vật tư', { id: loadingToast });
    } finally {
      setIsProcessingLoss(false);
    }
  };

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

  const handleAddViolation = async (violation: { empId: string; type: string; date: string; note?: string }) => {
    if (!currentAdmin) return;
    try {
      const emp = nhanViens.find(nv => nv.id === violation.empId || nv.empId === violation.empId);
      const monthYear = violation.date.substring(0, 7);
      const violationRef = await addDoc(collection(db, 'Violations'), {
        ...violation,
        monthYear,
        adminId: currentAdmin.id,
        locationId: emp?.locationId || 'all',
        timestamp: serverTimestamp(),
        isConfirmed: false
      });
      
      if (emp) {
        await addDoc(collection(db, 'Notifications'), {
          recipientId: emp.id,
          locationId: emp.locationId || 'all',
          title: 'Nhắc nhở vi phạm',
          message: `Bạn được ghi nhận 01 lần nhắc nhở: ${violation.type}. Vui lòng kiểm tra Bảng Vi Phạm.`,
          type: 'violation',
          priority: 'high',
          isRead: false,
          createdAt: serverTimestamp(),
          senderId: currentAdmin.id,
          relatedId: violationRef.id
        });
      }
      
      toast.success('Ghi nhận vi phạm thành công');
      fetchInitialData(filterMonth, true); // Force refresh cache for this month
      logAction('Thêm vi phạm', emp?.fullName || violation.empId, violation.type);
    } catch (error) {
      console.error('Error adding violation:', error);
      toast.error('Lỗi khi ghi nhận vi phạm');
    }
  };

  const handleDeleteViolation = async (violationId: string, reason: string) => {
    if (!currentAdmin) return;
    const loadingToast = toast.loading('Đang xóa vi phạm...');
    try {
      const violationRef = doc(db, 'Violations', violationId);
      const violationSnap = await getDoc(violationRef);
      
      if (violationSnap.exists()) {
        const vData = violationSnap.data();
        const emp = nhanViens.find(nv => nv.id === vData.empId || nv.empId === vData.empId);
        
        await deleteDoc(violationRef);
        
        if (emp) {
          // Notify employee about the deletion and reason
          await addDoc(collection(db, 'Notifications'), {
            recipientId: emp.id,
            locationId: emp.locationId || 'all',
            title: 'Hủy bỏ vi phạm',
            message: `Vi phạm ngày ${safeFormat(vData.date, 'dd/MM')} của bạn đã được xóa. Lý do: ${reason}`,
            type: 'info',
            priority: 'medium',
            isRead: false,
            createdAt: serverTimestamp(),
            senderId: currentAdmin.id
          });
          
          logAction('Xóa vi phạm', emp.fullName, `Lý do: ${reason} (Lỗi gốc: ${vData.type})`);
        }
      }
      
      toast.success('Đã xóa vi phạm thành công', { id: loadingToast });
      fetchInitialData(filterMonth, true);
    } catch (error) {
      console.error('Error deleting violation:', error);
      toast.error('Lỗi khi xóa vi phạm', { id: loadingToast });
    }
  };

  const [loading, setLoading] = useState(false);
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

  const [payrollActiveBranch, setPayrollActiveBranch] = useState<string>(() => {
    const saved = localStorage.getItem('adminFilterBranch');
    if (currentAdmin?.role !== 'SuperAdmin' && currentAdmin?.locationIds && currentAdmin.locationIds.length > 0) {
      if (saved && currentAdmin.locationIds.includes(saved)) return saved;
      return currentAdmin.locationIds[0];
    }
    if (saved && saved !== 'All') return saved;
    return 'Góc Phố';
  });

  const currentThemeBranch = activeTab === 'bangluong' ? payrollActiveBranch : filterBranch;
  const adminTheme = getBranchTheme(currentThemeBranch);
  const [showHolidayConfig, setShowHolidayConfig] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showOtherDeductionsModal, setShowOtherDeductionsModal] = useState(false);
  const [showMobileUtilities, setShowMobileUtilities] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<PayrollAdjustment | null>(null);
  const [showMaterialLossModal, setShowMaterialLossModal] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [totalLossAmount, setTotalLossAmount] = useState('');
  const [totalLossItems, setTotalLossItems] = useState('');
  const [isProcessingLoss, setIsProcessingLoss] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);

  // New states for Material Loss Module
  const [lossType, setLossType] = useState<'general' | 'individual'>('general');
  const [itemType, setItemType] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [deductionPrice, setDeductionPrice] = useState(0);
  const [quantity, setQuantity] = useState('');
  const [weightedEmployees, setWeightedEmployees] = useState<{
    id: string, 
    empId: string, 
    fullName: string, 
    totalHours: number, 
    weight: number, 
    checked: boolean
  }[]>([]);



  useEffect(() => {
    const price = Number(originalPrice) || 0;
    const dedPrice = Math.round(price * 0.7);
    setDeductionPrice(dedPrice);
    
    const qty = Number(quantity) || 0;
    setTotalLossAmount((dedPrice * qty).toString());
  }, [originalPrice, quantity]);

  // Column visibility and inline editing state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    stt: true,
    name: true,
    bank: false,
    joinDate: false,
    hours: true,
    baseSalary: true,
    responsibility: true,
    holiday: true,
    latePenalty: true,
    phonePenalty: true,
    extraAdditions: true,
    otherDeductions: true,
    materialLoss: true,
    actual: true,
    note: true,
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    stt: 40,
    name: 160,
    bank: 110,
    joinDate: 90,
    hours: 80,
    baseSalary: 110,
    responsibility: 130,
    holiday: 90,
    latePenalty: 110,
    phonePenalty: 110,
    otherDeductions: 110,
    extraAdditions: 110,
    actual: 110,
    note: 300
  });

  const handleResize = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = columnWidths[column];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + (moveEvent.pageX - startX));
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const [showDeductionDetails, setShowDeductionDetails] = useState<string | null>(null);
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, Partial<PayrollAdjustment>>>({});
  const [undoStack, setUndoStack] = useState<Record<string, Partial<PayrollAdjustment>>[]>([]);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);

  const allEmployeeSalaryStatsMap = useMemo(() => {
    const statsMap: Record<string, any> = {};
    nhanViens.forEach(emp => {
      const empTimesheets = chamCongs.filter(cc => (cc.empId === emp.id || cc.empId === emp.empId) && cc.date.startsWith(filterMonth));
      const empSchedules = lichLamViecs.filter(s => (s.empId === emp.id || s.empId === emp.empId) && s.date.startsWith(filterMonth) && !s.isOff);

      const adjustedTimesheets = empTimesheets.map(cc => {
        const daySchedules = empSchedules.filter(s => s.date === cc.date);
        if (daySchedules.length > 0) {
          const matchingSchedule = daySchedules.find(s => {
            if (cc.checkInTime && s.startTime) {
              const ccHour = parseInt(cc.checkInTime.split(':')[0]);
              const sHour = parseInt(s.startTime.split(':')[0]);
              return Math.abs(ccHour - sHour) <= 2;
            }
            return true;
          });

          if (matchingSchedule) {
            const defaults = [{ s: '06:00', e: '11:00' }, { s: '12:00', e: '17:00' }, { s: '17:00', e: '22:00' }];
            const isDefault = defaults.some(d => d.s === matchingSchedule.startTime && d.e === matchingSchedule.endTime);
            if (!isDefault) {
              const [sH, sM] = matchingSchedule.startTime.split(':').map(Number);
              const [eH, eM] = matchingSchedule.endTime.split(':').map(Number);
              const duration = (eH + eM/60) - (sH + sM/60);
              if (duration > 0) {
                return { ...cc, totalHours: duration, _isManualScheduleOverride: true };
              }
            }
          }
        }
        return cc;
      });

      statsMap[emp.id] = calculateNetSalary(emp, filterMonth, adjustedTimesheets, payrollAdjustments, holidays, localAdjustments[emp.id] || {}, violations.filter(v => (v.empId === emp.id || v.empId === emp.empId) && v.monthYear === filterMonth));
    });
    return statsMap;
  }, [nhanViens, chamCongs, lichLamViecs, payrollAdjustments, holidays, localAdjustments, filterMonth, violations]);

  const calculateEmployeeSalaryStats = useCallback((emp: Employee, month: string) => {
    if (month === filterMonth && allEmployeeSalaryStatsMap[emp.id]) {
        return allEmployeeSalaryStatsMap[emp.id];
    }
    // Very fallback logic if called for different month
    return calculateNetSalary(emp, month, [], payrollAdjustments, holidays, localAdjustments[emp.id] || {}, violations.filter(v => (v.empId === emp.id || v.empId === emp.empId) && v.monthYear === month));
  }, [allEmployeeSalaryStatsMap, filterMonth, payrollAdjustments, holidays, localAdjustments, violations]);

  useEffect(() => {
    if (showMaterialLossModal || showOtherDeductionsModal) {
      const branchEmployees = nhanViens.filter(emp => 
        payrollActiveBranch === 'All' || 
        emp.locationId === payrollActiveBranch || 
        (Array.isArray(emp.locationIds) && emp.locationIds.includes(payrollActiveBranch))
      );
      const employeesWithWeights = branchEmployees.map(emp => {
        const stats = allEmployeeSalaryStatsMap[emp.id] || { totalHours: 0 };
        const totalHours = stats.totalHours || 0;
        
        return {
          id: emp.id,
          empId: emp.empId,
          fullName: emp.fullName,
          totalHours,
          weight: totalHours >= 200 ? 1 : 0.5,
          checked: true
        };
      }).filter(emp => emp.totalHours > 0);
      setWeightedEmployees(employeesWithWeights);
      setItemType('');
      setOriginalPrice('');
      setQuantity('');
    }
  }, [showMaterialLossModal, showOtherDeductionsModal, nhanViens, allEmployeeSalaryStatsMap, payrollActiveBranch]);

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

  // Admin Change PIN State
  const [showChangeAdminPinModal, setShowChangeAdminPinModal] = useState(false);
  const [oldAdminPin, setOldAdminPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmNewAdminPin, setConfirmNewAdminPin] = useState('');
  const [showOldAdminPin, setShowOldAdminPin] = useState(false);
  const [showNewAdminPin, setShowNewAdminPin] = useState(false);
  const [showConfirmAdminPin, setShowConfirmAdminPin] = useState(false);
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

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


  // Manual Attendance State
  const [showManualCheckin, setShowManualCheckin] = useState(false);
  const [manualCheckinData, setManualCheckinData] = useState({
    empId: '',
    locationId: 'Góc Phố',
    dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'IN' as 'IN' | 'OUT'
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
      await fetchInitialData(filterMonth, true); // Force refresh cache
      setShowAdjustModal(false);
    } catch (error) {
      toast.error('Lỗi khi cập nhật giờ ra ca', { id: loadingToast });
    }
  };
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  const [pinChangeData, setPinChangeData] = useState({
    currentPin: '',
    newPin: '',
    confirmNewPin: ''
  });
  const [editingAttendance, setEditingAttendance] = useState<Timesheet | null>(null);
  const [manualAttendance, setManualAttendance] = useState({
    empId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    checkInTime: format(new Date(), 'HH:mm'),
    checkOutTime: '',
    locationId: getAllowedBranches()[0] || 'Góc Phố'
  });

  const checkEmployeeReview = (emp: Employee) => {
    let lastReviewDate = emp.lastSalaryReviewDate ? new Date(emp.lastSalaryReviewDate) : null;
    if (!lastReviewDate && emp.joinDate) {
      lastReviewDate = new Date(emp.joinDate);
    }
    if (!lastReviewDate) return { needsReview: false, daysSince: 0 };
    
    // Calculate difference in days between now and lastReviewDate
    const today = new Date();
    const diffTime = today.getTime() - lastReviewDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      needsReview: diffDays >= 90,
      daysSince: diffDays
    };
  };

  const handlePayrollChange = (empId: string, field: keyof PayrollAdjustment, value: any) => {
    setUndoStack(prev => [...prev, localAdjustments]);
    setLocalAdjustments(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value
      }
    }));
  };

// Moved to separate file

  const BottomNav = () => {
    const navConfig = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: 'dashboard', isCenter: false, badgeCount: 0 },
      { id: 'bangcong', label: 'Bảng Chấm Công', icon: TableProperties, path: 'bangcongthang', isCenter: false, badgeCount: 0 },
      { id: 'duyetgio', label: 'Duyệt công', icon: CheckCircle2, path: 'duyetgio', isCenter: true, badgeCount: pendingRequests.length },
      { id: 'lichlamviec', label: 'Lịch Làm Việc', icon: Calendar, path: 'lichlamviec', isCenter: false, badgeCount: xinNghiPheps.filter(x => x.status === 'cho_duyet').length },
      { id: 'bangluong', label: 'Bảng lương', icon: DollarSign, path: 'bangluong', isCenter: false, badgeCount: 0 },
    ];

    return (
      <div className={`md:hidden fixed bottom-0 left-0 right-0 ${adminTheme.footer} h-20 flex items-center justify-around z-50 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] pb-safe transition-colors duration-500`}>
        {navConfig.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.path;
          
          if (item.isCenter) {
            return (
              <motion.button
                key={item.id}
                whileTap={{ 
                  scale: 0.9,
                  x: [0, -2, 2, -2, 2, 0],
                  transition: { duration: 0.2 }
                }}
                onClick={() => setActiveTab(item.path as any)}
                className={`relative -top-2 flex flex-col items-center justify-center w-16 h-16 bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.3)] border-4 border-white/20 transition-all`}
              >
                <Icon className={`w-7 h-7 ${adminTheme.text}`} />
                <span className={`text-[8px] font-black mt-0.5 ${adminTheme.text} uppercase tracking-tighter`}>Chờ duyệt</span>
                {item.badgeCount > 0 && (
                  <motion.span 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, -10, 10, -10, 10, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      repeatDelay: 1
                    }}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                  >
                    {item.badgeCount}
                  </motion.span>
                )}
              </motion.button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.path as any)}
              className={`relative flex flex-col items-center gap-1 transition-all w-16 ${isActive ? 'text-white scale-110' : 'text-white/40 hover:text-white/60'}`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-[10px] ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
              {item.badgeCount > 0 && (
                <motion.span 
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                  }}
                  className={`absolute -top-1 right-3 w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white`}
                >
                  {item.badgeCount}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const SidebarItem = ({ icon: Icon, label, active, onClick, badge, variant }: any) => {
    const isRed = variant === 'danger';
    
    return (
      <button
        onClick={() => {
          onClick();
          setIsMobileSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all relative ${
          active 
            ? (isRed ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : `${adminTheme.accent} text-white shadow-lg ${adminTheme.shadow}`) 
            : (isRed ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-slate-400 hover:bg-white/5 hover:text-white')
        } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
      >
        <Icon strokeWidth={1.5} className="w-5 h-5 flex-shrink-0" />
        {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="text-sm whitespace-nowrap">{label}</span>}
        {(!isSidebarCollapsed || isMobileSidebarOpen) && badge > 0 && (
          <span className={`ml-auto ${isRed ? 'bg-white text-red-600' : (filterBranch === 'Phố Xanh' ? 'bg-[#D4AF37]' : 'bg-red-500')} text-white py-0.5 px-2 rounded-full text-[10px] font-black`}>
            {badge}
          </span>
        )}
        {(isSidebarCollapsed && !isMobileSidebarOpen) && badge > 0 && (
          <div className={`absolute top-2 right-2 w-2.5 h-2.5 ${isRed ? 'bg-white' : (filterBranch === 'Phố Xanh' ? 'bg-[#D4AF37]' : 'bg-red-500')} rounded-full border-2 border-[#0f172a]`} />
        )}
      </button>
    );
  };

  const handleSavePayroll = async (specificEmpId?: string, specificAdj?: any) => {
    setIsSavingPayroll(true);
    const loadingToast = fetchInitialData ? null : toast.loading('Đang lưu bảng lương...');
    
    try {
      const targets = (specificEmpId && specificAdj) 
        ? { [specificEmpId]: specificAdj } 
        : localAdjustments;

      const targetKeys = Object.keys(targets);
      if (targetKeys.length === 0) {
        setIsSavingPayroll(false);
        return;
      }

      const batch = writeBatch(db);
      const fields = [
        'hourlyRate', 'responsibilityBonus', 'penalty', 'penaltyNote', 
        'retainedSalary', 'retainedSalaryNote', 'returnRetainedSalary',
        'extraAdditions', 'extraAdditionsNote', 'advanceSalary', 'advanceSalaryNote',
        'materialLoss', 'materialLossNote', 'ttnPercentage', 'ttnPercentageNote',
        'overrideTtnPercentage', 'note',
        'overrideLatePenalty', 'overridePhonePenalty', 'overrideLateMinutes', 'overridePhoneCount'
      ];

      for (const keyId of targetKeys) {
        const changes = targets[keyId];
        if (!changes) continue;
        
        const emp = nhanViens.find(n => n.id === keyId || n.empId === keyId);
        if (!emp) continue;

        const matches = payrollAdjustments.filter(a => 
          (a.empId === emp.id || a.empId === emp.empId) && a.monthYear === filterMonth
        );
        const existingAdj = matches[0];
        const adjId = existingAdj?.id || `${emp.id}_${filterMonth}`;
        const adjRef = doc(db, 'PayrollAdjustments', adjId);

        const dataToSave: any = {
          empId: emp.id,
          monthYear: filterMonth,
          updatedAt: serverTimestamp()
        };

        fields.forEach(f => {
          if (changes[f] !== undefined) {
             dataToSave[f] = (changes[f] === null) ? deleteField() : changes[f];
          } else if (existingAdj && existingAdj[f] !== undefined) {
             const val = matches.find(m => m[f] !== undefined && m[f] !== 0 && m[f] !== '')?.[f];
             dataToSave[f] = val !== undefined ? val : existingAdj[f];
          }
        });

        if (changes.retainedSalary !== undefined) {
          dataToSave.retainedMonth = filterMonth;
          dataToSave.retainedBranch = payrollActiveBranch;
        }

        const empUpdates: any = {};
        let syncEmployee = false;

        if (changes.hourlyRate !== undefined && changes.hourlyRate > (emp.hourlyRate || 0)) {
           const luong = changes.hourlyRate;
           const diff = luong - (emp.hourlyRate || 0);
           const diffK = diff >= 1000 ? `${Math.round(diff / 1000)}k` : diff;
           const noteAddition = `Đã tăng ${diffK}/h từ tháng ${filterMonth}`;
           
           empUpdates.hourlyRate = luong;
           empUpdates.lastSalaryReviewDate = new Date().toISOString();
           syncEmployee = true;

           const currentAdjNote = dataToSave.note || '';
           dataToSave.note = currentAdjNote ? currentAdjNote + '\n' + noteAddition : noteAddition;
        } else if (changes.hourlyRate !== undefined) {
           empUpdates.hourlyRate = changes.hourlyRate;
           syncEmployee = true;
        }

        if (changes.responsibilityBonus !== undefined && changes.responsibilityBonus > (emp.responsibilityBonus || 0)) {
           const bonus = changes.responsibilityBonus;
           const diff = bonus - (emp.responsibilityBonus || 0);
           const diffK = diff >= 1000 ? `${Math.round(diff / 1000)}k` : diff;
           const noteAddition = `Đã tăng Đơn giá Thưởng TN ${diffK} từ tháng ${filterMonth}`;
           
           empUpdates.responsibilityBonus = bonus;
           empUpdates.lastSalaryReviewDate = new Date().toISOString();
           syncEmployee = true;

           const currentAdjNote = dataToSave.note || '';
           dataToSave.note = currentAdjNote ? currentAdjNote + '\n' + noteAddition : noteAddition;
        } else if (changes.responsibilityBonus !== undefined) {
           empUpdates.responsibilityBonus = changes.responsibilityBonus;
           syncEmployee = true;
        }

        batch.set(adjRef, dataToSave, { merge: true });

        // Duplicates cleanup - separate from batch because they are separate docs
        if (matches.length > 1) {
          const extraMatches = matches.filter(m => m.id !== adjId);
          extraMatches.forEach(m => batch.delete(doc(db, 'PayrollAdjustments', m.id)));
        }

        // Sync employee profile
        if (dataToSave.retainedSalary > 0) {
          empUpdates.retainedSalaryAmount = dataToSave.retainedSalary;
          empUpdates.retainedSalaryStatus = 'Đã giữ';
          empUpdates.retainedSalaryBranch = dataToSave.retainedBranch || payrollActiveBranch;
          syncEmployee = true;
        }
        if (dataToSave.returnRetainedSalary > 0) {
          empUpdates.retainedSalaryStatus = 'Đã trả';
          syncEmployee = true;
        }

        if (syncEmployee) {
          batch.update(doc(db, 'employees', emp.id), empUpdates);
        }

        // AUTO-TRIGGER NOTIFICATION FOR PAYROLL UPDATE
        await addDoc(collection(db, 'Notifications'), {
          recipientId: emp.id,
          locationId: emp.locationId || 'All',
          title: 'Cập nhật bảng lương',
          message: `Bảng lương tháng ${filterMonth} của bạn đã được Admin cập nhật/phê duyệt. Vui lòng kiểm tra lại.`,
          type: 'payroll',
          priority: 'medium',
          isRead: false,
          createdAt: serverTimestamp(),
          senderId: currentAdmin.id,
          relatedId: adjId
        });
      }

      await batch.commit();
      
      // Update global Data
      await fetchInitialData(filterMonth, true);
      
      if (specificEmpId) {
        setLocalAdjustments(prev => {
          const next = { ...prev };
          delete next[specificEmpId];
          return next;
        });
      } else {
        setLocalAdjustments({});
        setUndoStack([]);
      }
      
      toast.success('Đã lưu bảng lương thành công!', { id: loadingToast });
    } catch (error) {
      console.error("Error saving payroll:", error);
      toast.error('Có lỗi xảy ra khi lưu bảng lương.', { id: loadingToast });
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const handleUndoPayroll = () => {
    if (undoStack.length === 0) return;
    const newStack = [...undoStack];
    const previousState = newStack.pop();
    if (previousState) {
      setLocalAdjustments(previousState);
      setUndoStack(newStack);
      toast.success('Đã hoàn tác');
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginIdError('');
    setPinError('');

    if (!adminLoginId && password !== '2608') {
      setLoginIdError('Vui lòng nhập Số điện thoại hoặc Họ tên');
      return;
    }
    setLoading(true);
    try {
      let adminDataToSet: AdminAccount | null = null;
      let isMaster = false;

      // 1. Use existing admins list from globalData
      const allAdmins = (globalData?.admins || []).map((d: any) => ({
        ...d,
        locationIds: Array.isArray(d.locationIds) ? d.locationIds : (d.locationId ? [d.locationId] : ['Góc Phố', 'Phố Xanh'])
      }));

      // Find by ID and check PIN combined logic
      let foundAdmin = allAdmins.find((d: any) => 
        (d.email?.toLowerCase() === adminLoginId.toLowerCase()) || 
        (d.phone === adminLoginId)
      );

      const empMatch = (globalData?.nhanViens || []).find((nv: any) => 
        (nv.phone === adminLoginId || nv.fullName.toLowerCase() === adminLoginId.toLowerCase())
      );

      // Check PIN logic
      if (password === '2608') {
        isMaster = true;
      } else {
        // Authenticate based on foundAdmin OR matching employee
        const isAdmin = foundAdmin && foundAdmin.pin === password;
        const isEmployeeManager = empMatch && empMatch.pinCode === password;

        if (!isAdmin && !isEmployeeManager) {
          if (!foundAdmin && !empMatch) {
            setLoginIdError('Số điện thoại hoặc Tên đăng nhập không đúng');
          } else {
            setPinError('Sai mã PIN');
          }
          setLoading(false);
          return;
        }

        // If matched via employee but not explicitly in Admins, we might want to register them or just log them in
        // For now, let's assume if they match an employee who is also an Admin, we use the Admin account data
        // If matched as employee ONLY, we might need a default AdminAccount?
        // THE REQ IS: Unified PIN. Let's use foundAdmin if PIN matches, otherwise if employee PIN matches,
        // we need to resolve to which AdminAccount they belong to.
        if (isEmployeeManager && empMatch) {
            // Try to find the Admin account associated with this employee
            const associatedAdmin = allAdmins.find(a => a.email === empMatch.fullName);
            if (associatedAdmin) {
                foundAdmin = associatedAdmin;
            } else {
                // Should we create one? No, assuming the setup exists.
                setLoginIdError('Tài khoản này chưa được cấu hình quyền Admin');
                setLoading(false);
                return;
            }
        }
      }

      if (foundAdmin) {
        adminDataToSet = foundAdmin as AdminAccount;
      }

      // 2. Fallback for Master PIN if no found admin or if PIN is 2608
      if (isMaster) {
        console.log("🔥 ĐANG ĐỌC DATABASE (Admin - Super Check)...");
        try {
          const superDoc = await getDoc(doc(db, 'Admins', 'super'));
          if (!superDoc.exists()) {
            const newSuper = {
              email: 'admin',
              pin: '2608',
              role: 'SuperAdmin',
              locationIds: ['Góc Phố', 'Phố Xanh']
            };
            await setDoc(doc(db, 'Admins', 'super'), newSuper);
            adminDataToSet = { id: 'super', ...newSuper } as AdminAccount;
          } else {
            await updateDoc(doc(db, 'Admins', 'super'), { pin: '2608' });
            const data = superDoc.data();
            adminDataToSet = { 
              id: 'super', 
              ...data, 
              pin: '2608',
              locationIds: Array.isArray(data?.locationIds) ? data?.locationIds : ['Góc Phố', 'Phố Xanh']
            } as AdminAccount;
          }
        } catch (dbErr: any) {
          console.error("Master login DB error:", dbErr);
          setLoginIdError(`Lỗi kết nối Firebase: ${dbErr.code || dbErr.message}`);
          setLoading(false);
          return;
        }
      }

      if (adminDataToSet) {
        if (isMaster) {
          toast.success('Chào Sếp lớn! Hệ thống quản lý Góc Phố Xanh đã sẵn sàng!', { duration: 800, icon: '👋' });
        } else {
          const branchNames = adminDataToSet.locationIds.join(', ');
          let customGreeting = `Chào Quản lý ${branchNames}! Hệ thống đã sẵn sàng.`;
          const emailLower = adminDataToSet.email?.toLowerCase() || '';
          
          if (emailLower.includes('khoa')) {
            customGreeting = 'Chào sếp Khoa! Hệ thống đã sẵn sàng.';
          } else if (emailLower.includes('diệu')) {
            customGreeting = 'Chào sếp Diệu xinh đẹp! Hệ thống đã sẵn sàng.';
          }
          
          toast.success(customGreeting, { duration: 800, icon: '👋' });
        }
        
        // Save session
        localStorage.setItem('currentAdmin', JSON.stringify(adminDataToSet));
        
        setTimeout(() => {
          setCurrentAdmin(adminDataToSet!);
          setIsAuthenticated(true);
          // If manager, set their branch
          if (adminDataToSet?.role !== 'SuperAdmin' && adminDataToSet?.locationIds && adminDataToSet.locationIds.length > 0) {
            setFilterBranch(adminDataToSet.locationIds[0]);
            setPayrollActiveBranch(adminDataToSet.locationIds[0]);
          } else {
            setFilterBranch('Góc Phố');
            setPayrollActiveBranch('Góc Phố');
          }
          setLoading(false);
        }, 800);
        return;
      }

      toast.error('Mã PIN không đúng');
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi đăng nhập: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this email is the owner or in the Admins collection
      const ownerEmail = 'nguyen.thanh.liem2505@gmail.com';
      
      if (user.email === OWNER_EMAIL) {
        const superAdminData = {
          id: 'super',
          email: user.email || 'admin',
          pin: '******',
          role: 'SuperAdmin' as const,
          locationIds: ['Góc Phố', 'Phố Xanh']
        };
        setCurrentAdmin(superAdminData);
        setIsAuthenticated(true);
        setFilterBranch('Góc Phố');
        setPayrollActiveBranch('Góc Phố');
        localStorage.setItem('currentAdmin', JSON.stringify(superAdminData));
        return;
      }

      const q = query(collection(db, 'Admins'), where('email', '==', user.email));
      console.log("🔥 ĐANG ĐỌC DATABASE (Admin - Google Login Check)...");
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
        localStorage.setItem('currentAdmin', JSON.stringify(adminData));

        if (adminData.role !== 'SuperAdmin' && adminData.locationIds.length > 0) {
          setFilterBranch(adminData.locationIds[0]);
          setPayrollActiveBranch(adminData.locationIds[0]);
        } else {
          setFilterBranch('Góc Phố');
          setPayrollActiveBranch('Góc Phố');
        }
      } else {
        toast.error('Email này không có quyền truy cập Admin');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi đăng nhập Google');
    }
    setLoading(false);
  };

  const handleChangeAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError(null);
    
    if (!currentAdmin) return;

    // Check old PIN
    if (oldAdminPin !== currentAdmin.pin) {
      setAdminPinError('Mã PIN cũ không đúng');
      return;
    }

    if (newAdminPin !== confirmNewAdminPin) {
      setAdminPinError('Mã PIN mới không khớp, vui lòng kiểm tra lại');
      return;
    }
    if (newAdminPin.length !== 4) {
      setAdminPinError('Mã PIN phải gồm 4 chữ số');
      return;
    }
    
    try {
      if (currentAdmin?.id === 'super') {
        await setDoc(doc(db, 'Admins', 'super'), {
          ...currentAdmin,
          pin: newAdminPin
        });
      } else {
        await updateDoc(doc(db, 'Admins', currentAdmin?.id || ''), {
          pin: newAdminPin
        });
        
        // Update employee PIN if this admin is also an employee
        const emp = nhanViens.find(nv => nv.fullName === currentAdmin.email);
        if (emp) {
          await updateDoc(doc(db, 'employees', emp.id), {
            pinCode: newAdminPin
          });
        }
      }
      
      setCurrentAdmin({ ...currentAdmin, pin: newAdminPin });
      toast.success('Đổi mã PIN thành công');
      setShowChangeAdminPinModal(false);
      setOldAdminPin('');
      setNewAdminPin('');
      setConfirmNewAdminPin('');
      setAdminPinError(null);
    } catch (error) {
      console.error(error);
      setAdminPinError('Lỗi khi đổi mã PIN');
    }
  };

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



  const exportToCSV = () => {
    // CSV Export: Granular Report (One row per shift)
    const filteredData = chamCongs.filter(cc => 
      cc.date.startsWith(filterMonth) && 
      (filterBranch === 'All' || cc.locationId === filterBranch)
    );

    if (filteredData.length === 0) {
      toast.error('Không có dữ liệu ca làm việc để xuất CSV');
      return;
    }

    const headers = [
      'Ngày', 
      'Tên nhân viên', 
      'Mã NV', 
      'Giờ vào', 
      'Giờ ra', 
      'Địa điểm', 
      'Tổng giờ', 
      'Lương cơ bản', 
      'Phụ cấp', 
      'Vi phạm', 
      'Thực lãnh'
    ];

    const rows = filteredData.map(cc => {
      const employee = nhanViens.find(nv => nv.id === cc.empId || nv.empId === cc.empId);
      const stats = allEmployeeSalaryStatsMap[cc.empId] || { 
        currentHourlyRate: employee?.hourlyRate || 0,
        responsibilityBonus: 0,
        latePenaltyTotal: 0,
        phonePenaltyTotal: 0,
        actualSalary: 0
      };
      
      // Since stats are monthly, for granular view we show shift-specific pay if available, 
      // or just the monthly context. User wants detailed đối soát.
      return [
        cc.date,
        employee?.fullName || 'N/A',
        cc.empId,
        cc.checkInTime || '',
        cc.checkOutTime || '',
        cc.locationId,
        cc.totalHours ? cc.totalHours.toFixed(2) : '0',
        stats.currentHourlyRate,
        stats.responsibilityBonus, // Monthly context
        (cc.PhutPhatRoiApp || 0), // Shift specific violation
        cc.totalPay ? Math.round(cc.totalPay) : 0
      ].map(val => `"${val}"`).join(',');
    });

    // UTF-8 with BOM for Excel compatibility
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Bao_cao_chi_tiet_nhan_su_${filterBranch}_${filterMonth}.csv`);
    toast.success('Đã xuất báo cáo CSV chi tiết thành công!');
  };

  const sendToGoogleScript = async (csvData: string, subject: string, recipientEmail?: string) => {
    const scriptUrl = import.meta.env.VITE_GAS_URL;
    
    if (!scriptUrl) {
      console.error("[GAS] VITE_GAS_URL is not defined in environment variables!");
      toast.error('Chưa cấu hình URL Script gửi mail (VITE_GAS_URL). Vui lòng kiểm tra lại Settings.');
      return { success: false, actualRecipient: '' };
    }
    
    try {
      // VALIDATION: Ensure we have a REAL email, not a display name
      const isValidEmail = (email: string) => {
        if (!email || typeof email !== 'string') return false;
        // Strict check: must have @ and . and no spaces
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      };
      
      let targetRecipient = (recipientEmail || currentAdmin?.email || '').trim();
      
      console.log(`[GAS] Validating recipient: "${targetRecipient}"`);

      // Fallback 1: If current target is not a valid email, try Auth user
      if (!isValidEmail(targetRecipient)) {
        const authEmail = auth.currentUser?.email;
        if (authEmail && isValidEmail(authEmail)) {
          console.log(`[GAS] Switching invalid recipient "${targetRecipient}" to auth email: ${authEmail}`);
          targetRecipient = authEmail;
        }
      }
      
      // Fallback 2: Hard fallback to OWNER_EMAIL
      if (!isValidEmail(targetRecipient)) {
        console.log(`[GAS] Final fallback to OWNER_EMAIL: ${OWNER_EMAIL} (Previous was: "${targetRecipient}")`);
        targetRecipient = OWNER_EMAIL;
      }

      const senderEmail = (currentAdmin?.email && isValidEmail(currentAdmin.email)) 
        ? currentAdmin.email 
        : (auth.currentUser?.email || 'admin-system@gocphoxanh.com');
      
      // Prepare JSON payload for better compatibility with complex scripts
      const payload = {
        csv: csvData,
        subject: subject,
        recipient: targetRecipient,
        email: targetRecipient,
        sender: senderEmail,
        branch: filterBranchRef.current || 'All',
        timestamp: new Date().toISOString(),
        source: 'AI Studio Build'
      };

      console.log("[GAS] Dispatching JSON payload to:", targetRecipient, "(URL:", scriptUrl, ")");
      
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });
      
      return { success: true, actualRecipient: targetRecipient };
    } catch (error) {
      console.error("[GAS] sendToGoogleScript Error:", error);
      return { success: false, actualRecipient: '' };
    }
  };

  const handleSendMonthlyReport = async () => {
    const isAdminSuper = currentAdmin?.role === 'SuperAdmin' || currentAdmin?.email === OWNER_EMAIL;
    if (!currentAdmin || !isAdminSuper) {
      toast.error('Chỉ Super Admin mới có quyền thực hiện tính năng này');
      return;
    }

    setIsSendingReport(true);
    const reportMonth = filterMonth;
    const branchName = filterBranch;
    
    try {
      toast.loading(`Đang chuẩn bị báo cáo tháng ${reportMonth} - Chi nhánh ${branchName}...`, { id: 'send-report' });
      
      // Filter logs by month AND branch (if not 'All')
      const reportData = chamCongs.filter(cc => {
        const matchesMonth = cc.date.startsWith(reportMonth);
        const matchesBranch = branchName === 'All' || cc.locationId === branchName;
        return matchesMonth && matchesBranch;
      });
      
      if (reportData.length === 0) {
        toast.error('Sếp ơi, không có dữ liệu để báo cáo!', { id: 'send-report' });
        setIsSendingReport(false);
        return;
      }

      console.log(`[REPORT] Preparing data for ${reportData.length} records...`);

      const headers = [
        'Ngày', 
        'Tên nhân viên', 
        'Mã NV', 
        'Giờ vào', 
        'Giờ ra', 
        'Địa điểm', 
        'Tổng giờ', 
        'Lương cơ bản', 
        'Vi phạm (Shift)', 
        'Thực lãnh (Shift)'
      ];

      const escapeCSV = (valValue: any) => {
        const str = String(valValue === null || valValue === undefined ? '' : valValue);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = reportData.map(cc => {
        const employee = nhanViens.find(nv => nv.id === cc.empId || nv.empId === cc.empId);
        return [
          escapeCSV(cc.date),
          escapeCSV(employee?.fullName || 'N/A'),
          escapeCSV(cc.empId),
          escapeCSV(cc.checkInTime || ''),
          escapeCSV(cc.checkOutTime || ''),
          escapeCSV(cc.locationId),
          escapeCSV(cc.totalHours ? cc.totalHours.toFixed(2) : '0'),
          escapeCSV(employee?.hourlyRate || 0),
          escapeCSV(cc.PhutPhatRoiApp || 0),
          escapeCSV(cc.totalPay ? Math.round(cc.totalPay) : 0)
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const subject = `[GPX] Báo cáo nhân sự - ${branchName === 'All' ? 'Tất cả chi nhánh' : branchName} - Tháng ${reportMonth}`;
      
      console.log("[REPORT] Sending to GAS via sendToGoogleScript...");
      const { success, actualRecipient } = await sendToGoogleScript(csvContent, subject, currentAdmin.email);
      
      if (success) {
        console.log("[REPORT] Script request returned success, logging to Firestore...");
        const reportId = `Report_${branchName.replace(/\s+/g, '_')}_${reportMonth}_${Date.now()}`;
        await setDoc(doc(db, 'ReportStatus', reportId), {
          type: 'MANUAL_SEND',
          branch: branchName,
          monthYear: reportMonth,
          triggeredBy: currentAdmin.email,
          triggeredAt: serverTimestamp(),
          status: 'sent_to_gas',
          subject: subject,
          recipient: actualRecipient
        });

        toast.success(`Đã gửi báo cáo thành công! Sếp vui lòng kiểm tra hộp thư (${actualRecipient})`, { 
          id: 'send-report',
          duration: 6000 
        });
      } else {
        throw new Error("Gửi dữ liệu qua GAS thất bại (Network Error)");
      }
    } catch (err: any) {
      console.error("handleSendMonthlyReport Error:", err);
      toast.error(`Gửi thất bại: ${err?.message || 'Lỗi kết nối GAS'}`, { id: 'send-report' });
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAttendance.empId || !manualAttendance.date || !manualAttendance.checkInTime) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const loadingToast = toast.loading('Đang ghi nhận chấm công...');
    try {
      const employee = nhanViens.find(nv => nv.empId === manualAttendance.empId);
      if (!employee) {
        toast.error('Nhân viên không tồn tại', { id: loadingToast });
        return;
      }

      const checkInISO = new Date(`${manualAttendance.date}T${manualAttendance.checkInTime}`).toISOString();
      let checkOutISO = null;
      let totalHours = 0;
      let totalPay = 0;

      if (manualAttendance.checkOutTime) {
        checkOutISO = new Date(`${manualAttendance.date}T${manualAttendance.checkOutTime}`).toISOString();
        const diffMs = new Date(checkOutISO).getTime() - new Date(checkInISO).getTime();
        totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
        totalPay = totalHours * employee.hourlyRate;
      }

      const timesheetId = `TS_MANUAL_${manualAttendance.empId}_${Date.now()}`;
      await addDoc(collection(db, 'timesheets'), {
        timesheetId,
        date: manualAttendance.date,
        empId: manualAttendance.empId,
        locationId: manualAttendance.locationId,
        checkInTime: checkInISO,
        checkOutTime: checkOutISO,
        SaiSoGPS: 0,
        AnhVaoCa: 'MANUAL_BY_ADMIN',
        AnhRaCa: manualAttendance.checkOutTime ? 'MANUAL_BY_ADMIN' : null,
        PhutPhatRoiApp: 0,
        SoLanRoiApp: 0,
        totalHours,
        totalPay,
        createdByAdminId: currentAdmin?.id
      });
      await logAction('Chấm công hộ', 'Chấm công', `Chấm công hộ cho ${employee.fullName} (Mã: ${manualAttendance.empId}) vào ngày ${manualAttendance.date}`);

      toast.success('Chấm công hộ thành công', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
      setShowEditAttendanceModal(false);
      setManualAttendance({
        empId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        checkInTime: format(new Date(), 'HH:mm'),
        checkOutTime: '',
        locationId: 'Góc Phố'
      });
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi chấm công hộ');
    }
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;

    const loadingToast = toast.loading('Đang cập nhật chấm công...');
    try {
      const employee = nhanViens.find(nv => nv.empId === editingAttendance.empId);
      if (!employee) {
        toast.error('Nhân viên không tồn tại');
        return;
      }

      const checkInISO = new Date(`${editingAttendance.date}T${editingAttendance.checkInTime}`).toISOString();
      let checkOutISO = null;
      let totalHours = 0;
      let totalPay = 0;
      let lateMinutes = 0;
      let latePenaltyMinutes = 0;

      if (editingAttendance.scheduledStartTime && editingAttendance.checkInTime) {
        const [schH, schM] = editingAttendance.scheduledStartTime.split(':').map(Number);
        const [selH, selM] = editingAttendance.checkInTime.split(':').map(Number);
        const selTotal = selH * 60 + selM;
        const schTotal = schH * 60 + schM;
        if (selTotal > schTotal) {
          lateMinutes = selTotal - schTotal;
          if (lateMinutes >= 10) {
            latePenaltyMinutes = lateMinutes * 3;
          }
        }
      }

      if (editingAttendance.checkOutTime) {
        checkOutISO = new Date(`${editingAttendance.date}T${editingAttendance.checkOutTime}`).toISOString();
        const diffMs = new Date(checkOutISO).getTime() - new Date(checkInISO).getTime();
        totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
        totalPay = totalHours * employee.hourlyRate;
      }

      await updateDoc(doc(db, 'timesheets', editingAttendance.id), {
        date: editingAttendance.date,
        locationId: editingAttendance.locationId,
        checkInTime: checkInISO,
        checkOutTime: checkOutISO,
        totalHours,
        totalPay,
        lateMinutes,
        latePenaltyMinutes
      });
      await logAction('Sửa', 'Chấm công', `Sửa bản ghi chấm công của ${employee.fullName} (Mã: ${editingAttendance.empId}) ngày ${editingAttendance.date}`);

      toast.success('Cập nhật chấm công thành công', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
      setShowEditAttendanceModal(false);
      setEditingAttendance(null);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật chấm công');
    }
  };


  const handleApproveAttendance = async (log: Timesheet) => {
    const loadingToast = toast.loading('Đang duyệt giờ công...');
    try {
      await updateDoc(doc(db, 'timesheets', log.id), {
        status: 'approved'
      });
      
      // Also update any related ApprovalRequests if they exist
      const q = query(collection(db, 'ApprovalRequests'), where('details.timesheetId', '==', log.id));
      console.log("🔥 ĐANG ĐỌC DATABASE (Admin - Update Attendance Approval)...");
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'ApprovalRequests', d.id), {
          status: 'approved',
          adminId: currentAdmin?.id,
          processedAt: serverTimestamp()
        });
      }

      // Create notification for employee
      const targetEmp = nhanViens.find(e => e.empId === log.empId || e.id === log.empId);
      const recipientId = targetEmp ? targetEmp.id : log.empId;
      
      await addDoc(collection(db, 'Notifications'), {
        recipientId: recipientId,
        locationId: log.locationId,
        title: 'Yêu cầu được duyệt',
        message: `Giờ công ngày ${log.date} của bạn đã được duyệt bởi ${currentAdmin?.email.split('@')[0]}.`,
        type: 'approval',
        priority: 'low',
        isRead: false,
        createdAt: serverTimestamp(),
        senderId: currentAdmin?.id,
        relatedId: log.id
      });

      await logAction('Duyệt giờ công', log.empId, `Duyệt giờ công ngoài lịch cho ${log.empId} ngày ${log.date}`);
      toast.success('Đã duyệt giờ công thành công', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi duyệt giờ công', { id: loadingToast });
    }
  };

  const handleDeleteAttendance = async (log: Timesheet) => {
    if (!currentAdmin) return;
    
    // Check permission: only creator can delete, or super admin
    if (currentAdmin?.role !== 'SuperAdmin' && log.createdByAdminId !== currentAdmin?.id) {
      toast.error('Bạn không có quyền xóa bản ghi này (chỉ người tạo mới có quyền xóa)');
      return;
    }

    openConfirmModal(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bản ghi chấm công này?',
      async () => {
        const loadingToast = toast.loading('Đang xóa bản ghi...');
        try {
          await deleteDoc(doc(db, 'timesheets', log.id));
          await logAction('Xóa', 'Chấm công', `Xóa bản ghi chấm công của nhân viên (Mã: ${log.empId}) ngày ${log.date}`);
          toast.success('Xóa bản ghi thành công', { id: loadingToast });
          await fetchInitialData(filterMonth, true);
        } catch (error) {
          console.error(error);
          toast.error('Lỗi khi xóa bản ghi', { id: loadingToast });
        }
      }
    );
  };

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
      await fetchInitialData(filterMonth, true);
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
    requestTypeFilter,
    setRequestTypeFilter,
    approvalSubTab,
    setApprovalSubTab,
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
    BottomNav,
    SidebarItem,
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
    xinNghiPheps,
    admins,
    canhBaos,
    notifications,
    approvalRequests,
    payrollAdjustments,
    salaryHistories,
    planningGoals,
    filteredChamCongs,
    filteredLichLamViecs,
    filteredXinNghiPheps,
    filteredApprovalRequests,
    historySearchTermLower,
    approvalHistory,
    pendingRequests,
    allEmployeeSalaryStatsMap,
    adminTheme,
    calculateEmployeeSalaryStats,
    auditLogs,
    materialLossLogs: globalData.materialLossLogs || [],
    materialItems,
    holidays
  };
}
