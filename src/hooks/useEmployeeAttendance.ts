import { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { calculateDistance } from '../utils/geo';
import { CameraCaptureRef } from '../components/CameraCapture';

export const useEmployeeAttendance = (
  loggedInEmployee: any,
  kioskBranch: string | null,
  workSchedules: any[],
  latestLog: any,
  fetchInitialData: (monthYear?: string, force?: boolean) => Promise<any>,
  admins: any[]
) => {
  const [actionType, setActionType] = useState<'check-in' | 'check-out' | null>(null);
  const [selectedShiftTime, setSelectedShiftTime] = useState<string>('');
  const [scheduledShiftTime, setScheduledShiftTime] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutWarningStep, setCheckoutWarningStep] = useState(0);
  const [checkinWarningStep, setCheckinWarningStep] = useState(0);
  const [emergencyManager, setEmergencyManager] = useState('');
  const [showEmergencyCheckInModal, setShowEmergencyCheckInModal] = useState(false);
  const [showOutsideScheduleModal, setShowOutsideScheduleModal] = useState(false);
  const [showExtraSupportModal, setShowExtraSupportModal] = useState(false);
  const [checkinWarningModalStep, setCheckinWarningModalStep] = useState(0);
  const cameraRef = useRef<CameraCaptureRef>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const BRANCHES = [
    { id: 'Góc Phố', name: 'Góc Phố', lat: 9.934713233832424, lng: 106.33866680984944 },
    { id: 'Phố Xanh', name: 'Phố Xanh', lat: 9.929620625180215, lng: 106.33961265587556 },
  ];

  const handleActionClick = (type: 'check-in' | 'check-out') => {
    if (!loggedInEmployee || !kioskBranch) return;
    
    setActionType(type);
    setPhotoData(null);
    setNote('');
    setEmergencyManager('');
    setCoords(null);
    setGpsError(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = workSchedules
      .filter(s => s.date === todayStr && !s.isOff && s.locationId === kioskBranch && s.empId === loggedInEmployee.id)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const now = new Date();
    const nowStr = format(now, 'HH:mm');
    const nowTotal = now.getHours() * 60 + now.getMinutes();

    let matchedShift = todayShifts.length > 0 ? todayShifts[0] : null;
    if (todayShifts.length > 0) {
      // Find the shift that is closest to current time, or where current time is within or right before the shift
      for (const shift of todayShifts) {
        const [schH, schM] = shift.startTime.split(':').map(Number);
        const [endH, endM] = shift.endTime.split(':').map(Number);
        const schTotal = schH * 60 + schM;
        const endTotal = endH * 60 + endM;
        // If current time is less than endTime, we can consider this shift!
        if (nowTotal <= endTotal + 60) { // allow up to 1 hour after shift ends to still select it (though unlikely to checkin)
           matchedShift = shift;
           // If we are somewhat close to the start time (e.g. within 2 hours before or currently during it)
           if (nowTotal >= schTotal - 120 && nowTotal <= endTotal + 60) {
             break; // Perfect match
           }
        }
      }
    }

    if (type === 'check-in') {
      setSelectedShiftTime(nowStr);
      if (matchedShift) {
        setScheduledShiftTime(matchedShift.startTime);
        setSelectedShiftId(matchedShift.id);
      }
    } else {
      setSelectedShiftTime(nowStr);
      if (latestLog?.selectedShiftId) {
        const currentShift = workSchedules.find(s => s.id === latestLog.selectedShiftId);
        if (currentShift) {
          setScheduledShiftTime(currentShift.endTime);
          setSelectedShiftId(currentShift.id);
        }
      } else if (matchedShift) {
        setScheduledShiftTime(matchedShift.endTime);
        setSelectedShiftId(matchedShift.id);
      }
    }
  };

  const handleConfirmAction = async (capturedPhoto: string) => {
    if (!loggedInEmployee || !kioskBranch) return;
    setIsSubmitting(true);
    try {
      if (actionType === 'check-in') {
        let lateMinutes = 0;
        let latePenaltyMinutes = 0;
        const isAdmin = loggedInEmployee.empId.toUpperCase() === 'ADMIN' || 
                        admins.some(a => a.email === loggedInEmployee.fullName);
        
        let isExtraShift = !scheduledShiftTime && !isAdmin;
        let finalCheckInTime = selectedShiftTime;
                        
        if (scheduledShiftTime) {
          const [schH, schM] = scheduledShiftTime.split(':').map(Number);
          const [selH, selM] = selectedShiftTime.split(':').map(Number);
          const selTotal = selH * 60 + selM;
          const schTotal = schH * 60 + schM;
          if (selTotal > schTotal) {
            lateMinutes = selTotal - schTotal;
            if (lateMinutes >= 10 && !isAdmin) {
                latePenaltyMinutes = lateMinutes * 3;
            }
          } else if (selTotal < schTotal) {
            const earlyMinutes = schTotal - selTotal;
            if (earlyMinutes <= 30) {
              finalCheckInTime = scheduledShiftTime; // Clamp to scheduled time
            } else {
              if (!isAdmin) isExtraShift = true; // Early more than 30 mins
            }
          }
        }
        
        const checkInDoc = {
          empId: loggedInEmployee.empId,
          fullName: loggedInEmployee.fullName,
          date: format(new Date(), 'yyyy-MM-dd'),
          checkInTime: finalCheckInTime,
          actualCheckInTime: selectedShiftTime, // Preserve real time just in case
          checkOutTime: null,
          locationId: kioskBranch,
          status: isExtraShift ? 'pending_approval' : 'Present',
          note: note,
          photoCheckIn: capturedPhoto,
          gpsIn: coords, // Save GPS coords
          scheduledStartTime: scheduledShiftTime,
          selectedShiftId: selectedShiftId,
          isEmergency: emergencyManager !== '',
          emergencyManager: emergencyManager,
          baseRate: loggedInEmployee.hourlyRate,
          responsibilityBonus: loggedInEmployee.responsibilityBonus || 0,
          deviceId: localStorage.getItem('browser_device_id') || 'unknown',
          lateMinutes: lateMinutes,
          latePenaltyMinutes: latePenaltyMinutes
        };
        const newDocRef = await addDoc(collection(db, 'timesheets'), checkInDoc);
        
        if (isExtraShift) {
          await addDoc(collection(db, 'Notifications'), {
            recipientId: 'admin',
            locationId: kioskBranch,
            title: 'Ca phát sinh (Ngoài lịch)',
            message: `Nhân viên ${loggedInEmployee.fullName} đã vào ca không có trong lịch làm việc. Vui lòng kiểm tra và duyệt giờ công.`,
            type: 'approval',
            priority: 'high',
            isRead: false,
            createdAt: serverTimestamp(),
            senderId: loggedInEmployee.emId || loggedInEmployee.id,
            relatedId: newDocRef.id
          });
        }
        
        toast.success(isExtraShift ? 'Vào ca thành công! (Ca ngoài lịch, chờ duyệt)' : 'Vào ca thành công!');
      } else {
        if (!latestLog) return;
        
        let totalHours = 0;
        let totalPay = 0;
        const checkInTimeStr = latestLog.checkInTime || scheduledShiftTime;
        let updateData: any = {
          photoCheckOut: capturedPhoto,
          gpsOut: coords, // Save GPS coords
          noteCheckOut: note,
          scheduledEndTime: scheduledShiftTime,
          updatedAt: serverTimestamp()
        };

        if (checkInTimeStr) {
          const checkInDate = new Date(`${latestLog.date}T${checkInTimeStr}`);
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const checkOutDate = new Date(`${todayStr}T${selectedShiftTime}`);
          
          let diffMs = checkOutDate.getTime() - checkInDate.getTime();
          
          // Allow up to 16 hours for a single shift (e.g., night shift)
          if (diffMs > 0 && diffMs <= 16 * 60 * 60 * 1000) {
            totalHours = diffMs / (1000 * 60 * 60);
            totalPay = totalHours * (loggedInEmployee.hourlyRate || 0);
            updateData.checkOutTime = selectedShiftTime;
            updateData.totalHours = totalHours;
            updateData.totalPay = totalPay;
          } else {
            // Quên bấm RA CA và để giờ trôi
            updateData.checkOutTime = selectedShiftTime;
            updateData.totalHours = 0;
            updateData.totalPay = 0;
            updateData.isAbandonedShift = false; // We can keep this false, user just gets 0 hours
            // They will do a request to correct this.
          }
        } else {
            updateData.checkOutTime = selectedShiftTime;
            updateData.totalHours = 0;
            updateData.totalPay = 0;
        }

        await updateDoc(doc(db, 'timesheets', latestLog.id), updateData);
        
        if (latestLog?.checkInTime && updateData.totalHours === 0) {
          toast.error('Không được ghi nhận giờ công do quên bấm RA CA! Vui lòng làm YÊU CẦU QUÊN CHẤM CÔNG gửi Quản lý.', { duration: 8000 });
        } else {
          toast.success('Ra ca thành công!');
        }
      }
      setActionType(null);
      setPhotoData(null);
      await fetchInitialData(undefined, true);
    } catch (error) {
      toast.error('Lỗi khi lưu dữ liệu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoCapture = (data: string) => {
    setPhotoData(data);
    handleConfirmAction(data); // Auto-confirm on capture
  };

  useEffect(() => {
    if (!actionType) {
      setDistance(null);
      setCoords(null);
      return;
    }

    if (!kioskBranch || !loggedInEmployee) return;

    const isAdmin = loggedInEmployee.empId.toUpperCase() === 'ADMIN' || 
                    admins.some(a => a.email === loggedInEmployee.fullName);
    
    if (isAdmin) {
      setDistance(0);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        const branch = BRANCHES.find(b => b.id === kioskBranch);
        if (branch) {
          const dist = calculateDistance(
            latitude,
            longitude,
            branch.lat,
            branch.lng
          );
          setDistance(dist);
        }
      }, (error) => {
        console.error('GPS Error:', error);
        const errMsg = 'Không thể lấy vị trí. Vui lòng bật định vị hoặc cấp quyền cho trình duyệt!';
        toast.error(errMsg);
        setGpsError(errMsg);
        
        // Cố gắng reset distance để tắt trạng thái loading nếu nó đã được định nghĩa là null 
        // Thay vào đó, ui đã tự tắt loading ở AttendanceActionForm nhờ gpsError
      }, { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 });
    }
  }, [actionType, kioskBranch, loggedInEmployee, admins]);

  return {
    actionType, setActionType,
    selectedShiftTime, setSelectedShiftTime,
    scheduledShiftTime, setScheduledShiftTime,
    selectedShiftId, setSelectedShiftId,
    note, setNote,
    photoData, setPhotoData,
    distance,
    isSubmitting, setIsSubmitting,
    checkoutWarningStep, setCheckoutWarningStep,
    checkinWarningStep, setCheckinWarningStep,
    emergencyManager, setEmergencyManager,
    showEmergencyCheckInModal, setShowEmergencyCheckInModal,
    showOutsideScheduleModal, setShowOutsideScheduleModal,
    showExtraSupportModal, setShowExtraSupportModal,
    checkinWarningModalStep, setCheckinWarningModalStep,
    cameraRef,
    gpsError,
    handleActionClick,
    handlePhotoCapture,
    handleConfirmAction
  };
};
