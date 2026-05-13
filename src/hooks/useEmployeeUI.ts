import { useState } from 'react';
import { format } from 'date-fns';

export const useEmployeeUI = (kioskBranch: string | null) => {
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSalaryDetails, setShowSalaryDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  
  // Request Form States
  const [requestType, setRequestType] = useState<'off_sudden' | 'shift_swap' | 'late_early' | 'forgot_check' | 'feedback' | 'salary_advance' | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [swapWithEmpId, setSwapWithEmpId] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [requestDate, setRequestDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [requestSubTime, setRequestSubTime] = useState('');

  const [selectedCalendarDate, setSelectedCalendarDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'grid'>('list');
  const [teamScheduleBranch, setTeamScheduleBranch] = useState<string>(kioskBranch || 'Góc Phố');

  return {
    showWeeklySchedule,
    setShowWeeklySchedule,
    showStats,
    setShowStats,
    showRequestModal,
    setShowRequestModal,
    showSalaryDetails,
    setShowSalaryDetails,
    showHistory,
    setShowHistory,
    showViolationModal,
    setShowViolationModal,
    requestType,
    setRequestType,
    requestNote,
    setRequestNote,
    advanceAmount,
    setAdvanceAmount,
    swapWithEmpId,
    setSwapWithEmpId,
    requestTime,
    setRequestTime,
    requestDate,
    setRequestDate,
    requestSubTime,
    setRequestSubTime,
    selectedCalendarDate,
    setSelectedCalendarDate,
    scheduleViewMode,
    setScheduleViewMode,
    teamScheduleBranch,
    setTeamScheduleBranch
  };
};
