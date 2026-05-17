import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export interface Employee {
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
  locationId?: string;
}

export const useEmployeeAuth = (employees: Employee[], admins: any[], kioskBranch: string | null) => {
  const navigate = useNavigate();
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Login Inputs
  const [empIdInput, setEmpIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // Device Security
  const [showDeviceError, setShowDeviceError] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null);

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
    setIsSubmitting(true);
    setError(null);
    setShowDeviceError(false);
    setPendingEmployee(null);
    
    try {
      const emp = employees.find(e => e.phone === empIdInput);
      if (!emp) {
        setError('Số điện thoại không tồn tại.');
        return;
      }
      
      if (emp.pinCode !== pinInput) {
        // Fallback for existing users who might not have their pinCode updated properly in the DB yet
        const last4Phone = emp.phone ? emp.phone.slice(-4) : null;
        if (emp.isFirstLogin && last4Phone && pinInput === last4Phone) {
           // Allow login, it will immediately prompt them to change PIN anyway
        } else {
          setError('Mã PIN không đúng.');
          return;
        }
      }

      const currentDeviceId = getBrowserDeviceId();

      if (emp.deviceId && emp.deviceId !== currentDeviceId) {
        setPendingEmployee(emp);
        setShowDeviceError(true);
        setError('Đăng nhập không đúng thiết bị.');
        return;
      }

      if (!emp.deviceId) {
        try {
          await updateDoc(doc(db, 'employees', emp.id), {
            deviceId: currentDeviceId
          });
        } catch (err) {
          console.error('Error setting device ID:', err);
        }
      }

      localStorage.setItem('hasLoggedInBefore', 'true');
      setLoggedInEmployee(emp);
      if (emp.isFirstLogin) {
        setShowChangePinModal(true);
      }
      setEmpIdInput('');
      setPinInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setLoggedInEmployee(null);
    setEmpIdInput('');
    setPinInput('');
  };

  const handleConfirmDeviceChange = async () => {
    if (!pendingEmployee) return;
    const currentDeviceId = getBrowserDeviceId();
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'employees', pendingEmployee.id), {
        deviceId: currentDeviceId
      });
      
      await addDoc(collection(db, 'DeviceLogs'), {
        empId: pendingEmployee.empId,
        fullName: pendingEmployee.fullName,
        oldDeviceId: pendingEmployee.deviceId,
        newDeviceId: currentDeviceId,
        timestamp: serverTimestamp(),
        reason: 'Device replaced or broken',
        locationId: kioskBranch || 'Unknown'
      });
      
      setLoggedInEmployee(pendingEmployee);
      setEmpIdInput('');
      setPinInput('');
      setShowDeviceError(false);
      setPendingEmployee(null);
      setError(null);
      // setSuccessMsg('Đã đổi thiết bị thành công. Chào mừng bạn trở lại!');
      // setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi đổi thiết bị. Vui lòng thử lại hoặc liên hệ quản lý.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change PIN State
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Reset PIN State
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetEmpId, setResetEmpId] = useState('');
  const [resetCccdLast4, setResetCccdLast4] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [showResetNewPin, setShowResetNewPin] = useState(false);
  const [showResetConfirmPin, setShowResetConfirmPin] = useState(false);

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
    } catch (err: any) {
      console.error('Error resetting PIN:', err);
      toast.error(`Lỗi database: ${err.code || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loggedInEmployee) return;

    if (!loggedInEmployee.isFirstLogin && oldPin !== loggedInEmployee.pinCode) {
      setError('Mã PIN cũ không đúng.');
      return;
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setError('Mã PIN mới phải từ 4 đến 6 số.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setError('Mã PIN mới không khớp, vui lòng kiểm tra lại');
      return;
    }

    try {
      await updateDoc(doc(db, 'employees', loggedInEmployee?.id || ''), {
        pinCode: newPin,
        isFirstLogin: false
      });
      
      const q = query(collection(db, 'Admins'), where('email', '==', loggedInEmployee.fullName));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(doc(db, 'Admins', snapshot.docs[0].id), {
          pin: newPin
        });
      }

      setLoggedInEmployee({ ...loggedInEmployee, pinCode: newPin, isFirstLogin: false });
      setShowChangePinModal(false);
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
      setSuccessMsg('Đổi mã PIN thành công.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(`Lỗi kết nối cơ sở dữ liệu: ${err.code || err.message}`);
    }
  };

  return {
    loggedInEmployee,
    setLoggedInEmployee,
    isSubmitting,
    setIsSubmitting,
    error,
    setError,
    successMsg,
    setSuccessMsg,
    empIdInput,
    setEmpIdInput,
    pinInput,
    setPinInput,
    showPin,
    setShowPin,
    showDeviceError,
    setShowDeviceError,
    pendingEmployee,
    handleLogin,
    handleLogout,
    handleConfirmDeviceChange,
    showChangePinModal,
    setShowChangePinModal,
    oldPin,
    setOldPin,
    newPin,
    setNewPin,
    confirmNewPin,
    setConfirmNewPin,
    showOldPin,
    setShowOldPin,
    showNewPin,
    setShowNewPin,
    showConfirmPin,
    setShowConfirmPin,
    showResetPinModal,
    setShowResetPinModal,
    resetEmpId,
    setResetEmpId,
    resetCccdLast4,
    setResetCccdLast4,
    resetNewPin,
    setResetNewPin,
    resetConfirmPin,
    setResetConfirmPin,
    showResetNewPin,
    setShowResetNewPin,
    showResetConfirmPin,
    setShowResetConfirmPin,
    handleResetPin,
    handleChangePin
  };
};
