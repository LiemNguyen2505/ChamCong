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
              const currentLan = Number(currentLog.SoLanRoiApp) || 0;
              const currentPenaltyTotal = Number(currentLog.phonePenalty) || 0;
              const currentPhut = Number(currentLog.phoneMinutes) || Number(currentLog.PhutPhatRoiApp) || 0;
              const hourlyRate = Number(currentEmployee.hourlyRate) || 0;
              
              const newLan = currentLan + 1;
              let currentPenalty = 0;
              let minutesToCharge = 0;
              let hasViolation = currentLog.hasPhoneViolation || false;
              
              // Rule: Penalty money if a single session > 3 minutes OR if usage count > 3 times
              if (diffMinutesExact > 3 || newLan > 3) {
                minutesToCharge = Math.ceil(diffMinutesExact);
                // Formula: minutes * 3 * (hourly_rate / 60)
                currentPenalty = Math.round(minutesToCharge * 3 * (hourlyRate / 60));
                hasViolation = true;
              }

              const newPenaltyTotal = currentPenaltyTotal + currentPenalty;
              const newPhut = currentPhut + (minutesToCharge || Math.ceil(diffMinutesExact));

              await updateDoc(doc(db, 'timesheets', currentLog.id), {
                phonePenalty: newPenaltyTotal,
                SoLanRoiApp: newLan,
                phoneMinutes: newPhut,
                PhutPhatRoiApp: newPhut,
                hasPhoneViolation: hasViolation
              });

              if (newLan > 3 || diffMinutesExact > 3) {
                await addDoc(collection(db, 'CanhBao'), {
                  empId: currentEmployee.empId,
                  fullName: currentEmployee.fullName,
                  locationId: kioskBranchRef.current || 'Unknown',
                  ThoiGian: new Date().toISOString(),
                  NoiDung: diffMinutesExact > 3 
                    ? `Cảnh báo: Sử dụng điện thoại ${Math.ceil(diffMinutesExact)} phút (> 3 phút). Phạt: ${new Intl.NumberFormat('vi-VN').format(currentPenalty)}đ`
                    : `Cảnh báo: Sử dụng điện thoại lần thứ ${newLan} trong ca. Phạt: ${new Intl.NumberFormat('vi-VN').format(currentPenalty)}đ`
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
