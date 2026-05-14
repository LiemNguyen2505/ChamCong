import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

import { EmployeeClock } from './employee/EmployeeClock';
import { EmployeeSchedule } from './employee/EmployeeSchedule';
import { EmployeeRequests } from './employee/EmployeeRequests';
import { EmployeeHistory } from './employee/EmployeeHistory';
import { EmployeeSalaryDetails } from './employee/EmployeeSalaryDetails';
import { ChangePinModal, ResetPinModal, DeviceSecurityModal } from './employee/EmployeeAuthModals';
import { CheckinWarningModal, CheckoutSummaryModal, OvertimeReasonModal, EmergencyCheckInModal, ExtraSupportModal, OutsideScheduleModal } from './employee/EmployeeAttendanceModals';
import { BranchSelection } from './employee/BranchSelection';
import { EmployeeHeader } from './employee/EmployeeHeader';
import { EmployeeLoginForm } from './employee/EmployeeLoginForm';
import { EmployeeAttendancePanel } from './employee/EmployeeAttendancePanel';
import { AttendanceActionForm } from './employee/AttendanceActionForm';
import { EmployeeViolationTracker } from './employee/EmployeeViolationTracker';

import { useEmployeeAuth } from '../hooks/useEmployeeAuth';
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
  fetchInitialData: (monthYear?: string, force?: boolean) => Promise<any>,
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
  const monthTimesheets = globalData.chamCongs;
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
    return globalData.chamCongs
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
  }, [globalData.chamCongs, loggedInEmployee]);

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
    handleActionClick,
    handlePhotoCapture,
    handleConfirmAction
  } = useEmployeeAttendance(loggedInEmployee, kioskBranch, globalData.lichLamViecs, latestLog, fetchInitialData, admins);

  useEffect(() => {
    if (loggedInEmployee && loggedInEmployee.locationId) {
      if (loggedInEmployee.locationId !== kioskBranch) {
        setKioskBranch(loggedInEmployee.locationId);
        localStorage.setItem('kioskBranch', loggedInEmployee.locationId);
      }
    }
  }, [loggedInEmployee, kioskBranch]);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { monthlyStats } = useEmployeeSalary(loggedInEmployee, monthTimesheets, payrollAdjustments, holidays, selectedMonth);

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
  } = useEmployeeUI(kioskBranch);

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

  const { notifications: navNotifications, markAsRead, markAllAsRead } = useNotifications(
    'Employee',
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
              todayShifts={workSchedules}
              selectedShiftId={selectedShiftId}
              setSelectedShiftId={setSelectedShiftId}
              setScheduledShiftTime={setScheduledShiftTime}
              selectedShiftTime={selectedShiftTime}
              setSelectedShiftTime={setSelectedShiftTime}
              note={note}
              setNote={setNote}
              onCancel={() => setActionType(null)}
              onConfirm={() => {
                if (actionType === 'check-in') {
                  if (emergencyManager) {
                    cameraRef.current?.capturePhoto();
                    return;
                  }
                  cameraRef.current?.capturePhoto();
                } else {
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
                  violations={(globalData.violations || []).filter((v: any) => 
                    (v.empId === loggedInEmployee?.id || v.empId === loggedInEmployee?.empId) && 
                    v.monthYear === format(new Date(), 'yyyy-MM')
                  )}
                  onRefresh={() => fetchInitialData(format(new Date(), 'yyyy-MM'))}
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
        emergencyManager={emergencyManager}
        setEmergencyManager={setEmergencyManager}
        theme={theme}
        admins={admins}
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
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        fetchInitialData={fetchInitialData}
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
        <EmployeeSchedule
          showWeeklySchedule={showWeeklySchedule}
          setShowWeeklySchedule={setShowWeeklySchedule}
          teamScheduleBranch={teamScheduleBranch}
          setTeamScheduleBranch={setTeamScheduleBranch}
          allSchedules={globalData.lichLamViecs}
          employees={employees}
          selectedCalendarDate={selectedCalendarDate}
          setSelectedCalendarDate={setSelectedCalendarDate}
          scheduleZoom={1}
          setScheduleZoom={() => {}}
          scheduleViewMode={scheduleViewMode}
          setScheduleViewMode={setScheduleViewMode}
          loggedInEmployee={loggedInEmployee}
          theme={theme}
          BRANCHES={BRANCHES}
        />
      )}

      <EmployeeRequests
        showRequestModal={showRequestModal}
        setShowRequestModal={setShowRequestModal}
        loggedInEmployee={loggedInEmployee}
        theme={theme}
        employees={employees}
        allSchedules={globalData.lichLamViecs}
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
