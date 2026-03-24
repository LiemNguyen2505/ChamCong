import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { calculateDistance } from '../utils/geo';
import CameraCapture from './CameraCapture';
import { Clock, User, KeyRound, CheckCircle, AlertCircle, Camera, LogOut, MapPin, History, Calendar, ChevronRight, Eye, EyeOff, Building, Lock, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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
  deviceId?: string;
  createdAt?: string;
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
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDeviceError, setShowDeviceError] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null);
  
  const [latestLog, setLatestLog] = useState<any>(null);

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

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const savedBranch = localStorage.getItem('kioskBranch');
    if (savedBranch) {
      setKioskBranch(savedBranch);
    }
    
    return () => {
      clearInterval(timer);
      unsubscribeEmp();
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

  // Anti-Slacking Logic
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!latestLog || latestLog.checkOutTime || !loggedInEmployee) return;

      if (document.hidden) {
        localStorage.setItem('lastHiddenTime', Date.now().toString());
      } else {
        const lastHiddenStr = localStorage.getItem('lastHiddenTime');
        if (lastHiddenStr) {
          const lastHidden = parseInt(lastHiddenStr, 10);
          const now = Date.now();
          const diffMinutes = Math.floor((now - lastHidden) / 60000);
          
          if (diffMinutes > 0) {
            try {
              const currentPhat = latestLog.PhutPhatRoiApp || 0;
              const currentLan = latestLog.SoLanRoiApp || 0;
              
              const currentHour = new Date().getHours();
              const limitMinutes = currentHour < 10 ? 1 : 3;
              
              let penalty = 0;
              if (diffMinutes > limitMinutes) {
                penalty = diffMinutes * 3;
              }

              const newPhat = currentPhat + penalty;
              const newLan = currentLan + 1;

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
  }, [latestLog, loggedInEmployee, kioskBranch]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowDeviceError(false);
    setPendingEmployee(null);
    
    const emp = employees.find(e => e.empId.toUpperCase() === empIdInput.toUpperCase());
    if (!emp) {
      setError('Mã nhân viên không tồn tại.');
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

    if (newPin.length !== 4) {
      setError('Mã PIN mới phải có đúng 4 số.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
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
      setShowChangePinModal(false);
      setNewPin('');
      setConfirmNewPin('');
      setEmpIdInput('');
      setPinInput('');
      setSuccessMsg('Đổi mã PIN thành công. Bạn có thể chấm công ngay bây giờ.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi đổi mã PIN.');
    }
  };

  const handleLogout = () => {
    setLoggedInEmployee(null);
    setLatestLog(null);
    setEmpIdInput('');
    setPinInput('');
  };

  const handleActionClick = (type: 'check-in' | 'check-out') => {
    if (!loggedInEmployee || !kioskBranch) {
      setError('Lỗi hệ thống: Thiếu thông tin nhân viên hoặc chi nhánh.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setActionType(type);
    
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

  const handlePhotoCapture = async (dataUrl: string) => {
    setPhotoData(dataUrl);
    submitLog(dataUrl);
  };

  const submitLog = async (photo: string) => {
    if (!loggedInEmployee || !kioskBranch || !actionType || !location || distance === null) return;
    
    setIsSubmitting(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const timeStr = new Date().toISOString();

      const photoRef = ref(storage, `chamcong/${loggedInEmployee.empId}_${Date.now()}.jpg`);
      await uploadString(photoRef, photo, 'data_url');
      const photoUrl = await getDownloadURL(photoRef);

      if (actionType === 'check-in') {
        const timesheetId = `TS_${loggedInEmployee.empId}_${Date.now()}`;
        await addDoc(collection(db, 'timesheets'), {
          timesheetId,
          date: today,
          empId: loggedInEmployee.empId,
          locationId: kioskBranch,
          checkInTime: timeStr,
          checkOutTime: null,
          SaiSoGPS: distance,
          AnhVaoCa: photoUrl,
          AnhRaCa: null,
          PhutPhatRoiApp: 0,
          SoLanRoiApp: 0,
          totalHours: 0,
          totalPay: 0
        });

        // Send Notification
        await addDoc(collection(db, 'notifications'), {
          empId: loggedInEmployee.empId,
          fullName: loggedInEmployee.fullName,
          locationId: kioskBranch,
          type: 'check_in',
          timestamp: timeStr,
          message: `Nhân viên ${loggedInEmployee.fullName} đã vào ca tại ${kioskBranch}`
        });
      } else {
        const q = query(
          collection(db, 'timesheets'),
          where('empId', '==', loggedInEmployee.empId),
          where('date', '==', today),
          where('checkOutTime', '==', null)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          const data = snapshot.docs[0].data();
          const gioVao = new Date(data.checkInTime).getTime();
          const gioRa = new Date(timeStr).getTime();
          const phutPhat = data.PhutPhatRoiApp || 0;
          
          const diffMs = gioRa - gioVao;
          const diffHours = diffMs / (1000 * 60 * 60);
          const penaltyHours = phutPhat / 60;
          const tongGio = Math.max(0, diffHours - penaltyHours);
          const totalPay = tongGio * (loggedInEmployee.hourlyRate || 0);

          await updateDoc(docRef, {
            checkOutTime: timeStr,
            AnhRaCa: photoUrl,
            totalHours: tongGio,
            totalPay: totalPay
          });

          // Send Notification
          await addDoc(collection(db, 'notifications'), {
            empId: loggedInEmployee.empId,
            fullName: loggedInEmployee.fullName,
            locationId: kioskBranch,
            type: 'check_out',
            timestamp: timeStr,
            message: `Nhân viên ${loggedInEmployee.fullName} đã kết thúc ca tại ${kioskBranch}`
          });
        } else {
          const timesheetId = `TS_${loggedInEmployee.empId}_${Date.now()}`;
          await addDoc(collection(db, 'timesheets'), {
            timesheetId,
            date: today,
            empId: loggedInEmployee.empId,
            locationId: kioskBranch,
            checkInTime: null,
            checkOutTime: timeStr,
            SaiSoGPS: distance,
            AnhVaoCa: null,
            AnhRaCa: photoUrl,
            PhutPhatRoiApp: 0,
            SoLanRoiApp: 0,
            totalHours: 0,
            totalPay: 0
          });

          // Send Notification
          await addDoc(collection(db, 'notifications'), {
            empId: loggedInEmployee.empId,
            fullName: loggedInEmployee.fullName,
            locationId: kioskBranch,
            type: 'check_out',
            timestamp: timeStr,
            message: `Nhân viên ${loggedInEmployee.fullName} đã kết thúc ca tại ${kioskBranch} (Không có giờ vào)`
          });
        }
      }
      
      setSuccessMsg(`${actionType === 'check-in' ? 'Bắt đầu ca' : 'Kết thúc ca'} thành công lúc ${format(new Date(), 'HH:mm:ss')}`);
      
      setTimeout(() => {
        setActionType(null);
        setPhotoData(null);
        setLocation(null);
        setDistance(null);
        setSuccessMsg(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting log:', err);
      setError('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
      setActionType(null);
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
        
        <div className="bg-amber-600 text-white p-8 text-center rounded-b-[3rem] shadow-lg relative z-10">
          <div className="inline-block bg-gradient-to-br from-slate-50 to-slate-200 py-4 px-10 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.2),inset_0_2px_5px_rgba(255,255,255,1)] border-b-4 border-slate-400/40 mb-8 relative group transform hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-emerald-500/5 rounded-2xl" />
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 text-3xl font-black tracking-tighter uppercase relative z-10 drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]">
              {BRANCHES.find(b => b.id === kioskBranch)?.name}
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 inline-block border border-white/20 shadow-xl">
            <div className="text-4xl font-mono font-bold tracking-wider">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm font-medium mt-1 text-amber-50">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: vi })}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start animate-in fade-in slide-in-from-top-4">
              <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {showDeviceError ? (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in zoom-in duration-300">
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
                  className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
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
                <form onSubmit={handleLogin} className="space-y-4 bg-amber-50 p-5 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-amber-800">Đăng nhập chấm công</h3>
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
                      <User className="w-4 h-4 mr-2 text-amber-600" />
                      Chọn nhân viên
                    </label>
                    <select 
                      required
                      value={empIdInput}
                      onChange={(e) => {
                        setEmpIdInput(e.target.value);
                        setError(null);
                        setShowDeviceError(false);
                      }}
                      className="w-full p-3.5 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-stone-800 font-medium outline-none"
                    >
                      <option value="">-- Chọn tên của bạn --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.empId}>
                          {emp.fullName} ({emp.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-700 flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-amber-600" />
                      Mã PIN
                    </label>
                    <div className="relative">
                      <input 
                        type={showPin ? "text" : "password"}
                        required
                        placeholder="Nhập mã PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className="w-full p-3.5 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-stone-800 font-medium text-center tracking-widest"
                        maxLength={4}
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
                    <p className="text-xs text-stone-500 text-center">
                      Quên mã PIN? Vui lòng liên hệ <span className="font-bold text-amber-700">Quản lý</span> để được Reset về 4 số cuối SĐT.
                    </p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
                  >
                    Đăng nhập
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center font-bold text-xl mr-4">
                        {loggedInEmployee.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-amber-700 font-medium">Xin chào,</p>
                        <p className="font-bold text-stone-800 text-lg">{loggedInEmployee.fullName}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="text-xs text-amber-600 hover:text-amber-800 underline font-medium px-2 py-1"
                    >
                      Đăng xuất
                    </button>
                  </div>

                  {latestLog && !latestLog.checkOutTime && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
                      <p className="text-sm text-amber-800 font-medium mb-2">
                        ⚠️ Vui lòng giữ ứng dụng mở trong ca làm. Hạn mức thoát nền: 1 phút (trước 10h) và 3 phút (sau 10h).
                      </p>
                      <div className="bg-white p-3 rounded-lg border border-amber-100 text-sm">
                        <p className="text-gray-700">Số lần rời app: <span className="font-bold text-red-600">{latestLog.SoLanRoiApp || 0}/5</span></p>
                        <p className="text-gray-700">Số phút bị phạt: <span className="font-bold text-red-600">{latestLog.PhutPhatRoiApp || 0} phút</span></p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleActionClick('check-in')}
                      disabled={latestLog && !latestLog.checkOutTime}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm transition-all ${
                        latestLog && !latestLog.checkOutTime
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 active:scale-95'
                      }`}
                    >
                      <Clock className="w-8 h-8 mb-2" />
                      <span className="font-bold text-lg">Bắt đầu ca</span>
                      <span className="text-xs mt-1 opacity-80">
                        {latestLog && !latestLog.checkOutTime ? 'Đang trong ca' : 'Check-in'}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => handleActionClick('check-out')}
                      disabled={!latestLog || latestLog.checkOutTime}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm transition-all ${
                        !latestLog || latestLog.checkOutTime
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 active:scale-95'
                      }`}
                    >
                      <Clock className="w-8 h-8 mb-2" />
                      <span className="font-bold text-lg">Kết thúc ca</span>
                      <span className="text-xs mt-1 opacity-80">
                        {!latestLog || latestLog.checkOutTime ? 'Chưa Check-in' : 'Check-out'}
                      </span>
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
                  onClick={() => setActionType(null)}
                  className="text-sm text-stone-500 hover:text-stone-800 font-medium bg-stone-100 px-3 py-1 rounded-full"
                >
                  Hủy
                </button>
              </div>

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

              <div className="bg-stone-100 rounded-2xl overflow-hidden border-2 border-stone-200">
                <CameraCapture onCapture={handlePhotoCapture} />
              </div>

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
      </div>

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">Thiết lập mã PIN mới</h2>
              <p className="text-sm text-stone-500 mt-1">
                Đây là lần đăng nhập đầu tiên.<br/>
                Mã PIN hiện tại là <span className="font-bold text-amber-700">4 số cuối số điện thoại</span> của bạn.<br/>
                Vui lòng tạo mã PIN mới gồm 4 số.
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
                    pattern="\d{4}"
                    maxLength={4}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-center tracking-widest text-lg"
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
                    pattern="\d{4}"
                    maxLength={4}
                    value={confirmNewPin}
                    onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-center tracking-widest text-lg"
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
              <button
                type="submit"
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] mt-2"
              >
                Xác nhận & Đổi PIN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
