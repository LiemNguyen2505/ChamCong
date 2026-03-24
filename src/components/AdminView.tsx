import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, where, deleteField } from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, Filter, LogOut, Users, Clock, Plus, Trash2, Edit2, ShieldCheck, Download, Calendar, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Bell, BellOff, TrendingUp, DollarSign, History as HistoryIcon, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { differenceInMonths, parseISO, addMonths } from 'date-fns';

interface Employee {
  id: string;
  empId: string;
  phone: string;
  fullName: string;
  cccd: string;
  hourlyRate: number;
  pinCode: string;
  isFirstLogin: boolean;
  joinDate: string;
  lastSalaryReviewDate?: any;
  createdAt?: any;
}

interface SalaryHistory {
  id: string;
  empId: string;
  fullName: string;
  oldRate: number;
  newRate: number;
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
  type: 'check_in' | 'check_out';
  timestamp: string;
  message: string;
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
  const [activeTab, setActiveTab] = useState<'chamcong' | 'nhanvien' | 'lichlamviec' | 'xinnghiphep' | 'admins' | 'canhbao' | 'lichsu'>('chamcong');
  
  const [nhanViens, setNhanViens] = useState<Employee[]>([]);
  const [chamCongs, setChamCongs] = useState<Timesheet[]>([]);
  const [lichLamViecs, setLichLamViecs] = useState<WorkSchedule[]>([]);
  const [xinNghiPheps, setXinNghiPheps] = useState<LeaveRequest[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [canhBaos, setCanhBaos] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [salaryHistories, setSalaryHistories] = useState<SalaryHistory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Salary Review Notifications
  const [salaryReviewNotifications, setSalaryReviewNotifications] = useState<{empId: string, fullName: string, nextReviewDate: string}[]>([]);

  // Add Employee State
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showSalaryHistoryModal, setShowSalaryHistoryModal] = useState(false);
  const [showIncreaseSalaryModal, setShowIncreaseSalaryModal] = useState(false);
  const [selectedEmpForSalary, setSelectedEmpForSalary] = useState<Employee | null>(null);
  const [newSalaryRate, setNewSalaryRate] = useState<number>(0);
  const [salaryIncreaseReason, setSalaryIncreaseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    empId: '',
    phone: '',
    fullName: '',
    cccd: '',
    hourlyRate: 0,
    joinDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [luongTheoGioStr, setLuongTheoGioStr] = useState('');

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

  // Manual Attendance State
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Timesheet | null>(null);
  const [manualAttendance, setManualAttendance] = useState({
    empId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    checkInTime: format(new Date(), 'HH:mm'),
    checkOutTime: '',
    locationId: 'Góc Phố'
  });

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (password === SUPER_ADMIN.pin) {
        setCurrentAdmin(SUPER_ADMIN);
        setIsAuthenticated(true);
      } else {
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
        } else {
          toast.error('Mã PIN không đúng');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi đăng nhập');
    }
    setLoading(false);
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
    if (!newEmployee.cccd) {
      toast.error('Vui lòng nhập Số CCCD');
      return;
    }

    // Check for duplicate CCCD
    const isDuplicateCCCD = nhanViens.some(nv => nv.cccd === newEmployee.cccd);
    if (isDuplicateCCCD) {
      toast.error('Số CCCD đã tồn tại trong hệ thống');
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
      
      // Default PIN: last 4 digits of phone, if no phone use last 4 digits of CCCD
      let maPIN = '0000';
      if (newEmployee.phone && newEmployee.phone.length >= 4) {
        maPIN = newEmployee.phone.slice(-4);
      } else if (newEmployee.cccd && newEmployee.cccd.length >= 4) {
        maPIN = newEmployee.cccd.slice(-4);
      }

      const luong = parseInt(luongTheoGioStr.replace(/,/g, '')) || 0;

      const employeeData = {
        ...newEmployee,
        phone: newEmployee.phone || '', // Ensure it's a string even if empty
        empId: maNV,
        pinCode: maPIN,
        hourlyRate: luong,
        isFirstLogin: true,
        joinDate: newEmployee.joinDate || format(new Date(), 'yyyy-MM-dd'),
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
        cccd: '',
        hourlyRate: 0,
        joinDate: format(new Date(), 'yyyy-MM-dd'),
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
    if (!editingEmployee.cccd) {
      toast.error('Vui lòng nhập Số CCCD');
      return;
    }

    // Check for duplicate CCCD (excluding current employee)
    const isDuplicateCCCD = nhanViens.some(nv => nv.cccd === editingEmployee.cccd && nv.id !== editingEmployee.id);
    if (isDuplicateCCCD) {
      toast.error('Số CCCD đã tồn tại trong hệ thống');
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
      
      await updateDoc(doc(db, 'employees', editingEmployee.id), {
        fullName: editingEmployee.fullName,
        phone: editingEmployee.phone || '',
        cccd: editingEmployee.cccd,
        hourlyRate: luong,
        joinDate: editingEmployee.joinDate
      });
      await logAction('Sửa', 'Nhân viên', `Sửa thông tin nhân viên ${editingEmployee.fullName} (Mã: ${editingEmployee.empId})`);
      
      toast.success('Cập nhật nhân viên thành công');
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
      setLuongTheoGioStr('');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật nhân viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPIN = async (nv: Employee) => {
    if (window.confirm(`Bạn có chắc chắn muốn reset mã PIN của nhân viên ${nv.fullName} về 4 số cuối điện thoại?`)) {
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
        console.error(error);
        toast.error('Lỗi khi reset PIN');
      }
    }
  };

  const handleResetDevice = async (nv: Employee) => {
    if (window.confirm(`Bạn có chắc muốn reset thiết bị cho nhân viên ${nv.fullName}? Nhân viên sẽ có thể đăng nhập trên thiết bị mới.`)) {
      try {
        await updateDoc(doc(db, 'employees', nv.id), {
          deviceId: deleteField()
        });
        toast.success('Reset thiết bị thành công');
      } catch (error) {
        toast.error('Lỗi khi reset thiết bị');
      }
    }
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
      
      // 1. Update Employee
      await updateDoc(doc(db, 'employees', selectedEmpForSalary.id), {
        hourlyRate: newRate,
        lastSalaryReviewDate: new Date().toISOString()
      });
      
      // 2. Add Salary History
      await addDoc(collection(db, 'SalaryHistory'), {
        empId: selectedEmpForSalary.empId,
        fullName: selectedEmpForSalary.fullName,
        oldRate: oldRate,
        newRate: newRate,
        effectiveDate: new Date().toISOString(),
        reason: salaryIncreaseReason || 'Tăng lương định kỳ',
        approvedBy: currentAdmin?.email || 'Admin'
      });
      await logAction('Tăng lương', 'Nhân viên', `Tăng lương cho ${selectedEmpForSalary.fullName} (Mã: ${selectedEmpForSalary.empId}) từ ${oldRate} lên ${newRate}`);
      
      toast.success('Cập nhật lương thành công');
      setShowIncreaseSalaryModal(false);
      setSelectedEmpForSalary(null);
      setNewSalaryRate(0);
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
      setShowManualAttendanceModal(false);
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
                {currentAdmin?.role} - {currentAdmin?.locationIds?.join(', ')}
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
                                notif.type === 'check_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {notif.type === 'check_in' ? 'Vào ca' : 'Ra ca'}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {format(new Date(notif.timestamp), 'HH:mm dd/MM')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium">{notif.fullName}</p>
                            <p className="text-xs text-gray-500">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
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
            onClick={() => setActiveTab('nhanvien')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'nhanvien' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Nhân viên
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
          {activeTab === 'chamcong' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-gray-900">Lịch sử chấm công</h2>
                  <button
                    onClick={() => setShowManualAttendanceModal(true)}
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
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {currentAdmin?.role === 'SuperAdmin' ? (
                    <select
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    Xuất Excel
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-200">
                      <th className="p-4 text-sm font-semibold text-gray-600">Ngày</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Nhân viên</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Chi nhánh</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Giờ vào</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Giờ ra</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Số lần rời</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Phút phạt</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Tổng giờ</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Tổng lương</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {chamCongs.filter(cc => cc.date.startsWith(filterMonth)).map(log => {
                      const employee = nhanViens.find(nv => nv.empId === log.empId);
                      const canDelete = currentAdmin?.role === 'SuperAdmin' || (log.createdByAdminId && log.createdByAdminId === currentAdmin?.id);
                      
                      return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="p-4 text-sm text-gray-900">{log.date}</td>
                        <td className="p-4 text-sm font-medium text-gray-900">{employee?.fullName || 'Không rõ'}</td>
                        <td className="p-4 text-sm text-gray-600">{log.locationId}</td>
                        <td className="p-4 text-sm text-gray-600">
                          {log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm:ss') : '-'}
                          {log.AnhVaoCa && <a href={log.AnhVaoCa} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 text-xs underline">Ảnh</a>}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm:ss') : '-'}
                          {log.AnhRaCa && <a href={log.AnhRaCa} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 text-xs underline">Ảnh</a>}
                        </td>
                        <td className="p-4 text-sm text-red-600 font-medium">{log.SoLanRoiApp || 0}</td>
                        <td className="p-4 text-sm text-red-600 font-medium">{log.PhutPhatRoiApp || 0}p</td>
                        <td className="p-4 text-sm font-bold text-blue-600">{log.totalHours ? log.totalHours.toFixed(2) : '0'}h</td>
                        <td className="p-4 text-sm font-bold text-green-600">{(log.totalPay || 0).toLocaleString()}đ</td>
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
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Sửa bản ghi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendance(log)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

          {activeTab === 'nhanvien' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Quản lý nhân viên</h2>
                <button
                  onClick={() => {
                    setNewEmployee({
                      empId: '',
                      phone: '',
                      fullName: '',
                      cccd: '',
                      hourlyRate: 0,
                      joinDate: format(new Date(), 'yyyy-MM-dd'),
                    });
                    setLuongTheoGioStr('');
                    setShowAddEmployeeModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Thêm nhân viên
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nhanViens.map(nv => (
                  <div key={nv.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2 relative group">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900">{nv.fullName}</h3>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-bold">{nv.empId}</span>
                        {salaryReviewNotifications.some(n => n.empId === nv.empId) && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-full animate-pulse">
                            Đến hạn review lương
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">SĐT: {nv.phone}</p>
                    <p className="text-sm text-gray-600">CCCD: {nv.cccd}</p>
                    <p className="text-sm text-gray-600">Ngày vào làm: {nv.joinDate ? format(new Date(nv.joinDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    <p className="text-sm text-gray-600">Lương: <span className="font-bold text-emerald-600">{nv.hourlyRate.toLocaleString()}đ/h</span></p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => handleResetPIN(nv)}
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-200 transition-colors"
                      >
                        Reset PIN
                      </button>
                      <button
                        onClick={() => handleResetDevice(nv)}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-purple-200 transition-colors"
                      >
                        Reset Thiết bị
                      </button>
                      <button
                        onClick={() => {
                          setEditingEmployee(nv);
                          setLuongTheoGioStr(nv.hourlyRate.toLocaleString());
                          setShowEditEmployeeModal(true);
                        }}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-200 transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEmpForSalary(nv);
                          setShowSalaryHistoryModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-200 transition-colors flex items-center gap-1"
                      >
                        <HistoryIcon className="w-3 h-3" />
                        Lịch sử lương
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEmpForSalary(nv);
                          setNewSalaryRate(nv.hourlyRate);
                          setShowIncreaseSalaryModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Tăng lương
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
                          try {
                            await deleteDoc(doc(db, 'employees', nv.id));
                            toast.success('Xóa nhân viên thành công');
                          } catch (error) {
                            toast.error('Lỗi khi xóa nhân viên');
                          }
                        }
                      }}
                      className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'lichlamviec' && (
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Lịch làm việc</h2>
              <p className="text-gray-500">Tính năng đang được phát triển...</p>
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

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Thêm nhân viên mới</h2>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ Tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEmployee.fullName}
                  onChange={e => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={newEmployee.phone}
                  onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nhập số điện thoại (không bắt buộc)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số CCCD <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEmployee.cccd}
                  onChange={e => setNewEmployee({ ...newEmployee, cccd: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nhập số CCCD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Vào Làm</label>
                <input
                  type="date"
                  required
                  value={newEmployee.joinDate}
                  onChange={e => setNewEmployee({ ...newEmployee, joinDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lương Theo Giờ
                </label>
                <input
                  type="text"
                  value={luongTheoGioStr}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    const formatted = val ? parseInt(val).toLocaleString() : '';
                    setLuongTheoGioStr(formatted);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nhập mức lương (không bắt buộc)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
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
                        minLength={6}
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
      {showManualAttendanceModal && (
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
                  <select
                    value={manualAttendance.locationId}
                    onChange={e => setManualAttendance({ ...manualAttendance, locationId: e.target.value })}
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
                  onClick={() => setShowManualAttendanceModal(false)}
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sửa thông tin nhân viên</h2>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ Tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingEmployee.fullName}
                  onChange={e => setEditingEmployee({ ...editingEmployee, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editingEmployee.phone}
                  onChange={e => setEditingEmployee({ ...editingEmployee, phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số CCCD <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingEmployee.cccd}
                  onChange={e => setEditingEmployee({ ...editingEmployee, cccd: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Vào Làm</label>
                <input
                  type="date"
                  required
                  value={editingEmployee.joinDate}
                  onChange={e => setEditingEmployee({ ...editingEmployee, joinDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lương Theo Giờ
                </label>
                <input
                  type="text"
                  value={luongTheoGioStr}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    const formatted = val ? parseInt(val).toLocaleString() : '';
                    setLuongTheoGioStr(formatted);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder={editingEmployee.hourlyRate.toLocaleString()}
                />
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
                  value={editingAdmin.email}
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
                    minLength={6}
                    maxLength={6}
                    value={editingAdmin.pin}
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
                  value={editingAdmin.role}
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

      {/* Salary History Modal */}
      {showSalaryHistoryModal && selectedEmpForSalary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <div>
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  <HistoryIcon className="w-6 h-6" />
                  Lịch sử lương: {selectedEmpForSalary.fullName}
                </h2>
                <p className="text-sm text-indigo-600 font-medium">Mã NV: {selectedEmpForSalary.empId}</p>
              </div>
              <button
                onClick={() => {
                  setShowSalaryHistoryModal(false);
                  setSelectedEmpForSalary(null);
                }}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-indigo-900" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {salaryHistories.filter(h => h.empId === selectedEmpForSalary.empId).length === 0 ? (
                <div className="text-center py-12 text-gray-500 italic">
                  Chưa có lịch sử thay đổi lương
                </div>
              ) : (
                <div className="space-y-4">
                  {salaryHistories
                    .filter(h => h.empId === selectedEmpForSalary.empId)
                    .map((history, idx) => (
                      <div key={history.id || idx} className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {format(new Date(history.effectiveDate), 'dd/MM/yyyy HH:mm')}
                          </span>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                            Thành công
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lương cũ</p>
                            <p className="text-sm font-bold text-gray-600 line-through">{history.oldRate.toLocaleString()}đ/h</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Lương mới</p>
                            <p className="text-lg font-bold text-emerald-700">{history.newRate.toLocaleString()}đ/h</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-gray-200/50">
                          <p className="text-xs text-gray-600 italic">" {history.reason} "</p>
                          <p className="text-[10px] text-gray-400 mt-2">Duyệt bởi: <span className="font-bold">{history.approvedBy}</span></p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Increase Salary Modal */}
      {showIncreaseSalaryModal && selectedEmpForSalary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50">
              <div>
                <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Tăng lương nhân viên
                </h2>
                <p className="text-sm text-emerald-600 font-medium">{selectedEmpForSalary.fullName}</p>
              </div>
              <button
                onClick={() => {
                  setShowIncreaseSalaryModal(false);
                  setSelectedEmpForSalary(null);
                }}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-emerald-900" />
              </button>
            </div>
            
            <form onSubmit={handleIncreaseSalary} className="p-6 space-y-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Thông tin hiện tại</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Lương hiện tại:</span>
                  <span className="text-lg font-bold text-gray-900">{selectedEmpForSalary.hourlyRate.toLocaleString()}đ/h</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mức lương mới (đ/h)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={selectedEmpForSalary.hourlyRate + 1}
                      value={newSalaryRate}
                      onChange={e => setNewSalaryRate(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-bold text-lg"
                      placeholder="Nhập mức lương mới..."
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                    Tăng: +{(newSalaryRate - selectedEmpForSalary.hourlyRate).toLocaleString()}đ/h
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Lý do tăng lương</label>
                  <textarea
                    required
                    value={salaryIncreaseReason}
                    onChange={e => setSalaryIncreaseReason(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all min-h-[100px]"
                    placeholder="VD: Làm việc xuất sắc, tăng lương định kỳ 3 tháng..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowIncreaseSalaryModal(false);
                    setSelectedEmpForSalary(null);
                  }}
                  className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newSalaryRate <= selectedEmpForSalary.hourlyRate}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Xác nhận tăng
                    </>
                  )}
                </button>
              </div>
            </form>
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
      <div className="mt-8 mb-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black">
          Cafe HR Manager System
        </p>
        <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Version 1.0</p>
      </div>
    </div>
  );
}
