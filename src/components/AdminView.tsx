import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, where, deleteField, getDoc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, Filter, LogOut, Users, Clock, Plus, Trash2, Edit2, ShieldCheck, Download, Calendar, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Bell, BellOff, TrendingUp, DollarSign, History as HistoryIcon, X, Key, Smartphone, CheckCircle2, RefreshCw, Undo2, Save, Settings2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { differenceInMonths, parseISO, addMonths } from 'date-fns';
import { SmartScheduleBuilder } from './SmartScheduleBuilder';
import { PayrollAdjustmentModal } from './PayrollAdjustmentModal';
import { HolidayConfigModal } from './HolidayConfigModal';

interface Employee {
  id: string;
  empId: string;
  phone: string;
  fullName: string;
  hourlyRate: number; // Lương cơ bản
  responsibilityBonus: number; // Thưởng trách nhiệm
  pinCode: string;
  isFirstLogin: boolean;
  joinDate: string;
  locationId?: string;
  locationIds?: string[];
  lastSalaryReviewDate?: any;
  createdAt?: any;
  bankAccount?: string;
  notes?: string;
  defaultRole?: 'QUẦY' | 'PV';
  cccd?: string;
}

interface SalaryHistory {
  id: string;
  empId: string;
  fullName: string;
  oldRate: number;
  newRate: number;
  oldBonus: number;
  newBonus: number;
  effectiveDate: any;
  reason: string;
  approvedBy: string;
}

interface AuditLog {
  id: string;
  action: string;
  target: string;
  details: string;
  adminId: string;
  adminEmail: string;
  timestamp: any;
}

interface Timesheet {
  id: string;
  timesheetId: string;
  date: string;
  empId: string;
  locationId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  SaiSoGPS: number;
  AnhVaoCa: string | null;
  AnhRaCa: string | null;
  PhutPhatRoiApp: number;
  SoLanRoiApp: number;
  totalHours: number;
  totalPay: number;
  createdByAdminId?: string;
  incompleteTasks?: string[];
  checkoutRequiresApproval?: boolean;
  scheduledShiftEndTime?: string;
  selectedShiftEndTime?: string;
  note?: string;
  isEndTimeModified?: boolean;
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
  date: string;
  empId: string;
  locationId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  status: string;
  roleInShift?: 'QUẦY' | 'PV' | 'BOTH';
  tasks?: ShiftTask[];
}

interface LeaveRequest {
  id: string;
  requestDate: string;
  empId: string;
  locationId: string;
  leaveDate: string;
  reason: string;
  status: 'cho_duyet' | 'da_duyet' | 'tu_choi';
}

interface Alert {
  id: string;
  empId: string;
  fullName: string;
  locationId: string;
  timestamp: string;
  message: string;
}

interface AdminAccount {
  id: string;
  email: string;
  role: 'SuperAdmin' | 'BranchAdmin';
  locationIds: string[];
  pin: string;
  notificationSettings?: {
    enabled: boolean;
    filterEmpId: string;
  };
}

interface AppNotification {
  id: string;
  empId: string;
  fullName: string;
  locationId: string;
  type: 'check_in' | 'check_out' | 'checkout_approval';
  timestamp: any;
  message: string;
  title?: string;
  isRead?: boolean;
  timesheetId?: string;
}

interface ApprovalRequest {
  id: string;
  empId: string;
  fullName: string;
  locationId: string;
  type: 'checkin_early' | 'checkin_late' | 'checkout_different' | 'shift_swap' | 'app_exit' | 'off_sudden';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
  details: any;
  note?: string;
  adminId?: string;
  processedAt?: any;
}

export interface PayrollAdjustment {
  id: string;
  empId: string;
  monthYear: string; // "yyyy-MM"
  penalty: number;
  returnRetainedSalary: number;
  advanceSalary: number;
  compensation: number;
  note: string;
}

export interface HolidayConfig {
  id: string;
  date: string; // "yyyy-MM-dd"
  name: string;
  multiplier: number;
}

const SUPER_ADMIN: AdminAccount = {
  id: 'super',
  email: 'admin',
  pin: '123456',
  role: 'SuperAdmin',
  locationIds: ['Góc Phố', 'Phố Xanh']
};

export default function AdminView() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [password, setPassword] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [activeTab, setActiveTab] = useState<'chamcong' | 'nhanvien' | 'lichlamviec' | 'xinnghiphep' | 'admins' | 'canhbao' | 'lichsu' | 'duyetgio'>('chamcong');
  
  const [nhanViens, setNhanViens] = useState<Employee[]>([]);
  const [chamCongs, setChamCongs] = useState<Timesheet[]>([]);
  const [lichLamViecs, setLichLamViecs] = useState<WorkSchedule[]>([]);
  const [xinNghiPheps, setXinNghiPheps] = useState<LeaveRequest[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [canhBaos, setCanhBaos] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [salaryHistories, setSalaryHistories] = useState<SalaryHistory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const getRequestTypeLabel = (type: string) => {
    switch(type) {
      case 'checkin_early': return { label: 'Vào ca sớm', color: 'text-blue-600 bg-blue-50' };
      case 'checkin_late': return { label: 'Vào ca trễ', color: 'text-amber-600 bg-amber-50' };
      case 'checkout_different': return { label: 'Ra ca khác giờ', color: 'text-cyan-600 bg-cyan-50' };
      case 'shift_swap': return { label: 'Đổi ca', color: 'text-indigo-600 bg-indigo-50' };
      case 'app_exit': return { label: 'Thoát Web App', color: 'text-red-600 bg-red-50' };
      case 'off_sudden': return { label: 'Nghỉ đột xuất', color: 'text-rose-600 bg-rose-50' };
      case 'late_early': return { label: 'ĐI TRỄ / VỀ SỚM', color: 'text-orange-600 bg-orange-50' };
      case 'forgot_check': return { label: 'QUÊN CHẤM CÔNG', color: 'text-emerald-600 bg-emerald-50' };
      case 'feedback': return { label: 'Góp ý', color: 'text-pink-600 bg-pink-50' };
      default: return { label: type, color: 'text-gray-600 bg-gray-50' };
    }
  };

  const logAction = async (action: string, target: string, details: string) => {
    if (!currentAdmin) return;
    try {
      await addDoc(collection(db, 'AuditLogs'), {
        action,
        target,
        details,
        adminId: currentAdmin.id,
        adminEmail: currentAdmin.email,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [payrollAdjustments, setPayrollAdjustments] = useState<PayrollAdjustment[]>([]);
  const [holidays, setHolidays] = useState<HolidayConfig[]>([]);
  const [showHolidayConfig, setShowHolidayConfig] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<PayrollAdjustment | null>(null);

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
    penalty: true,
    retained: true,
    returnRetained: true,
    advance: true,
    compensation: true,
    actual: true,
    note: true,
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, Partial<PayrollAdjustment>>>({});
  const [undoStack, setUndoStack] = useState<Record<string, Partial<PayrollAdjustment>>[]>([]);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);

  // Salary Review Notifications
  const [salaryReviewNotifications, setSalaryReviewNotifications] = useState<{empId: string, fullName: string, nextReviewDate: string}[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email === 'nguyen.thanh.liem2505@gmail.com') {
        setCurrentAdmin({
          id: 'super',
          email: user.email || 'admin',
          pin: '******',
          role: 'SuperAdmin',
          locationIds: ['Góc Phố', 'Phố Xanh']
        });
        setIsAuthenticated(true);
        setFilterBranch('All');
      } else if (user) {
        const q = query(collection(db, 'Admins'), where('email', '==', user.email));
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
          setFilterBranch('All');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Salary Review Notification Logic
  useEffect(() => {
    const checkSalaryReviews = async () => {
      const today = new Date();
      if (today.getDate() !== 3) return;

      // Check if we already checked this month
      const lastCheck = localStorage.getItem('lastSalaryReviewCheck');
      if (lastCheck === format(today, 'yyyy-MM')) return;

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
      localStorage.setItem('lastSalaryReviewCheck', format(today, 'yyyy-MM'));
    };
    checkSalaryReviews();
  }, [nhanViens]);

  // Admin Change PIN State
  const [showChangeAdminPinModal, setShowChangeAdminPinModal] = useState(false);
  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmNewAdminPin, setConfirmNewAdminPin] = useState('');

  // Add Employee State
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  // Salary Management State
  const [showSalaryManagementModal, setShowSalaryManagementModal] = useState(false);
  const [salaryManagementTab, setSalaryManagementTab] = useState<'history' | 'increase'>('history');
  const [selectedEmpForSalary, setSelectedEmpForSalary] = useState<Employee | null>(null);
  const [newSalaryRateStr, setNewSalaryRateStr] = useState('');
  const [newSalaryRate, setNewSalaryRate] = useState<number>(0);
  const [newBonusRateStr, setNewBonusRateStr] = useState('');
  const [newBonusRate, setNewBonusRate] = useState<number>(0);
  const [salaryIncreaseReason, setSalaryIncreaseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    empId: '',
    phone: '',
    fullName: '',
    hourlyRate: 0,
    responsibilityBonus: 0,
    joinDate: format(new Date(), 'yyyy-MM-dd'),
    locationId: 'Góc Phố',
    defaultRole: 'PV',
    cccdLast4: ''
  });
  const [luongTheoGioStr, setLuongTheoGioStr] = useState('');
  const [thuongTrachNhiemStr, setThuongTrachNhiemStr] = useState('');


  // Add Admin State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [adminSource, setAdminSource] = useState<'employee' | 'phone'>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [newAdmin, setNewAdmin] = useState<Partial<AdminAccount>>({
    email: '',
    role: 'BranchAdmin',
    locationIds: ['Góc Phố'],
    pin: ''
  });
  const [showAddAdminPin, setShowAddAdminPin] = useState(false);

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
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [newEndTime, setNewEndTime] = useState('');

  const handleAdjustShift = async () => {
    if (!selectedShift) return;
    await updateDoc(doc(db, 'LichLamViec', selectedShift.id), {
      plannedEndTime: newEndTime
    });
    setShowAdjustModal(false);
    setSuccessMsg('Đã cập nhật giờ ra ca dự kiến!');
  };
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Timesheet | null>(null);
  const [manualAttendance, setManualAttendance] = useState({
    empId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    checkInTime: format(new Date(), 'HH:mm'),
    checkOutTime: '',
    locationId: 'Góc Phố'
  });

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

  const handleUndoPayroll = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setLocalAdjustments(previousState);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleSavePayroll = async () => {
    setIsSavingPayroll(true);
    try {
      for (const empId of Object.keys(localAdjustments)) {
        const changes = localAdjustments[empId];
        if (Object.keys(changes).length === 0) continue;
        
        const existingAdj = payrollAdjustments.find(a => a.empId === empId && a.monthYear === filterMonth);
        const adjId = existingAdj?.id || `${empId}_${filterMonth}`;
        
        const dataToSave = {
          empId,
          monthYear: filterMonth,
          penalty: changes.penalty !== undefined ? changes.penalty : (existingAdj?.penalty || 0),
          returnRetainedSalary: changes.returnRetainedSalary !== undefined ? changes.returnRetainedSalary : (existingAdj?.returnRetainedSalary || 0),
          advanceSalary: changes.advanceSalary !== undefined ? changes.advanceSalary : (existingAdj?.advanceSalary || 0),
          compensation: changes.compensation !== undefined ? changes.compensation : (existingAdj?.compensation || 0),
          note: changes.note !== undefined ? changes.note : (existingAdj?.note || ''),
        };
        
        await setDoc(doc(db, 'PayrollAdjustments', adjId), dataToSave, { merge: true });
      }
      setLocalAdjustments({});
      setUndoStack([]);
      toast.success('Đã lưu bảng lương thành công!');
    } catch (error) {
      console.error("Error saving payroll:", error);
      toast.error('Có lỗi xảy ra khi lưu bảng lương.');
    } finally {
      setIsSavingPayroll(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(collection(db, 'Admins'), where('pin', '==', password));
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
        setFilterBranch('All');
      } else if (password === '123456') {
        const superDoc = await getDoc(doc(db, 'Admins', 'super'));
        if (!superDoc.exists()) {
          setCurrentAdmin({
            id: 'super',
            email: 'admin',
            pin: '123456',
            role: 'SuperAdmin',
            locationIds: ['Góc Phố', 'Phố Xanh']
          });
          setIsAuthenticated(true);
          setFilterBranch('All');
        } else {
          toast.error('Mã PIN không đúng');
        }
      } else {
        toast.error('Mã PIN không đúng');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi đăng nhập');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this email is the owner or in the Admins collection
      const ownerEmail = 'nguyen.thanh.liem2505@gmail.com';
      
      if (user.email === ownerEmail) {
        setCurrentAdmin({
          id: 'super',
          email: user.email || 'admin',
          pin: '******',
          role: 'SuperAdmin',
          locationIds: ['Góc Phố', 'Phố Xanh']
        });
        setIsAuthenticated(true);
        setFilterBranch('All');
        toast.success('Đăng nhập thành công với quyền Chủ sở hữu');
        return;
      }

      const q = query(collection(db, 'Admins'), where('email', '==', user.email));
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
        setFilterBranch('All');
        toast.success('Đăng nhập thành công');
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
    if (newAdminPin !== confirmNewAdminPin) {
      toast.error('Mã PIN xác nhận không khớp');
      return;
    }
    if (newAdminPin.length < 4 || newAdminPin.length > 6) {
      toast.error('Mã PIN phải từ 4 đến 6 chữ số');
      return;
    }
    if (!currentAdmin) return;
    
    try {
      if (currentAdmin.id === 'super') {
        await setDoc(doc(db, 'Admins', 'super'), {
          ...currentAdmin,
          pin: newAdminPin
        });
      } else {
        await updateDoc(doc(db, 'Admins', currentAdmin.id), {
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
      setNewAdminPin('');
      setConfirmNewAdminPin('');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi đổi mã PIN');
    }
  };

  // Fetch Data
  useEffect(() => {
    if (!isAuthenticated || !currentAdmin) return;

    const managedBranches = currentAdmin.locationIds;
    const branchFilter = filterBranch === 'All' ? 'All' : filterBranch;

    // Fetch NhanVien
    let qNV = query(collection(db, 'employees'));
    // If not super admin, we might want to filter employees by branch too, but the schema doesn't have locationId for employees yet?
    // Wait, the Timesheet has locationId.
    const unsubNV = onSnapshot(qNV, (snap) => {
      setNhanViens(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    });

    // Fetch ChamCong
    let qCC = query(collection(db, 'timesheets'));
    if (branchFilter !== 'All') {
      qCC = query(collection(db, 'timesheets'), where('locationId', '==', branchFilter));
    } else if (currentAdmin.role !== 'SuperAdmin') {
      qCC = query(collection(db, 'timesheets'), where('locationId', 'in', managedBranches));
    }
    const unsubCC = onSnapshot(qCC, (snap) => {
      setChamCongs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Timesheet)).sort((a, b) => b.date.localeCompare(a.date)));
    });

    // Fetch LichLamViec
    let qLLV = query(collection(db, 'LichLamViec'));
    if (branchFilter !== 'All') {
      qLLV = query(collection(db, 'LichLamViec'), where('locationId', '==', branchFilter));
    } else if (currentAdmin.role !== 'SuperAdmin') {
      qLLV = query(collection(db, 'LichLamViec'), where('locationId', 'in', managedBranches));
    }
    const unsubLLV = onSnapshot(qLLV, (snap) => {
      setLichLamViecs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkSchedule)));
    });

    // Fetch XinNghiPhep
    let qXNP = query(collection(db, 'XinNghiPhep'));
    if (branchFilter !== 'All') {
      qXNP = query(collection(db, 'XinNghiPhep'), where('locationId', '==', branchFilter));
    } else if (currentAdmin.role !== 'SuperAdmin') {
      qXNP = query(collection(db, 'XinNghiPhep'), where('locationId', 'in', managedBranches));
    }
    const unsubXNP = onSnapshot(qXNP, (snap) => {
      setXinNghiPheps(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
    });

    // Fetch Admins
    let unsubAdmins = () => {};
    if (currentAdmin.role === 'SuperAdmin') {
      const qAdmins = query(collection(db, 'Admins'));
      unsubAdmins = onSnapshot(qAdmins, (snap) => {
        setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAccount)));
      });
    }

    // Fetch CanhBao (Alerts)
    let qCB = query(collection(db, 'CanhBao'), orderBy('timestamp', 'desc'));
    if (branchFilter !== 'All') {
      qCB = query(collection(db, 'CanhBao'), where('locationId', '==', branchFilter), orderBy('timestamp', 'desc'));
    } else if (currentAdmin.role !== 'SuperAdmin') {
      qCB = query(collection(db, 'CanhBao'), where('locationId', 'in', managedBranches), orderBy('timestamp', 'desc'));
    }
    const unsubCB = onSnapshot(qCB, (snap) => {
      setCanhBaos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
    });

    // Fetch Notifications
    let qNotif = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
    if (branchFilter !== 'All') {
      qNotif = query(collection(db, 'notifications'), where('locationId', '==', branchFilter), orderBy('timestamp', 'desc'));
    } else if (currentAdmin.role !== 'SuperAdmin') {
      qNotif = query(collection(db, 'notifications'), where('locationId', 'in', managedBranches), orderBy('timestamp', 'desc'));
    }
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      
      // Apply Admin Notification Settings
      if (currentAdmin.notificationSettings?.enabled === false) {
        setNotifications([]);
      } else {
        if (currentAdmin.notificationSettings?.filterEmpId) {
          notifs = notifs.filter(n => n.empId === currentAdmin.notificationSettings?.filterEmpId);
        }
        setNotifications(notifs);
      }
    });

    // Fetch SalaryHistory
    const qSalary = query(collection(db, 'SalaryHistory'), orderBy('effectiveDate', 'desc'));
    const unsubSalary = onSnapshot(qSalary, (snap) => {
      setSalaryHistories(snap.docs.map(d => ({ id: d.id, ...d.data() } as SalaryHistory)));
    });

    // Fetch AuditLogs
    let unsubAudit = () => {};
    if (currentAdmin.role === 'SuperAdmin') {
      const qAudit = query(collection(db, 'AuditLogs'), orderBy('timestamp', 'desc'));
      unsubAudit = onSnapshot(qAudit, (snap) => {
        setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
      });
    }

    // Fetch ApprovalRequests
    let qAR = query(collection(db, 'ApprovalRequests'), orderBy('timestamp', 'desc'));
    if (branchFilter !== 'All') {
      qAR = query(collection(db, 'ApprovalRequests'), where('locationId', '==', branchFilter), orderBy('timestamp', 'desc'));
    } else if (currentAdmin.role !== 'SuperAdmin') {
      qAR = query(collection(db, 'ApprovalRequests'), where('locationId', 'in', managedBranches), orderBy('timestamp', 'desc'));
    }
    const unsubAR = onSnapshot(qAR, (snap) => {
      setApprovalRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequest)));
    });

    // Fetch PayrollAdjustments
    const qPayroll = query(collection(db, 'PayrollAdjustments'));
    const unsubPayroll = onSnapshot(qPayroll, (snap) => {
      setPayrollAdjustments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayrollAdjustment)));
    });

    // Fetch Holidays
    const qHolidays = query(collection(db, 'Holidays'));
    const unsubHolidays = onSnapshot(qHolidays, (snap) => {
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() } as HolidayConfig)));
    });

    return () => {
      unsubNV();
      unsubCC();
      unsubLLV();
      unsubXNP();
      unsubAdmins();
      unsubCB();
      unsubNotif();
      unsubSalary();
      unsubAudit();
      unsubAR();
      unsubPayroll();
      unsubHolidays();
    };
  }, [isAuthenticated, currentAdmin, filterBranch]);

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

  const exportToExcel = () => {
    const filteredData = chamCongs.filter(cc => cc.date.startsWith(filterMonth));
    if (filteredData.length === 0) {
      toast.error('Không có dữ liệu trong tháng này');
      return;
    }

    const exportData = filteredData.map(cc => {
      const employee = nhanViens.find(nv => nv.empId === cc.empId);
      return {
        'Ngày': cc.date,
        'Mã NV': cc.empId,
        'Họ Tên': employee?.fullName || 'Không rõ',
        'Chi Nhánh': cc.locationId,
        'Giờ Vào': cc.checkInTime ? format(new Date(cc.checkInTime), 'HH:mm:ss') : '',
        'Giờ Ra': cc.checkOutTime ? format(new Date(cc.checkOutTime), 'HH:mm:ss') : '',
        'Sai Số GPS (m)': cc.SaiSoGPS,
        'Số Lần Rời App': cc.SoLanRoiApp || 0,
        'Phút Phạt': cc.PhutPhatRoiApp || 0,
        'Nhiệm Vụ Chưa HT': cc.incompleteTasks ? cc.incompleteTasks.join(', ') : '',
        'Tổng Giờ Hợp Lệ': cc.totalHours ? cc.totalHours.toFixed(2) : '0',
        'Lương Theo Giờ': employee?.hourlyRate || 0,
        'Tổng Lương': (cc.totalPay || 0).toLocaleString() + 'đ'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ChamCong");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `BangChamCong_${filterMonth}.xlsx`);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newEmployee.fullName) {
      toast.error('Vui lòng nhập Họ Tên');
      return;
    }

    // Check for duplicate Phone (if provided)
    if (newEmployee.phone) {
      const isDuplicatePhone = nhanViens.some(nv => nv.phone === newEmployee.phone);
      if (isDuplicatePhone) {
        toast.error('Số điện thoại đã tồn tại trong hệ thống');
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const maxId = nhanViens.reduce((max, nv) => {
        const idNum = parseInt(nv.empId.replace('NV', ''));
        return !isNaN(idNum) && idNum > max ? idNum : max;
      }, 0);
      const nextId = maxId + 1;
      const maNV = `NV${String(nextId).padStart(3, '0')}`;
      
      // Default PIN: last 4 digits of phone
      let maPIN = '0000';
      if (newEmployee.phone && newEmployee.phone.length >= 4) {
        maPIN = newEmployee.phone.slice(-4);
      }

      const luong = parseInt(luongTheoGioStr.replace(/,/g, '')) || 0;
      const thuong = parseInt(thuongTrachNhiemStr.replace(/,/g, '')) || 0;

      const employeeData = {
        ...newEmployee,
        phone: newEmployee.phone || '', // Ensure it's a string even if empty
        empId: maNV,
        pinCode: maPIN,
        hourlyRate: luong,
        responsibilityBonus: thuong,
        isFirstLogin: true,
        joinDate: newEmployee.joinDate || format(new Date(), 'yyyy-MM-dd'),
        locationId: newEmployee.locationId || (currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố'),
        locationIds: [newEmployee.locationId || (currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố')],
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'employees'), employeeData);
      await logAction('Thêm', 'Nhân viên', `Thêm nhân viên ${employeeData.fullName} (Mã: ${maNV})`);
      toast.success('Thêm nhân viên thành công');
      
      // Reset state and close modal
      setNewEmployee({
        empId: '',
        phone: '',
        fullName: '',
        hourlyRate: 0,
        joinDate: format(new Date(), 'yyyy-MM-dd'),
        locationId: currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố',
        defaultRole: 'PV'
      });
      setLuongTheoGioStr('');
      setShowAddEmployeeModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi thêm nhân viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (isSubmitting) return;

    if (!editingEmployee.fullName) {
      toast.error('Vui lòng nhập Họ Tên');
      return;
    }

    // Check for duplicate Phone (if provided, excluding current employee)
    if (editingEmployee.phone) {
      const isDuplicatePhone = nhanViens.some(nv => nv.phone === editingEmployee.phone && nv.id !== editingEmployee.id);
      if (isDuplicatePhone) {
        toast.error('Số điện thoại đã tồn tại trong hệ thống');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const luong = typeof luongTheoGioStr === 'string' && luongTheoGioStr !== '' 
        ? parseInt(luongTheoGioStr.replace(/,/g, '')) || 0 
        : editingEmployee.hourlyRate;
      
      const thuong = typeof thuongTrachNhiemStr === 'string' && thuongTrachNhiemStr !== ''
        ? parseInt(thuongTrachNhiemStr.replace(/,/g, '')) || 0
        : (editingEmployee.responsibilityBonus || 0);

      await updateDoc(doc(db, 'employees', editingEmployee.id), {
        fullName: editingEmployee.fullName,
        phone: editingEmployee.phone || '',
        hourlyRate: luong,
        responsibilityBonus: thuong,
        joinDate: editingEmployee.joinDate,
        locationId: editingEmployee.locationId || 'Góc Phố',
        locationIds: [editingEmployee.locationId || 'Góc Phố'],
        defaultRole: editingEmployee.defaultRole || 'PV',
        bankAccount: editingEmployee.bankAccount || '',
        notes: editingEmployee.notes || '',
        cccd: editingEmployee.cccd || ''
      });
      await logAction('Sửa', 'Nhân viên', `Sửa thông tin nhân viên ${editingEmployee.fullName} (Mã: ${editingEmployee.empId})`);
      
      toast.success('Cập nhật nhân viên thành công');
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
      setLuongTheoGioStr('');
      setThuongTrachNhiemStr('');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật nhân viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPIN = async (nv: Employee) => {
    openConfirmModal(
      'Reset PIN',
      `Bạn có chắc chắn muốn reset mã PIN của nhân viên ${nv.fullName} về 4 số cuối điện thoại?`,
      async () => {
        try {
          if (!nv.phone || nv.phone.length < 4) {
            toast.error('Số điện thoại không hợp lệ để reset PIN');
            return;
          }
          const newPin = nv.phone.slice(-4);
          await updateDoc(doc(db, 'employees', nv.id), {
            pinCode: newPin,
            isFirstLogin: true
          });
          toast.success('Reset PIN thành công');
        } catch (error) {
          console.error('Reset PIN error:', error);
          toast.error('Lỗi khi reset PIN');
        }
      }
    );
  };

  const handleResetDevice = async (nv: Employee) => {
    openConfirmModal(
      'Reset thiết bị',
      `Bạn có chắc muốn reset thiết bị cho nhân viên ${nv.fullName}? Nhân viên sẽ có thể đăng nhập trên thiết bị mới.`,
      async () => {
        try {
          await updateDoc(doc(db, 'employees', nv.id), {
            deviceId: deleteField()
          });
          toast.success('Reset thiết bị thành công');
        } catch (error) {
          console.error('Reset Device error:', error);
          toast.error('Lỗi khi reset thiết bị');
        }
      }
    );
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let adminEmail = newAdmin.email;
    let adminPin = newAdmin.pin;

    if (adminSource === 'employee') {
      const emp = nhanViens.find(nv => nv.id === selectedEmployeeId);
      if (!emp) {
        toast.error('Vui lòng chọn nhân viên');
        return;
      }
      adminEmail = emp.fullName;
      adminPin = emp.pinCode;
    } else {
      if (!adminEmail || !adminPin) {
        toast.error('Vui lòng điền đầy đủ thông tin');
        return;
      }
    }
    
    try {
      const adminData = {
        email: adminEmail,
        pin: adminPin,
        role: newAdmin.role,
        locationIds: newAdmin.role === 'SuperAdmin' ? ['Góc Phố', 'Phố Xanh'] : newAdmin.locationIds,
        notificationSettings: {
          enabled: true,
          filterEmpId: ''
        }
      };
      
      await addDoc(collection(db, 'Admins'), adminData);
      toast.success('Thêm Admin thành công');
      setShowAddAdminModal(false);
      setNewAdmin({
        email: '',
        role: 'BranchAdmin',
        locationIds: ['Góc Phố'],
        pin: ''
      });
      setSelectedEmployeeId('');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi thêm Admin');
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      await updateDoc(doc(db, 'Admins', editingAdmin.id), {
        email: editingAdmin.email,
        role: editingAdmin.role,
        locationIds: editingAdmin.role === 'SuperAdmin' ? ['Góc Phố', 'Phố Xanh'] : editingAdmin.locationIds,
        pin: editingAdmin.pin
      });
      toast.success('Cập nhật Admin thành công');
      setShowEditAdminModal(false);
      setEditingAdmin(null);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật Admin');
    }
  };

  const handleIncreaseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForSalary) return;
    
    setIsSubmitting(true);
    try {
      const oldRate = selectedEmpForSalary.hourlyRate;
      const newRate = newSalaryRate;
      const oldBonus = selectedEmpForSalary.responsibilityBonus || 0;
      const newBonus = newBonusRate;
      
      // 1. Update Employee
      await updateDoc(doc(db, 'employees', selectedEmpForSalary.id), {
        hourlyRate: newRate,
        responsibilityBonus: newBonus,
        lastSalaryReviewDate: new Date().toISOString()
      });
      
      // 2. Add Salary History
      await addDoc(collection(db, 'SalaryHistory'), {
        empId: selectedEmpForSalary.empId,
        fullName: selectedEmpForSalary.fullName,
        oldRate: oldRate,
        newRate: newRate,
        oldBonus: oldBonus,
        newBonus: newBonus,
        effectiveDate: serverTimestamp(),
        reason: salaryIncreaseReason || 'Tăng lương định kỳ',
        approvedBy: currentAdmin?.email || 'Admin'
      });
      await logAction('Tăng lương', 'Nhân viên', `Tăng lương cho ${selectedEmpForSalary.fullName} (Mã: ${selectedEmpForSalary.empId}): Lương ${oldRate}->${newRate}, Thưởng ${oldBonus}->${newBonus}`);
      
      toast.success('Cập nhật lương thành công');
      setShowSalaryManagementModal(false);
      setSelectedEmpForSalary(null);
      setNewSalaryRate(0);
      setNewBonusRate(0);
      setSalaryIncreaseReason('');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật lương');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAttendance.empId || !manualAttendance.date || !manualAttendance.checkInTime) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const employee = nhanViens.find(nv => nv.empId === manualAttendance.empId);
      if (!employee) {
        toast.error('Nhân viên không tồn tại');
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

      toast.success('Chấm công hộ thành công');
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
        totalPay
      });
      await logAction('Sửa', 'Chấm công', `Sửa bản ghi chấm công của ${employee.fullName} (Mã: ${editingAttendance.empId}) ngày ${editingAttendance.date}`);

      toast.success('Cập nhật chấm công thành công');
      setShowEditAttendanceModal(false);
      setEditingAttendance(null);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật chấm công');
    }
  };

  const handleDeleteAttendance = async (log: Timesheet) => {
    if (!currentAdmin) return;
    
    // Check permission: only creator can delete, or super admin
    if (currentAdmin.role !== 'SuperAdmin' && log.createdByAdminId !== currentAdmin.id) {
      toast.error('Bạn không có quyền xóa bản ghi này (chỉ người tạo mới có quyền xóa)');
      return;
    }

    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi chấm công này?')) {
      try {
        await deleteDoc(doc(db, 'timesheets', log.id));
        await logAction('Xóa', 'Chấm công', `Xóa bản ghi chấm công của nhân viên (Mã: ${log.empId}) ngày ${log.date}`);
        toast.success('Xóa bản ghi thành công');
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi xóa bản ghi');
      }
    }
  };

  const toggleNotifications = async () => {
    if (!currentAdmin || currentAdmin.id === 'super') return;
    
    const newSettings = {
      enabled: !(currentAdmin.notificationSettings?.enabled ?? true),
      filterEmpId: currentAdmin.notificationSettings?.filterEmpId || ''
    };

    try {
      await updateDoc(doc(db, 'Admins', currentAdmin.id), {
        notificationSettings: newSettings
      });
      setCurrentAdmin({ ...currentAdmin, notificationSettings: newSettings });
      toast.success(`Đã ${newSettings.enabled ? 'bật' : 'tắt'} thông báo`);
    } catch (error) {
      toast.error('Lỗi khi cập nhật cài đặt');
    }
  };

  const setNotificationFilter = async (empId: string) => {
    if (!currentAdmin || currentAdmin.id === 'super') return;
    
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

  const handleDeleteAdmin = async (id: string) => {
    if (id === 'super') {
      toast.error('Không thể xóa Super Admin mặc định');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa Admin này?')) {
      try {
        await deleteDoc(doc(db, 'Admins', id));
        toast.success('Xóa Admin thành công');
      } catch (error) {
        toast.error('Lỗi khi xóa Admin');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
        
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-400/30">
              <ShieldCheck className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">Đăng nhập Admin</h2>
          <p className="text-blue-200/60 text-center text-sm mb-8 font-medium">Cafe HR Manager System</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-blue-100 mb-2 ml-1">Mã PIN Admin</label>
              <div className="relative group">
                <input
                  type={showLoginPin ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-3xl tracking-[0.5em] text-white transition-all placeholder:text-white/20"
                  placeholder="••••••"
                  maxLength={6}
                  minLength={4}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPin(!showLoginPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white transition-colors"
                >
                  {showLoginPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xác thực...
                </div>
              ) : 'Đăng nhập hệ thống'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-white/40">Hoặc</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Đăng nhập bằng Google
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full mt-4 text-blue-200/40 hover:text-blue-200 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              Quay lại trang chấm công
            </button>
          </form>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster />
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">Cafe HR Manager</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Quản lý nhân sự</p>
              </div>
              <span className="ml-2 px-3 py-1 bg-white/10 text-blue-200 text-[10px] rounded-full font-bold border border-white/10 backdrop-blur-sm">
                {currentAdmin?.email} | {currentAdmin?.role} - {currentAdmin?.locationIds?.join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-blue-200 hover:bg-white/10 rounded-full relative transition-all"
                >
                  {currentAdmin?.notificationSettings?.enabled !== false ? (
                    <Bell className="w-6 h-6" />
                  ) : (
                    <BellOff className="w-6 h-6 opacity-50" />
                  )}
                  {(notifications.length + salaryReviewNotifications.length) > 0 && currentAdmin?.notificationSettings?.enabled !== false && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
                      {(notifications.length + salaryReviewNotifications.length) > 9 ? '9+' : (notifications.length + salaryReviewNotifications.length)}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Thông báo</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-gray-400">
                          {currentAdmin?.notificationSettings?.enabled !== false ? 'Bật' : 'Tắt'}
                        </span>
                        <button
                          onClick={toggleNotifications}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            currentAdmin?.notificationSettings?.enabled !== false ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              currentAdmin?.notificationSettings?.enabled !== false ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {/* Salary Review Notifications */}
                      {salaryReviewNotifications.length > 0 && currentAdmin?.notificationSettings?.enabled !== false && (
                        <div className="bg-amber-50 border-b border-amber-100">
                          <div className="px-4 py-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider">Nhắc nhở Review Lương</div>
                          {salaryReviewNotifications.map((notif, idx) => (
                            <div key={`salary-${idx}`} className="p-4 border-b border-amber-50 hover:bg-amber-100/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-200 text-amber-700 rounded-lg">
                                  <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-amber-900">{notif.fullName}</p>
                                  <p className="text-xs text-amber-700">Đến hạn xem xét tăng lương ({notif.nextReviewDate})</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-2 border-b border-gray-100">
                        <select
                          value={currentAdmin?.notificationSettings?.filterEmpId || ''}
                          onChange={(e) => setNotificationFilter(e.target.value)}
                          className="w-full text-xs p-1.5 border border-gray-200 rounded-lg outline-none"
                        >
                          <option value="">Tất cả nhân viên</option>
                          {nhanViens.map(nv => (
                            <option key={nv.id} value={nv.empId}>{nv.fullName}</option>
                          ))}
                        </select>
                      </div>

                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm italic">
                          Không có thông báo mới
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                notif.type === 'check_in' ? 'bg-emerald-100 text-emerald-700' : 
                                notif.type === 'check_out' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {notif.type === 'check_in' ? 'Vào ca' : 
                                 notif.type === 'check_out' ? 'Ra ca' : 
                                 'Chờ Duyệt'}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {notif.timestamp ? format(
                                  typeof notif.timestamp === 'string' ? new Date(notif.timestamp) : 
                                  (notif.timestamp as any).toDate ? (notif.timestamp as any).toDate() : new Date(), 
                                  'HH:mm dd/MM'
                                ) : ''}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium">{notif.fullName || notif.title}</p>
                            <p className="text-xs text-gray-500">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowChangeAdminPinModal(true)}
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10"
              >
                <Key className="w-5 h-5" />
                <span className="hidden sm:inline font-bold">Đổi PIN</span>
              </button>
              <button
                onClick={() => {
                  auth.signOut();
                  setIsAuthenticated(false);
                  setCurrentAdmin(null);
                  setPassword('');
                  navigate('/');
                }}
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline font-bold">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex overflow-x-auto pb-4 mb-6 gap-3 hide-scrollbar bg-slate-200/50 p-2 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('chamcong')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'chamcong' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-5 h-5" />
            Chấm công
          </button>
          <button
            onClick={() => setActiveTab('duyetgio')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'duyetgio' ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            Chờ Duyệt
            {chamCongs.filter(c => c.checkoutRequiresApproval).length > 0 && (
              <span className="bg-red-500 text-white py-0.5 px-2 rounded-full text-xs font-black ml-1">
                {chamCongs.filter(c => c.checkoutRequiresApproval).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('nhanvien')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'nhanvien' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Nhân viên
          </button>
          <button
            onClick={() => setActiveTab('bangluong')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'bangluong' ? 'bg-green-600 text-white shadow-green-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Bảng Lương
          </button>
          <button
            onClick={() => setActiveTab('vipham')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'vipham' ? 'bg-red-600 text-white shadow-red-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            Vi phạm
          </button>
          <button
            onClick={() => setActiveTab('lichlamviec')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'lichlamviec' ? 'bg-violet-600 text-white shadow-violet-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Lịch làm việc
          </button>
          <button
            onClick={() => setActiveTab('canhbao')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'canhbao' ? 'bg-red-600 text-white shadow-red-200' : 'bg-white text-red-600 hover:bg-red-50'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            Cảnh báo khẩn
            {canhBaos.length > 0 && (
              <span className="bg-white text-red-600 py-0.5 px-2 rounded-full text-xs font-black">
                {canhBaos.length}
              </span>
            )}
          </button>
          {currentAdmin?.role === 'SuperAdmin' && (
            <>
              <button
                onClick={() => setActiveTab('admins')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
                  activeTab === 'admins' ? 'bg-slate-800 text-white shadow-slate-200' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                Quản lý Admin
              </button>
              <button
                onClick={() => setActiveTab('lichsu')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
                  activeTab === 'lichsu' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <HistoryIcon className="w-5 h-5" />
                Lịch sử hệ thống
              </button>
            </>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {activeTab === 'duyetgio' && (
            <div className="p-6">
              {/* Combined Approval Requests Table */}
              <div className="space-y-6">
                {/* Pending Requests */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <h2 className="text-lg font-bold text-amber-900">Yêu cầu chờ duyệt</h2>
                  </div>
                  {approvalRequests.filter(r => r.status === 'pending').length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      Không có yêu cầu nào đang chờ duyệt.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 w-12">STT</th>
                            <th className="px-4 py-3">Nhân viên</th>
                            <th className="px-4 py-3">Loại yêu cầu</th>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Chi tiết</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvalRequests.filter(r => r.status === 'pending').map((req, index) => {
                            const typeInfo = getRequestTypeLabel(req.type);
                            
                            return (
                              <tr key={req.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500 font-medium">{index + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{req.fullName}</div>
                                  <div className="text-xs text-gray-500">{req.locationId}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${typeInfo.color}`}>
                                    {typeInfo.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500">
                                  {req.timestamp ? format(new Date(req.timestamp.toDate ? req.timestamp.toDate() : req.timestamp), 'HH:mm dd/MM') : '-'}
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                  {req.type === 'checkout_different' && (
                                    <div>
                                      Lịch: {req.details?.scheduledEndTime} → Thực tế: {req.details?.actualEndTime}
                                    </div>
                                  )}
                                  {(req.type === 'checkin_late' || req.type === 'checkin_early') && (
                                    <div>
                                      Lịch: {req.details?.scheduledStartTime} → Thực tế: {req.details?.actualStartTime}
                                      {req.details?.lateMinutes > 0 && <span className="text-red-500 ml-1">(Trễ {req.details.lateMinutes}p)</span>}
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
                                  {req.type === 'app_exit' && (
                                    <div>Xin thoát App sử dụng điện thoại</div>
                                  )}
                                  {req.note && <div className="italic mt-1">"{req.note}"</div>}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                  <button
                                    onClick={() => openConfirmModal(
                                      'Xác nhận duyệt',
                                      `Bạn có chắc chắn muốn duyệt yêu cầu ${typeInfo.label.toLowerCase()} của ${req.fullName}?`,
                                      async () => {
                                        try {
                                          await updateDoc(doc(db, 'ApprovalRequests', req.id), {
                                            status: 'approved',
                                            adminId: currentAdmin?.email,
                                            processedAt: serverTimestamp()
                                          });
                                          
                                          // Perform specific actions based on type
                                          if (req.type === 'checkout_different' && req.details?.timesheetId) {
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
                                            const todayStr = format(new Date(), 'yyyy-MM-dd');
                                            const q = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', todayStr));
                                            const snap = await getDocs(q);
                                            for (const d of snap.docs) {
                                              await updateDoc(doc(db, 'LichLamViec', d.id), { isOff: true });
                                            }
                                          } else if (req.type === 'shift_swap' && req.details?.swapWithEmpId && req.details?.swapDate) {
                                            const dateStr = req.details.swapDate;
                                            const q1 = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', dateStr));
                                            const q2 = query(collection(db, 'LichLamViec'), where('empId', '==', req.details.swapWithEmpId), where('date', '==', dateStr));
                                            
                                            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                                            
                                            for (const d of snap1.docs) {
                                              await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.details.swapWithEmpId });
                                            }
                                            for (const d of snap2.docs) {
                                              await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.empId });
                                            }
                                          }
                                          
                                          await logAction('Duyệt yêu cầu', req.fullName, `Duyệt ${typeInfo.label} cho ${req.fullName}`);
                                          toast.success('Đã duyệt thành công!');
                                        } catch (error) {
                                          console.error(error);
                                          toast.error('Lỗi khi duyệt yêu cầu');
                                        }
                                      }
                                    )}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-bold transition-colors"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => openConfirmModal(
                                      'Xác nhận từ chối',
                                      `Bạn có chắc chắn muốn từ chối yêu cầu ${typeInfo.label.toLowerCase()} của ${req.fullName}?`,
                                      async () => {
                                        try {
                                          await updateDoc(doc(db, 'ApprovalRequests', req.id), {
                                            status: 'rejected',
                                            adminId: currentAdmin?.email,
                                            processedAt: serverTimestamp()
                                          });
                                          
                                          // Perform specific actions based on type (e.g., revert timesheet)
                                          if (req.type === 'checkout_different' && req.details?.timesheetId) {
                                            const tsDoc = await getDoc(doc(db, 'timesheets', req.details.timesheetId));
                                            if (tsDoc.exists()) {
                                              const log = tsDoc.data();
                                              const emp = nhanViens.find(e => e.empId === log.empId);
                                              const checkInTime = new Date(log.checkInTime);
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
                                          
                                          await logAction('Từ chối yêu cầu', req.fullName, `Từ chối ${typeInfo.label} cho ${req.fullName}`);
                                          toast.success('Đã từ chối yêu cầu');
                                        } catch (error) {
                                          console.error(error);
                                          toast.error('Lỗi khi từ chối yêu cầu');
                                        }
                                      }
                                    )}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold transition-colors"
                                  >
                                    Từ chối
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Processed Requests (History) */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-gray-600" />
                    <h3 className="font-bold text-gray-900 text-sm">Lịch sử phê duyệt</h3>
                  </div>
                  {approvalRequests.filter(r => r.status !== 'pending').length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      Chưa có lịch sử phê duyệt.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                          <tr>
                            <th className="px-4 py-3">Nhân viên</th>
                            <th className="px-4 py-3">Loại</th>
                            <th className="px-4 py-3">Kết quả</th>
                            <th className="px-4 py-3">Người duyệt</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvalRequests.filter(r => r.status !== 'pending').slice(0, 10).map(req => {
                            return (
                              <tr key={req.id} className="border-b hover:bg-gray-50 opacity-75">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-700">{req.fullName}</div>
                                  <div className="text-[10px] text-gray-400">
                                    {req.processedAt ? format(new Date(req.processedAt.toDate ? req.processedAt.toDate() : req.processedAt), 'HH:mm dd/MM') : '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                  {getRequestTypeLabel(req.type).label}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {req.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                  {req.adminId}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => openConfirmModal(
                                      'Xác nhận hoàn tác',
                                      'Bạn có chắc chắn muốn hoàn tác hành động này? Yêu cầu sẽ quay lại trạng thái Chờ duyệt.',
                                      async () => {
                                        try {
                                          await updateDoc(doc(db, 'ApprovalRequests', req.id), {
                                            status: 'pending',
                                            adminId: deleteField(),
                                            processedAt: deleteField()
                                          });
                                          
                                          // Revert specific actions if needed
                                          if (req.type === 'checkout_different' && req.details?.timesheetId) {
                                            await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                              checkoutRequiresApproval: true,
                                              checkoutApprovedBy: deleteField(),
                                              checkoutApprovedAt: deleteField(),
                                              checkoutRejectedBy: deleteField(),
                                              checkoutRejectedAt: deleteField()
                                            });
                                          } else if ((req.type === 'checkin_late' || req.type === 'checkin_early') && req.details?.timesheetId) {
                                            const lateMinutes = req.details?.lateMinutes || 0;
                                            const latePenaltyMinutes = lateMinutes * 3;
                                            await updateDoc(doc(db, 'timesheets', req.details.timesheetId), {
                                              isLateExcused: false,
                                              latePenaltyMinutes,
                                              checkinApprovedBy: deleteField(),
                                              checkinApprovedAt: deleteField()
                                            });
                                          } else if (req.type === 'off_sudden') {
                                            const dateStr = format(new Date(req.timestamp.toDate ? req.timestamp.toDate() : req.timestamp), 'yyyy-MM-dd');
                                            const q = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', dateStr));
                                            const snap = await getDocs(q);
                                            for (const d of snap.docs) {
                                              await updateDoc(doc(db, 'LichLamViec', d.id), { isOff: false });
                                            }
                                          } else if (req.type === 'shift_swap' && req.details?.swapWithEmpId && req.details?.swapDate) {
                                            // Revert swap: swap back
                                            const dateStr = req.details.swapDate;
                                            const q1 = query(collection(db, 'LichLamViec'), where('empId', '==', req.empId), where('date', '==', dateStr));
                                            const q2 = query(collection(db, 'LichLamViec'), where('empId', '==', req.details.swapWithEmpId), where('date', '==', dateStr));
                                            
                                            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                                            
                                            for (const d of snap1.docs) {
                                              await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.details.swapWithEmpId });
                                            }
                                            for (const d of snap2.docs) {
                                              await updateDoc(doc(db, 'LichLamViec', d.id), { empId: req.empId });
                                            }
                                          }
                                          
                                          await logAction('Hoàn tác phê duyệt', req.fullName, `Hoàn tác phê duyệt ${req.type} cho ${req.fullName}`);
                                          toast.success('Đã hoàn tác thành công');
                                        } catch (error) {
                                          console.error(error);
                                          toast.error('Lỗi khi hoàn tác');
                                        }
                                      }
                                    )}
                                    className="text-amber-600 hover:text-amber-700 text-xs font-bold flex items-center gap-1 justify-end ml-auto"
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
                  )}
                </div>
              </div>
            </div>
          )}


          {activeTab === 'chamcong' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-900">Lịch sử chấm công</h2>
                  <button
                    onClick={() => setShowEditAttendanceModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Chấm công hộ
                  </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  {currentAdmin?.role === 'SuperAdmin' ? (
                    <select
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="All">Tất cả chi nhánh</option>
                      <option value="Góc Phố">Góc Phố</option>
                      <option value="Phố Xanh">Phố Xanh</option>
                    </select>
                  ) : (
                    currentAdmin?.locationIds && currentAdmin.locationIds.length > 1 && (
                      <select
                        value={filterBranch}
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      >
                        <option value="All">Tất cả chi nhánh quản lý</option>
                        {currentAdmin.locationIds.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    )
                  )}
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Xuất Excel
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <th className="p-4 text-sm font-semibold text-slate-600">Ngày</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Nhân viên</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Chi nhánh</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Giờ vào</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Giờ ra</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Số lần rời</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Phút phạt</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Nhiệm vụ chưa HT</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Tổng giờ</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Tổng lương</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {chamCongs.filter(cc => cc.date.startsWith(filterMonth)).map(log => {
                      const employee = nhanViens.find(nv => nv.empId === log.empId);
                      const canDelete = currentAdmin?.role === 'SuperAdmin' || (log.createdByAdminId && log.createdByAdminId === currentAdmin?.id);
                      
                      return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm text-slate-900">{log.date}</td>
                        <td className="p-4 text-sm font-medium text-slate-900">{employee?.fullName || 'Không rõ'}</td>
                        <td className="p-4 text-sm text-slate-600">{log.locationId}</td>
                        <td className="p-4 text-sm text-slate-600">
                          {log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm:ss') : '-'}
                          {log.AnhVaoCa && <a href={log.AnhVaoCa} target="_blank" rel="noreferrer" className="ml-2 text-sky-500 text-xs underline">Ảnh</a>}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm:ss') : '-'}
                          {log.AnhRaCa && <a href={log.AnhRaCa} target="_blank" rel="noreferrer" className="ml-2 text-sky-500 text-xs underline">Ảnh</a>}
                        </td>
                        <td className="p-4 text-sm text-rose-600 font-medium">{log.SoLanRoiApp || 0}</td>
                        <td className="p-4 text-sm text-rose-600 font-medium">{log.PhutPhatRoiApp || 0}p</td>
                        <td className="p-4 text-sm text-rose-600">
                          {log.incompleteTasks && log.incompleteTasks.length > 0 ? (
                            <ul className="list-disc list-inside">
                              {log.incompleteTasks.map((task, idx) => (
                                <li key={idx} className="text-xs">{task}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-bold text-sky-600">{log.totalHours ? log.totalHours.toFixed(2) : '0'}h</td>
                        <td className="p-4 text-sm font-bold text-emerald-600">{(log.totalPay || 0).toLocaleString()}đ</td>
                        <td className="p-4 text-sm text-right flex justify-end gap-2">
                          {canDelete && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingAttendance({
                                    ...log,
                                    checkInTime: log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm') : '',
                                    checkOutTime: log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm') : ''
                                  });
                                  setShowEditAttendanceModal(true);
                                }}
                                className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                title="Sửa bản ghi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendance(log)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Xóa bản ghi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'bangluong' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Bảng tính lương</h2>
                <div className="flex gap-4">
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => setShowHolidayConfig(true)}
                    className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold hover:bg-amber-200 transition-colors flex items-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Cấu hình ngày lễ
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowColumnConfig(!showColumnConfig)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                      <Settings2 className="w-5 h-5" />
                      Tùy chỉnh cột
                    </button>
                    {showColumnConfig && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 text-left">
                        <h4 className="font-bold text-slate-900 mb-3">Hiển thị cột</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {Object.entries({
                            stt: 'TT', name: 'Tên', bank: 'Số TK ngân hàng', joinDate: 'Ngày vào làm',
                            hours: 'Số giờ công', baseSalary: 'Lương cơ bản', responsibility: 'Thưởng Trách nhiệm',
                            holiday: 'Thưởng Lễ', penalty: 'Phạt', retained: 'Lương giữ tạm',
                            returnRetained: 'Trả lương giữ tạm', advance: 'Ứng lương',
                            compensation: 'Tiền đền ly tách', actual: 'Tiền thực lãnh', note: 'Ghi chú'
                          }).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleColumns[key]}
                                onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                className="rounded text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-sm text-slate-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleUndoPayroll}
                    disabled={undoStack.length === 0}
                    className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
                      undoStack.length > 0 ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Undo2 className="w-5 h-5" />
                    Hoàn tác
                  </button>
                  <button
                    onClick={handleSavePayroll}
                    disabled={Object.keys(localAdjustments).length === 0 || isSavingPayroll}
                    className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
                      Object.keys(localAdjustments).length > 0 
                        ? 'bg-sky-600 text-white hover:bg-sky-700' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-5 h-5" />
                    {isSavingPayroll ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button
                    onClick={() => {
                      const dataToExport = nhanViens.map((emp, index) => {
                        const empTimesheets = chamCongs.filter(cc => cc.empId === emp.id && cc.date.startsWith(filterMonth));
                        const totalHours = empTimesheets.reduce((sum, cc) => sum + (cc.totalHours || 0), 0);
                        
                        let holidayHours = 0;
                        let holidayBonusTotal = 0;
                        empTimesheets.forEach(cc => {
                          const holiday = holidays.find(h => h.date === cc.date);
                          if (holiday) {
                            holidayHours += (cc.totalHours || 0);
                            holidayBonusTotal += (cc.totalHours || 0) * (emp.hourlyRate || 0) * (holiday.multiplier - 1);
                          }
                        });
                          
                        const baseSalaryTotal = totalHours * (emp.hourlyRate || 0);
                        const responsibilityBonusTotal = totalHours * (emp.responsibilityBonus || 0);
                        
                        let retainedSalary = 0;
                        if (emp.joinDate && emp.joinDate.startsWith(filterMonth)) {
                          retainedSalary = 500000;
                        }
                        
                        const adjustment = payrollAdjustments.find(a => a.empId === emp.id && a.monthYear === filterMonth) || {
                          penalty: 0,
                          returnRetainedSalary: 0,
                          advanceSalary: 0,
                          compensation: 0,
                          note: ''
                        };
                        
                        const actualSalary = baseSalaryTotal + responsibilityBonusTotal + holidayBonusTotal 
                          - (adjustment.penalty || 0) - retainedSalary + (adjustment.returnRetainedSalary || 0) 
                          - (adjustment.advanceSalary || 0) - (adjustment.compensation || 0);

                        return {
                          'TT': index + 1,
                          'Tên': emp.fullName,
                          'Số TK ngân hàng': emp.bankAccount || '',
                          'Ngày vào làm': emp.joinDate ? format(parseISO(emp.joinDate), 'dd/MM/yyyy') : '',
                          'Số giờ công': totalHours.toFixed(2),
                          'Lương cơ bản': emp.hourlyRate || 0,
                          'Thưởng Trách nhiệm': responsibilityBonusTotal,
                          'Thưởng Lễ (Số h)': holidayHours > 0 ? holidayHours.toFixed(2) : '',
                          'Phạt': adjustment.penalty || 0,
                          'Lương giữ tạm': retainedSalary,
                          'Trả lương giữ tạm': adjustment.returnRetainedSalary || 0,
                          'Ứng lương': adjustment.advanceSalary || 0,
                          'Tiền đền ly tách': adjustment.compensation || 0,
                          'Tiền thực lãnh': actualSalary,
                          'Ghi chú': adjustment.note || ''
                        };
                      });

                      const ws = XLSX.utils.json_to_sheet(dataToExport);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Bảng Lương");
                      XLSX.writeFile(wb, `Bang_Luong_${filterMonth}.xlsx`);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Xuất Excel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-sm">
                      {visibleColumns.stt && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-center w-12">TT</th>}
                      {visibleColumns.name && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 min-w-[150px]">Tên</th>}
                      {visibleColumns.bank && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Số TK ngân hàng</th>}
                      {visibleColumns.joinDate && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Ngày vào làm</th>}
                      {visibleColumns.hours && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right w-24">Số giờ công</th>}
                      {visibleColumns.baseSalary && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[100px]">Lương cơ bản</th>}
                      {visibleColumns.responsibility && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[120px]">Thưởng Trách nhiệm</th>}
                      {visibleColumns.holiday && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[100px]">Thưởng Lễ (Số h)</th>}
                      {visibleColumns.penalty && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[100px]">Phạt</th>}
                      {visibleColumns.retained && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[120px]">Lương giữ tạm</th>}
                      {visibleColumns.returnRetained && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[120px]">Trả lương giữ tạm</th>}
                      {visibleColumns.advance && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[100px]">Ứng lương</th>}
                      {visibleColumns.compensation && <th className="p-3 font-semibold text-slate-700 border-r border-slate-200 text-right min-w-[120px]">Tiền đền ly tách</th>}
                      {visibleColumns.actual && <th className="p-3 font-bold text-sky-800 bg-sky-100/50 border-r border-slate-200 text-right min-w-[120px]">Tiền thực lãnh</th>}
                      {visibleColumns.note && <th className="p-3 font-semibold text-slate-700 min-w-[150px]">Ghi chú</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {nhanViens.map((emp, index) => {
                      const empTimesheets = chamCongs.filter(cc => cc.empId === emp.id && cc.date.startsWith(filterMonth));
                      const totalHours = empTimesheets.reduce((sum, cc) => sum + (cc.totalHours || 0), 0);
                      
                      const holidayDates = holidays.map(h => h.date);
                      let holidayHours = 0;
                      let holidayBonusTotal = 0;
                      
                      empTimesheets.forEach(cc => {
                        const holiday = holidays.find(h => h.date === cc.date);
                        if (holiday) {
                          holidayHours += (cc.totalHours || 0);
                          // Extra bonus = (multiplier - 1) * hourlyRate
                          holidayBonusTotal += (cc.totalHours || 0) * (emp.hourlyRate || 0) * (holiday.multiplier - 1);
                        }
                      });
                        
                      const baseSalaryTotal = totalHours * (emp.hourlyRate || 0);
                      const responsibilityBonusTotal = totalHours * (emp.responsibilityBonus || 0);
                      
                      let retainedSalary = 0;
                      if (emp.joinDate && emp.joinDate.startsWith(filterMonth)) {
                        retainedSalary = 500000;
                      }
                      
                      const adjustment = payrollAdjustments.find(a => a.empId === emp.id && a.monthYear === filterMonth) || {
                        penalty: 0,
                        returnRetainedSalary: 0,
                        advanceSalary: 0,
                        compensation: 0,
                        note: ''
                      };
                      
                      const localAdj = localAdjustments[emp.id] || {};
                      
                      const finalPenalty = localAdj.penalty !== undefined ? localAdj.penalty : (adjustment.penalty || 0);
                      const finalReturnRetained = localAdj.returnRetainedSalary !== undefined ? localAdj.returnRetainedSalary : (adjustment.returnRetainedSalary || 0);
                      const finalAdvance = localAdj.advanceSalary !== undefined ? localAdj.advanceSalary : (adjustment.advanceSalary || 0);
                      const finalCompensation = localAdj.compensation !== undefined ? localAdj.compensation : (adjustment.compensation || 0);
                      const finalNote = localAdj.note !== undefined ? localAdj.note : (adjustment.note || '');
                      
                      const actualSalary = baseSalaryTotal + responsibilityBonusTotal + holidayBonusTotal 
                        - finalPenalty - retainedSalary + finalReturnRetained 
                        - finalAdvance - finalCompensation;

                      const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

                      return (
                        <tr key={emp.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                          {visibleColumns.stt && <td className="p-3 border border-slate-200 text-center text-slate-600">{index + 1}</td>}
                          {visibleColumns.name && <td className="p-3 font-medium border border-slate-200 text-slate-800">{emp.fullName}</td>}
                          {visibleColumns.bank && <td className="p-3 border border-slate-200 text-slate-600">{emp.bankAccount || '-'}</td>}
                          {visibleColumns.joinDate && <td className="p-3 border border-slate-200 text-slate-600">{emp.joinDate ? format(parseISO(emp.joinDate), 'dd/MM/yyyy') : '-'}</td>}
                          {visibleColumns.hours && <td className="p-3 font-bold text-sky-600 border border-slate-200 text-right">{totalHours.toFixed(2)}</td>}
                          {visibleColumns.baseSalary && <td className="p-3 border border-slate-200 text-right text-slate-700">{formatCurrency(emp.hourlyRate || 0)}</td>}
                          {visibleColumns.responsibility && <td className="p-3 border border-slate-200 text-right text-slate-700">{formatCurrency(responsibilityBonusTotal)}</td>}
                          {visibleColumns.holiday && <td className="p-3 border border-slate-200 text-right text-slate-700">{holidayHours > 0 ? holidayHours.toFixed(2) : '-'}</td>}
                          {visibleColumns.penalty && (
                            <td className="p-0 border border-slate-200">
                              <input 
                                type="text"
                                value={finalPenalty === 0 ? '' : formatCurrency(finalPenalty)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                  handlePayrollChange(emp.id, 'penalty', val);
                                }}
                                className="w-full h-full p-3 bg-transparent outline-none focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-sky-500 text-right text-rose-600 font-medium"
                                placeholder="0"
                              />
                            </td>
                          )}
                          {visibleColumns.retained && <td className="p-3 text-amber-600 font-medium border border-slate-200 text-right">{formatCurrency(retainedSalary)}</td>}
                          {visibleColumns.returnRetained && (
                            <td className="p-0 border border-slate-200">
                              <input 
                                type="text"
                                value={finalReturnRetained === 0 ? '' : formatCurrency(finalReturnRetained)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                  handlePayrollChange(emp.id, 'returnRetainedSalary', val);
                                }}
                                className="w-full h-full p-3 bg-transparent outline-none focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-sky-500 text-right text-emerald-600 font-medium"
                                placeholder="0"
                              />
                            </td>
                          )}
                          {visibleColumns.advance && (
                            <td className="p-0 border border-slate-200">
                              <input 
                                type="text"
                                value={finalAdvance === 0 ? '' : formatCurrency(finalAdvance)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                  handlePayrollChange(emp.id, 'advanceSalary', val);
                                }}
                                className="w-full h-full p-3 bg-transparent outline-none focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-sky-500 text-right text-amber-600 font-medium"
                                placeholder="0"
                              />
                            </td>
                          )}
                          {visibleColumns.compensation && (
                            <td className="p-0 border border-slate-200">
                              <input 
                                type="text"
                                value={finalCompensation === 0 ? '' : formatCurrency(finalCompensation)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                  handlePayrollChange(emp.id, 'compensation', val);
                                }}
                                className="w-full h-full p-3 bg-transparent outline-none focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-sky-500 text-right text-rose-600 font-medium"
                                placeholder="0"
                              />
                            </td>
                          )}
                          {visibleColumns.actual && <td className="p-3 font-bold text-sky-700 text-lg border border-slate-200 text-right bg-sky-50/30">{formatCurrency(actualSalary)}</td>}
                          {visibleColumns.note && (
                            <td className="p-0 border border-slate-200">
                              <input 
                                type="text"
                                value={finalNote}
                                onChange={(e) => handlePayrollChange(emp.id, 'note', e.target.value)}
                                className="w-full h-full p-3 bg-transparent outline-none focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-sky-500 text-slate-700"
                                placeholder="Ghi chú..."
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {nhanViens.length === 0 && (
                      <tr>
                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="p-8 text-center text-gray-500 border border-gray-300">
                          Không có dữ liệu nhân viên.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'nhanvien' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Quản lý nhân viên</h2>
                {currentAdmin?.role === 'SuperAdmin' && (
                  <button
                    onClick={() => {
                      setNewEmployee({
                        empId: '',
                        phone: '',
                        fullName: '',
                        hourlyRate: 0,
                        joinDate: format(new Date(), 'yyyy-MM-dd'),
                        locationId: currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố'
                      });
                      setLuongTheoGioStr('');
                      setShowAddEmployeeModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm nhân viên
                  </button>
                )}
              </div>
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                      <th className="p-3 font-semibold text-gray-600">Họ Tên</th>
                      <th className="p-3 font-semibold text-gray-600">Liên hệ</th>
                      <th className="p-3 font-semibold text-gray-600">Chi nhánh</th>
                      <th className="p-3 font-semibold text-gray-600">Ngày vào làm</th>
                      <th className="p-3 font-semibold text-gray-600">Lương / Lương TN</th>
                      <th className="p-3 font-semibold text-gray-600 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {nhanViens.filter(nv => currentAdmin?.role === 'SuperAdmin' || (currentAdmin?.locationIds || []).includes(nv.locationId || '')).map(nv => (
                      <tr 
                        key={nv.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onDoubleClick={() => {
                          setEditingEmployee(nv);
                          setLuongTheoGioStr(nv.hourlyRate.toLocaleString('en-US'));
                          setThuongTrachNhiemStr((nv.responsibilityBonus || 0).toLocaleString('en-US'));
                          setShowEditEmployeeModal(true);
                        }}
                      >
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{nv.fullName}</div>
                          {salaryReviewNotifications.some(n => n.empId === nv.empId) && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full animate-pulse">
                              Đến hạn review lương
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-gray-600">{nv.phone}</div>
                        </td>
                        <td className="p-3 text-gray-600">
                          {nv.locationId || (Array.isArray(nv.locationIds) && nv.locationIds.length > 0 ? nv.locationIds[0] : 'N/A')}
                        </td>
                        <td className="p-3 text-gray-600">{nv.joinDate ? format(new Date(nv.joinDate), 'dd/MM/yyyy') : 'N/A'}</td>
                        <td className="p-3">
                          <div className="font-bold text-emerald-600">{(nv.hourlyRate || 0).toLocaleString('en-US')}đ/h</div>
                          <div className="text-blue-600 text-xs">Lương TN: {(nv.responsibilityBonus || 0).toLocaleString('en-US')}đ/h</div>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {currentAdmin?.role === 'SuperAdmin' && (
                              <>
                                <button
                                  onClick={() => handleResetPIN(nv)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Reset PIN"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleResetDevice(nv)}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Reset Thiết bị"
                                >
                                  <Smartphone className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setSelectedEmpForSalary(nv);
                                setShowSalaryManagementModal(true);
                                setSalaryManagementTab(currentAdmin?.role === 'SuperAdmin' ? 'history' : 'increase');
                                setNewSalaryRate(nv.hourlyRate);
                                setNewSalaryRateStr(nv.hourlyRate.toLocaleString('en-US'));
                                setNewBonusRate(nv.responsibilityBonus || 0);
                                setNewBonusRateStr((nv.responsibilityBonus || 0).toLocaleString('en-US'));
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title={currentAdmin?.role === 'SuperAdmin' ? 'Quản lý lương' : 'Đề xuất tăng lương'}
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingEmployee(nv);
                                setLuongTheoGioStr(nv.hourlyRate.toLocaleString('en-US'));
                                setThuongTrachNhiemStr((nv.responsibilityBonus || 0).toLocaleString('en-US'));
                                setShowEditEmployeeModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {currentAdmin?.role === 'SuperAdmin' && (
                              <button
                                onClick={() => {
                                  openConfirmModal(
                                    'Xóa nhân viên',
                                    `Bạn có chắc chắn muốn xóa nhân viên ${nv.fullName}?`,
                                    async () => {
                                      try {
                                        await deleteDoc(doc(db, 'employees', nv.id));
                                        toast.success('Xóa nhân viên thành công');
                                      } catch (error) {
                                        console.error('Delete employee error:', error);
                                        toast.error('Lỗi khi xóa nhân viên');
                                      }
                                    }
                                  );
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'vipham' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-6">Quản lý vi phạm</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                    <tr>
                      <th className="px-6 py-3">Ngày</th>
                      <th className="px-6 py-3">Nhân viên</th>
                      <th className="px-6 py-3">Nội dung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canhBaos.map((cb) => (
                      <tr key={cb.id} className="bg-white border-b hover:bg-slate-50">
                        <td className="px-6 py-4">{format(new Date(cb.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{cb.fullName}</td>
                        <td className="px-6 py-4">{cb.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'lichlamviec' && (
            <div className="p-6 h-[calc(100vh-120px)]">
              <SmartScheduleBuilder
                employees={nhanViens}
                schedules={lichLamViecs}
                currentBranchFilter={filterBranch}
                managedBranches={currentAdmin?.locationIds || []}
                onAddShift={async (shift) => {
                  try {
                    const emp = nhanViens.find(e => e.id === shift.empId);
                    await addDoc(collection(db, 'LichLamViec'), {
                      ...shift,
                      empName: emp?.fullName || '',
                      shiftName: `${shift.startTime} - ${shift.endTime}`,
                      status: 'scheduled',
                      createdAt: serverTimestamp()
                    });
                  } catch (error) {
                    console.error('Error adding shift:', error);
                    toast.error('Lỗi khi thêm ca làm việc');
                  }
                }}
                onUpdateShift={async (id, shift) => {
                  try {
                    const updateData: any = { ...shift };
                    if (shift.startTime && shift.endTime) {
                      updateData.shiftName = `${shift.startTime} - ${shift.endTime}`;
                    }
                    await updateDoc(doc(db, 'LichLamViec', id), updateData);
                  } catch (error) {
                    console.error('Error updating shift:', error);
                    toast.error('Lỗi khi cập nhật ca làm việc');
                  }
                }}
                onDeleteShift={async (id) => {
                  try {
                    await deleteDoc(doc(db, 'LichLamViec', id));
                  } catch (error) {
                    console.error('Error deleting shift:', error);
                    toast.error('Lỗi khi xóa ca làm việc');
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'admins' && currentAdmin?.role === 'SuperAdmin' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Quản lý Admin</h2>
                <button
                  onClick={() => setShowAddAdminModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Thêm Admin
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Default Super Admin */}
                <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 flex flex-col gap-2 relative">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-blue-900">{SUPER_ADMIN.email}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Mặc định</span>
                  </div>
                  <p className="text-sm text-blue-700">Vai trò: {SUPER_ADMIN.role}</p>
                  <p className="text-sm text-blue-700">Chi nhánh quản lý: {SUPER_ADMIN.locationIds.join(', ')}</p>
                  <div className="absolute top-4 right-4">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                {admins.map(ad => (
                  <div key={ad.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2 relative group">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900">{ad.email}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ad.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {ad.role}
                      </span>
                    </div>
                  <p className="text-sm text-gray-600">Chi nhánh: {Array.isArray(ad.locationIds) ? ad.locationIds.join(', ') : ad.locationId}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setEditingAdmin(ad);
                        setShowEditAdminModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      Sửa
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteAdmin(ad.id)}
                    className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'canhbao' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Cảnh báo khẩn</h2>
              </div>
              {canhBaos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Không có cảnh báo nào.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {canhBaos.map(cb => (
                    <div key={cb.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-4 items-start">
                      <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-red-900">{cb.fullName} ({cb.empId})</h3>
                          <span className="text-sm text-red-600 font-medium">
                            {format(new Date(cb.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                          </span>
                        </div>
                        <p className="text-red-800 mb-2">{cb.message}</p>
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md font-medium">
                          Chi nhánh: {cb.locationId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Admin Change PIN Modal */}
      {showChangeAdminPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Đổi mã PIN Admin</h2>
            <form onSubmit={handleChangeAdminPin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã PIN mới (6 số)</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  minLength={4}
                  value={newAdminPin}
                  onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-2xl tracking-widest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mã PIN mới</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  minLength={4}
                  value={confirmNewAdminPin}
                  onChange={e => setConfirmNewAdminPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-2xl tracking-widest"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeAdminPinModal(false);
                    setNewAdminPin('');
                    setConfirmNewAdminPin('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Thêm nhân viên mới</h2>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4">Thông tin cơ bản</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ Tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newEmployee.fullName}
                      onChange={e => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={newEmployee.phone || ''}
                      onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="Nhập SĐT"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số CCCD (Dùng để reset PIN)</label>
                    <input
                      type="text"
                      value={newEmployee.cccd || ''}
                      onChange={e => setNewEmployee({ ...newEmployee, cccd: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="Nhập số CCCD"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chi nhánh <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-4 p-3 border border-gray-200 rounded-lg bg-white shadow-inner">
                      {['Góc Phố', 'Phố Xanh'].map(branch => (
                        <label key={branch} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="newEmployeeLocation"
                            checked={newEmployee.locationId === branch}
                            onChange={() => setNewEmployee({ ...newEmployee, locationId: branch })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            disabled={currentAdmin?.role !== 'SuperAdmin'}
                          />
                          <span className="text-sm text-gray-700">{branch}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lương Cơ Bản (đ/h)</label>
                    <input
                      type="text"
                      value={luongTheoGioStr}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val ? parseInt(val).toLocaleString('en-US') : '';
                        setLuongTheoGioStr(formatted);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lương Trách Nhiệm (đ/h)</label>
                    <input
                      type="text"
                      value={thuongTrachNhiemStr}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val ? parseInt(val).toLocaleString('en-US') : '';
                        setThuongTrachNhiemStr(formatted);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Information */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-4">Thông tin bổ sung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vị trí mặc định
                    </label>
                    <div className="flex gap-6 p-3 border border-gray-200 rounded-lg bg-white shadow-inner">
                      {['QUẦY', 'PV'].map(role => (
                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="newEmployeeRole"
                            checked={(newEmployee.defaultRole || 'PV') === role}
                            onChange={() => setNewEmployee({ ...newEmployee, defaultRole: role as 'QUẦY' | 'PV' })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{role === 'QUẦY' ? 'Pha chế (QUẦY)' : 'Phục vụ (PV)'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Vào Làm</label>
                    <input
                      type="date"
                      required
                      value={newEmployee.joinDate || ''}
                      onChange={e => setNewEmployee({ ...newEmployee, joinDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số TK Ngân Hàng</label>
                    <input
                      type="text"
                      value={newEmployee.bankAccount || ''}
                      onChange={e => setNewEmployee({ ...newEmployee, bankAccount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="Nhập số TK"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      value={newEmployee.notes || ''}
                      onChange={e => setNewEmployee({ ...newEmployee, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none shadow-sm"
                      placeholder="Ghi chú (nếu có)"
                      rows={2}
                    />
                  </div>
                </div>
              </div>


              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Thêm nhân viên'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Thêm Admin mới</h2>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setAdminSource('employee')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    adminSource === 'employee' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Từ nhân viên
                </button>
                <button
                  type="button"
                  onClick={() => setAdminSource('phone')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    adminSource === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Thêm mới
                </button>
              </div>

              {adminSource === 'employee' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chọn nhân viên</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={e => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {nhanViens.map(nv => (
                      <option key={nv.id} value={nv.id}>{nv.fullName} ({nv.phone})</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-gray-500 italic">
                    * Admin này sẽ sử dụng mã PIN hiện tại của nhân viên.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên quản lý</label>
                    <input
                      type="text"
                      required
                      value={newAdmin.email}
                      onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Nhập tên quản lý"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã PIN Đăng nhập</label>
                    <div className="relative">
                      <input
                        type={showAddAdminPin ? "text" : "password"}
                        required
                        minLength={4}
                        maxLength={6}
                        value={newAdmin.pin}
                        onChange={e => setNewAdmin({ ...newAdmin, pin: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-xl tracking-widest"
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddAdminPin(!showAddAdminPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showAddAdminPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={newAdmin.role}
                  onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value as 'SuperAdmin' | 'BranchAdmin' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="BranchAdmin">Quản lý chi nhánh (Branch Admin)</option>
                  <option value="SuperAdmin">Quản lý tổng (Super Admin)</option>
                </select>
              </div>
              {newAdmin.role === 'BranchAdmin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chi Nhánh Quản Lý</label>
                  <div className="flex flex-wrap gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    {['Góc Phố', 'Phố Xanh'].map(branch => (
                      <label key={branch} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newAdmin.locationIds?.includes(branch)}
                          onChange={e => {
                            const currentIds = newAdmin.locationIds || [];
                            if (e.target.checked) {
                              setNewAdmin({ ...newAdmin, locationIds: [...currentIds, branch] });
                            } else {
                              setNewAdmin({ ...newAdmin, locationIds: currentIds.filter(id => id !== branch) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{branch}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Thêm Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {showEditAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-600" />
              Chấm công hộ nhân viên
            </h2>
            <form onSubmit={handleManualAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn nhân viên</label>
                <select
                  value={manualAttendance.empId}
                  onChange={e => setManualAttendance({ ...manualAttendance, empId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {nhanViens.map(nv => (
                    <option key={nv.id} value={nv.empId}>{nv.fullName} ({nv.phone})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                  <input
                    type="date"
                    required
                    value={manualAttendance.date}
                    onChange={e => setManualAttendance({ ...manualAttendance, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                  <div className="flex gap-4 p-2 border border-gray-300 rounded-lg">
                    {['Góc Phố', 'Phố Xanh'].map(branch => (
                      <label key={branch} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="manualAttendanceLocation"
                          checked={manualAttendance.locationId === branch}
                          onChange={() => setManualAttendance({ ...manualAttendance, locationId: branch })}
                          className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700">{branch}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào</label>
                  <input
                    type="time"
                    required
                    value={manualAttendance.checkInTime}
                    onChange={e => setManualAttendance({ ...manualAttendance, checkInTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra (Tùy chọn)</label>
                  <input
                    type="time"
                    value={manualAttendance.checkOutTime}
                    onChange={e => setManualAttendance({ ...manualAttendance, checkOutTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-700 italic">
                  * Chấm công hộ sẽ không yêu cầu ảnh chụp và GPS. Dữ liệu sẽ được đánh dấu là "MANUAL_BY_ADMIN".
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditAttendanceModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 shadow-md"
                >
                  Xác nhận chấm công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Sửa thông tin nhân viên</h2>
            <form onSubmit={handleUpdateEmployee} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4">Thông tin cơ bản</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ Tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingEmployee.fullName}
                      onChange={e => setEditingEmployee({ ...editingEmployee, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={editingEmployee.phone || ''}
                      onChange={e => setEditingEmployee({ ...editingEmployee, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số CCCD (Dùng để reset PIN)</label>
                    <input
                      type="text"
                      value={editingEmployee.cccd || ''}
                      onChange={e => setEditingEmployee({ ...editingEmployee, cccd: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="Nhập số CCCD"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chi nhánh <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-4 p-3 border border-gray-200 rounded-lg bg-white shadow-inner">
                      {['Góc Phố', 'Phố Xanh'].map(branch => (
                        <label key={branch} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editEmployeeLocation"
                            checked={editingEmployee.locationId === branch}
                            onChange={() => setEditingEmployee({ ...editingEmployee, locationId: branch })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            disabled={currentAdmin?.role !== 'SuperAdmin'}
                          />
                          <span className="text-sm text-gray-700">{branch}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lương Cơ Bản (đ/h)</label>
                    <input
                      type="text"
                      value={luongTheoGioStr}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val ? parseInt(val).toLocaleString('en-US') : '';
                        setLuongTheoGioStr(formatted);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder={editingEmployee.hourlyRate.toLocaleString('en-US')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lương Trách Nhiệm (đ/h)</label>
                    <input
                      type="text"
                      value={thuongTrachNhiemStr}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val ? parseInt(val).toLocaleString('en-US') : '';
                        setThuongTrachNhiemStr(formatted);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder={(editingEmployee.responsibilityBonus || 0).toLocaleString('en-US')}
                    />
                  </div>
                </div>
              </div>

              {/* Optional Information */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-4">Thông tin bổ sung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vị trí mặc định
                    </label>
                    <div className="flex gap-6 p-3 border border-gray-200 rounded-lg bg-white shadow-inner">
                      {['QUẦY', 'PV'].map(role => (
                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editEmployeeRole"
                            checked={(editingEmployee.defaultRole || 'PV') === role}
                            onChange={() => setEditingEmployee({ ...editingEmployee, defaultRole: role as 'QUẦY' | 'PV' })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{role === 'QUẦY' ? 'Pha chế (QUẦY)' : 'Phục vụ (PV)'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Vào Làm</label>
                    <input
                      type="date"
                      required
                      value={editingEmployee.joinDate || ''}
                      onChange={e => setEditingEmployee({ ...editingEmployee, joinDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số TK Ngân Hàng</label>
                    <input
                      type="text"
                      value={editingEmployee.bankAccount || ''}
                      onChange={e => setEditingEmployee({ ...editingEmployee, bankAccount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                      placeholder="Nhập số tài khoản ngân hàng"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      value={editingEmployee.notes || ''}
                      onChange={e => setEditingEmployee({ ...editingEmployee, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none shadow-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEmployeeModal(false);
                    setEditingEmployee(null);
                    setLuongTheoGioStr('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditAdminModal && editingAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sửa thông tin Admin</h2>
            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên quản lý</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.email || ''}
                  onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã PIN Đăng nhập</label>
                <div className="relative">
                  <input
                    type={showAddAdminPin ? "text" : "password"}
                    required
                    minLength={4}
                    maxLength={6}
                    value={editingAdmin.pin || ''}
                    onChange={e => setEditingAdmin({ ...editingAdmin, pin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-xl tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddAdminPin(!showAddAdminPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showAddAdminPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={editingAdmin.role || 'BranchAdmin'}
                  onChange={e => setEditingAdmin({ ...editingAdmin, role: e.target.value as 'SuperAdmin' | 'BranchAdmin' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="BranchAdmin">Quản lý chi nhánh (Branch Admin)</option>
                  <option value="SuperAdmin">Quản lý tổng (Super Admin)</option>
                </select>
              </div>
              {editingAdmin.role === 'BranchAdmin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chi Nhánh Quản Lý</label>
                  <div className="flex flex-wrap gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    {['Góc Phố', 'Phố Xanh'].map(branch => (
                      <label key={branch} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingAdmin.locationIds?.includes(branch)}
                          onChange={e => {
                            const currentIds = editingAdmin.locationIds || [];
                            if (e.target.checked) {
                              setEditingAdmin({ ...editingAdmin, locationIds: [...currentIds, branch] });
                            } else {
                              setEditingAdmin({ ...editingAdmin, locationIds: currentIds.filter(id => id !== branch) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{branch}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAdminModal(false);
                    setEditingAdmin(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {showEditAttendanceModal && editingAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Sửa bản ghi chấm công
            </h2>
            <form onSubmit={handleUpdateAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                <input
                  type="text"
                  readOnly
                  value={nhanViens.find(nv => nv.empId === editingAttendance.empId)?.fullName || editingAttendance.empId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                  <input
                    type="date"
                    required
                    value={editingAttendance.date}
                    onChange={e => setEditingAttendance({ ...editingAttendance, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                  <select
                    value={editingAttendance.locationId}
                    onChange={e => setEditingAttendance({ ...editingAttendance, locationId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="Góc Phố">Góc Phố</option>
                    <option value="Phố Xanh">Phố Xanh</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào</label>
                  <input
                    type="time"
                    required
                    value={editingAttendance.checkInTime || ''}
                    onChange={e => setEditingAttendance({ ...editingAttendance, checkInTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra</label>
                  <input
                    type="time"
                    value={editingAttendance.checkOutTime || ''}
                    onChange={e => setEditingAttendance({ ...editingAttendance, checkOutTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAttendanceModal(false);
                    setEditingAttendance(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Management Modal */}
      {showSalaryManagementModal && selectedEmpForSalary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 bg-indigo-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  Quản lý lương: {selectedEmpForSalary.fullName}
                </h2>
                <button
                  onClick={() => {
                    setShowSalaryManagementModal(false);
                    setSelectedEmpForSalary(null);
                  }}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-indigo-900" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSalaryManagementTab('history')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${salaryManagementTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-100'}`}
                >
                  Lịch sử lương
                </button>
                <button
                  onClick={() => setSalaryManagementTab('increase')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${salaryManagementTab === 'increase' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 hover:bg-emerald-100'}`}
                >
                  Tăng lương
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {salaryManagementTab === 'history' ? (
                salaryHistories.filter(h => h.empId === selectedEmpForSalary.empId).length === 0 ? (
                  <div className="text-center py-12 text-gray-500 italic">Chưa có lịch sử thay đổi lương</div>
                ) : (
                  <div className="space-y-4">
                    {salaryHistories
                      .filter(h => h.empId === selectedEmpForSalary.empId)
                      .map((history, idx) => (
                        <div key={history.id || idx} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {history.effectiveDate ? format(new Date(history.effectiveDate?.toDate?.() || history.effectiveDate), 'dd/MM/yyyy HH:mm') : 'Đang cập nhật...'}
                            </span>
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Thành công</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lương cũ</p>
                              <p className="text-sm font-bold text-gray-600 line-through">{(history.oldRate || 0).toLocaleString('en-US')}đ/h</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Thưởng cũ</p>
                              <p className="text-xs font-bold text-gray-500 line-through">{(history.oldBonus || 0).toLocaleString('en-US')}đ/h</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Lương mới</p>
                              <p className="text-lg font-bold text-emerald-700">{(history.newRate || 0).toLocaleString('en-US')}đ/h</p>
                              <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Thưởng mới</p>
                              <p className="text-sm font-bold text-blue-700">{(history.newBonus || 0).toLocaleString('en-US')}đ/h</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-gray-200/50">
                            <p className="text-xs text-gray-600 italic">" {history.reason} "</p>
                            <p className="text-[10px] text-gray-400 mt-2">Duyệt bởi: <span className="font-bold">{history.approvedBy}</span></p>
                          </div>
                        </div>
                      ))}
                  </div>
                )
              ) : (
                <form onSubmit={handleIncreaseSalary} className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Thông tin hiện tại</p>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Lương cơ bản hiện tại:</span>
                      <span className="text-lg font-bold text-gray-900">{(selectedEmpForSalary.hourlyRate || 0).toLocaleString('en-US')}đ/h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Thưởng TN hiện tại:</span>
                      <span className="text-lg font-bold text-gray-900">{(selectedEmpForSalary.responsibilityBonus || 0).toLocaleString('en-US')}đ/h</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Lương cơ bản mới (đ/h)</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={newSalaryRateStr}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/[^0-9]/g, '');
                            setNewSalaryRateStr(rawValue ? Number(rawValue).toLocaleString('en-US') : '');
                            setNewSalaryRate(Number(rawValue));
                          }}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-bold text-lg"
                          placeholder="Nhập lương cơ bản..."
                        />
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Thưởng TN mới (đ/h)</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={newBonusRateStr}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/[^0-9]/g, '');
                            setNewBonusRateStr(rawValue ? Number(rawValue).toLocaleString('en-US') : '');
                            setNewBonusRate(Number(rawValue));
                          }}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-lg"
                          placeholder="Nhập thưởng TN..."
                        />
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Lý do tăng lương (Tùy chọn)</label>
                    <textarea
                      value={salaryIncreaseReason}
                      onChange={e => setSalaryIncreaseReason(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all min-h-[100px]"
                      placeholder="VD: Làm việc xuất sắc, tăng lương định kỳ 3 tháng..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || newSalaryRate <= selectedEmpForSalary.hourlyRate}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Xác nhận tăng</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

          {activeTab === 'lichsu' && currentAdmin?.role === 'SuperAdmin' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Lịch sử hệ thống</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Hành động</th>
                      <th className="px-4 py-3">Đối tượng</th>
                      <th className="px-4 py-3">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3">{log.timestamp ? format(new Date(log.timestamp.toDate()), 'dd/MM/yyyy HH:mm:ss') : ''}</td>
                        <td className="px-4 py-3">{log.adminEmail}</td>
                        <td className="px-4 py-3">{log.action}</td>
                        <td className="px-4 py-3">{log.target}</td>
                        <td className="px-4 py-3">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmAction.title}</h3>
            <p className="text-gray-600 mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={closeConfirmModal}
                className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  confirmAction.onConfirm();
                  closeConfirmModal();
                }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {showHolidayConfig && (
        <HolidayConfigModal
          holidays={holidays}
          onClose={() => setShowHolidayConfig(false)}
        />
      )}

      {editingAdjustment && (
        <PayrollAdjustmentModal
          adjustment={editingAdjustment}
          empName={nhanViens.find(e => e.id === editingAdjustment.empId)?.fullName || ''}
          monthYear={editingAdjustment.monthYear}
          empId={editingAdjustment.empId}
          onClose={() => setEditingAdjustment(null)}
          onSave={() => setEditingAdjustment(null)}
        />
      )}

      <div className="mt-8 mb-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black">
          Cafe HR Manager System
        </p>
        <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Version 1.0</p>
        <p className="text-[10px] text-slate-400 font-medium italic mt-2">Designed by Liem Nguyen</p>
      </div>
      <Toaster />
    </div>
  );
}
