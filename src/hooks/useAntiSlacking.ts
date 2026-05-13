import { useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

export const useAntiSlacking = (
  loggedInEmployee: any,
  latestLog: any,
  admins: any[],
  kioskBranch: string | null
) => {
  const loggedInEmployeeRef = useRef(loggedInEmployee);
  const latestLogRef = useRef(latestLog);
  const adminsRef = useRef(admins);
  const kioskBranchRef = useRef(kioskBranch);

  useEffect(() => {
    loggedInEmployeeRef.current = loggedInEmployee;
    latestLogRef.current = latestLog;
    adminsRef.current = admins;
    kioskBranchRef.current = kioskBranch;
  }, [loggedInEmployee, latestLog, admins, kioskBranch]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      const currentLog = latestLogRef.current;
      const currentEmployee = loggedInEmployeeRef.current;
      const currentAdmins = adminsRef.current;

      if (!currentLog || currentLog.checkOutTime || !currentEmployee) return;

      // Logic immune roles
      const isAdmin = currentEmployee.empId.toUpperCase() === 'ADMIN' || 
                      currentAdmins.some(a => a.email === currentEmployee.fullName);
      const isImmuneRole = isAdmin && currentEmployee.fullName !== 'Nguyễn Thanh Liêm';
      
      if (isImmuneRole) return;

      if (document.hidden) {
        localStorage.setItem('lastHiddenTime', Date.now().toString());
      } else {
        const lastHiddenStr = localStorage.getItem('lastHiddenTime');
        if (lastHiddenStr) {
          const lastHidden = parseInt(lastHiddenStr, 10);
          const now = Date.now();
          const diffSeconds = (now - lastHidden) / 1000;
          const diffMinutesExact = diffSeconds / 60;
          
          if (diffSeconds >= 10) {
            try {
              const currentLan = currentLog.SoLanRoiApp || 0;
              const currentPenaltyTotal = currentLog.phonePenalty || 0;
              
              const newLan = currentLan + 1;
              let currentPenalty = 0;
              
              if (diffMinutesExact > 2 || newLan > 5) {
                const minutesToCharge = Math.ceil(diffMinutesExact);
                currentPenalty = minutesToCharge * 2000;
              }

              const newPenaltyTotal = currentPenaltyTotal + currentPenalty;

              await updateDoc(doc(db, 'timesheets', currentLog.id), {
                phonePenalty: newPenaltyTotal,
                SoLanRoiApp: newLan
              });

              if (newLan > 5) {
                await addDoc(collection(db, 'CanhBao'), {
                  empId: currentEmployee.empId,
                  fullName: currentEmployee.fullName,
                  locationId: kioskBranchRef.current || 'Unknown',
                  ThoiGian: new Date().toISOString(),
                  NoiDung: `Cảnh báo: Nhân viên sử dụng điện thoại lần thứ ${newLan} trong ngày.`
                });
              }
            } catch (error) {
              console.error('Error updating Phone Usage data:', error);
            }
          }
          localStorage.removeItem('lastHiddenTime');
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
};
