import React, { useState, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { AdminAccount, Employee } from '../types/admin';

const OWNER_EMAIL = 'nguyen.thanh.liem2505@gmail.com';

interface UseAdminAuthProps {
  globalData: any;
  nhanViens: Employee[];
  setFilterBranch: (branch: string) => void;
  setPayrollActiveBranch: (branch: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAdminAuth = ({ globalData, setFilterBranch, setPayrollActiveBranch }: Omit<UseAdminAuthProps, 'setLoading' | 'nhanViens'>) => {
  const [loading, setLoading] = useState(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('currentAdmin') !== null;
  });
  
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(() => {
    const saved = localStorage.getItem('currentAdmin');
    return saved ? JSON.parse(saved) : null;
  });

  const [password, setPassword] = useState('');
  const [adminLoginId, setAdminLoginId] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginIdError, setLoginIdError] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [showChangeAdminPinModal, setShowChangeAdminPinModal] = useState(false);
  const [oldAdminPin, setOldAdminPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmNewAdminPin, setConfirmNewAdminPin] = useState('');
  const [showOldAdminPin, setShowOldAdminPin] = useState(false);
  const [showNewAdminPin, setShowNewAdminPin] = useState(false);
  const [showConfirmAdminPin, setShowConfirmAdminPin] = useState(false);
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

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

        if (isEmployeeManager && empMatch) {
            const associatedAdmin = allAdmins.find((a: any) => a.email === empMatch.fullName);
            if (associatedAdmin) {
                foundAdmin = associatedAdmin;
            } else {
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
        
        localStorage.setItem('currentAdmin', JSON.stringify(adminDataToSet));
        
        setTimeout(() => {
          setCurrentAdmin(adminDataToSet!);
          setIsAuthenticated(true);
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
        setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError(null);
    
    if (!currentAdmin) return;

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
        
        const emp = (globalData?.nhanViens || []).find((nv: any) => nv.fullName === currentAdmin.email);
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
      
      localStorage.setItem('currentAdmin', JSON.stringify({ ...currentAdmin, pin: newAdminPin }));
    } catch (error) {
      console.error(error);
      setAdminPinError('Lỗi khi đổi mã PIN');
    }
  };

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    localStorage.removeItem('currentAdmin');
  }, []);

  return {
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
  };
};
