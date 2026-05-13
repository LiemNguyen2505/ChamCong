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

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = workSchedules
      .filter(s => s.date === todayStr && !s.isOff && s.locationId === kioskBranch)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const now = new Date();
    const nowStr = format(now, 'HH:mm');

    if (type === 'check-in') {
      setSelectedShiftTime(nowStr);
      if (todayShifts.length > 0) {
        setScheduledShiftTime(todayShifts[0].startTime);
        setSelectedShiftId(todayShifts[0].id);
      }
    } else {
      setSelectedShiftTime(nowStr);
      if (latestLog?.selectedShiftId) {
        const currentShift = workSchedules.find(s => s.id === latestLog.selectedShiftId);
        if (currentShift) {
          setScheduledShiftTime(currentShift.endTime);
          setSelectedShiftId(currentShift.id);
        }
      }
    }

    // GPS Logic
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
          if (dist > 50) {
            toast.error(`Bạn ở quá xa (${Math.round(dist)}m). Hãy lại gần chi nhánh.`);
          }
        }
      }, () => {
        toast.error('Không thể lấy vị trí. Vui lòng bật GPS.');
      }, { enableHighAccuracy: true });
    }
  };

  const handleConfirmAction = async (capturedPhoto: string) => {
    if (!loggedInEmployee || !kioskBranch) return;
    setIsSubmitting(true);
    try {
      if (actionType === 'check-in') {
        const checkInDoc = {
          empId: loggedInEmployee.empId,
          fullName: loggedInEmployee.fullName,
          date: format(new Date(), 'yyyy-MM-dd'),
          checkInTime: selectedShiftTime,
          checkOutTime: null,
          locationId: kioskBranch,
          status: 'Present',
          note: note,
          photoCheckIn: capturedPhoto,
          gpsIn: coords, // Save GPS coords
          scheduledStartTime: scheduledShiftTime,
          selectedShiftId: selectedShiftId,
          isEmergency: emergencyManager !== '',
          emergencyManager: emergencyManager,
          baseRate: loggedInEmployee.hourlyRate,
          responsibilityBonus: loggedInEmployee.responsibilityBonus || 0,
          deviceId: localStorage.getItem('browser_device_id') || 'unknown'
        };
        await addDoc(collection(db, 'timesheets'), checkInDoc);
        toast.success('Vào ca thành công!');
      } else {
        if (!latestLog) return;
        await updateDoc(doc(db, 'timesheets', latestLog.id), {
          checkOutTime: selectedShiftTime,
          photoCheckOut: capturedPhoto,
          gpsOut: coords, // Save GPS coords
          noteCheckOut: note,
          scheduledEndTime: scheduledShiftTime,
          updatedAt: serverTimestamp()
        });
        toast.success('Ra ca thành công!');
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
    handleActionClick,
    handlePhotoCapture,
    handleConfirmAction
  };
};
