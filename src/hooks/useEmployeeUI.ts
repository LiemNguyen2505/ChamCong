import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export const useEmployeeUI = (kioskBranch: string | null, loggedInEmployee?: any) => {
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSalaryDetails, setShowSalaryDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);

  const [selectedCalendarDate, setSelectedCalendarDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'grid'>('list');
  const [teamScheduleBranch, setTeamScheduleBranch] = useState<string>(loggedInEmployee?.locationId || kioskBranch || 'Góc Phố');

  useEffect(() => {
    if (loggedInEmployee?.locationId) {
      setTeamScheduleBranch(loggedInEmployee.locationId);
    }
  }, [loggedInEmployee?.locationId]);

  return {
    showWeeklySchedule,
    setShowWeeklySchedule,
    showStats,
    setShowStats,
    showSalaryDetails,
    setShowSalaryDetails,
    showHistory,
    setShowHistory,
    showViolationModal,
    setShowViolationModal,
    selectedCalendarDate,
    setSelectedCalendarDate,
    scheduleViewMode,
    setScheduleViewMode,
    teamScheduleBranch,
    setTeamScheduleBranch
  };
};
