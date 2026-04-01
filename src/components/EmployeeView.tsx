import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs } from 'firebase/firestore';
import { calculateDistance } from '../utils/geo';
import CameraCapture, { CameraCaptureRef } from './CameraCapture';
import { Clock, User, Info, KeyRound, CheckCircle, AlertCircle, Camera, LogOut, MapPin, History, Calendar, ChevronRight, ChevronLeft, Eye, EyeOff, Building, Lock, Coffee, CheckCircle2, AlertTriangle, Edit2, X, List, LayoutGrid, Users, ShieldCheck, CalendarOff, RefreshCw, Smartphone, ArrowRight, ArrowRightLeft, Phone, Store, FileEdit, Fingerprint, CalendarX, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  empId: string;
  phone: string;
  fullName: string;
  hourlyRate: number;
  responsibilityBonus?: number;
  pinCode: string;
  isFirstLogin: boolean;
  joinDate: string;
  deviceId?: string;
  createdAt?: string;
  avatar?: string;
  cccd?: string;
}

interface ShiftTask {
  id: string;
  content: string;
  isCompleted: boolean;
  createdBy: string;
  isHandover?: boolean;
  handoverApproved?: boolean;
}

interface WorkSchedule {
  id: string;
  empId: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  roleInShift: string;
  isOff: boolean;
  notes: string;
  colorLabel: string;
  tasks?: ShiftTask[];
}

const BRANCHES = [
  { id: 'Góc Phố', name: 'Quán Góc Phố', lat: 9.934713233832424, lng: 106.33866680984944 },
  { id: 'Phố Xanh', name: 'Quán Phố Xanh', lat: 9.929620625180215, lng: 106.33961265587556 },
];

const MAX_DISTANCE_METERS = 50;

export default function EmployeeView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Kiosk State
  const [kioskBranch, setKioskBranch] = useState<string | null>(null);
  
  // Login State
  const [empIdInput, setEmpIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);
  
  // Change PIN State
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Action State
  const [actionType, setActionType] = useState<'check-in' | 'check-out' | null>(null);
  const [selectedShiftTime, setSelectedShiftTime] = useState<string>('');
  const [scheduledShiftTime, setScheduledShiftTime] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDeviceError, setShowDeviceError] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null);
  const cameraRef = useRef<CameraCaptureRef>(null);
  
  // Reset PIN State
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetEmpId, setResetEmpId] = useState('');
  const [resetCccdLast4, setResetCccdLast4] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [showResetNewPin, setShowResetNewPin] = useState(false);
  const [showResetConfirmPin, setShowResetConfirmPin] = useState(false);

  const [latestLog, setLatestLog] = useState<any>(null);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [monthTimesheets, setMonthTimesheets] = useState<any[]>([]);
  const [monthSchedules, setMonthSchedules] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    latePenaltyMinutes: 0,
    lateCount: 0,
    totalLateMinutes: 0,
    expectedTTN: 0,
    ttnPercentage: 100,
    expectedBaseSalary: 0,
    totalExpected: 0
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayShifts = workSchedules
    .filter(s => s.date === todayStr && !s.isOff && s.locationId === kioskBranch)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const [admins, setAdmins] = useState<any[]>([]);
  const [checkoutSummary, setCheckoutSummary] = useState<any>(null);
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAvatarCamera, setShowAvatarCamera] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'off_sudden' | 'shift_swap' | 'late_early' | 'forgot_check' | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [swapWithEmpId, setSwapWithEmpId] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [requestDate, setRequestDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [requestSubTime, setRequestSubTime] = useState(''); // For forgot check out time if needed
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [checkoutWarningStep, setCheckoutWarningStep] = useState(0);
  const [checkinWarningStep, setCheckinWarningStep] = useState(0);
  const [isTimeManuallyEdited, setIsTimeManuallyEdited] = useState(false);
  const [lateCheckoutOption, setLateCheckoutOption] = useState<'forgot' | 'overtime' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'grid'>('list');
  const [teamScheduleBranch, setTeamScheduleBranch] = useState<string>('');
  const [allSchedules, setAllSchedules] = useState<WorkSchedule[]>([]);

  useEffect(() => {
    setTeamScheduleBranch(kioskBranch || 'Góc Phố');
  }, [kioskBranch]);

  useEffect(() => {
    if (!showWeeklySchedule) return;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    const startOfWeek = format(monday, 'yyyy-MM-dd');
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const endOfWeek = format(sunday, 'yyyy-MM-dd');

    const q = query(
      collection(db, 'LichLamViec'),
      where('date', '>=', startOfWeek),
      where('date', '<=', endOfWeek)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Fetched schedules snapshot size:', snapshot.size);
      const schedules = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Schedule doc data:', data);
        return { id: doc.id, ...data as any };
      });
      setAllSchedules(schedules);
    }, (error) => {
      console.error('Error fetching schedules:', error);
      handleFirestoreError(error, OperationType.GET, 'LichLamViec');
    });

    return () => unsubscribe();
  }, [showWeeklySchedule]);

  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    // Start from the beginning of the current week (Monday)
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };
  const weekDays = getWeekDays();

  useEffect(() => {
    const qEmp = query(collection(db, 'employees'), orderBy('fullName', 'asc'));
    const unsubscribeEmp = onSnapshot(qEmp, (snapshot) => {
      const empData: Employee[] = [];
      snapshot.forEach(doc => empData.push({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(empData);
      
      // Update logged in employee data if it changes
      if (loggedInEmployee) {
        const updated = empData.find(e => e.id === loggedInEmployee.id);
        if (updated) setLoggedInEmployee(updated);
      }
    });

    const qAdmins = query(collection(db, 'Admins'));
    const unsubscribeAdmins = onSnapshot(qAdmins, (snapshot) => {
      const adminData: any[] = [];
      snapshot.forEach(doc => adminData.push({ id: doc.id, ...doc.data() }));
      setAdmins(adminData);
    });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const savedBranch = localStorage.getItem('kioskBranch');
    if (savedBranch) {
      setKioskBranch(savedBranch);
    }
    
    return () => {
      clearInterval(timer);
      unsubscribeEmp();
      unsubscribeAdmins();
    };
  }, []);

  useEffect(() => {
    if (!loggedInEmployee) {
      setLatestLog(null);
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'timesheets'),
      where('empId', '==', loggedInEmployee.empId),
      where('date', '==', todayStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sortedLogs = logs.sort((a, b) => {
        if (!a.checkInTime) return 1;
        if (!b.checkInTime) return -1;
        return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime();
      });
      
      if (sortedLogs.length > 0) {
        setLatestLog(sortedLogs[0]);
      } else {
        setLatestLog(null);
      }
    });

    return () => unsubscribe();
  }, [loggedInEmployee]);

  useEffect(() => {
    if (!loggedInEmployee) {
      setWorkSchedules([]);
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'LichLamViec'),
      where('empId', '==', loggedInEmployee.id),
      where('date', '>=', todayStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sortedSchedules = schedules.sort((a, b) => a.date.localeCompare(b.date));
      setWorkSchedules(sortedSchedules);
    });

    return () => unsubscribe();
  }, [loggedInEmployee]);

  useEffect(() => {
    if (!loggedInEmployee) {
      setMonthTimesheets([]);
      setMonthSchedules([]);
      return;
    }

    const today = new Date();
    const startOfMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
    const endOfMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');

    const qTimesheets = query(
      collection(db, 'timesheets'),
      where('empId', '==', loggedInEmployee.empId),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth)
    );

    const qSchedules = query(
      collection(db, 'LichLamViec'),
      where('empId', '==', loggedInEmployee.id),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth)
    );

    const unsubscribeTimesheets = onSnapshot(qTimesheets, (snapshot) => {
      setMonthTimesheets(snapshot.docs.map(doc => doc.data()));
    });

    const unsubscribeSchedules = onSnapshot(qSchedules, (snapshot) => {
      setMonthSchedules(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubscribeTimesheets();
      unsubscribeSchedules();
    };
  }, [loggedInEmployee]);

  useEffect(() => {
    if (!loggedInEmployee) {
      setMonthlyStats({
        latePenaltyMinutes: 0,
        lateCount: 0,
        totalLateMinutes: 0,
        expectedTTN: 0,
        ttnPercentage: 100,
        expectedBaseSalary: 0,
        totalExpected: 0
      });
      return;
    }

    let totalLatePenalty = 0;
    let lateCount = 0;
    let totalLate = 0;
    let totalHours = 0;

    monthTimesheets.forEach(data => {
      if (data.lateMinutes && !data.isLateExcused) {
        totalLate += data.lateMinutes;
        if (data.lateMinutes >= 10) {
          lateCount++;
          totalLatePenalty += (data.lateMinutes * 2);
        }
      }
      if (data.totalHours) {
        totalHours += data.totalHours;
      }
    });

    let missedShifts = 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const nowStr = format(new Date(), 'HH:mm');

    monthSchedules.forEach(schedule => {
      if (schedule.isOff) return;
      if (schedule.date < todayStr || (schedule.date === todayStr && schedule.endTime < nowStr)) {
        const hasTimesheet = monthTimesheets.some(t => t.date === schedule.date && t.selectedShiftTime === schedule.startTime);
        if (!hasTimesheet) {
          missedShifts++;
        }
      }
    });

    let ttnPercentage = 100;
    if (missedShifts > 0 || lateCount > 10) {
      ttnPercentage = 0;
    } else if (lateCount >= 6 && lateCount <= 10) {
      ttnPercentage = 50;
    } else {
      ttnPercentage = 100;
    }

    const baseSalaryPerHour = loggedInEmployee.hourlyRate || 0;
    const bonusSalaryPerHour = loggedInEmployee.responsibilityBonus || 0;

    const validHours = Math.max(0, totalHours - (totalLatePenalty / 60));

    const expectedBaseSalary = validHours * baseSalaryPerHour;
    const expectedTTN = validHours * bonusSalaryPerHour * (ttnPercentage / 100);
    const totalExpected = expectedBaseSalary + expectedTTN;

    setMonthlyStats({
      latePenaltyMinutes: totalLatePenalty,
      lateCount: lateCount,
      totalLateMinutes: totalLate,
      expectedTTN,
      ttnPercentage,
      expectedBaseSalary,
      totalExpected
    });
  }, [monthTimesheets, monthSchedules, loggedInEmployee]);

  // Anti-Slacking Logic
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!latestLog || latestLog.checkOutTime || !loggedInEmployee) return;

      const isImmuneRole = loggedInEmployee.empId.toUpperCase() === 'ADMIN' || 
                           admins.some(a => a.email === loggedInEmployee.fullName);
      
      if (isImmuneRole) return;

      if (document.hidden) {
        localStorage.setItem('lastHiddenTime', Date.now().toString());
      } else {
        const lastHiddenStr = localStorage.getItem('lastHiddenTime');
        if (lastHiddenStr) {
          const lastHidden = parseInt(lastHiddenStr, 10);
          const now = Date.now();
          const diffMinutesExact = (now - lastHidden) / 60000;
          
          // Chỉ tính là rời app nếu rời quá 10 giây (0.16 phút)
          if (diffMinutesExact > 0.16) {
            try {
              const currentPhat = latestLog.PhutPhatRoiApp || 0;
              const currentLan = latestLog.SoLanRoiApp || 0;
              
              const newLan = currentLan + 1;
              
              let penalty = 0;
              // Từ lần thứ 6 trở đi, HOẶC dưới 5 lần nhưng quá 1 phút
              if (newLan > 5 || diffMinutesExact > 1) {
                // Tính số phút bị phạt (ít nhất 1 phút)
                const penalizedMinutes = Math.max(1, Math.floor(diffMinutesExact));
                penalty = penalizedMinutes * 3;
              }

              const newPhat = currentPhat + penalty;

              await updateDoc(doc(db, 'timesheets', latestLog.id), {
                PhutPhatRoiApp: newPhat,
                SoLanRoiApp: newLan
              });

              if (newLan > 5) {
                await addDoc(collection(db, 'CanhBao'), {
                  empId: loggedInEmployee.empId,
                  fullName: loggedInEmployee.fullName,
                  locationId: kioskBranch || 'Unknown',
                  ThoiGian: new Date().toISOString(),
                  NoiDung: `Nhân viên đã rời ứng dụng ${newLan} lần trong ca làm việc.`
                });
              }
            } catch (error) {
              console.error('Error updating Anti-Slacking data:', error);
            }
          }
          localStorage.removeItem('lastHiddenTime');
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [latestLog, loggedInEmployee, kioskBranch, admins]);

  const handleSetKioskBranch = (branchId: string) => {
    localStorage.setItem('kioskBranch', branchId);
    setKioskBranch(branchId);
  };

  const handleBackToBranchSelection = () => {
    localStorage.removeItem('kioskBranch');
    setKioskBranch(null);
    setEmpIdInput('');
    setPinInput('');
    setError(null);
  };

  const getBrowserDeviceId = () => {
    let devId = localStorage.getItem('browser_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('browser_device_id', devId);
    }
    return devId;
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPin !== resetConfirmPin) {
      toast.error('Mã PIN xác nhận không khớp');
      return;
    }
    if (resetNewPin.length < 4) {
      toast.error('Mã PIN phải có ít nhất 4 số');
      return;
    }

    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'employees'), where('phone', '==', resetEmpId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Không tìm thấy nhân viên với số điện thoại này');
        return;
      }

      const empDoc = querySnapshot.docs[0];
      const empData = empDoc.data() as Employee;

      // Extract last 4 digits of stored CCCD for verification
      const storedCccdLast4 = empData.cccd ? empData.cccd.slice(-4) : '';

      if (!storedCccdLast4 || storedCccdLast4 !== resetCccdLast4) {
        toast.error('Thông tin xác thực (4 số cuối CCCD) không chính xác');
        return;
      }

      await updateDoc(doc(db, 'employees', empDoc.id), {
        pinCode: resetNewPin,
        isFirstLogin: false
      });

      toast.success('Đổi mã PIN thành công! Vui lòng đăng nhập lại.');
      setShowResetPinModal(false);
      setResetEmpId('');
      setResetCccdLast4('');
      setResetNewPin('');
      setResetConfirmPin('');
    } catch (error) {
      console.error('Error resetting PIN:', error);
      toast.error('Lỗi khi đổi mã PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowDeviceError(false);
    setPendingEmployee(null);
    
    // Find employee by phone number
    const emp = employees.find(e => e.phone === empIdInput);
    if (!emp) {
      setError('Số điện thoại không tồn tại.');
      return;
    }
    
    if (emp.pinCode !== pinInput) {
      setError('Mã PIN không đúng.');
      return;
    }

    const currentDeviceId = getBrowserDeviceId();

    // Device Check
    if (emp.deviceId && emp.deviceId !== currentDeviceId) {
      setPendingEmployee(emp);
      setShowDeviceError(true);
      setError('Đăng nhập không đúng thiết bị.');
      return;
    }

    // If no deviceId set, set it now
    if (!emp.deviceId) {
      try {
        await updateDoc(doc(db, 'employees', emp.id), {
          deviceId: currentDeviceId
        });
      } catch (err) {
        console.error('Error setting device ID:', err);
      }
    }

    if (emp.isFirstLogin) {
      setLoggedInEmployee(emp);
      setShowChangePinModal(true);
    } else {
      setLoggedInEmployee(emp);
      setEmpIdInput('');
      setPinInput('');
    }
  };

  const handleConfirmDeviceChange = async () => {
    const currentDeviceId = getBrowserDeviceId();
    setIsSubmitting(true);
    try {
      // 1. Update the employee's deviceId
      await updateDoc(doc(db, 'employees', pendingEmployee.id), {
        deviceId: currentDeviceId
      });
      
      // 2. Log the device change for admin tracking
      await addDoc(collection(db, 'DeviceLogs'), {
        empId: pendingEmployee.empId,
        fullName: pendingEmployee.fullName,
        oldDeviceId: pendingEmployee.deviceId,
        newDeviceId: currentDeviceId,
        timestamp: serverTimestamp(),
        reason: 'Device replaced or broken',
        locationId: kioskBranch || 'Unknown'
      });
      
      // 3. After updating, log them in
      setLoggedInEmployee(pendingEmployee);
      setEmpIdInput('');
      setPinInput('');
      setShowDeviceError(false);
      setPendingEmployee(null);
      setError(null);
      setSuccessMsg('Đã đổi thiết bị thành công. Chào mừng bạn trở lại!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi đổi thiết bị. Vui lòng thử lại hoặc liên hệ quản lý.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPin.length < 4 || newPin.length > 6) {
      setError('Mã PIN mới phải từ 4 đến 6 số.');
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setError('Mã PIN chỉ được chứa các chữ số.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setError('Mã PIN xác nhận không khớp.');
      return;
    }

    if (!loggedInEmployee) return;

    try {
      await updateDoc(doc(db, 'employees', loggedInEmployee.id), {
        pinCode: newPin,
        isFirstLogin: false
      });
      
      // Update Admin PIN if this employee is also an admin
      const q = query(collection(db, 'Admins'), where('email', '==', loggedInEmployee.fullName));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(doc(db, 'Admins', snapshot.docs[0].id), {
          pin: newPin
        });
      }

      setLoggedInEmployee({ ...loggedInEmployee, pinCode: newPin, isFirstLogin: false });
      setShowChangePinModal(false);
      setNewPin('');
      setConfirmNewPin('');
      setEmpIdInput('');
      setPinInput('');
      setSuccessMsg('Đổi mã PIN thành công.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi đổi mã PIN.');
    }
  };

  const checkInAction = () => {
    if (latestLog && !latestLog.checkOutTime) {
      setError('Bạn đang trong ca làm việc. Vui lòng Kết thúc ca trước khi Đổi mã PIN hay Đăng xuất.');
      return false;
    }
    return true;
  };

  const handleLogout = () => {
    if (!checkInAction()) return;
    setLoggedInEmployee(null);
    setLatestLog(null);
    setEmpIdInput('');
    setPinInput('');
  };

  useEffect(() => {
    if (selectedShiftTime && error?.includes('Vui lòng chọn Giờ')) {
      setError(null);
    }
  }, [selectedShiftTime, error]);

  const handleActionClick = (type: 'check-in' | 'check-out') => {
    if (!loggedInEmployee || !kioskBranch) {
      setError('Lỗi hệ thống: Thiếu thông tin nhân viên hoặc chi nhánh.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setPhotoData(null);
    setIsTimeManuallyEdited(false);
    
    // Pre-fill shift time if available
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = workSchedules
      .filter(s => s.date === todayStr && !s.isOff && s.locationId === kioskBranch)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (todayShifts.length > 0) {
      const now = new Date();
      const nowStr = format(now, 'HH:mm');
      let targetShift;
      
      if (type === 'check-in') {
        const nowTotal = now.getHours() * 60 + now.getMinutes();
        
        // Find the shift closest to current time (based on startTime)
        targetShift = todayShifts.reduce((prev, curr) => {
          const [prevH, prevM] = prev.startTime.split(':').map(Number);
          const [currH, currM] = curr.startTime.split(':').map(Number);
          const prevDiff = Math.abs(nowTotal - (prevH * 60 + prevM));
          const currDiff = Math.abs(nowTotal - (currH * 60 + currM));
          return currDiff < prevDiff ? curr : prev;
        });

        if (targetShift) {
          const time = targetShift.startTime || '';
          const [schH, schM] = time.split(':').map(Number);
          const schTotal = schH * 60 + schM;
          
          if (nowTotal > schTotal) {
            setSelectedShiftTime(nowStr);
          } else {
            setSelectedShiftTime(time);
          }
          setScheduledShiftTime(time);
          setSelectedShiftId(targetShift.id);
        } else {
          // No shifts today
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const stdShifts = [
            { time: '06:00', minutes: 360 },
            { time: '12:00', minutes: 720 },
            { time: '17:00', minutes: 1020 }
          ];
          let nearest = stdShifts[0];
          let minDiff = Math.abs(currentMinutes - stdShifts[0].minutes);
          for (let i = 1; i < stdShifts.length; i++) {
            const diff = Math.abs(currentMinutes - stdShifts[i].minutes);
            if (diff < minDiff) {
              minDiff = diff;
              nearest = stdShifts[i];
            }
          }
          if (currentMinutes > nearest.minutes) {
            setSelectedShiftTime(nowStr);
          } else {
            setSelectedShiftTime(nearest.time);
          }
          setScheduledShiftTime(nearest.time);
        }
      } else {
        const nowTotal = now.getHours() * 60 + now.getMinutes();
        // Cho check-out, tìm ca đã bắt đầu và chưa kết thúc quá lâu
        // Ưu tiên tìm ca khớp với giờ vào ca đã chọn
        targetShift = todayShifts.find(s => s.startTime === latestLog?.scheduledShiftTime) ||
          todayShifts.find(s => s.startTime === latestLog?.selectedShiftTime) ||
          todayShifts.reduce((prev, curr) => {
            const [prevH, prevM] = prev.endTime.split(':').map(Number);
            const [currH, currM] = curr.endTime.split(':').map(Number);
            const prevDiff = Math.abs(nowTotal - (prevH * 60 + prevM));
            const currDiff = Math.abs(nowTotal - (currH * 60 + currM));
            return currDiff < prevDiff ? curr : prev;
          });

        const time = format(now, 'HH:mm');
        setSelectedShiftTime(time);
        setScheduledShiftTime(targetShift?.endTime || '');
        setSelectedShiftId(targetShift?.id || '');
      }
    } else {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const nowStr = format(now, 'HH:mm');
      
      // Standard shift times in minutes
      const stdShifts = [
        { time: '06:00', minutes: 360 },
        { time: '12:00', minutes: 720 },
        { time: '17:00', minutes: 1020 }
      ];
      
      // Find the nearest shift time
      let nearest = stdShifts[0];
      let minDiff = Math.abs(currentMinutes - stdShifts[0].minutes);
      
      for (let i = 1; i < stdShifts.length; i++) {
        const diff = Math.abs(currentMinutes - stdShifts[i].minutes);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = stdShifts[i];
        }
      }
      
      const defaultTime = nearest.time;
      if (type === 'check-in') {
        if (currentMinutes > nearest.minutes) {
          setSelectedShiftTime(nowStr);
        } else {
          setSelectedShiftTime(defaultTime);
        }
        setScheduledShiftTime(defaultTime);
        setSelectedShiftId('');
      } else {
        setSelectedShiftTime(nowStr);
        setScheduledShiftTime('');
        setSelectedShiftId('');
      }
    }
    
    setNote('');
    setActionType(type);
    setCheckinWarningStep(0);
    setCheckoutWarningStep(0);
    
    const isImmuneRole = loggedInEmployee.empId.toUpperCase() === 'ADMIN' || 
                         admins.some(a => a.email === loggedInEmployee.fullName);

    if (isImmuneRole) {
      setLocation({ lat: 0, lng: 0 });
      setDistance(0);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          
          const branch = BRANCHES.find((b) => b.id === kioskBranch);
          if (branch) {
            const dist = calculateDistance(latitude, longitude, branch.lat, branch.lng);
            setDistance(dist);
            if (dist > MAX_DISTANCE_METERS) {
              setError(`Bạn đang ở quá xa quán (${Math.round(dist)}m). Vui lòng di chuyển lại gần hơn (dưới ${MAX_DISTANCE_METERS}m).`);
              setActionType(null);
            }
          }
        },
        (err) => {
          setError('Không thể lấy vị trí. Vui lòng bật GPS và cấp quyền truy cập vị trí.');
          setActionType(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError('Trình duyệt của bạn không hỗ trợ GPS.');
      setActionType(null);
    }
  };

  useEffect(() => {
    if (actionType) {
      setIsSubmitting(false);
    }
  }, [actionType]);

  const handlePhotoCapture = async (dataUrl: string) => {
    setPhotoData(dataUrl);
    submitLog(dataUrl);
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
    ]);
  };

  const submitLog = async (photo: string) => {
    if (!loggedInEmployee || !kioskBranch || !actionType || !location || distance === null) return;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (!selectedShiftTime) {
      setError(`Vui lòng chọn Giờ ${actionType === 'check-in' ? 'vào' : 'ra'} ca trước khi chụp ảnh xác nhận.`);
      setPhotoData(null);
      return;
    } else {
      const [shiftHour, shiftMinute] = selectedShiftTime.split(':').map(Number);
      const shiftMinutes = shiftHour * 60 + shiftMinute;

      if (actionType === 'check-out' && shiftMinutes > currentMinutes) {
        setError(`Không thể chọn giờ ra ca (${selectedShiftTime}) sau thời gian hiện tại (${format(now, 'HH:mm')}).`);
        setPhotoData(null);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const timeStr = now.toISOString();
      const photoUrl = photo;

      // Tính toán giờ dự kiến
      const [shiftHour, shiftMinute] = selectedShiftTime.split(':').map(Number);
      const shiftMinutes = shiftHour * 60 + shiftMinute;

      const isImmuneRole = loggedInEmployee.empId.toUpperCase() === 'ADMIN' || 
                           admins.some(a => a.email === loggedInEmployee.fullName);

      if (actionType === 'check-in') {
        const scheduledShift = todayShifts.find(s => s.startTime === scheduledShiftTime) || (todayShifts.length > 0 ? todayShifts[0] : null);
        const isExtraShift = !scheduledShift;
        
        const [selH, selM] = selectedShiftTime.split(':').map(Number);
        const selTotal = selH * 60 + selM;
        const isEarlyCheckInApprovalPending = selTotal < currentMinutes;
        
        const status = (isExtraShift || isEarlyCheckInApprovalPending) ? 'pending_approval' : 'approved';
        
        let lateMinutes = 0;
        let latePenaltyMinutes = 0;
        let paidStartTime = timeStr;

        if (!isImmuneRole && scheduledShift) {
          const [schedH, schedM] = scheduledShift.startTime.split(':').map(Number);
          const schedMinutes = schedH * 60 + schedM;
          
          // Đi trễ (quá 5 phút ân hạn)
          if (currentMinutes > schedMinutes + 5) {
            lateMinutes = currentMinutes - schedMinutes;
            latePenaltyMinutes = lateMinutes * 3; // Phạt x3
          } 
          // Đi sớm
          else if (currentMinutes < schedMinutes) {
            paidStartTime = new Date(now.setHours(schedH, schedM, 0, 0)).toISOString();
          }
        }

        const isTimeModified = selectedShiftTime !== scheduledShiftTime && scheduledShiftTime !== '';
        const isEarlyCheckIn = selectedShiftTime < scheduledShiftTime && scheduledShiftTime !== '';
        const needsApproval = (isTimeModified && !isEarlyCheckIn) || isExtraShift || isEarlyCheckInApprovalPending;
        
        let finalNote = note;
        if (isTimeModified) {
          finalNote = `[CHỈNH GIỜ: ${scheduledShiftTime} -> ${selectedShiftTime}] ${note}`.trim();
        }
        if (isEarlyCheckInApprovalPending) {
          finalNote = `[CHỌN GIỜ TRƯỚC THỰC TẾ: ${selectedShiftTime}] ${finalNote}`.trim();
        }
        
        const timesheetRef = await withTimeout(addDoc(collection(db, 'timesheets'), {
          date: today,
          empId: loggedInEmployee.empId,
          locationId: kioskBranch,
          checkInTime: timeStr,
          paidStartTime,
          checkOutTime: null,
          selectedShiftTime,
          scheduledShiftTime,
          isTimeModified,
          note: finalNote,
          SaiSoGPS: distance,
          AnhVaoCa: photoUrl,
          lateMinutes,
          latePenaltyMinutes,
          isLateExcused: false,
          isExtraShift,
          status
        }), 10000);

        if (needsApproval) {
          await addDoc(collection(db, 'ApprovalRequests'), {
            empId: loggedInEmployee.empId,
            fullName: loggedInEmployee.fullName,
            locationId: kioskBranch,
            type: lateMinutes > 0 ? 'checkin_late' : 'checkin_early',
            status: 'pending',
            timestamp: serverTimestamp(),
            details: {
              timesheetId: timesheetRef.id,
              scheduledStartTime: scheduledShiftTime,
              actualStartTime: selectedShiftTime,
              lateMinutes
            },
            note: finalNote
          });
        }
      } else {
        // Check-out logic
        if (latestLog && !latestLog.checkOutTime) {
          const [selectedH, selectedM] = selectedShiftTime.split(':').map(Number);
          const selectedMinutes = selectedH * 60 + selectedM;
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();

          if (selectedMinutes > currentMinutes) {
            setError('Lỗi: Bạn không thể chọn giờ ra ca lớn hơn thời gian hiện tại!');
            return;
          }

          const docRef = doc(db, 'timesheets', latestLog.id);
          const checkInTime = new Date(latestLog.checkInTime);
          
          // Tính giờ làm thực tế: không quá giờ dự kiến (trừ khi là Admin)
          const shiftEndMinutes = shiftMinutes; // Giả sử selectedShiftTime là giờ ra ca
          const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
          
          let actualDurationMinutes = currentMinutes - checkInMinutes;
          
          if (!isImmuneRole) {
            actualDurationMinutes = Math.min(
              actualDurationMinutes,
              shiftEndMinutes - checkInMinutes
            );
          }
          
          const totalHours = Math.max(0, actualDurationMinutes / 60);
          const totalPay = totalHours * (loggedInEmployee.hourlyRate || 0);

          const currentShift = workSchedules.find(s => s.date === today && s.startTime === latestLog.selectedShiftTime);
          const incompleteTasks = currentShift?.tasks?.filter(t => !t.isCompleted).map(t => t.content) || [];

          // Get app exit count for this shift
          const exitCount = latestLog.exitCount || 0;
          const lateMinutes = latestLog.lateMinutes || 0;
          const latePenaltyMinutes = latestLog.latePenaltyMinutes || 0;

          const isTimeModified = selectedShiftTime !== scheduledShiftTime && scheduledShiftTime !== '';
          
          let checkoutRequiresApproval = isTimeModified;
          let finalNote = note;

          if (lateCheckoutOption === 'forgot') {
            checkoutRequiresApproval = false;
            finalNote = `[TÔI QUÊN BẤM (TÍNH THEO LỊCH: ${scheduledShiftTime})] ${note}`.trim();
          } else if (lateCheckoutOption === 'overtime') {
            checkoutRequiresApproval = true;
            finalNote = `[TÔI LÀM TĂNG CA (TÍNH THÊM GIỜ: ${selectedShiftTime})] ${note}`.trim();
          } else if (isTimeModified) {
            finalNote = `[CHỈNH GIỜ RA: ${scheduledShiftTime} -> ${selectedShiftTime}] ${note}`.trim();
          }

          await withTimeout(updateDoc(docRef, {
            checkOutTime: timeStr,
            selectedShiftEndTime: selectedShiftTime,
            scheduledShiftEndTime: scheduledShiftTime,
            isEndTimeModified: isTimeModified,
            checkoutRequiresApproval: checkoutRequiresApproval,
            note: finalNote,
            AnhRaCa: photoUrl,
            totalHours,
            totalPay,
            incompleteTasks
          }));

          if (checkoutRequiresApproval) {
            await addDoc(collection(db, 'ApprovalRequests'), {
              empId: loggedInEmployee.empId,
              fullName: loggedInEmployee.fullName,
              locationId: kioskBranch,
              type: 'checkout_different',
              status: 'pending',
              timestamp: serverTimestamp(),
              details: {
                timesheetId: latestLog.id,
                scheduledEndTime: scheduledShiftTime,
                actualEndTime: selectedShiftTime
              },
              note: finalNote
            });

            await addDoc(collection(db, 'notifications'), {
              type: 'checkout_approval',
              title: 'Yêu cầu duyệt giờ ra ca',
              message: `Nhân viên ${loggedInEmployee.fullName} yêu cầu đổi giờ ra ca từ ${scheduledShiftTime} thành ${selectedShiftTime}`,
              timestamp: serverTimestamp(),
              isRead: false,
              locationId: kioskBranch,
              empId: loggedInEmployee.empId,
              timesheetId: latestLog.id
            });
          }

          setCheckoutSummary({
            totalHours,
            lateMinutes,
            latePenaltyMinutes,
            exitCount,
            incompleteTasks,
            checkInTime: latestLog.checkInTime,
            checkOutTime: timeStr
          });
        } else {
          throw new Error('Không tìm thấy ca làm việc để kết thúc.');
        }
      }
      
      if (actionType === 'check-in') {
        setError(null);
        setSuccessMsg(`Bắt đầu ca thành công lúc ${format(new Date(), 'HH:mm:ss')}`);
        setTimeout(() => {
          setActionType(null);
          setPhotoData(null);
          setLocation(null);
          setDistance(null);
          setSuccessMsg(null);
          setLateCheckoutOption(null);
        }, 3000);
      } else {
        // For check-out, the summary modal will handle the closing
        setError(null);
        setIsSubmitting(false);
        setActionType(null);
        setPhotoData(null);
        setLocation(null);
        setDistance(null);
        setLateCheckoutOption(null);
      }
      
    } catch (err) {
      console.error('Error submitting log:', err);
      setError('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
      setActionType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (shiftId: string, taskId: string, isCompleted: boolean) => {
    try {
      const shift = workSchedules.find(s => s.id === shiftId);
      if (!shift || !shift.tasks) return;

      const updatedTasks = shift.tasks.map(t => 
        t.id === taskId ? { ...t, isCompleted } : t
      );

      await updateDoc(doc(db, 'LichLamViec', shiftId), {
        tasks: updatedTasks
      });
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Không thể cập nhật nhiệm vụ.');
    }
  };

    if (!kioskBranch) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Fresh decorative background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-100/50 rounded-full blur-[120px]" />

        <div className="bg-slate-100 p-12 rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.05)] max-w-md w-full text-center border-t-2 border-l-2 border-white border-b-4 border-r-4 border-slate-300/50 relative z-10 overflow-hidden">
          {/* 3D Inner Bevel Effect */}
          <div className="absolute inset-0 border-[12px] border-white/60 pointer-events-none rounded-[4rem] shadow-[inset_0_4px_8px_rgba(0,0,0,0.05),inset_0_-4px_8px_rgba(255,255,255,0.8)]" />
          
          {/* Subtle 3D Glass Reflection */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[4rem]" />
          
          <div className="w-24 h-24 bg-gradient-to-br from-amber-700 to-amber-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-amber-900/30 relative group">
            <div className="absolute inset-0 border-4 border-white/20 rounded-[2.5rem] group-hover:scale-110 transition-transform duration-500" />
            <Coffee className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter uppercase">Chọn nơi chấm công</h2>
          <p className="text-slate-500 text-[10px] mb-12 font-bold uppercase tracking-[0.15em] leading-none whitespace-nowrap">
            VUI LÒNG XÁC ĐỊNH VỊ TRÍ <span className="text-amber-700">CA LÀM VIỆC</span>
          </p>
          
          <div className="space-y-4 relative z-20">
            {BRANCHES.map((br, index) => (
              <button
                key={br.id}
                onClick={() => handleSetKioskBranch(br.id)}
                className={`w-full py-6 px-8 text-white font-black rounded-2xl transition-all active:scale-[0.98] flex items-center justify-between group shadow-xl relative overflow-hidden ${
                  index === 0 
                    ? 'bg-gradient-to-r from-amber-600 to-amber-800' 
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-800'
                }`}
              >
                {/* Button Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className="bg-white/20 p-2.5 rounded-xl group-hover:rotate-12 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-xl tracking-tight uppercase">{br.name}</span>
                </div>
                <ChevronRight className="w-7 h-7 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all relative z-10" />
              </button>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t-2 border-slate-200/60">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-1 w-8 bg-amber-500/20 rounded-full" />
              <div className="h-1 w-1 bg-amber-500/40 rounded-full" />
              <div className="h-1 w-8 bg-emerald-500/20 rounded-full" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black flex items-center justify-center gap-1">
              Cafe HR Manager System <span className="text-blue-600 font-black">®</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getBranchTheme = (branchId: string | null) => {
    if (branchId === 'Góc Phố') {
      return {
        bg: 'bg-[#FFF7ED]', // Very light amber
        accent: 'bg-amber-600',
        text: 'text-amber-900',
        border: 'border-amber-100',
        gradient: 'from-amber-600 to-amber-800',
        button: 'bg-amber-600 hover:bg-amber-700',
        card: 'bg-white border-amber-100'
      };
    }
    if (branchId === 'Phố Xanh') {
      return {
        bg: 'bg-[#F0FDF4]', // Very light emerald
        accent: 'bg-emerald-600',
        text: 'text-emerald-900',
        border: 'border-emerald-100',
        gradient: 'from-emerald-600 to-emerald-800',
        button: 'bg-emerald-600 hover:bg-emerald-700',
        card: 'bg-white border-emerald-100'
      };
    }
    return {
      bg: 'bg-slate-50',
      accent: 'bg-slate-900',
      text: 'text-slate-900',
      border: 'border-slate-200',
      gradient: 'from-slate-700 to-slate-900',
      button: 'bg-slate-900 hover:bg-slate-800',
      card: 'bg-white border-slate-100'
    };
  };

  const theme = getBranchTheme(kioskBranch);

  const renderWeeklySchedule = () => {
    const theme = getBranchTheme(teamScheduleBranch);
    const dayLabels = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    const startOfWeek = format(weekDays[0], 'dd/MM/yyyy');
    const endOfWeek = format(weekDays[6], 'dd/MM/yyyy');

    const roleLabels: Record<string, string> = {
      "QUẦY": "PHA CHẾ (QUẦY)",
      "PV": "PHỤC VỤ"
    };

    const branchEmployees = employees.filter(e => e.locationId === teamScheduleBranch);
    const supportEmployees = employees.filter(e => 
      e.locationId !== teamScheduleBranch && 
      allSchedules.some(s => s.empId === e.id && s.locationId === teamScheduleBranch)
    );
    const allRelevantEmployees = [...branchEmployees, ...supportEmployees];

    const groupedEmployees = {
      QUẦY: allRelevantEmployees.filter(e => e.defaultRole === 'QUẦY'),
      PV: allRelevantEmployees.filter(e => e.defaultRole === 'PV' || !e.defaultRole)
    };

    const isAdminUser = loggedInEmployee && admins.some(a => a.phone === loggedInEmployee.phone || a.email === loggedInEmployee.phone);

    const getShiftStyle = (startTime: string, isOff: boolean) => {
      if (isOff) return 'bg-red-100 border-red-300 text-red-800';
      if (startTime < '12:00') return 'bg-amber-200 border-amber-400 text-amber-900';
      if (startTime < '17:00') return 'bg-sky-200 border-sky-400 text-sky-900';
      return 'bg-indigo-300 border-indigo-500 text-indigo-950';
    };

    const renderDailySummary = (dateStr: string) => {
      const dayShifts = allSchedules.filter(s => s.date === dateStr && s.locationId === teamScheduleBranch && !s.isOff);
      const roles = ["QUẦY", "PV"];
      
      return (
        <div className="p-2 space-y-1">
          {roles.map(role => {
            const count = dayShifts.filter(s => {
              const emp = employees.find(e => e.id === s.empId);
              const actualRole = s.roleInShift || emp?.defaultRole || 'PV';
              return actualRole === role;
            }).length;
            if (count === 0) return null;
            return (
              <div key={role} className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center justify-between ${role === 'QUẦY' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                <span>{role === 'QUẦY' ? '☕' : '🏃'}</span>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className={`fixed inset-0 z-[100] ${theme.bg} flex flex-col animate-in fade-in slide-in-from-right duration-300 overflow-hidden`}>
        {/* HEADER */}
        <div className={`${teamScheduleBranch === 'Góc Phố' ? 'bg-orange-500' : 'bg-emerald-600'} border-b border-white/10 px-6 py-4 flex flex-col gap-2 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowWeeklySchedule(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6 rotate-180 text-white" />
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  BẢNG XẾP LỊCH TUẦN
                </h1>
                <select 
                  value={teamScheduleBranch}
                  onChange={(e) => setTeamScheduleBranch(e.target.value)}
                  className="bg-white/20 text-white text-sm font-bold px-2 py-1 rounded-lg border border-white/30 focus:outline-none"
                >
                  <option value="Góc Phố" className="text-slate-800">Góc Phố</option>
                  <option value="Phố Xanh" className="text-slate-800">Phố Xanh</option>
                </select>
              </div>
              {isAdminUser && (
                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] rounded-full border border-white/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  QUẢN LÝ
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl border border-white/30 shadow-inner">
                <Calendar className="w-4 h-4 text-white" />
                <span className="text-sm font-black text-white">
                  {startOfWeek} - {endOfWeek}
                </span>
              </div>
              
              

              <div className="flex items-center bg-white/20 p-1 rounded-xl border border-white/30 ml-2">
                <button 
                  onClick={() => setScheduleViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${scheduleViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setScheduleViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${scheduleViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-[11px] text-white/70 italic font-medium px-6 pb-4">
          * Giờ ra ca được sắp tương đối. Quản lý sẽ điều phối giờ ra ca thực tế dựa trên tình hình nhân sự tại quán.
        </p>

        {scheduleViewMode === 'list' ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* STICKY CALENDAR STRIP */}
            <div className="p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
              <div className="flex justify-between items-center overflow-x-auto no-scrollbar gap-2 py-2">
                {weekDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isSelected = dateStr === selectedCalendarDate;
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedCalendarDate(dateStr)}
                      className={`flex flex-col items-center min-w-[60px] p-3 rounded-2xl transition-all relative ${
                        isSelected 
                          ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                          : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider mb-1">
                        {dayLabels[idx]}
                      </span>
                      <span className={`text-lg font-black ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
                        {format(day, 'dd')}
                      </span>
                      {isSelected && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                      {isToday && !isSelected && <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIST CONTENT */}
            <div className="p-4 space-y-6">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    {format(new Date(selectedCalendarDate), 'EEEE, \'Ngày\' dd/MM', { locale: vi })}
                  </h2>
                </div>
                <div className="flex gap-1">
                  {["QUẦY", "PV"].map(role => {
                    const count = allSchedules.filter(s => {
                      const emp = employees.find(e => e.id === s.empId);
                      const actualRole = s.roleInShift || emp?.defaultRole || 'PV';
                      return actualRole === role && s.date === selectedCalendarDate && s.locationId === teamScheduleBranch && !s.isOff;
                    }).length;
                    return (
                      <div key={role} className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${role === 'QUẦY' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                        {role === 'QUẦY' ? <Coffee className="w-2 h-2" /> : <Users className="w-2 h-2" />}
                        {role}: {count}
                      </div>
                    );
                  })}
                </div>
              </div>

              {["QUẦY", "PV"].map(role => {
                const shifts = allSchedules
                  .filter(s => {
                    const emp = employees.find(e => e.id === s.empId);
                    const actualRole = s.roleInShift || emp?.defaultRole || 'PV';
                    return actualRole === role && s.date === selectedCalendarDate && s.locationId === teamScheduleBranch && !s.isOff;
                  })
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                
                if (shifts.length === 0) return null;

                return (
                  <div key={role} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className={`p-1 rounded-lg ${role === 'QUẦY' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {role === 'QUẦY' ? <Coffee className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      </div>
                      <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">
                        {roleLabels[role]} ({shifts.length})
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(shifts.reduce((acc, shift) => {
                        if (!acc[shift.empId]) acc[shift.empId] = [];
                        acc[shift.empId].push(shift);
                        return acc;
                      }, {} as Record<string, typeof shifts>)).map(([empId, empShifts]) => {
                        const typedEmpShifts = empShifts as typeof shifts;
                        const emp = employees.find(e => e.id === empId);
                        const isMe = loggedInEmployee && emp && loggedInEmployee.empId === emp.empId;
                        
                        const morningShift = typedEmpShifts.find(s => parseInt(s.startTime.split(':')[0]) < 12);
                        const afternoonShift = typedEmpShifts.find(s => parseInt(s.startTime.split(':')[0]) >= 12 && parseInt(s.startTime.split(':')[0]) < 17);
                        const eveningShift = typedEmpShifts.find(s => parseInt(s.startTime.split(':')[0]) >= 17);

                        return (
                          <div key={empId} className={`bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2 ${isMe ? 'ring-1 ring-blue-500 bg-blue-50/30' : ''}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm ${isMe ? 'bg-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                              {emp?.fullName.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              {[morningShift, afternoonShift, eveningShift].map((shift, idx) => (
                                <div key={idx} className="text-center">
                                  {shift ? (
                                    <div className={`p-1.5 rounded-lg border text-[10px] font-black ${getShiftStyle(shift.startTime, false)}`}>
                                      {shift.startTime} - {shift.endTime}
                                    </div>
                                  ) : (
                                    <div className="p-1.5 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-300">-</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* GRID VIEW - REWRITTEN TO MATCH IMAGE */
          <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
            <div className="min-w-[1100px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="h-[70px] bg-slate-50/80">
                    <th className="w-[200px] p-4 border-b-2 border-r border-slate-200 text-left text-xs font-black text-slate-500 uppercase tracking-widest sticky left-0 z-20 bg-slate-50">
                      NHÂN VIÊN
                    </th>
                    {weekDays.map((day, idx) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      return (
                        <th key={idx} className={`p-2 border-b-2 border-r border-slate-200 text-center sticky top-0 z-10 ${isToday ? 'bg-blue-50/50' : 'bg-slate-50'}`}>
                          <div className={`text-[11px] font-black uppercase tracking-widest ${isWeekend ? 'text-red-500' : 'text-slate-600'}`}>
                            {dayLabels[idx]}
                          </div>
                          <div className={`text-xs font-bold ${isWeekend ? 'text-red-400' : 'text-slate-400'}`}>
                            {format(day, 'dd/MM')}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {["QUẦY", "PV"].map(role => {
                    const empsInRole = groupedEmployees[role as keyof typeof groupedEmployees];
                    if (empsInRole.length === 0) return null;

                    return (
                      <React.Fragment key={role}>
                        <tr>
                          <td colSpan={8} className={`p-3 bg-blue-50/50 text-blue-800 font-black text-[11px] uppercase tracking-[0.2em] border-b-2 border-slate-300 sticky left-0 z-10`}>
                            {roleLabels[role]}
                          </td>
                        </tr>
                        {empsInRole.map(emp => {
                          const empShifts = allSchedules.filter(s => s.empId === emp.id && s.locationId === teamScheduleBranch && !s.isOff);
                          const hasMorning = empShifts.some(s => parseInt(s.startTime.split(':')[0]) < 12);
                          const hasAfternoon = empShifts.some(s => parseInt(s.startTime.split(':')[0]) >= 12 && parseInt(s.startTime.split(':')[0]) < 17);
                          const hasEvening = empShifts.some(s => parseInt(s.startTime.split(':')[0]) >= 17);

                          const periods = [
                            { type: 'Sáng', has: hasMorning, check: (s: any) => parseInt(s.startTime.split(':')[0]) < 12 },
                            { type: 'Trưa', has: hasAfternoon, check: (s: any) => parseInt(s.startTime.split(':')[0]) >= 12 && parseInt(s.startTime.split(':')[0]) < 17 },
                            { type: 'Tối', has: hasEvening, check: (s: any) => parseInt(s.startTime.split(':')[0]) >= 17 },
                          ];

                          const isThanhLiem = emp.fullName === 'Nguyễn Thanh Liêm';

                          return periods.filter(p => p.has).map((p, pIdx) => (
                            <tr key={`${emp.id}-${p.type}`} className="border-b border-slate-200 hover:bg-slate-50/30 transition-colors">
                              {pIdx === 0 && (
                                <td rowSpan={periods.filter(p => p.has).length} className="p-4 border-r border-slate-200 font-bold text-sm text-slate-700 sticky left-0 bg-white z-10">
                                  <div className="flex flex-col">
                                    <span className="truncate">{emp.fullName}</span>
                                    {emp.locationId !== teamScheduleBranch && (
                                      <span className="text-[9px] text-red-500 font-black italic truncate">Hỗ trợ từ {emp.locationId}</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              {weekDays.map((day, dIdx) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const shift = allSchedules
                                  .filter(s => s.empId === emp.id && s.date === dateStr && s.locationId === teamScheduleBranch)
                                  .find(p.check);
                                const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                return (
                                  <td key={dIdx} className={`p-2 border-r border-slate-200 align-middle ${isToday ? 'bg-blue-50/10' : ''}`}>
                                    <div className="h-[30px] flex items-center justify-center">
                                      {shift ? (
                                        <div 
                                          className={`p-1.5 border text-center transition-all shadow-sm w-full text-[10px] font-black ${getShiftStyle(shift.startTime, shift.isOff)} ${isThanhLiem ? '' : 'rounded-lg'} ${loggedInEmployee && loggedInEmployee.empId === emp.empId ? 'ring-2 ring-blue-500 ring-offset-1' : ''} relative group/shift`}
                                        >
                                          {shift.isOff ? 'OFF' : `${shift.startTime} - ${shift.endTime}`}
                                          {isAdminUser && (
                                            <div className="absolute -top-1 -right-1 hidden group-hover/shift:flex">
                                              <div className="bg-amber-500 text-white p-1 rounded-full shadow-lg">
                                                <Edit2 className="w-2 h-2" />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-full h-full border border-dashed border-slate-100 rounded-lg" />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ));
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50/80">
                  <tr className="h-[80px]">
                    <td className="p-4 border-t-2 border-r border-slate-200 font-black text-[10px] text-slate-500 uppercase tracking-widest sticky left-0 z-10 text-right bg-slate-50">
                      TỔNG KẾT NGÀY:
                    </td>
                    {weekDays.map((day, idx) => (
                      <td key={idx} className="p-0 border-t-2 border-r border-slate-200">
                        {renderDailySummary(format(day, 'yyyy-MM-dd'))}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !loggedInEmployee) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, 'employees', loggedInEmployee.id), {
          avatar: base64String
        });
        setLoggedInEmployee({ ...loggedInEmployee, avatar: base64String });
        setShowAvatarOptions(false);
      } catch (error) {
        console.error("Error updating avatar:", error);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderRequestModal = () => {
    if (!showRequestModal || !loggedInEmployee) return null;

    const getRequestTypeConfig = (typeId: string) => {
      switch (typeId) {
        case 'off_sudden': return { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-500', ring: 'focus:ring-red-500', activeBg: 'bg-red-50/50' };
        case 'shift_swap': return { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-500', ring: 'focus:ring-blue-500', activeBg: 'bg-blue-50/50' };
        case 'late_early': return { color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-500', ring: 'focus:ring-orange-500', activeBg: 'bg-orange-50/50' };
        case 'forgot_check': return { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-500', ring: 'focus:ring-emerald-500', activeBg: 'bg-emerald-50/50' };
        case 'feedback': return { color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-500', ring: 'focus:ring-purple-500', activeBg: 'bg-purple-50/50' };
        default: return { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-500', ring: 'focus:ring-slate-500', activeBg: 'bg-slate-50/50' };
      }
    };

    const handleSubmitRequest = async () => {
      if (!loggedInEmployee) {
        toast.error('Lỗi: Không tìm thấy thông tin nhân viên');
        return;
      }

      if (!requestType) {
        toast.error('Vui lòng chọn loại yêu cầu');
        return;
      }

      if (requestType === 'shift_swap') {
        if (!swapWithEmpId) { toast.error('Vui lòng chọn nhân viên muốn đổi'); return; }
        if (!requestTime.trim()) { toast.error('Vui lòng nhập ca muốn đổi'); return; }
      }

      if (requestType === 'off_sudden') {
        if (!requestTime.trim()) { toast.error('Vui lòng nhập ca muốn nghỉ'); return; }
      }

      if (requestType === 'forgot_check') {
        if (!requestTime && !requestSubTime) {
          toast.error('Vui lòng nhập giờ vào hoặc giờ ra');
          return;
        }
      }

      if (requestType !== 'forgot_check' && requestType !== 'feedback' && !requestNote.trim()) {
        toast.error('Vui lòng nhập ghi chú');
        return;
      }

      try {
        await addDoc(collection(db, 'ApprovalRequests'), {
          empId: loggedInEmployee.empId,
          fullName: loggedInEmployee.fullName,
          locationId: kioskBranch,
          type: requestType,
          status: 'pending',
          timestamp: serverTimestamp(),
          details: {
            requestDate,
            requestTime,
            requestSubTime,
            swapWithEmpId: requestType === 'shift_swap' ? swapWithEmpId : null
          },
          note: requestNote
        });

        toast.success('Gửi yêu cầu thành công! Chờ quản lý duyệt.');
        setShowRequestModal(false);
        setRequestType(null);
        setRequestNote('');
        setSwapWithEmpId('');
        setRequestTime('');
        setRequestSubTime('');
      } catch (error) {
        console.error("Error submitting request:", error);
        toast.error('Lỗi khi gửi yêu cầu');
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
          <div className={`relative p-8 pb-10 ${theme.bg} border-b ${theme.border}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <h3 className={`font-black text-2xl uppercase tracking-tighter ${theme.text} drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]`}>
                  XIN PHÉP & HỖ TRỢ
                </h3>
                <div className={`h-1.5 w-12 ${theme.accent} rounded-full shadow-sm`} />
              </div>
              <button 
                onClick={() => {
                  if (requestType) {
                    setRequestType(null);
                  } else {
                    setShowRequestModal(false);
                  }
                }} 
                className="p-3 bg-white/80 hover:bg-white rounded-full transition-all shadow-sm hover:shadow-md active:scale-90"
              >
                <X className={`w-6 h-6 ${theme.text}`} />
              </button>
            </div>
          </div>

          <div className="p-8 pt-6 space-y-6">
            {!requestType ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'off_sudden', label: 'XIN NGHỈ PHÉP', icon: CalendarX, color: 'text-red-500', bg: 'bg-red-50', activeBorder: 'border-red-500' },
                  { id: 'shift_swap', label: 'ĐỔI CA', icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', activeBorder: 'border-blue-500' },
                  { id: 'late_early', label: 'ĐI TRỄ / VỀ SỚM', icon: User, color: 'text-orange-500', bg: 'bg-orange-50', activeBorder: 'border-orange-500' },
                  { id: 'forgot_check', label: 'QUÊN CHẤM CÔNG', icon: Fingerprint, color: 'text-emerald-500', bg: 'bg-emerald-50', activeBorder: 'border-emerald-500' },
                  { id: 'feedback', label: 'GÓP Ý KHÁC', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50', activeBorder: 'border-purple-500' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setRequestType(type.id as any)}
                    className={`p-5 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 relative ${theme.bg} ${theme.border} hover:border-stone-300 hover:scale-[1.05] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] active:scale-95 group`}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${type.bg} flex items-center justify-center ${type.color} shadow-inner group-hover:rotate-6 transition-transform`}>
                      <type.icon className="w-7 h-7" />
                    </div>
                    <span className="text-[11px] font-black text-slate-700 text-center uppercase leading-tight tracking-wide">
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${getRequestTypeConfig(requestType).bg.replace('bg-', 'bg-').replace('50', '500')}`} />
                  <div className={`w-16 h-16 rounded-2xl ${getRequestTypeConfig(requestType).bg} flex items-center justify-center ${getRequestTypeConfig(requestType).color} shadow-inner transform group-hover:scale-110 transition-transform duration-500`}>
                    {(() => {
                      const Icon = [CalendarX, RefreshCw, User, Fingerprint, MessageSquare][['off_sudden', 'shift_swap', 'late_early', 'forgot_check', 'feedback'].indexOf(requestType)];
                      return <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <span className={`font-black ${getRequestTypeConfig(requestType).color} text-xl uppercase tracking-tight`}>
                    {['XIN NGHỈ PHÉP', 'ĐỔI CA', 'ĐI TRỄ / VỀ SỚM', 'QUÊN CHẤM CÔNG', 'GÓP Ý KHÁC'][['off_sudden', 'shift_swap', 'late_early', 'forgot_check', 'feedback'].indexOf(requestType)]}
                  </span>
                </div>

                <div key={requestType} className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  {requestType === 'shift_swap' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Đổi với nhân viên</label>
                        <select
                          value={swapWithEmpId}
                          onChange={(e) => setSwapWithEmpId(e.target.value)}
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        >
                          <option value="">-- Chọn nhân viên --</option>
                          {employees.filter(e => e.empId !== loggedInEmployee.empId).map(emp => (
                            <option key={emp.id} value={emp.empId}>{emp.fullName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Đổi ngày</label>
                        <input
                          type="date"
                          value={requestDate}
                          onChange={(e) => setRequestDate(e.target.value)}
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Đổi ca</label>
                        {allSchedules.filter(s => s.empId === loggedInEmployee.empId && s.date === requestDate).length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {allSchedules
                              .filter(s => s.empId === loggedInEmployee.empId && s.date === requestDate)
                              .map((s, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setRequestTime(`${s.startTime} - ${s.endTime}`)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    requestTime === `${s.startTime} - ${s.endTime}`
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  }`}
                                >
                                  {s.startTime} - {s.endTime}
                                </button>
                              ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={requestTime}
                          onChange={(e) => setRequestTime(e.target.value)}
                          placeholder="Ví dụ: 08:00 - 12:00"
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        />
                      </div>
                    </>
                  )}

                  {requestType === 'late_early' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Giờ dự kiến</label>
                      <input
                        type="time"
                        value={requestTime}
                        onChange={(e) => setRequestTime(e.target.value)}
                        className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      />
                    </div>
                  )}

                  {requestType === 'forgot_check' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Giờ vào</label>
                        <input
                          type="time"
                          value={requestTime}
                          onChange={(e) => setRequestTime(e.target.value)}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all cursor-pointer`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Giờ ra</label>
                        <input
                          type="time"
                          value={requestSubTime}
                          onChange={(e) => setRequestSubTime(e.target.value)}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all cursor-pointer`}
                        />
                      </div>
                    </div>
                  )}

                  {requestType === 'off_sudden' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ngày off</label>
                        <input
                          type="date"
                          value={requestDate}
                          onChange={(e) => setRequestDate(e.target.value)}
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ca off</label>
                        <input
                          type="text"
                          value={requestTime}
                          onChange={(e) => setRequestTime(e.target.value)}
                          placeholder="Ví dụ: Ca sáng, Cả ngày..."
                          className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                        />
                      </div>
                    </>
                  )}

                  {requestType !== 'shift_swap' && requestType !== 'off_sudden' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ngày</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className={`w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 ${getRequestTypeConfig(requestType).ring} transition-all`}
                      />
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder={
                      requestType === 'shift_swap' 
                        ? "Ghi chú đổi ca..." 
                        : requestType === 'off_sudden'
                        ? "Ghi chú nghỉ..."
                        : "Ghi chú..."
                    }
                    className={`w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm focus:outline-none focus:ring-2 ${requestType ? getRequestTypeConfig(requestType).ring : 'focus:ring-orange-500'} transition-all min-h-[100px] resize-none font-medium`}
                  />
                  {requestType === 'feedback' && (
                    <p className="text-[10px] text-slate-400 italic mt-2 px-2">
                      *Mọi góp ý của bạn luôn được ghi nhận để giúp quán tốt hơn mỗi ngày
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSubmitRequest}
                  className={`w-full py-5 ${requestType ? getRequestTypeConfig(requestType).bg.replace('bg-', 'bg-').replace('50', '500') : 'bg-[#f25c05]'} hover:opacity-95 hover:shadow-xl hover:-translate-y-0.5 text-white font-black rounded-full shadow-lg active:scale-[0.98] active:translate-y-0 transition-all text-xl uppercase tracking-widest`}
                  style={{ backgroundColor: requestType ? undefined : '#f25c05' }}
                >
                  GỬI CHO QUẢN LÝ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleAvatarCapture = async (photoData: string) => {
    if (!loggedInEmployee) return;
    try {
      await updateDoc(doc(db, 'employees', loggedInEmployee.id), {
        avatar: photoData
      });
      setLoggedInEmployee({ ...loggedInEmployee, avatar: photoData });
      setShowAvatarCamera(false);
      setShowAvatarOptions(false);
    } catch (error) {
      console.error("Error updating avatar:", error);
    }
  };

  if (showWeeklySchedule) return renderWeeklySchedule();

  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col items-center py-8 px-4 font-sans`}>
      {renderRequestModal()}
      <div className="w-full max-w-md bg-slate-50 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {!loggedInEmployee && (
          <div className={`${theme.accent} text-white p-8 text-center rounded-b-[3rem] shadow-lg relative z-10`}>
            <div className="inline-block bg-gradient-to-br from-slate-50 to-slate-200 py-4 px-10 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.2),inset_0_2px_5px_rgba(255,255,255,1)] border-b-4 border-slate-400/40 mb-8 relative group transform hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-emerald-500/5 rounded-2xl" />
              <p className={`text-transparent bg-clip-text bg-gradient-to-r ${kioskBranch === 'Phố Xanh' ? 'from-emerald-700 via-emerald-800 to-emerald-950' : 'from-amber-700 via-amber-800 to-amber-950'} text-3xl font-black tracking-tighter uppercase relative z-10 drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]`}>
                {BRANCHES.find(b => b.id === kioskBranch)?.name}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 inline-block border border-white/20 shadow-xl">
              <div className="text-4xl font-mono font-bold tracking-wider">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-sm font-medium mt-1 opacity-80">
                {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: vi })}
              </div>
            </div>
          </div>
        )}

        <div className={`p-6 space-y-6 ${loggedInEmployee ? 'pt-10' : ''}`}>
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start animate-in fade-in slide-in-from-top-4">
              <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {showDeviceError ? (
            <div className={`${theme.bg} border-2 ${theme.border} rounded-3xl p-6 shadow-sm animate-in fade-in zoom-in duration-300`}>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 text-center uppercase tracking-tight mb-2">Bảo mật thiết bị</h3>
              <p className="text-slate-500 text-sm text-center mb-6 leading-relaxed">
                Tài khoản của bạn đang được liên kết với một thiết bị khác. Nếu bạn đã đổi điện thoại hoặc thiết bị cũ bị hỏng, vui lòng xác nhận để cập nhật thiết bị mới.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleConfirmDeviceChange}
                  disabled={isSubmitting}
                  className={`w-full py-4 ${theme.button} text-white font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 group`}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span>XÁC NHẬN ĐỔI THIẾT BỊ</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowDeviceError(false);
                    setError(null);
                    setPendingEmployee(null);
                  }}
                  className="w-full py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
                >
                  Hủy bỏ
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider italic">
                  * Hành động này sẽ được ghi lại để quản lý theo dõi.
                </p>
              </div>
            </div>
          ) : error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          {!actionType ? (
            <div className="space-y-5">
              {!loggedInEmployee ? (
                <form onSubmit={handleLogin} className={`space-y-4 ${theme.bg} p-5 rounded-2xl border ${theme.border}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold ${theme.text}`}>Đăng nhập chấm công</h3>
                    <button
                      type="button"
                      onClick={handleBackToBranchSelection}
                      className="text-xs text-stone-500 hover:text-amber-600 font-medium flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-sm"
                    >
                      <Building className="w-3 h-3" />
                      Đổi quán
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-700 flex items-center">
                      <Phone className={`w-4 h-4 mr-2 ${kioskBranch === 'Phố Xanh' ? 'text-emerald-600' : 'text-amber-600'}`} />
                      Số điện thoại
                    </label>
                    <input 
                      type="tel"
                      required
                      placeholder="Nhập số điện thoại"
                      value={empIdInput}
                      onChange={(e) => {
                        setEmpIdInput(e.target.value);
                        setPinInput('');
                        setError(null);
                        setShowDeviceError(false);
                      }}
                      className={`w-full p-3.5 bg-white border border-stone-200 rounded-2xl focus:ring-2 ${kioskBranch === 'Phố Xanh' ? 'focus:ring-emerald-500 focus:border-emerald-500' : 'focus:ring-amber-500 focus:border-amber-500'} transition-all text-stone-800 font-medium outline-none`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-700 flex items-center">
                      <Lock className={`w-4 h-4 mr-2 ${kioskBranch === 'Phố Xanh' ? 'text-emerald-600' : 'text-amber-600'}`} />
                      Mã PIN
                    </label>
                    <div className="relative">
                      <input 
                        type={showPin ? "text" : "password"}
                        required
                        placeholder="Nhập mã PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className={`w-full p-3.5 bg-white border border-stone-200 rounded-2xl focus:ring-2 ${kioskBranch === 'Phố Xanh' ? 'focus:ring-emerald-500 focus:border-emerald-500' : 'focus:ring-amber-500 focus:border-amber-500'} transition-all text-stone-800 font-medium outline-none`}
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-xs text-stone-600 text-center bg-stone-100 p-2 rounded-lg w-full">
                      <p>
                        <span className={`font-bold ${kioskBranch === 'Phố Xanh' ? 'text-emerald-700' : 'text-amber-700'}`}>Lần đầu đăng nhập:</span> Mã PIN là 4 số cuối SĐT.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowResetPinModal(true)}
                        className="text-blue-600 hover:text-blue-800 font-bold mt-1 inline-block transition-colors"
                      >
                        Quên mã PIN? Tự khôi phục tại đây
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className={`w-full py-3.5 ${theme.button} text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]`}
                  >
                    Đăng nhập
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Greeting Card */}
                  <div className={`${kioskBranch === 'Phố Xanh' ? 'bg-emerald-600 border-emerald-700' : 'bg-amber-600 border-amber-700'} p-6 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border relative overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 ${kioskBranch === 'Phố Xanh' ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full -mr-16 -mt-16 opacity-50`} />
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-2 mb-6">
                        <Store className="w-4 h-4 text-white" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">
                          {BRANCHES.find(b => b.id === kioskBranch)?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button 
                          onClick={() => setShowChangePinModal(true)}
                          className="p-2.5 bg-white/20 text-white hover:bg-white/30 rounded-full transition-all shadow-sm"
                          title="Đổi mã PIN"
                        >
                          <KeyRound className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="p-2.5 bg-white/20 text-white hover:bg-red-500 rounded-full transition-all shadow-sm"
                          title="Đăng xuất"
                        >
                          <LogOut className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="relative z-10 mt-2">
                      <p className="text-sm text-white/90 font-black uppercase tracking-[0.2em] mb-1">XIN CHÀO,</p>
                      <p className="font-black text-white text-3xl tracking-tight leading-normal py-1 truncate">{loggedInEmployee.fullName.toUpperCase()}</p>
                    </div>
                  </div>

                  {/* New Menu Buttons */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => setShowWeeklySchedule(true)}
                        className={`w-full flex items-center justify-between p-5 ${theme.bg} rounded-[2rem] shadow-sm border ${theme.border} hover:border-stone-300 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all group`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 ${kioskBranch === 'Phố Xanh' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'} rounded-2xl group-hover:scale-110 transition-transform`}>
                            <Calendar className="w-6 h-6" />
                          </div>
                          <span className={`font-bold ${theme.text} text-lg`}>Xem lịch làm việc</span>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${kioskBranch === 'Phố Xanh' ? 'text-emerald-400' : 'text-amber-400'} group-hover:translate-x-1 transition-transform`} />
                      </button>
                      <button 
                        onClick={() => {
                          setRequestType(null);
                          setRequestNote('');
                          setSwapWithEmpId('');
                          setRequestTime('');
                          setRequestSubTime('');
                          setRequestDate(format(new Date(), 'yyyy-MM-dd'));
                          setShowRequestModal(true);
                        }}
                        className={`w-full flex items-center justify-between p-5 ${theme.bg} rounded-[2rem] shadow-sm border ${theme.border} hover:border-stone-300 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all group`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 ${kioskBranch === 'Phố Xanh' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'} rounded-2xl group-hover:scale-110 transition-transform`}>
                            <FileEdit className="w-6 h-6" />
                          </div>
                          <span className={`font-bold ${theme.text} text-lg`}>Xin Phép & Hỗ Trợ</span>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${kioskBranch === 'Phố Xanh' ? 'text-emerald-400' : 'text-amber-400'} group-hover:translate-x-1 transition-transform`} />
                      </button>
                    </div>

                  {/* Leaving App Warning */}
                  {latestLog && !latestLog.checkOutTime && (!loggedInEmployee || !(loggedInEmployee.empId.toUpperCase() === 'ADMIN' || admins.some(a => a.email === loggedInEmployee.fullName))) && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl animate-pulse">
                      <p className="text-xs text-amber-800 font-bold flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        CẢNH BÁO GIÁM SÁT
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/50 p-2 rounded-lg text-center">
                          <p className="text-[10px] text-stone-500 uppercase font-bold">Rời app</p>
                          <p className="text-lg font-black text-red-600">{latestLog.SoLanRoiApp || 0}/5</p>
                        </div>
                        <div className="bg-white/50 p-2 rounded-lg text-center">
                          <p className="text-[10px] text-stone-500 uppercase font-bold">Bị phạt</p>
                          <p className="text-lg font-black text-red-600">{latestLog.PhutPhatRoiApp || 0}m</p>
                        </div>
                      </div>
                    </div>
                  )}



                  {/* Tasks in Shift (if active) */}
                  {latestLog && !latestLog.checkOutTime && workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)?.tasks && workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)!.tasks!.length > 0 && (
                    <div className="bg-white border border-stone-100 p-6 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
                      <h4 className="text-xs font-black text-stone-400 mb-4 uppercase tracking-widest">Nhiệm vụ trong ca</h4>
                      <div className="space-y-3">
                        {workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)!.tasks!.map((task) => (
                          <div 
                            key={task.id} 
                            onClick={() => handleToggleTask(
                              workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)!.id,
                              task.id,
                              !task.isCompleted
                            )}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                              task.isCompleted ? 'bg-stone-50 border-stone-100 opacity-60' : 'bg-white border-stone-200 shadow-sm'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              task.isCompleted ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-300'
                            }`}>
                              {task.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            <span className={`text-sm flex-1 ${task.isCompleted ? 'line-through text-stone-400' : 'text-stone-700 font-bold'}`}>
                              {task.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salary & Statistics Card */}
                  <div className={`${theme.bg} p-6 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border ${theme.border}`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black ${theme.text} uppercase tracking-widest text-xs`}>Thống kê tháng {format(new Date(), 'MM')}</h3>
                        <button 
                          onClick={() => setShowStats(!showStats)} 
                          className={`${kioskBranch === 'Phố Xanh' ? 'text-emerald-600 hover:text-emerald-700' : 'text-amber-600 hover:text-amber-700'} transition-colors`}
                        >
                          {showStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className={`px-3 py-1 ${kioskBranch === 'Phố Xanh' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'} rounded-full text-[10px] font-black uppercase tracking-wider border`}>
                        Dự kiến
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-3xl border border-white shadow-sm">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Tổng lương</p>
                        <p className={`text-3xl font-black text-emerald-600`}>
                          {showStats ? Math.round(monthlyStats.totalExpected).toLocaleString('vi-VN') : '***'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 font-medium">Lương cơ bản:</span>
                        <span className={`font-bold ${showStats ? 'text-emerald-600' : 'text-stone-700'}`}>
                          {showStats ? Math.round(monthlyStats.expectedBaseSalary).toLocaleString('vi-VN') : '***'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 font-medium">Thưởng TN ({monthlyStats.ttnPercentage}%):</span>
                        <span className="font-bold text-emerald-600">{showStats ? '+' + Math.round(monthlyStats.expectedTTN).toLocaleString('vi-VN') : '***'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-3 border-t border-stone-100">
                        <span className="text-stone-500 font-medium">Số lần đi trễ:</span>
                        <span className="font-bold text-red-500">{monthlyStats.lateCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-stone-500 font-medium">Phạt đi trễ:</span>
                        <span className="font-bold text-red-500">-{Math.round(monthlyStats.latePenaltyMinutes * (loggedInEmployee.hourlyRate / 60)).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>

                    {(monthlyStats.lateCount >= 4 || monthlyStats.totalLateMinutes >= 100) && (
                      <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-2xl text-[10px] font-bold border border-red-100 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Cảnh báo: Bạn sắp mất Thưởng Trách Nhiệm do vi phạm quy định đi trễ!</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleActionClick('check-in')}
                      disabled={latestLog && !latestLog.checkOutTime}
                      className={`w-full py-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.95] ${
                        latestLog && !latestLog.checkOutTime
                          ? 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${latestLog && !latestLog.checkOutTime ? 'bg-stone-200' : 'bg-white/20'}`}>
                        <div className="relative">
                          <Clock className="w-7 h-7" />
                          <ArrowRight className="w-3 h-3 absolute -right-1 -bottom-1 bg-emerald-500 rounded-full border border-white" />
                        </div>
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">VÀO CA</span>
                    </button>
                    
                    <button
                      onClick={() => handleActionClick('check-out')}
                      disabled={!latestLog || latestLog.checkOutTime}
                      className={`w-full py-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.95] ${
                        !latestLog || latestLog.checkOutTime
                          ? 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'
                          : 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${!latestLog || latestLog.checkOutTime ? 'bg-stone-200' : 'bg-white/20'}`}>
                        <LogOut className="w-7 h-7" />
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">RA CA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-stone-800 text-lg flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-amber-600" />
                  Xác thực vị trí & Khuôn mặt
                </h3>
                <button 
                  onClick={() => {
                    setActionType(null);
                    setPhotoData(null);
                    setCheckinWarningStep(0);
                    setCheckoutWarningStep(0);
                  }}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {actionType === 'check-out' && latestLog && workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)?.tasks?.some(t => !t.isCompleted) && (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm font-medium border border-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-bold">Bạn chưa hoàn thành tất cả nhiệm vụ!</p>
                    <p className="text-xs mt-1">Vui lòng kiểm tra lại danh sách nhiệm vụ trước khi kết thúc ca. Quản lý sẽ nhận được thông báo nếu bạn ra ca khi chưa hoàn thành nhiệm vụ.</p>
                  </div>
                </div>
              )}

              {distance !== null && (
                <div className={`p-3 rounded-xl text-sm font-medium border ${
                  distance <= MAX_DISTANCE_METERS 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  Khoảng cách đến quán: {Math.round(distance)}m 
                  (Cho phép: {MAX_DISTANCE_METERS}m)
                </div>
              )}

              {(actionType === 'check-in' || actionType === 'check-out') && (
                <div className="bg-stone-100 rounded-2xl overflow-hidden border-2 border-stone-200">
                  {photoData ? (
                    <img src={photoData} alt="Captured" className="w-full h-auto object-cover" />
                  ) : (
                    <CameraCapture 
                      ref={cameraRef} 
                      onCapture={handlePhotoCapture} 
                      hideButton={true} 
                    />
                  )}
                </div>
              )}

              <div className="space-y-4">
                    {(actionType === 'check-in' || actionType === 'check-out') && (
                      todayShifts.length > 0 ? (
                        <div className="relative">
                          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${actionType === 'check-in' ? 'text-emerald-600' : 'text-red-600'} pointer-events-none`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <select
                            value={selectedShiftId}
                            onChange={(e) => {
                              const shiftId = e.target.value;
                              setSelectedShiftId(shiftId);
                              const shift = todayShifts.find(s => s.id === shiftId);
                              if (!shift) return;

                              if (actionType === 'check-in') {
                                setScheduledShiftTime(shift.startTime);
                                const now = new Date();
                                const nowStr = format(now, 'HH:mm');
                                const [schH, schM] = shift.startTime.split(':').map(Number);
                                const schTotal = schH * 60 + schM;
                                const nowTotal = now.getHours() * 60 + now.getMinutes();
                                if (nowTotal > schTotal) {
                                  setSelectedShiftTime(nowStr);
                                } else {
                                  setSelectedShiftTime(shift.startTime);
                                }
                              } else {
                                setScheduledShiftTime(shift.endTime);
                              }
                            }}
                            className={`w-full ${actionType === 'check-in' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-500' : 'bg-red-50 text-red-800 border-red-200 focus:ring-red-500'} p-3 pl-10 pr-10 rounded-xl text-sm border font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2`}
                          >
                            {todayShifts.map((shift, idx) => (
                              <option key={idx} value={shift.id}>
                                Lịch hôm nay: {shift.startTime} - {shift.endTime} ({shift.locationId || 'Góc Phố'})
                              </option>
                            ))}
                          </select>
                          <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${actionType === 'check-in' ? 'text-emerald-600' : 'text-red-600'} pointer-events-none`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-sm border border-amber-200 flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <span>⚠️ Bạn chưa được xếp lịch hôm nay tại chi nhánh này. Hệ thống sẽ ghi nhận đây là ca phát sinh.</span>
                        </div>
                      )
                    )}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`inline-block px-3 py-1 rounded-md font-bold text-white text-sm ${actionType === 'check-in' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                        Giờ {actionType === 'check-in' ? 'vào' : 'ra'} ca:
                      </label>
                      {actionType === 'check-in' && todayShifts.length === 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                          Chưa được xếp lịch
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      {actionType === 'check-out' ? (
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input 
                              type="time" 
                              value={selectedShiftTime}
                              max={format(new Date(), 'HH:mm')}
                              onChange={(e) => {
                                const currentTime = format(new Date(), 'HH:mm');
                                if (e.target.value > currentTime) {
                                  setSelectedShiftTime(currentTime);
                                  toast.error('Không được chọn giờ ở tương lai');
                                } else {
                                  setSelectedShiftTime(e.target.value);
                                }
                              }}
                              className="w-full p-4 pr-12 rounded-2xl border-2 border-red-500 ring-4 ring-red-50 bg-white text-lg font-black transition-all disabled:bg-stone-100 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-red-600 bg-red-50 pointer-events-none">
                              <Clock className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input 
                              type="time" 
                              value={selectedShiftTime}
                              onChange={(e) => {
                                setSelectedShiftTime(e.target.value);
                                setIsTimeManuallyEdited(true);
                              }}
                              className="w-full p-4 pr-12 rounded-2xl border-2 border-blue-500 ring-4 ring-blue-50 bg-white text-lg font-black transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-blue-600 bg-blue-50 pointer-events-none">
                              <Clock className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {actionType === 'check-out' && (
                      <p className="text-[10px] text-stone-400 mt-1 italic">
                        Nhập giờ ra ca thực tế.
                      </p>
                    )}
                  </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Ghi chú:</label>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-300"
                    placeholder="Nhập ghi chú nếu có..."
                  />
                </div>
              </div>

              {actionType === 'check-in' && (
                <div className="mt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const nowH = now.getHours();
                      const nowM = now.getMinutes();
                      const nowTotal = nowH * 60 + nowM;
                      const [selH, selM] = selectedShiftTime.split(':').map(Number);
                      const selTotal = selH * 60 + selM;

                      if (selTotal < nowTotal) {
                        setCheckinWarningStep(2);
                      } else if (selectedShiftTime !== scheduledShiftTime && scheduledShiftTime !== '') {
                        setCheckinWarningStep(1);
                      } else {
                        cameraRef.current?.capturePhoto();
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    Vào ca
                  </button>
                </div>
              )}

              {actionType === 'check-out' && (
                <div className="mt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      const [selH, selM] = selectedShiftTime.split(':').map(Number);
                      const [schH, schM] = (scheduledShiftTime || '00:00').split(':').map(Number);
                      const selTotal = selH * 60 + selM;
                      const schTotal = schH * 60 + schM;

                      // Check for late check-out
                      if (selTotal > schTotal && scheduledShiftTime !== '') {
                        const diff = selTotal - schTotal;
                        if (diff <= 15) {
                          // Grace period: auto-calculate by schedule
                          setSelectedShiftTime(scheduledShiftTime);
                          cameraRef.current?.capturePhoto();
                        } else {
                          // Over 15 minutes: trigger classification popup
                          setCheckoutWarningStep(3);
                        }
                      } else if (selectedShiftTime !== scheduledShiftTime && scheduledShiftTime !== '') {
                        setCheckoutWarningStep(1);
                      } else {
                        cameraRef.current?.capturePhoto();
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    Xác nhận ra ca
                  </button>
                </div>
              )}

              {isSubmitting && (
                <div className="text-center p-4 text-amber-700 font-medium flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                  Đang xử lý dữ liệu...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t-2 border-slate-200/60 text-center w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-1 w-8 bg-amber-500/20 rounded-full" />
          <div className="h-1 w-1 bg-amber-500/40 rounded-full" />
          <div className="h-1 w-8 bg-emerald-500/20 rounded-full" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black flex items-center justify-center gap-1">
          Cafe HR Manager System <span className="text-blue-600 font-black">®</span>
        </p>
        <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Version 1.0</p>
        <p className="text-[10px] text-slate-400 font-medium italic mt-2">Designed by Liem Nguyen</p>
      </div>

      {/* Checkout Summary Modal */}
      {checkoutSummary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-200"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-emerald-700 uppercase tracking-tight">Tóm tắt ca làm việc</h2>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <span className="text-stone-500 font-bold text-sm uppercase tracking-wider">Tổng giờ công</span>
                <span className="text-xl font-black text-emerald-600">{checkoutSummary.totalHours.toFixed(2)}h</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 relative">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="block text-stone-400 text-[10px] font-bold uppercase">Đi trễ</span>
                    <button type="button" className="group relative focus:outline-none">
                      <Info className="w-3 h-3 text-stone-400 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block group-focus:block w-48 p-2 bg-stone-800 text-white text-[10px] rounded-lg shadow-xl z-10 font-normal normal-case tracking-normal text-left">
                        Trễ dưới 10p không phạt. Trễ 10-20p phạt 10p. Trễ 20-30p phạt 20p...
                        <div className="absolute top-full left-2 border-4 border-transparent border-t-stone-800"></div>
                      </div>
                    </button>
                  </div>
                  <span className={`text-lg font-black ${checkoutSummary.lateMinutes > 0 ? 'text-amber-600' : 'text-stone-400'}`}>
                    {checkoutSummary.lateMinutes}p
                  </span>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="block text-stone-400 text-[10px] font-bold uppercase mb-1">Phạt trễ</span>
                  <span className={`text-lg font-black ${checkoutSummary.latePenaltyMinutes > 0 ? 'text-red-600' : 'text-stone-400'}`}>
                    {checkoutSummary.latePenaltyMinutes}p
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 relative">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="block text-stone-400 text-[10px] font-bold uppercase">Rời Web App</span>
                    <button type="button" className="group relative focus:outline-none">
                      <Info className="w-3 h-3 text-stone-400 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block group-focus:block w-48 p-2 bg-stone-800 text-white text-[10px] rounded-lg shadow-xl z-10 font-normal normal-case tracking-normal text-left">
                        Rời app dưới 3 lần không phạt. Từ lần thứ 4 trở đi, mỗi lần rời app sẽ bị trừ 10 phút công.
                        <div className="absolute top-full left-2 border-4 border-transparent border-t-stone-800"></div>
                      </div>
                    </button>
                  </div>
                  <span className={`text-lg font-black ${checkoutSummary.exitCount > 0 ? 'text-amber-600' : 'text-stone-400'}`}>
                    {checkoutSummary.exitCount} lần
                  </span>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="block text-stone-400 text-[10px] font-bold uppercase mb-1">Phạt rời app</span>
                  <span className={`text-lg font-black ${checkoutSummary.exitCount > 3 ? 'text-red-600' : 'text-stone-400'}`}>
                    {Math.max(0, (checkoutSummary.exitCount - 3) * 10)}p
                  </span>
                </div>
              </div>

              {checkoutSummary.incompleteTasks.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <span className="block text-amber-700 text-[10px] font-bold uppercase mb-2">Nhiệm vụ chưa hoàn thành</span>
                  <ul className="space-y-1">
                    {checkoutSummary.incompleteTasks.map((task: string, i: number) => (
                      <li key={i} className="text-xs text-amber-800 flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 bg-amber-600 rounded-full shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setCheckoutSummary(null)}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest"
            >
              Xác nhận
            </button>
          </motion.div>
        </div>
      )}

      {/* Avatar Camera Modal */}
      {showAvatarCamera && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
              <h3 className="font-black text-stone-800">Chụp ảnh đại diện</h3>
              <button 
                onClick={() => setShowAvatarCamera(false)}
                className="p-2 text-stone-400 hover:text-stone-600 bg-white rounded-full shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <CameraCapture onCapture={handleAvatarCapture} />
            </div>
          </div>
        </div>
      )}

      {/* Checkin Warning Modal */}
      {checkinWarningStep === 1 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-amber-100/50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-4">Xác nhận giờ vào ca</h2>
            <p className="text-stone-600 mb-8 font-medium text-lg leading-relaxed">
              {(() => {
                const [selH, selM] = selectedShiftTime.split(':').map(Number);
                const [schH, schM] = (scheduledShiftTime || '00:00').split(':').map(Number);
                const selTotal = selH * 60 + selM;
                const schTotal = schH * 60 + schM;
                const diffMinutes = Math.abs(selTotal - schTotal);
                const diffH = Math.floor(diffMinutes / 60);
                const diffM = diffMinutes % 60;
                const diffText = diffH > 0 
                  ? (diffM > 0 ? `${diffH}h ${diffM} phút` : `${diffH}h`)
                  : `${diffM} phút`;
                const diffType = selTotal < schTotal ? 'sớm hơn' : 'trễ hơn';
                const baseMsg = `Bạn đang vào ca lúc ${selectedShiftTime}, ${diffType} ${diffText} so với lịch làm việc là ${scheduledShiftTime}.`;
                const extraMsg = selTotal < schTotal ? ` Giờ công được tính từ ${scheduledShiftTime}.` : '';
                return `${baseMsg}${extraMsg} Xác nhận vào ca?`;
              })()}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setCheckinWarningStep(0)}
                className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all text-lg"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  setCheckinWarningStep(0);
                  cameraRef.current?.capturePhoto();
                }}
                className="flex-1 py-4 bg-[#f59e0b] hover:bg-amber-600 text-white font-bold rounded-2xl transition-all text-lg"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Checkin Warning Modal - Before Real Time */}
      {checkinWarningStep === 2 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-red-100/50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-4">Xác nhận vào ca</h2>
            <p className="text-stone-600 mb-8 font-medium text-lg leading-relaxed">
              Giờ vào ca bạn chọn ({selectedShiftTime}) sớm hơn hiện tại. Quản lý sẽ nhận thông báo để đối soát giờ công giúp bạn.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setCheckinWarningStep(0)}
                className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all text-lg uppercase"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  setCheckinWarningStep(0);
                  cameraRef.current?.capturePhoto();
                }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all text-lg uppercase"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Checkout Warning Modal */}
      {checkoutWarningStep === 1 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-amber-100/50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-4">Xác nhận giờ ra ca</h2>
            <p className="text-stone-600 mb-8 font-medium text-lg leading-relaxed">
              {(() => {
                const [selH, selM] = selectedShiftTime.split(':').map(Number);
                const [schH, schM] = (scheduledShiftTime || '00:00').split(':').map(Number);
                const selTotal = selH * 60 + selM;
                const schTotal = schH * 60 + schM;
                const diffMinutes = Math.abs(selTotal - schTotal);
                const diffH = Math.floor(diffMinutes / 60);
                const diffM = diffMinutes % 60;
                const diffText = diffH > 0 
                  ? (diffM > 0 ? `${diffH}h ${diffM} phút` : `${diffH}h`)
                  : `${diffM} phút`;
                const diffType = selTotal < schTotal ? 'sớm hơn' : 'trễ hơn';
                return `Bạn đang ra ca lúc ${selectedShiftTime}, ${diffType} ${diffText} so với lịch làm việc là ${scheduledShiftTime}. Xác nhận ra ca?`;
              })()}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setCheckoutWarningStep(0)}
                className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all text-lg"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  setCheckoutWarningStep(0);
                  cameraRef.current?.capturePhoto();
                }}
                className="flex-1 py-4 bg-[#f59e0b] hover:bg-amber-600 text-white font-bold rounded-2xl transition-all text-lg"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Late Checkout Classification Modal */}
      {checkoutWarningStep === 3 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-red-100/50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-4">Bạn ra ca trễ?</h2>
            <p className="text-stone-600 mb-8 font-medium text-lg leading-relaxed">
              Bạn đang ra ca trễ hơn lịch làm việc. Vui lòng chọn lý do:
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setLateCheckoutOption('forgot');
                  setSelectedShiftTime(scheduledShiftTime);
                  setCheckoutWarningStep(0);
                  cameraRef.current?.capturePhoto();
                }}
                className="w-full py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all text-lg flex flex-col items-center"
              >
                <span>Tôi quên bấm</span>
                <span className="text-xs font-medium text-stone-500">(Tính giờ theo lịch: {scheduledShiftTime})</span>
              </button>
              <button
                onClick={() => {
                  setLateCheckoutOption('overtime');
                  setCheckoutWarningStep(4);
                }}
                className="w-full py-4 bg-[#f59e0b] hover:bg-amber-600 text-white font-bold rounded-2xl transition-all text-lg flex flex-col items-center"
              >
                <span>Tôi làm tăng ca</span>
                <span className="text-xs font-medium text-white/80">(Tính thêm giờ)</span>
              </button>
              <button
                onClick={() => setCheckoutWarningStep(0)}
                className="w-full py-2 text-stone-400 font-bold hover:text-stone-600 transition-all"
              >
                Quay lại
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Overtime Reason Modal */}
      {checkoutWarningStep === 4 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl"
          >
            <h2 className="text-2xl font-black text-stone-900 mb-4 text-center">Lý do tăng ca</h2>
            <p className="text-stone-600 mb-6 font-medium text-center">
              Vui lòng nhập lý do bạn ở lại làm thêm giờ:
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-stone-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-50 mb-6 min-h-[120px] text-lg"
              placeholder="VD: Khách đông, A.Khoa nhờ ở lại..."
            />
            <div className="flex gap-4">
              <button
                onClick={() => setCheckoutWarningStep(3)}
                className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  if (!note.trim()) {
                    toast.error('Vui lòng nhập lý do tăng ca');
                    return;
                  }
                  setCheckoutWarningStep(0);
                  cameraRef.current?.capturePhoto();
                }}
                className="flex-1 py-4 bg-[#f59e0b] hover:bg-amber-600 text-white font-bold rounded-2xl transition-all"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">
                {loggedInEmployee?.isFirstLogin ? 'Thiết lập mã PIN mới' : 'Đổi mã PIN'}
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {loggedInEmployee?.isFirstLogin ? (
                  <>
                    Đây là lần đăng nhập đầu tiên.<br/>
                    Mã PIN hiện tại là <span className="font-bold text-amber-700">4 số cuối số điện thoại</span> của bạn.<br/>
                  </>
                ) : (
                  <>Vui lòng tạo mã PIN mới gồm 4 số.</>
                )}
              </p>
            </div>
            
            <form onSubmit={handleChangePin} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Mã PIN mới (4 số)</label>
                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    required
                    pattern="\d{4,6}"
                    maxLength={6}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-center tracking-widest text-lg"
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Xác nhận mã PIN</label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? "text" : "password"}
                    required
                    pattern="\d{4,6}"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-center tracking-widest text-lg"
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                {!loggedInEmployee?.isFirstLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePinModal(false);
                      setNewPin('');
                      setConfirmNewPin('');
                      setError(null);
                    }}
                    className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all active:scale-[0.98]"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  Xác nhận & Đổi PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {showResetPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 uppercase">Khôi phục mã PIN</h2>
              <p className="text-xs text-stone-500 mt-2">
                Vui lòng nhập số điện thoại và 4 số cuối CCCD để xác thực danh tính.
              </p>
            </div>
            
            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1 ml-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={resetEmpId}
                  onChange={e => setResetEmpId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold"
                  placeholder="Nhập SĐT đăng ký"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1 ml-1">4 số cuối CCCD</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={resetCccdLast4}
                  onChange={e => setResetCccdLast4(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-center tracking-[0.5em]"
                  placeholder="XXXX"
                />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1 ml-1">Mã PIN mới</label>
                <div className="relative">
                  <input
                    type={showResetNewPin ? "text" : "password"}
                    required
                    maxLength={6}
                    value={resetNewPin}
                    onChange={e => setResetNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-center tracking-widest"
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPin(!showResetNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showResetNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1 ml-1">Xác nhận PIN mới</label>
                <div className="relative">
                  <input
                    type={showResetConfirmPin ? "text" : "password"}
                    required
                    maxLength={6}
                    value={resetConfirmPin}
                    onChange={e => setResetConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-center tracking-widest"
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPin(!showResetConfirmPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showResetConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPinModal(false);
                    setResetEmpId('');
                    setResetCccdLast4('');
                    setResetNewPin('');
                    setResetConfirmPin('');
                  }}
                  className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal removed for security reasons */}

      <div className="mt-8 text-center">
        <p className="text-[10px] text-stone-400 font-medium italic">Designed by Liem Nguyen</p>
      </div>
    </div>
  );
}
