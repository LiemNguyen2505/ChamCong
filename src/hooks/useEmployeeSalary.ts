import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { calculateNetSalary } from '../utils/salaryCalculator';

export const useEmployeeSalary = (
  loggedInEmployee: any,
  monthTimesheets: any[],
  payrollAdjustments: any[],
  holidays: any[],
  targetMonth?: string,
  violations: any[] = []
) => {
  const [monthlyStats, setMonthlyStats] = useState({
    totalHours: 0,
    baseSalaryTotal: 0,
    responsibilityBonusTotal: 0,
    holidayBonusTotal: 0,
    extraAdditionsTotal: 0,
    latePenaltyTotal: 0,
    phonePenaltyTotal: 0,
    finalPenalty: 0,
    otherDeductionsTotal: 0,
    actualSalary: 0,
    totalLatePenaltyMinutes: 0,
    lateCount: 0,
    totalLateMinutes: 0,
    lateDetails: [] as any[],
    ttnPenalty: { penaltyValue: 0, penaltyReason: '' },
    finalTtnPercentage: 100,
    currentHourlyRate: 0,
    currentResponsibilityBonus: 0,
    finalRetained: 0,
    finalReturnRetained: 0,
    finalAdvance: 0,
    finalMaterialLoss: 0,
    finalExtraAdditions: 0,
    finalNote: '',
    materialLossNote: '',
    hoursForTtn: 0,
    phonePenaltyCount: 0,
    phonePenaltyMinutes: 0
  });

  useEffect(() => {
    const filterMonth = targetMonth || format(new Date(), 'yyyy-MM');
    
    if (!loggedInEmployee || !loggedInEmployee.empId) return;
    
    const empTimesheets = monthTimesheets.filter((cc: any) => 
      (cc.empId === loggedInEmployee.id || cc.empId === loggedInEmployee.empId) && 
      cc.date.startsWith(filterMonth)
    );
    
    const empViolations = violations.filter(v => 
      (v.empId === loggedInEmployee.id || v.empId === loggedInEmployee.empId) && 
      v.monthYear === filterMonth
    );
    
    const stats = calculateNetSalary(loggedInEmployee, filterMonth, empTimesheets, payrollAdjustments, holidays, {}, empViolations);
    setMonthlyStats(stats);
  }, [monthTimesheets, loggedInEmployee, holidays, payrollAdjustments, targetMonth, violations]);

  return { monthlyStats };
};
