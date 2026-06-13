import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
const toast: any = (() => {}) as any;
toast.loading = () => {};
toast.success = () => {};
toast.error = () => {};

import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, where, deleteField, getDoc, setDoc, increment, limit, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, Filter, LogOut, Users, Clock, Plus, Trash2, Edit2, ShieldCheck, Download, Calendar, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Bell, BellOff, TrendingUp, DollarSign, History as HistoryIcon, X, Key, Smartphone, CheckCircle2, RefreshCw, Undo2, ChevronLeft, Save, Settings2, ChevronDown, ChevronRight, ArrowLeft, Info, StickyNote, LayoutDashboard, AlertTriangle, TrendingDown, Activity, Banknote, Menu, Phone, MessageSquare, MoreVertical, User, Coffee, TableProperties, Wallet, MoreHorizontal, ChevronUp, Package, FileCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { saveAs } from 'file-saver';
import { differenceInMonths, parseISO, addMonths } from 'date-fns';
import { ScheduleView } from '../ScheduleView';
import { PayrollAdjustmentModal } from '../PayrollAdjustmentModal';
import { HolidayConfigModal } from '../HolidayConfigModal';
import { EmployeeAttendanceDetailModal } from '../EmployeeAttendanceDetailModal';
import EmployeeSalaryDetailModal from '../EmployeeSalaryDetailModal';
import SalaryDetailContent from '../SalaryDetailContent';
import { PayrollComponent } from '../PayrollComponent';
import { EmployeeManagement } from '../EmployeeManagement';
import { MonthlyAttendanceTable } from '../MonthlyAttendanceTable';
import { Dashboard } from '../Dashboard';
import { AdminManagement } from './AdminManagement';
import { ViolationManagement } from '../ViolationManagement';
import { RegulationsTab } from './RegulationsTab';
import { SystemLogs } from '../SystemLogs';
import { Alerts } from '../Alerts';
import { AttendanceTab } from '../AttendanceTab';
import { ManualAttendanceModal, EditAttendanceModal } from '../AttendanceModals';
import { ChangePinModal, ChangeAdminPinModal, ConfirmModal } from './AdminAuthModals';
import { FinancialModal } from '../FinancialModal';
import { OtherDeductionsGlobalModal } from '../OtherDeductionsGlobalModal';
import { motion, AnimatePresence } from 'motion/react';
import { calculateNetSalary, calculateTtnPenalty, getPreviousMonthRates, roundToUnit } from '../../utils/salaryCalculator';

import { Employee, AdminAccount, ApprovalRequest, PlanningGoal, SalaryHistory, AuditLog, Timesheet, ShiftTask, WorkSchedule, LeaveRequest, Alert, AppNotification, PayrollAdjustment, HolidayConfig } from '../../types/admin';
import { AdminLogin } from './AdminLogin';
import { AdminSidebar } from './AdminSidebar';
import { BottomNav } from './AdminNavigation';
import { BranchTabs } from '../BranchTabs';
import { useAdminLogic } from '../../hooks/useAdminLogic';

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

const SUPER_ADMIN: AdminAccount = {
  id: 'super',
  email: 'admin',
  pin: '2608',
  role: 'SuperAdmin',
  locationIds: ['Góc Phố', 'Phố Xanh']
};

import { TABLE_COL_WIDTHS, formatMinutes, formatDecimalHours, getTimeStyle, calculateShifts, FieldNote } from '../../utils/adminHelpers';


import { useNotifications } from '../../hooks/useNotifications';
import { NotificationModal } from '../NotificationModal';

export default function AdminView({ 
  globalData, 
  fetchInitialData, 
  isLoading: isGlobalLoading 
}: { 
  globalData: any, 
  fetchInitialData: (monthYear?: string, force?: any, options?: any) => Promise<any>, 
  isLoading: boolean 
}) {
  const logic = useAdminLogic(globalData, fetchInitialData, isGlobalLoading);
  const { notifications: navNotifications, markAsRead, markAllAsRead } = useNotifications(
    logic.currentAdmin?.role,
    logic.currentAdmin?.id,
    logic.currentAdmin?.locationIds
  );

  const {
    openMenuEmpId,
    setOpenMenuEmpId,
    isAuthenticated,
    setIsAuthenticated,
    currentAdmin,
    setCurrentAdmin,
    password,
    setPassword,
    adminLoginId,
    setAdminLoginId,
    showLoginPin,
    setShowLoginPin,
    loginIdError,
    setLoginIdError,
    pinError,
    setPinError,
    activeTab,
    setActiveTab,
    historyDay,
    setHistoryDay,
    historyEmployee,
    setHistoryEmployee,
    mobileHistoryMode,
    setMobileHistoryMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    showCompactActionMenu,
    setShowCompactActionMenu,
    showDatePickerGrid,
    setShowDatePickerGrid,
    filterBranch,
    setFilterBranch,
    filterMonth,
    setFilterMonth,
    initializedTabs,
    setInitializedTabs,
    historySearchTerm,
    setHistorySearchTerm,
    showNotifications,
    setShowNotifications,
    headerTapCount,
    setHeaderTapCount,
    loading,
    setLoading,
    successMsg,
    setSuccessMsg,
    payrollActiveBranch,
    setPayrollActiveBranch,
    showHolidayConfig,
    setShowHolidayConfig,
    showFinancialModal,
    setShowFinancialModal,
    showMobileUtilities,
    setShowMobileUtilities,
    editingAdjustment,
    setEditingAdjustment,
    showMaterialLossModal,
    setShowMaterialLossModal,
    showOtherDeductionsModal,
    setShowOtherDeductionsModal,
    isScheduleModalOpen,
    setIsScheduleModalOpen,
    totalLossAmount,
    setTotalLossAmount,
    totalLossItems,
    setTotalLossItems,
    isProcessingLoss,
    setIsProcessingLoss,
    itemType,
    setItemType,
    lossType,
    setLossType,
    originalPrice,
    setOriginalPrice,
    deductionPrice,
    setDeductionPrice,
    quantity,
    setQuantity,
    weightedEmployees,
    setWeightedEmployees,
    visibleColumns,
    setVisibleColumns,
    showColumnConfig,
    setShowColumnConfig,
    columnWidths,
    setColumnWidths,
    showDeductionDetails,
    setShowDeductionDetails,
    localAdjustments,
    setLocalAdjustments,
    undoStack,
    setUndoStack,
    isSavingPayroll,
    setIsSavingPayroll,
    salaryReviewNotifications,
    setSalaryReviewNotifications,
    showChangeAdminPinModal,
    setShowChangeAdminPinModal,
    oldAdminPin,
    setOldAdminPin,
    newAdminPin,
    setNewAdminPin,
    confirmNewAdminPin,
    setConfirmNewAdminPin,
    showOldAdminPin,
    setShowOldAdminPin,
    showNewAdminPin,
    setShowNewAdminPin,
    showConfirmAdminPin,
    setShowConfirmAdminPin,
    adminPinError,
    setAdminPinError,
    selectedEmployeeForDetails,
    setSelectedEmployeeForDetails,
    selectedEmployeeForSalaryDetails,
    setSelectedEmployeeForSalaryDetails,
    showConfirmModal,
    setShowConfirmModal,
    confirmAction,
    setConfirmAction,
    showManualCheckin,
    setShowManualCheckin,
    manualCheckinData,
    setManualCheckinData,
    showAdjustModal,
    setShowAdjustModal,
    selectedShift,
    setSelectedShift,
    newEndTime,
    setNewEndTime,
    showEditAttendanceModal,
    setShowEditAttendanceModal,
    showChangePinModal,
    setShowChangePinModal,
    pinChangeData,
    setPinChangeData,
    editingAttendance,
    setEditingAttendance,
    manualAttendance,
    setManualAttendance,
    removeAccents,
    handlePrevMonth,
    handleNextMonth,
    handleHeaderTap,
    getAllowedBranches,
    handleSelectItemType,
    handleProcessMaterialLoss,
    logAction,
    getBranchTheme,
    handleResize,
    openConfirmModal,
    closeConfirmModal,
    handleChangePin,
    handleAdjustShift,
    checkEmployeeReview,
    handlePayrollChange,
    handleSavePayroll,
    handleUndoPayroll,
    violations,
    handleAddViolation,
    handleDeleteViolation,
    handleLogin,
    handleGoogleLogin,
    handleChangeAdminPin,
    handleRefresh,
    exportToCSV,
    handleSendMonthlyReport,
    isSendingReport,
    handleManualAttendance,
    handleUpdateAttendance,
    handleApproveAttendance,
    handleDeleteAttendance,
    toggleNotifications,
    setNotificationFilter,
    headerTapTimeoutRef,
    currentAdminRef,
    filterBranchRef,
    filterMonthRef,
    isAuthenticatedRef,
    hasCheckedSalaryRef,
    nhanViens,
    adminDisplayName,
    chamCongs,
    lichLamViecs,
    admins,
    canhBaos,
    notifications,
    payrollAdjustments,
    salaryHistories,
    planningGoals,
    filteredChamCongs,
    filteredLichLamViecs,
    historySearchTermLower,
    allEmployeeSalaryStatsMap,
    adminTheme,
    navigate,
    calculateEmployeeSalaryStats,
    auditLogs,
    materialLossLogs,
    retainedSalaryRecords,
    salaryAdvanceRecords,
    materialItems,
    holidays
  } = logic;

  const [notificationBranch, setNotificationBranch] = useState('All');

  const CommonBranchTabs = (props: any) => (
    <BranchTabs 
      currentAdmin={currentAdmin}
      activeTab={activeTab}
      payrollActiveBranch={payrollActiveBranch}
      filterBranch={filterBranch}
      setPayrollActiveBranch={setPayrollActiveBranch}
      setFilterBranch={setFilterBranch}
      adminTheme={adminTheme}
      {...props}
    />
  );

    if (!isAuthenticated) {
      return (
        <AdminLogin
          adminLoginId={adminLoginId} setAdminLoginId={setAdminLoginId}
          loginIdError={loginIdError} showLoginPin={showLoginPin} setShowLoginPin={setShowLoginPin}
          password={password} setPassword={setPassword} pinError={pinError}
          loading={loading} handleLogin={handleLogin} handleGoogleLogin={handleGoogleLogin}
          navigate={navigate} adminTheme={adminTheme} filterBranch={filterBranch}
        />
      );
    }

  return (
    <div className={`flex h-screen w-screen max-w-full ${adminTheme.bg} overflow-x-hidden relative`}>

      
      <AdminSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminTheme={adminTheme}
        currentAdmin={currentAdmin}
        filteredChamCongs={filteredChamCongs}
        pendingRequests={pendingRequests}
        canhBaos={canhBaos}
        notifications={navNotifications}
        setShowNotifications={setShowNotifications}
        handleSendMonthlyReport={handleSendMonthlyReport}
        isSendingReport={isSendingReport}
        filterBranch={filterBranch}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden ${(!selectedEmployeeForSalaryDetails && !isScheduleModalOpen && ['dashboard', 'bangcongthang', 'lichlamviec', 'bangluong'].includes(activeTab)) ? 'pb-16' : 'pb-0'} md:pb-0 ml-0`}>
        {/* Optimized Header */}
        <header className={`h-auto whitespace-nowrap ${adminTheme.header} grid grid-cols-[auto_1fr_auto] items-center px-4 md:px-8 flex-none z-40 shadow-md w-full left-0 transition-colors duration-500 pt-4 pb-1 md:py-4`}>
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1 px-2 hover:bg-white/10 rounded-xl md:hidden text-white transition-colors flex items-center gap-2"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex flex-col items-start justify-center flex-1 min-w-0 mx-2 py-0.5 gap-0.5">
            <div className="flex items-center gap-2 py-0.5">
              <h2 
                onClick={handleHeaderTap}
                className="text-2xl md:text-3xl font-black text-white leading-normal truncate uppercase tracking-tight cursor-pointer select-none"
              >
                {filterBranch === 'All' ? 'GÓC PHỐ XANH' : (activeTab === 'bangluong' ? payrollActiveBranch : filterBranch || 'ADMIN PANEL')}
              </h2>
              {currentAdmin?.role === 'SuperAdmin' && (
                <button
                  onClick={() => {
                    const nextBranch = (activeTab === 'bangluong' ? payrollActiveBranch : filterBranch) === 'Góc Phố' ? 'Phố Xanh' : 'Góc Phố';
                    setFilterBranch(nextBranch);
                    setPayrollActiveBranch(nextBranch);
                    toast.success(`Đã chuyển sang ${nextBranch.toUpperCase()}`, { icon: '🔄' });
                  }}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all active:rotate-180 duration-500"
                  title="Đổi chi nhánh"
                >
                  <RefreshCw className="w-4 h-4 md:w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-0.5">
              <span className="w-1 h-1 bg-white/40 rounded-full" />
              <span className="text-[11px] md:text-sm font-bold text-white/90">{adminDisplayName}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 text-white">
            <button
              onClick={() => setShowChangePinModal(true)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
              title="Đổi mã PIN"
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all relative"
            >
              <Bell className="w-5 h-5" />
              {navNotifications.some(n => !n.isRead) && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">
                  {navNotifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                auth.signOut();
                setIsAuthenticated(false);
                setCurrentAdmin(null);
                setPassword('');
                navigate('/');
              }}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto bg-[#FDFBF7] p-0 md:p-8 md:pt-4 pb-24 md:pb-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full md:p-0">
            {/* Tab Content Wrapper */}
            <div className="bg-white rounded-none md:rounded-3xl shadow-sm border-0 md:border border-stone-200 overflow-visible min-h-[calc(100vh-8rem)]">
              <Dashboard
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                filterBranch={filterBranch}
                filterMonth={filterMonth}
                nhanViens={nhanViens}
                filteredChamCongs={filteredChamCongs}
                payrollAdjustments={payrollAdjustments}
                currentAdmin={currentAdmin}
                adminTheme={adminTheme}
                formatCurrency={formatCurrency}
                getPreviousMonthRates={getPreviousMonthRates}
                toast={toast}
                pendingRequests={pendingRequests}
                BranchTabs={CommonBranchTabs}
              />

          <AttendanceTab
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filterBranch={filterBranch}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            nhanViens={nhanViens}
            admins={admins}
            filteredChamCongs={filteredChamCongs}
            globalData={globalData}
            currentAdmin={currentAdmin}
            adminTheme={adminTheme}
            historyDay={historyDay}
            setHistoryDay={setHistoryDay}
            historyEmployee={historyEmployee}
            setHistoryEmployee={setHistoryEmployee}
            mobileHistoryMode={mobileHistoryMode}
            setMobileHistoryMode={setMobileHistoryMode}
            showDatePickerGrid={showDatePickerGrid}
            setShowDatePickerGrid={setShowDatePickerGrid}
            handlePrevMonth={handlePrevMonth}
            handleNextMonth={handleNextMonth}
            handleApproveAttendance={handleApproveAttendance}
            handleDeleteAttendance={handleDeleteAttendance}
            setShowEditAttendanceModal={setShowEditAttendanceModal}
            setEditingAttendance={setEditingAttendance}
            setShowManualCheckin={setShowManualCheckin}
            exportToCSV={exportToCSV}
            checkEmployeeReview={checkEmployeeReview}
            BranchTabs={CommonBranchTabs}
            isLoading={loading}
            fetchInitialData={fetchInitialData}
          />

          {activeTab === 'bangluong' && (
            <PayrollComponent 
                nhanViens={nhanViens}
                chamCongs={chamCongs}
                filterMonth={filterMonth}
                setFilterMonth={setFilterMonth}
                payrollActiveBranch={payrollActiveBranch}
                calculateEmployeeSalaryStats={calculateEmployeeSalaryStats}
                formatCurrency={formatCurrency}
                localAdjustments={localAdjustments}
                isSavingPayroll={isSavingPayroll}
                handleSavePayroll={handleSavePayroll}
                handleUndoPayroll={handleUndoPayroll}
                undoStack={undoStack}
                BranchTabs={CommonBranchTabs}
                showMobileUtilities={showMobileUtilities}
                setShowMobileUtilities={setShowMobileUtilities}
                setShowHolidayConfig={setShowHolidayConfig}
                setShowMaterialLossModal={setShowMaterialLossModal}
                setShowFinancialModal={setShowFinancialModal}
                showOtherDeductionsModal={showOtherDeductionsModal}
                setShowOtherDeductionsModal={setShowOtherDeductionsModal}
                showColumnConfig={showColumnConfig}
                setShowColumnConfig={setShowColumnConfig}
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
                columnWidths={columnWidths}
                handleResize={handleResize}
                payrollAdjustments={payrollAdjustments}
                setSelectedEmployeeForSalaryDetails={setSelectedEmployeeForSalaryDetails}
                isSalaryDetailOpen={!!selectedEmployeeForSalaryDetails}
                payrollTheme={getBranchTheme(payrollActiveBranch)}
                handlePayrollChange={handlePayrollChange}
                showDeductionDetails={showDeductionDetails}
                setShowDeductionDetails={setShowDeductionDetails}
                handlePrevMonth={handlePrevMonth}
                handleNextMonth={handleNextMonth}
                exportToCSV={exportToCSV}
                handleSendMonthlyReport={handleSendMonthlyReport}
                formatDecimalHours={formatDecimalHours}
                activeTab={activeTab}
                currentAdmin={currentAdmin}
                onEmployeeClick={(nv: any) => {
                  setHistoryEmployee(nv);
                  setHistoryDay(null);
                  setMobileHistoryMode('employee');
                  setActiveTab('bangcongthang');
                }}
                checkEmployeeReview={checkEmployeeReview}
                isLoading={loading}
            />
          )}

            {activeTab === 'nhanvien' && (
              <EmployeeManagement
                currentAdmin={currentAdmin}
                adminTheme={adminTheme}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                nhanViens={nhanViens}
                filterBranch={filterBranch}
                planningGoals={planningGoals}
                openConfirmModal={openConfirmModal}
                fetchInitialData={fetchInitialData}
                BranchTabs={CommonBranchTabs}
                logAction={logAction}
                filterMonth={filterMonth}
                localGoals={logic.localGoals}
                setLocalGoals={logic.setLocalGoals}
                handleUpdatePlanningGoal={logic.handleUpdatePlanningGoal}
              />
            )}

          {/* Tab: Vi phạm */}
          <ViolationManagement
            activeTab={activeTab}
            nhanViens={nhanViens}
            violations={violations}
            handleAddViolation={handleAddViolation}
            handleDeleteViolation={handleDeleteViolation}
            adminTheme={adminTheme}
            filterMonth={filterMonth}
            BranchTabs={CommonBranchTabs}
          />

          {activeTab === 'lichlamviec' && (
            <ScheduleView 
              nhanViens={globalData.nhanViens}
              lichLamViecs={globalData.lichLamViecs}
              filterBranch={filterBranch}
              filterMonth={filterMonth}
              currentAdmin={currentAdmin}
              planningGoals={planningGoals}
              adminTheme={adminTheme}
              setIsScheduleModalOpen={setIsScheduleModalOpen}
              fetchInitialData={fetchInitialData}
              exportToCSV={exportToCSV}
              BranchTabs={CommonBranchTabs}
              onDateChange={(date) => {
                 const [y, m, d] = date.split('-').map(Number);
                 const dDate = new Date(y, m - 1, d);
                 const wStart = new Date(dDate); wStart.setDate(wStart.getDate() - 3);
                 const wEnd = new Date(dDate); wEnd.setDate(wEnd.getDate() + 10);
                 const formatD = (dateObj: Date) => {
                    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                 };
                 fetchInitialData(undefined, ['lichLamViecs'], {
                    isWeek: true,
                    weekStart: formatD(wStart),
                    weekEnd: formatD(wEnd)
                 });
              }}
            />
          )}

          <AdminManagement
            activeTab={activeTab}
            currentAdmin={currentAdmin}
            adminTheme={adminTheme}
            admins={admins}
            SUPER_ADMIN={SUPER_ADMIN}
            nhanViens={nhanViens}
            fetchInitialData={fetchInitialData}
            logAction={logAction}
            getAllowedBranches={getAllowedBranches}
            openConfirmModal={openConfirmModal}
            handleSendMonthlyReport={handleSendMonthlyReport}
          />

          <Alerts
            activeTab={activeTab}
            canhBaos={canhBaos}
          />

          <SystemLogs
            activeTab={activeTab}
            currentAdmin={currentAdmin}
            auditLogs={auditLogs}
          />

          <RegulationsTab 
            activeTab={activeTab}
            adminTheme={adminTheme}
          />

      <ChangePinModal
        show={showChangePinModal}
        onClose={() => {
          setShowChangePinModal(false);
          setPinChangeData({ currentPin: '', newPin: '', confirmNewPin: '' });
        }}
        onSubmit={handleChangePin}
        pinChangeData={{
          currentPin: pinChangeData.currentPin,
          newPin: pinChangeData.newPin,
          confirmPin: pinChangeData.confirmNewPin
        }}
        setPinChangeData={(data: any) => setPinChangeData({
          currentPin: data.currentPin,
          newPin: data.newPin,
          confirmNewPin: data.confirmPin
        })}
        adminTheme={adminTheme}
      />

      <ChangeAdminPinModal
        show={showChangeAdminPinModal}
        onClose={() => {
          setShowChangeAdminPinModal(false);
          setOldAdminPin('');
          setNewAdminPin('');
          setConfirmNewAdminPin('');
          setAdminPinError(null);
        }}
        oldAdminPin={oldAdminPin}
        setOldAdminPin={setOldAdminPin}
        newAdminPin={newAdminPin}
        setNewAdminPin={setNewAdminPin}
        confirmNewAdminPin={confirmNewAdminPin}
        setConfirmNewAdminPin={setConfirmNewAdminPin}
        showOldAdminPin={showOldAdminPin}
        setShowOldAdminPin={setShowOldAdminPin}
        showNewAdminPin={showNewAdminPin}
        setShowNewAdminPin={setShowNewAdminPin}
        showConfirmAdminPin={showConfirmAdminPin}
        setShowConfirmAdminPin={setShowConfirmAdminPin}
        adminPinError={adminPinError || ''}
        onSubmit={handleChangeAdminPin}
        adminTheme={adminTheme}
      />

      <ManualAttendanceModal
        show={showManualCheckin}
        onClose={() => setShowManualCheckin(false)}
        manualAttendance={manualAttendance}
        setManualAttendance={setManualAttendance}
        onSubmit={handleManualAttendance}
        nhanViens={nhanViens}
        adminTheme={adminTheme}
        filterBranch={filterBranch}
      />

      <EditAttendanceModal
        show={showEditAttendanceModal && !!editingAttendance}
        onClose={() => {
          setShowEditAttendanceModal(false);
          setEditingAttendance(null);
        }}
        editingAttendance={editingAttendance}
        setEditingAttendance={setEditingAttendance}
        onSubmit={handleUpdateAttendance}
        nhanViens={nhanViens}
        getAllowedBranches={getAllowedBranches}
        adminTheme={adminTheme}
        currentAdmin={currentAdmin}
      />

      <ConfirmModal
        show={showConfirmModal && !!confirmAction}
        config={confirmAction || { title: '', message: '', onConfirm: () => {} }}
        onClose={closeConfirmModal}
        adminTheme={adminTheme}
      />
      {showHolidayConfig && (
        <HolidayConfigModal
          holidays={holidays}
          onClose={() => setShowHolidayConfig(false)}
          fetchInitialData={fetchInitialData}
          adminTheme={adminTheme}
        />
      )}

      {showFinancialModal && (
        <FinancialModal
          nhanViens={nhanViens}
          allowedBranches={getAllowedBranches()}
          logAction={logAction}
          openConfirmModal={openConfirmModal}
          onClose={() => setShowFinancialModal(false)}
          adminTheme={adminTheme}
        />
      )}

      {editingAdjustment && (
        <PayrollAdjustmentModal
          adjustment={editingAdjustment}
          empName={nhanViens.find(e => e.id === editingAdjustment.empId)?.fullName || ''}
          monthYear={editingAdjustment.monthYear}
          empId={editingAdjustment.empId}
          onClose={() => setEditingAdjustment(null)}
          onSave={() => { setEditingAdjustment(null); fetchInitialData(filterMonth, ['payrollAdjustments']); }}
          adminTheme={adminTheme}
        />
      )}

      {selectedEmployeeForDetails && (
        <EmployeeAttendanceDetailModal
          employee={selectedEmployeeForDetails}
          timesheets={filteredChamCongs.filter(cc => cc.empId === selectedEmployeeForDetails.id || cc.empId === selectedEmployeeForDetails.empId)}
          schedules={filteredLichLamViecs.filter(s => s.empId === selectedEmployeeForDetails.id || s.empId === selectedEmployeeForDetails.empId)}
          month={filterMonth}
          onClose={() => setSelectedEmployeeForDetails(null)}
          adminTheme={adminTheme}
          fetchInitialData={fetchInitialData}
        />
      )}

      {selectedEmployeeForSalaryDetails && (
        <EmployeeSalaryDetailModal
          employee={selectedEmployeeForSalaryDetails}
          month={filterMonth}
          timesheets={filteredChamCongs.filter(cc => (cc.empId === selectedEmployeeForSalaryDetails.id || cc.empId === selectedEmployeeForSalaryDetails.empId) && cc.date.startsWith(filterMonth))}
          schedules={filteredLichLamViecs.filter(s => (s.empId === selectedEmployeeForSalaryDetails.id || s.empId === selectedEmployeeForSalaryDetails.empId) && s.date.startsWith(filterMonth))}
          adjustments={payrollAdjustments}
          holidays={holidays}
          onClose={() => setSelectedEmployeeForSalaryDetails(null)}
          theme={{ isAdmin: ['SuperAdmin', 'BranchAdmin'].includes(currentAdmin?.role || '') }}
          isSubjectAdmin={selectedEmployeeForSalaryDetails.empId?.toUpperCase() === 'ADMIN' || admins.some((a: any) => a.email === selectedEmployeeForSalaryDetails.fullName)}
          adminTheme={adminTheme}
          localAdj={localAdjustments[selectedEmployeeForSalaryDetails.id] || {}}
          onAdjustmentChange={handlePayrollChange}
          onMonthChange={(m) => setFilterMonth(m)}
          onSave={(empId, adj) => {
            handleSavePayroll(empId, adj);
            setSelectedEmployeeForSalaryDetails(null);
          }}
          violations={violations}
        />
      )}

      <OtherDeductionsGlobalModal 
        show={showOtherDeductionsModal}
        onClose={() => setShowOtherDeductionsModal(false)}
        adminTheme={adminTheme}
        nhanViens={nhanViens}
        allowedBranches={getAllowedBranches()}
        logAction={logAction}
        openConfirmModal={openConfirmModal}
        fetchInitialData={fetchInitialData}
        filterMonth={filterMonth}
        payrollActiveBranch={payrollActiveBranch}
        materialItems={materialItems}
        materialLossLogs={materialLossLogs}
        weightedEmployees={weightedEmployees}
        setWeightedEmployees={setWeightedEmployees}
        itemType={itemType}
        setItemType={setItemType}
        handleSelectItemType={handleSelectItemType}
        lossType={lossType}
        setLossType={setLossType}
        originalPrice={originalPrice}
        setOriginalPrice={setOriginalPrice}
        deductionPrice={deductionPrice}
        quantity={quantity}
        setQuantity={setQuantity}
        totalLossAmount={totalLossAmount}
        setTotalLossAmount={setTotalLossAmount}
        isProcessingLoss={isProcessingLoss}
        onProcessMaterialLoss={handleProcessMaterialLoss}
        localAdjustments={localAdjustments}
        payrollAdjustments={payrollAdjustments}
        handlePayrollChange={handlePayrollChange}
        currentAdmin={currentAdmin}
        retainedSalaryRecords={retainedSalaryRecords}
        salaryAdvanceRecords={salaryAdvanceRecords}
      />

            </div>
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation for Mobile */}
      {!selectedEmployeeForSalaryDetails && 
       !showHolidayConfig && 
       !showFinancialModal && 
       !showAdjustModal && 
       !showEditAttendanceModal && 
       !showChangePinModal && 
       !showChangeAdminPinModal && 
       !showConfirmModal && 
       !isScheduleModalOpen &&
       ['dashboard', 'bangcongthang', 'lichlamviec', 'bangluong'].includes(activeTab) && (
         <BottomNav 
           adminTheme={adminTheme} 
           activeTab={activeTab} 
           setActiveTab={setActiveTab} 
           pendingRequestsCount={pendingRequests.length} 
           xinNghiPhepsCount={xinNghiPheps.filter(x => x.status === 'cho_duyet').length} 
         />
       )}
      <NotificationModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={navNotifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        isAdmin={['Admin', 'SuperAdmin', 'BranchAdmin'].includes(currentAdmin?.role || '')}
        isSuperAdmin={currentAdmin?.role === 'SuperAdmin'}
        allowedBranches={currentAdmin?.locationIds}
        selectedBranch={notificationBranch}
        onBranchChange={setNotificationBranch}
        adminTheme={adminTheme}
      />
    </div>
  );
}
