import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { Clock, CheckCircle, AlertCircle, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

import { EmployeeClock } from './employee/EmployeeClock';
import { SmartScheduleBuilder } from './SmartScheduleBuilder';
import { EmployeeRequests } from './employee/EmployeeRequests';
import { EmployeeHistory } from './employee/EmployeeHistory';
import { EmployeeSalaryDetails } from './employee/EmployeeSalaryDetails';
import { ChangePinModal, ResetPinModal, DeviceSecurityModal } from './employee/EmployeeAuthModals';
import { CheckinWarningModal, CheckoutSummaryModal, OvertimeReasonModal, EmergencyCheckInModal, ExtraSupportModal, OutsideScheduleModal, CheckoutWarningModal } from './employee/EmployeeAttendanceModals';
import { BranchSelection } from './employee/BranchSelection';
import { EmployeeHeader } from './employee/EmployeeHeader';
import { EmployeeLoginForm } from './employee/EmployeeLoginForm';
import { EmployeeAttendancePanel } from './employee/EmployeeAttendancePanel';
import { AttendanceActionForm } from './employee/AttendanceActionForm';
import { EmployeeViolationTracker } from './employee/EmployeeViolationTracker';

import { useEmployeeAuth } from '../hooks/useEmployeeAuth';
import { matchSchedulesForTimesheet } from '../utils/adminHelpers';
import { useEmployeeAttendance } from '../hooks/useEmployeeAttendance';
import { useEmployeeUI } from '../hooks/useEmployeeUI';
import { useAntiSlacking } from '../hooks/useAntiSlacking';
import { useEmployeeSalary } from '../hooks/useEmployeeSalary';

import { getBranchTheme } from '../utils/theme';

const BRANCHES = [
  { id: 'Góc Phố', name: 'Góc Phố', lat: 9.934713233832424, lng: 106.33866680984944 },
  { id: 'Phố Xanh', name: 'Phố Xanh', lat: 9.929620625180215, lng: 106.33961265587556 },
];

import { useNotifications } from '../hooks/useNotifications';
import { NotificationModal } from './NotificationModal';

export default function EmployeeView({
  globalData,
  fetchInitialData,
  isLoading
}: {
  globalData: any,
  fetchInitialData: (monthYear?: string, force?: any | string | string[], options?: { empId?: string, docId?: string, onlyToday?: boolean, exactDate?: string, branchId?: string }) => Promise<any>,
  isLoading: boolean
}) {
  const navigate = useNavigate();
  const [kioskBranch, setKioskBranch] = useState<string | null>(localStorage.getItem('kioskBranch'));
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const employees = globalData.nhanViens;
  const admins = globalData.admins;
  const payrollAdjustments = globalData.payrollAdjustments;
  const holidays = globalData.holidays;
  const monthTimesheets = useMemo(() => {
    return (globalData.chamCongs || []).map((cc: any) => {
      const emp = employees?.find((n:any) => n.empId === cc.empId || n.id === cc.empId);
      const possibleIds = emp ? [emp.id, emp.empId].filter(Boolean) : [cc.empId, cc.id];
      const daySchedules = (globalData.lichLamViecs || []).filter((s:any) => s.date === cc.date && possibleIds.includes(s.empId) && !s.isOff);
      return matchSchedulesForTimesheet(cc, daySchedules);
    });
  }, [globalData.chamCongs, globalData.lichLamViecs]);

  const workSchedules = useMemo(() => {
    return globalData.lichLamViecs.filter((s: any) => s.date === format(new Date(), 'yyyy-MM-dd'));
  }, [globalData.lichLamViecs]);

  const {
    loggedInEmployee, setLoggedInEmployee,
    isSubmitting: isAuthSubmitting,
    error: authError,
    successMsg, setSuccessMsg,
    empIdInput, setEmpIdInput,
    pinInput, setPinInput,
    showPin, setShowPin,
    showDeviceError, setShowDeviceError,
    handleLogin, handleLogout,
    handleConfirmDeviceChange,
    showChangePinModal, setShowChangePinModal,
    oldPin, setOldPin,
    newPin, setNewPin,
    confirmNewPin, setConfirmNewPin,
    showOldPin, setShowOldPin,
    showNewPin, setShowNewPin,
    showConfirmPin, setShowConfirmPin,
    showResetPinModal, setShowResetPinModal,
    resetEmpId, setResetEmpId,
    resetCccdLast4, setResetCccdLast4,
    resetNewPin, setResetNewPin,
    resetConfirmPin, setResetConfirmPin,
    showResetNewPin, setShowResetNewPin,
    showResetConfirmPin, setShowResetConfirmPin,
    handleResetPin,
    handleChangePin
  } = useEmployeeAuth(employees, admins, kioskBranch);

  const latestLog = useMemo(() => {
    if (!loggedInEmployee) return null;
    return monthTimesheets
      .filter((cc: any) => cc.empId === loggedInEmployee.empId)
      .sort((a: any, b: any) => {
        const dateB = b.date || '';
        const dateA = a.date || '';
        const timeB = b.checkInTime || '';
        const timeA = a.checkInTime || '';
        const combinedB = dateB + timeB;
        const combinedA = dateA + timeA;
        return combinedB.localeCompare(combinedA);
      })[0] || null;
  }, [monthTimesheets, loggedInEmployee]);

  const {
    actionType, setActionType,
    selectedShiftTime, setSelectedShiftTime,
    scheduledShiftTime, setScheduledShiftTime,
    selectedShiftId, setSelectedShiftId,
    note, setNote,
    photoData, setPhotoData,
    distance,
    isSubmitting: isAttendanceSubmitting,
    checkoutWarningStep, setCheckoutWarningStep,
    checkinWarningStep, setCheckinWarningStep,
    emergencyManager, setEmergencyManager,
    showEmergencyCheckInModal, setShowEmergencyCheckInModal,
    showOutsideScheduleModal, setShowOutsideScheduleModal,
    showExtraSupportModal, setShowExtraSupportModal,
    cameraRef,
    gpsError,
    handleActionClick,
    handlePhotoCapture,
    handleConfirmAction
  } = useEmployeeAttendance(loggedInEmployee, kioskBranch, globalData.lichLamViecs, latestLog, fetchInitialData, admins);



  const {
    showWeeklySchedule, setShowWeeklySchedule,
    showStats, setShowStats,
    showRequestModal, setShowRequestModal,
    showSalaryDetails, setShowSalaryDetails,
    showHistory, setShowHistory,
    showViolationModal, setShowViolationModal,
    requestType, setRequestType,
    requestNote, setRequestNote,
    advanceAmount, setAdvanceAmount,
    swapWithEmpId, setSwapWithEmpId,
    requestTime, setRequestTime,
    requestDate, setRequestDate,
    requestSubTime, setRequestSubTime,
    selectedCalendarDate, setSelectedCalendarDate,
    scheduleViewMode, setScheduleViewMode,
    teamScheduleBranch, setTeamScheduleBranch
  } = useEmployeeUI(kioskBranch, loggedInEmployee);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // 1. Fetch only today's data on login
  const hasFetchedTodayRef = useRef<string | null>(null);
  useEffect(() => {
    if (loggedInEmployee && hasFetchedTodayRef.current !== loggedInEmployee.empId) {
      hasFetchedTodayRef.current = loggedInEmployee.empId;
      fetchInitialData(undefined, ['admins', 'chamCongs', 'lichLamViecs'], { empId: loggedInEmployee.empId, docId: loggedInEmployee.id, onlyToday: true });
    }
  }, [loggedInEmployee, fetchInitialData]);

  // 2. Fetch full month data when switching to history or salary tabs
  const employeeHasFetchedMonthRef = useRef<string | null>(null);
  useEffect(() => {
    if (loggedInEmployee && (showHistory || showSalaryDetails || showStats)) {
      const lockKey = `${loggedInEmployee.empId}-${selectedMonth}-details`;
      if (employeeHasFetchedMonthRef.current !== lockKey) {
         employeeHasFetchedMonthRef.current = lockKey;
         fetchInitialData(selectedMonth, ['holidays', 'chamCongs', 'lichLamViecs', 'xinNghiPheps', 'payrollAdjustments', 'violations', 'salaryAdvanceRecords'], { empId: loggedInEmployee.empId, docId: loggedInEmployee.id });
      }
    }
  }, [showHistory, showSalaryDetails, showStats, selectedMonth, loggedInEmployee, fetchInitialData]);

  // 3. Fetch nhanViens when opening weekly schedule to show colleagues (schedule is handled by SmartScheduleBuilder onDateChange)
  const hasFetchedScheduleMonthRef = useRef<boolean>(false);
  useEffect(() => {
    if (loggedInEmployee && showWeeklySchedule && !hasFetchedScheduleMonthRef.current) {
      hasFetchedScheduleMonthRef.current = true;
      fetchInitialData(undefined, ['nhanViens']);
    }
  }, [showWeeklySchedule, loggedInEmployee, fetchInitialData]);

  // 4. Fetch full nhanViens when opening request modal (for shift swapping)
  const hasFetchedNhanViensForRequestRef = useRef<boolean>(false);
  useEffect(() => {
    if (loggedInEmployee && showRequestModal && !hasFetchedNhanViensForRequestRef.current) {
      hasFetchedNhanViensForRequestRef.current = true;
      // Fetch employees for the request modal so they can pick people to swap with ONLY. No need to fetch all schedules.
      fetchInitialData(undefined, ['nhanViens']);
    }
  }, [showRequestModal, selectedMonth, loggedInEmployee, fetchInitialData]);

  const employeeTodayShifts = useMemo(() => {
    if (!loggedInEmployee) return [];
    return globalData.lichLamViecs
      .filter((s: any) => s.date === format(new Date(), 'yyyy-MM-dd') && !s.isOff && (s.empId === loggedInEmployee.id || s.empId === loggedInEmployee.empId))
      .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
  }, [globalData.lichLamViecs, loggedInEmployee]);

  const isSubjectAdmin = loggedInEmployee?.empId?.toUpperCase() === 'ADMIN' || 
                         admins.some((a: any) => a.email === loggedInEmployee?.fullName);
                         
  const { monthlyStats, branchStats, activeBranches } = useEmployeeSalary(loggedInEmployee, monthTimesheets, payrollAdjustments, holidays, selectedMonth, globalData.violations, isSubjectAdmin);

  useAntiSlacking(loggedInEmployee, latestLog, admins, kioskBranch);

  const handleSecretTap = () => {
    setTapCount(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setTapCount(0), 1500);
  };

  useEffect(() => {
    if (tapCount >= 3) {
      setTapCount(0);
      localStorage.setItem('adminFilterBranch', kioskBranch || 'All');
      if (loggedInEmployee) {
        const adminAccount = admins.find(a => (a.email === loggedInEmployee.fullName || a.phone === loggedInEmployee.phone));
        if (adminAccount) {
          localStorage.setItem('currentAdmin', JSON.stringify(adminAccount));
          navigate('/admin');
          return;
        }
      }
      localStorage.removeItem('currentAdmin');
      navigate('/admin');
    }
  }, [tapCount, navigate, kioskBranch, loggedInEmployee, admins]);

  const handleSetKioskBranch = (branchId: string) => {
    localStorage.setItem('kioskBranch', branchId);
    setKioskBranch(branchId);
  };

  const handleBackToBranchSelection = () => {
    localStorage.removeItem('kioskBranch');
    setKioskBranch(null);
    handleLogout();
  };

  const currentUserAdmin = useMemo(() => {
    if (!loggedInEmployee) return null;
    return admins.find(a => 
      (a.email === loggedInEmployee.fullName || a.phone === loggedInEmployee.phone) ||
      (a.role === 'Manager' && a.locationIds?.includes(kioskBranch))
    );
  }, [loggedInEmployee, admins, kioskBranch]);

  const { notifications: navNotifications, markAsRead, markAllAsRead } = useNotifications(
    currentUserAdmin ? (currentUserAdmin.role === 'SuperAdmin' ? 'SuperAdmin' : 'BranchAdmin') : 'Employee',
    loggedInEmployee?.id,
    [kioskBranch || '']
  );

  const [showNotifications, setShowNotifications] = useState(false);

  const theme = getBranchTheme(kioskBranch);

  const checkInAction = () => {
    if (latestLog && !latestLog.checkOutTime) {
      toast.error('Bạn đang trong ca làm việc. Vui lòng Kết thúc ca trước khi thao tác.');
      return false;
    }
    return true;
  };

  const handleLogoutWithCheck = () => {
    if (!checkInAction()) return;
    handleLogout();
  };

  const handleToggleTask = async (shiftId: string, taskId: string, isCompleted: boolean) => {
    try {
      const shift = globalData.lichLamViecs.find((s: any) => s.id === shiftId);
      if (!shift || !shift.tasks) return;
      const updatedTasks = shift.tasks.map((t: any) => t.id === taskId ? { ...t, isCompleted } : t);
      await updateDoc(doc(db, 'LichLamViec', shiftId), { tasks: updatedTasks });
    } catch (err) {
      toast.error('Không thể cập nhật nhiệm vụ.');
    }
  };

  if (!kioskBranch) {
    return (
      <BranchSelection 
        branches={BRANCHES}
        kioskBranch={kioskBranch}
        onSelectBranch={handleSetKioskBranch}
        handleSecretTap={handleSecretTap}
        navigate={navigate}
        theme={theme}
      />
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col font-sans relative`}>
      <EmployeeHeader 
        branchName={kioskBranch}
        onBranchReset={handleBackToBranchSelection}
        loggedInEmployee={loggedInEmployee}
        theme={theme}
        onShowChangePin={() => setShowChangePinModal(true)}
        onLogout={handleLogoutWithCheck}
        handleSecretTap={handleSecretTap}
        notifications={navNotifications}
        onShowNotifications={() => setShowNotifications(true)}
      />

      <div className="flex-1 flex flex-col justify-start items-center w-full overflow-y-auto pt-4 px-3">
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 mb-6 px-3 py-6" style={{ marginTop: '-13px' }}>
          {successMsg && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start">
              <CheckCircle className="w-5 h-5 mr-3 mt-0.5" />
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {authError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start">
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5" />
              <p className="font-medium">{authError}</p>
            </div>
          )}

          {!actionType ? (
            !loggedInEmployee ? (
              <EmployeeLoginForm 
                theme={theme}
                empIdInput={empIdInput}
                setEmpIdInput={setEmpIdInput}
                pinInput={pinInput}
                setPinInput={setPinInput}
                showPin={showPin}
                setShowPin={setShowPin}
                isSubmitting={isAuthSubmitting}
                error={authError}
                showDeviceError={showDeviceError}
                onLogin={handleLogin}
                setShowResetPinModal={setShowResetPinModal}
                kioskBranch={kioskBranch || ''}
              />
            ) : (
              <EmployeeAttendancePanel 
                loggedInEmployee={loggedInEmployee}
                kioskBranch={kioskBranch}
                admins={admins}
                theme={theme}
                employees={employees}
                latestLog={latestLog}
                workSchedules={workSchedules}
                monthlyStats={monthlyStats}
                showStats={showStats}
                setShowStats={setShowStats}
                setShowWeeklySchedule={setShowWeeklySchedule}
                setShowRequestModal={setShowRequestModal}
                setShowSalaryDetails={setShowSalaryDetails}
                setShowHistory={setShowHistory}
                setShowViolationModal={setShowViolationModal}
                handleActionClick={handleActionClick}
                handleToggleTask={handleToggleTask}
                setRequestType={setRequestType}
                setRequestNote={setRequestNote}
                setSwapWithEmpId={setSwapWithEmpId}
                setRequestTime={setRequestTime}
                setRequestSubTime={setRequestSubTime}
                setRequestDate={setRequestDate}
                format={format}
                selectedMonth={selectedMonth}
                globalData={globalData}
                onRefresh={() => fetchInitialData(undefined, ['bulletinNotes', 'chamCongs', 'lichLamViecs'], { empId: loggedInEmployee?.empId, docId: loggedInEmployee?.id, onlyToday: true })}
              />
            )
          ) : (
            <AttendanceActionForm 
              actionType={actionType}
              theme={theme}
              distance={distance}
              MAX_DISTANCE_METERS={50}
              photoData={photoData}
              cameraRef={cameraRef}
              handlePhotoCapture={handlePhotoCapture}
              todayShifts={employeeTodayShifts}
              selectedShiftId={selectedShiftId}
              setSelectedShiftId={setSelectedShiftId}
              setScheduledShiftTime={setScheduledShiftTime}
              selectedShiftTime={selectedShiftTime}
              setSelectedShiftTime={setSelectedShiftTime}
              note={note}
              setNote={setNote}
              gpsError={gpsError}
              onCancel={() => setActionType(null)}
              onConfirm={() => {
                const isAdmin = loggedInEmployee?.empId?.toUpperCase() === 'ADMIN' || 
                                admins.some(a => a.email === loggedInEmployee?.fullName);
                if (!isAdmin && distance !== null && distance > 50) {
                  toast.error('Bạn ở quá xa chi nhánh. Vui lòng di chuyển đến quán để chấm công.');
                  return;
                }

                if (actionType === 'check-in') {
                  if (emergencyManager) {
                    cameraRef.current?.capturePhoto();
                    return;
                  }
                  
                  const selectedShift = employeeTodayShifts.find(s => s.id === selectedShiftId);
                  if (!selectedShiftId || (selectedShift && selectedShift.locationId !== kioskBranch)) {
                    setShowOutsideScheduleModal(true);
                    return;
                  }

                  const now = new Date();
                  const [selH, selM] = selectedShiftTime.split(':').map(Number);
                  const selTotal = selH * 60 + selM;
                  const [schH, schM] = (scheduledShiftTime || '00:00').split(':').map(Number);
                  const schTotal = schH * 60 + schM;
                  const nowTotal = now.getHours() * 60 + now.getMinutes();

                  if (selTotal < schTotal - 30) {
                    setCheckinWarningStep(1); // Sớm hơn 30p
                    return;
                  } else if (selTotal > schTotal) {
                    setCheckinWarningStep(2); // Trễ
                    return;
                  }
                  
                  cameraRef.current?.capturePhoto();
                } else {
                  if (emergencyManager) {
                    cameraRef.current?.capturePhoto();
                    return;
                  }

                  const now = new Date();
                  const [selH, selM] = selectedShiftTime.split(':').map(Number);
                  let selTotal = selH * 60 + selM;
                  const [schH, schM] = (scheduledShiftTime || '00:00').split(':').map(Number);
                  const schTotal = schH * 60 + schM;

                  const inDateStr = latestLog?.date || format(now, 'yyyy-MM-dd');
                  if (inDateStr !== format(now, 'yyyy-MM-dd')) {
                    // Check out is on a different day than check in
                    const inDateObj = new Date(inDateStr);
                    const diffDays = Math.floor((now.getTime() - inDateObj.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0) {
                      selTotal += (diffDays || 1) * 24 * 60;
                    }
                  }

                  if (selTotal < schTotal) {
                    setCheckoutWarningStep(1); // Ra ca sớm
                    return;
                  }

                  // Bypass checkout reason if shift was outside schedule (emergency or pending_approval)
                  if (
                    selTotal > schTotal + 30 && 
                    note.trim() === '' && 
                    !latestLog?.isEmergency && 
                    latestLog?.status !== 'pending_approval' &&
                    latestLog?.selectedShiftId
                  ) {
                    setCheckoutWarningStep(4); // Tăng ca cần ghi chú
                    return;
                  }
                  
                  cameraRef.current?.capturePhoto();
                }
              }}
              isSubmitting={isAttendanceSubmitting}
              latestLog={latestLog}
              workSchedules={globalData.lichLamViecs}
              format={format}
              scheduledShiftTime={scheduledShiftTime}
            />
          )}
        </div>

        {loggedInEmployee && !actionType && (
          <div className="w-full max-w-md mb-8">
            {/* Inline violation tracker removed - now in modal */}
          </div>
        )}
      </div>

      {/* Violation Tracker Modal */}
      <AnimatePresence>
        {showViolationModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
              <div className={`relative p-6 pb-4 ${theme.accent} border-b border-white/10 shrink-0`}>
                <div className="flex items-center justify-between relative z-10">
                  <div className="space-y-0.5">
                    <h3 className="font-black text-xl uppercase tracking-tight text-white drop-shadow-sm">
                      TRÁCH NHIỆM & VI PHẠM
                    </h3>
                    <div className="h-1 w-10 bg-white rounded-full shadow-sm" />
                  </div>
                  <button 
                    onClick={() => setShowViolationModal(false)} 
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all shadow-sm hover:shadow-md active:scale-90"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto p-4 custom-scrollbar">
                <EmployeeViolationTracker 
                  theme={theme}
                  employeeInfo={loggedInEmployee}
                  violations={(globalData.violations || []).filter((v: any) => 
                    (v.empId === loggedInEmployee?.id || v.empId === loggedInEmployee?.empId) && 
                    v.monthYear === format(new Date(), 'yyyy-MM')
                  )}
                  monthlyStats={monthlyStats}
                  onRefresh={() => fetchInitialData(format(new Date(), 'yyyy-MM'), ['violations'], { empId: loggedInEmployee?.empId, docId: loggedInEmployee?.id })}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <EmployeeSalaryDetails
        showSalaryDetails={showSalaryDetails}
        setShowSalaryDetails={setShowSalaryDetails}
        loggedInEmployee={loggedInEmployee}
        theme={theme}
        monthlyStats={monthlyStats}
        branchStats={branchStats}
        activeBranches={activeBranches}
        monthTimesheets={monthTimesheets}
        payrollAdjustments={payrollAdjustments}
        holidays={holidays}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        fetchInitialData={fetchInitialData}
        violations={globalData.violations || []}
      />

      <DeviceSecurityModal
        showDeviceError={showDeviceError}
        setShowDeviceError={setShowDeviceError}
        theme={theme}
        handleConfirmDeviceChange={handleConfirmDeviceChange}
        isSubmitting={isAuthSubmitting}
      />

      <ChangePinModal
        showChangePinModal={showChangePinModal}
        setShowChangePinModal={setShowChangePinModal}
        loggedInEmployee={loggedInEmployee}
        theme={theme}
        handleChangePin={handleChangePin}
        oldPin={oldPin}
        setOldPin={setOldPin}
        newPin={newPin}
        setNewPin={setNewPin}
        confirmNewPin={confirmNewPin}
        setConfirmNewPin={setConfirmNewPin}
        showOldPin={showOldPin}
        setShowOldPin={setShowOldPin}
        showNewPin={showNewPin}
        setShowNewPin={setShowNewPin}
        showConfirmPin={showConfirmPin}
        setShowConfirmPin={setShowConfirmPin}
        error={authError}
        setError={() => {}}
      />

      <ResetPinModal
        showResetPinModal={showResetPinModal}
        setShowResetPinModal={setShowResetPinModal}
        theme={theme}
        handleResetPin={handleResetPin}
        resetEmpId={resetEmpId}
        setResetEmpId={setResetEmpId}
        resetCccdLast4={resetCccdLast4}
        setResetCccdLast4={setResetCccdLast4}
        resetNewPin={resetNewPin}
        setResetNewPin={setResetNewPin}
        resetConfirmPin={resetConfirmPin}
        setResetConfirmPin={setResetConfirmPin}
        showResetNewPin={showResetNewPin}
        setShowResetNewPin={setShowResetNewPin}
        showResetConfirmPin={showResetConfirmPin}
        setShowResetConfirmPin={setShowResetConfirmPin}
        isSubmitting={isAuthSubmitting}
      />

      <EmergencyCheckInModal
        showEmergencyCheckInModal={showEmergencyCheckInModal}
        setShowEmergencyCheckInModal={setShowEmergencyCheckInModal}
        theme={theme}
        emergencyManager={emergencyManager}
        setEmergencyManager={setEmergencyManager}
        outsideScheduleReason={note}
        setOutsideScheduleReason={setNote}
        admins={admins}
        kioskBranch={kioskBranch}
        onConfirm={() => {
          setShowEmergencyCheckInModal(false);
          cameraRef.current?.capturePhoto();
        }}
        onCancel={() => {
          setShowEmergencyCheckInModal(false);
          setActionType(null);
        }}
      />

      <EmployeeHistory
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        loggedInEmployee={loggedInEmployee}
        theme={theme}
        monthTimesheets={monthTimesheets}
        monthlyStats={monthlyStats}
        branchStats={branchStats}
        activeBranches={activeBranches}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        fetchInitialData={fetchInitialData}
        isSubjectAdmin={isSubjectAdmin}
      />

      <NotificationModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={navNotifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        adminTheme={theme}
      />

      {showWeeklySchedule && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-300">
          <div className={`p-4 ${theme.accent} border-b border-white/10 flex items-center gap-3 shadow-lg flex-shrink-0`}>
            <button 
              onClick={() => setShowWeeklySchedule(false)}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-widest leading-none">Quay lại</h2>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">Đội ngũ {teamScheduleBranch}</p>
            </div>
          </div>
          <div className="flex-1 bg-white overflow-hidden flex flex-col p-1 md:p-4">
            <SmartScheduleBuilder
              employees={employees || []}
              schedules={globalData.lichLamViecs}
              currentBranchFilter={teamScheduleBranch === 'All' ? (loggedInEmployee?.locationId || 'Góc Phố') : teamScheduleBranch}
              managedBranches={BRANCHES.map(b => b.id)}
              onAddShift={async () => {}}
              onUpdateShift={async () => {}}
              onDeleteShift={async () => {}}
              isReadOnly={true}
              planningGoals={[]}
              onDateChange={(date) => {
                fetchInitialData(undefined, ['lichLamViecs'], { exactDate: date, branchId: teamScheduleBranch === 'All' ? loggedInEmployee?.locationId : teamScheduleBranch });
              }}
            />
          </div>
        </div>
      )}

      <EmployeeRequests
        showRequestModal={showRequestModal}
        setShowRequestModal={setShowRequestModal}
        loggedInEmployee={loggedInEmployee}
        theme={theme}
        employees={employees || []}
        allSchedules={globalData.lichLamViecs || []}
        kioskBranch={kioskBranch}
        requestType={requestType}
        setRequestType={setRequestType}
        requestNote={requestNote}
        setRequestNote={setRequestNote}
        advanceAmount={advanceAmount}
        setAdvanceAmount={setAdvanceAmount}
        swapWithEmpId={swapWithEmpId}
        setSwapWithEmpId={setSwapWithEmpId}
        requestDate={requestDate}
        setRequestDate={setRequestDate}
        requestTime={requestTime}
        setRequestTime={setRequestTime}
        requestSubTime={requestSubTime}
        setRequestSubTime={setRequestSubTime}
      />

      <CheckinWarningModal
        checkinWarningStep={checkinWarningStep}
        setCheckinWarningStep={setCheckinWarningStep}
        selectedShiftTime={selectedShiftTime}
        scheduledShiftTime={scheduledShiftTime}
        monthlyStats={monthlyStats}
        theme={theme}
        onConfirm={() => {
          setCheckinWarningStep(0);
          cameraRef.current?.capturePhoto();
        }}
      />

      <OutsideScheduleModal
        showOutsideScheduleModal={showOutsideScheduleModal}
        setShowOutsideScheduleModal={setShowOutsideScheduleModal}
        theme={theme}
        outsideScheduleReason={note}
        setOutsideScheduleReason={setNote}
        onConfirm={() => {
          setShowOutsideScheduleModal(false);
          const isNativeBranch = loggedInEmployee?.locationId === kioskBranch || (loggedInEmployee?.locationIds && loggedInEmployee.locationIds.includes(kioskBranch));
          if (isNativeBranch) {
            cameraRef.current?.capturePhoto();
          } else {
            setShowEmergencyCheckInModal(true);
          }
        }}
      />

      <CheckoutWarningModal
        checkoutWarningStep={checkoutWarningStep}
        setCheckoutWarningStep={setCheckoutWarningStep}
        selectedShiftTime={selectedShiftTime}
        scheduledShiftTime={scheduledShiftTime}
        theme={theme}
        onConfirm={() => {
          setCheckoutWarningStep(0);
          cameraRef.current?.capturePhoto();
        }}
      />

      <OvertimeReasonModal
        checkoutWarningStep={checkoutWarningStep}
        setCheckoutWarningStep={setCheckoutWarningStep}
        note={note}
        setNote={setNote}
        theme={theme}
        onConfirm={() => {
          setCheckoutWarningStep(0);
          cameraRef.current?.capturePhoto();
        }}
      />

      <ExtraSupportModal
        showExtraSupportModal={showExtraSupportModal}
        setShowExtraSupportModal={setShowExtraSupportModal}
        theme={theme}
        kioskBranch={kioskBranch}
        BRANCHES={BRANCHES}
      />
    </div>
  );
}
