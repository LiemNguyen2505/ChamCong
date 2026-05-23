import { format, parseISO } from 'date-fns';
import { safeFormat } from './dateUtils';

export const roundToUnit = (num: number) => Math.round(num);

export function calculateTtnPenalty(timesheets: any[], violations: any[] = []) {
  const getLateMinutes = (t: any) => {
    if (t.lateMinutes !== undefined) return t.lateMinutes;
    const extractTimeStr = (tm: string | undefined | null) => {
        if (!tm) return null;
        return tm.includes('T') ? tm.split('T')[1].substring(0, 5) : (tm.includes(' ') ? tm.split(' ')[1].substring(0, 5) : tm.substring(0, 5));
    };
    const inTimeStr = extractTimeStr(t.checkInTime);
    const schTimeStr = extractTimeStr(t.scheduledStartTime);
    if (schTimeStr && inTimeStr) {
      const [schH, schM] = schTimeStr.split(':').map(Number);
      const [inH, inM] = inTimeStr.split(':').map(Number);
      let diff = (inH * 60 + inM) - (schH * 60 + schM);
      if (diff < 0 && (24 - schH + inH) < 12) diff += 24 * 60;
      if (diff > 0 && diff < 12 * 60) return diff;
    }
    return 0;
  };

  const lateCountForTtn = timesheets.filter(t => getLateMinutes(t) > 0 && !t.isLateExcused).length;
  const skipShiftForTtn = timesheets.find(t => getLateMinutes(t) >= 300 && !t.isLateExcused);
  const violationCount = violations.length;
  // SUSPENDED: const phoneViolationCount = timesheets.filter(t => t.hasPhoneViolation).length;
  
  let ttnPenaltyValue = 0;
  let ttnPenaltyReason = "";

  // SUSPENDED: Tạm ngưng tính phạt điện thoại theo yêu cầu
  const phoneViolationCount = 0; // timesheets.filter(t => t.hasPhoneViolation).length;
  // 1. Check skip shift first (immediate 100% loss)
  if (skipShiftForTtn) {
    ttnPenaltyValue = 100;
    ttnPenaltyReason = `Bỏ ca ngày ${safeFormat(skipShiftForTtn.date, 'dd/MM')}`;
  } 
  else {
    // 2. Accumulate "gạch" (steps)
    // - Each late = 1 gạch (10%)
    // - Each phone violation = 1 gạch (10%)
    // - Each official violation = 2 gạchs (20%)? Or follow the old 5/8 rule.
    // Let's stick to the new requirement for phone: 1 violation = 1 gạch.
    
    const lateGach = lateCountForTtn * 10;
    const phoneGach = phoneViolationCount * 10;
    
    // Official violations: keep existing thresholds for now but make them additive
    let officialVioGach = 0;
    if (violationCount >= 8) officialVioGach = 100;
    else if (violationCount >= 5) officialVioGach = 50;
    else if (violationCount > 0) officialVioGach = violationCount * 10;

    ttnPenaltyValue = Math.min(100, lateGach + phoneGach + officialVioGach);
    
    const reasons = [];
    if (lateCountForTtn > 0) reasons.push(`Trễ ${lateCountForTtn} lần`);
    if (violationCount > 0) reasons.push(`Vi phạm ${violationCount} lần`);

    ttnPenaltyReason = reasons.join(', ');
  }

  return { penaltyValue: ttnPenaltyValue, penaltyReason: ttnPenaltyReason, violationCount, phoneViolationCount };
}

export function getPreviousMonthRates(employeeId: string, currentMonth: string, payrollAdjustments: any[]) {
  const previousAdjustments = payrollAdjustments
    .filter(a => (a.empId === employeeId) && a.monthYear < currentMonth)
    .sort((a, b) => b.monthYear.localeCompare(a.monthYear));

  if (previousAdjustments.length > 0) {
    const latestAdj = previousAdjustments[0];
    return {
      hourlyRate: latestAdj.hourlyRate,
      responsibilityBonus: latestAdj.responsibilityBonus
    };
  }
  return {};
}

export function calculateNetSalary(
  employee: any,
  month: string,
  timesheets: any[],
  adjustments: any[],
  holidays: any[],
  localAdj: any = {},
  violations: any[] = []
) {
  // Use all timesheets and violations for TTN penalty calculation
  const ttnPenalty = calculateTtnPenalty(timesheets, violations);
  
  // Filter approved timesheets for salary calculation
  const approvedTimesheets = timesheets.filter(cc => cc.status !== 'pending_approval');
  
  // Dynamically calculate missing totalHours and late minutes
  const calculatedTimesheets = approvedTimesheets.map(cc => {
    let computedHours = cc.totalHours || 0;
    const extractTimeStr = (t: string | undefined | null) => {
        if (!t) return null;
        return t.includes('T') ? t.split('T')[1].substring(0, 5) : (t.includes(' ') ? t.split(' ')[1].substring(0, 5) : t.substring(0, 5));
    };
    
    const inTimeStr = extractTimeStr(cc.checkInTime);
    const outTimeStr = extractTimeStr(cc.checkOutTime);

    if (!computedHours && inTimeStr && outTimeStr) {
      const [inH, inM] = inTimeStr.split(':').map(Number);
      const [outH, outM] = outTimeStr.split(':').map(Number);
      let diff = (outH * 60 + outM) - (inH * 60 + inM);
      if (diff < 0) diff += 24 * 60;
      if (diff > 0) computedHours = diff / 60;
    }

    let lateVal = cc.lateMinutes;
    if (lateVal === undefined && cc.scheduledStartTime && inTimeStr) {
        const schTimeStr = extractTimeStr(cc.scheduledStartTime);
        if (schTimeStr) {
          const [schH, schM] = schTimeStr.split(':').map(Number);
          const [inH, inM] = inTimeStr.split(':').map(Number);
          let diff = (inH * 60 + inM) - (schH * 60 + schM);
          if (diff < 0 && (24 - schH + inH) < 12) diff += 24 * 60;
          if (diff > 0 && diff < 12 * 60) {
              lateVal = diff;
          }
        }
    }
    
    let penaltyMins = cc.latePenaltyMinutes || 0;
    if (cc.isLateExcused) {
        penaltyMins = 0;
    } else if ((cc.latePenaltyMinutes === undefined || cc.latePenaltyMinutes === 0) && lateVal >= 10) {
        penaltyMins = lateVal * 3;
    }

    return { 
      ...cc, 
      _computedTotalHours: computedHours,
      _computedLateMinutes: lateVal || 0,
      _computedLatePenaltyMinutes: penaltyMins || 0
    };
  });

  const totalHours = calculatedTimesheets.reduce((sum, cc) => sum + cc._computedTotalHours, 0);
  
  const adjustment = adjustments.find(a => (a.empId === employee.id || a.empId === employee.empId) && a.monthYear === month) || {};
  const prevRates = getPreviousMonthRates(employee.id || employee.empId, month, adjustments);
  
  const currentHourlyRate = localAdj.hourlyRate !== undefined 
    ? localAdj.hourlyRate 
    : (adjustment.hourlyRate !== undefined 
      ? adjustment.hourlyRate 
      : (prevRates.hourlyRate !== undefined ? prevRates.hourlyRate : (employee.hourlyRate || 0)));
  
  const currentResponsibilityBonus = localAdj.responsibilityBonus !== undefined
    ? localAdj.responsibilityBonus
    : (adjustment.responsibilityBonus !== undefined
      ? adjustment.responsibilityBonus
      : (prevRates.responsibilityBonus !== undefined ? prevRates.responsibilityBonus : (employee.responsibilityBonus || 0)));

  const holidaysList = holidays || [];

  let holidayBonusTotal = 0;
  let totalLatePenaltyMinutes = 0;
  let totalLateMinutes = 0;
  let lateCount = 0;
  let lateDetails: any[] = [];

  calculatedTimesheets.forEach(cc => {
    if (cc._computedLateMinutes && !cc.isLateExcused) {
      if (cc.status !== 'pending_approval') {
        totalLateMinutes += cc._computedLateMinutes;
        lateCount++;
        if (cc._computedLatePenaltyMinutes) {
          totalLatePenaltyMinutes += cc._computedLatePenaltyMinutes;
        }
      }
      lateDetails.push({
        date: cc.date,
        shift: cc.selectedShiftTime || 'Không rõ',
        minutes: cc._computedLateMinutes,
        penaltyMinutes: cc._computedLatePenaltyMinutes || 0,
        penalty: roundToUnit((cc._computedLatePenaltyMinutes || 0) * (currentHourlyRate / 60)),
        isAbandonedShift: cc.isAbandonedShift,
        status: cc.status
      });
    }
    
    if (cc.status !== 'pending_approval') {
      const holiday = holidaysList.find(h => h.date === cc.date);
      if (holiday) {
        holidayBonusTotal += roundToUnit(cc._computedTotalHours * currentHourlyRate * (holiday.multiplier - 1));
      }
    }
  });

  const baseSalaryTotal = roundToUnit(totalHours * currentHourlyRate);
  
  const finalPenalty = localAdj.penalty !== undefined ? localAdj.penalty : (adjustment.penalty || 0);
  const finalRetained = localAdj.retainedSalary !== undefined ? localAdj.retainedSalary : (adjustment.retainedSalary !== undefined ? adjustment.retainedSalary : (employee.joinDate && employee.joinDate.startsWith(month) ? Math.min(500000, Math.floor(baseSalaryTotal * 0.5)) : 0));
  const finalReturnRetained = localAdj.returnRetainedSalary !== undefined ? localAdj.returnRetainedSalary : (adjustment.returnRetainedSalary || 0);
  const finalExtraAdditions = localAdj.extraAdditions !== undefined ? localAdj.extraAdditions : (adjustment.extraAdditions || 0);
  const finalAdvance = localAdj.advanceSalary !== undefined ? localAdj.advanceSalary : (adjustment.advanceSalary || 0);
  const finalMaterialLoss = localAdj.materialLoss !== undefined ? localAdj.materialLoss : (adjustment.materialLoss || 0);
  const finalMaterialLossShared = localAdj.materialLossShared !== undefined ? localAdj.materialLossShared : (adjustment.materialLossShared || 0);
  const finalMaterialLossIndividual = localAdj.materialLossIndividual !== undefined ? localAdj.materialLossIndividual : (adjustment.materialLossIndividual || 0);
  
  const baseTtnPercentage = localAdj.ttnPercentage !== undefined ? localAdj.ttnPercentage : (adjustment.ttnPercentage ?? 100);
  
  let finalTtnPercentage;
  if (localAdj.overrideTtnPercentage !== undefined) {
    finalTtnPercentage = localAdj.overrideTtnPercentage;
  } else if (adjustment.overrideTtnPercentage !== undefined) {
    finalTtnPercentage = adjustment.overrideTtnPercentage;
  } else {
    finalTtnPercentage = Math.max(0, baseTtnPercentage - ttnPenalty.penaltyValue);
  }
  
  const finalNote = localAdj.note !== undefined ? localAdj.note : (adjustment.note || '');
  const penaltyNote = localAdj.penaltyNote !== undefined ? localAdj.penaltyNote : (adjustment.penaltyNote || '');
  const materialLossNote = localAdj.materialLossNote !== undefined ? localAdj.materialLossNote : (adjustment.materialLossNote || '');
  const extraAdditionsNote = localAdj.extraAdditionsNote !== undefined ? localAdj.extraAdditionsNote : (adjustment.extraAdditionsNote || '');
  const retainedSalaryNote = localAdj.retainedSalaryNote !== undefined ? localAdj.retainedSalaryNote : (adjustment.retainedSalaryNote || '');
  const advanceSalaryNote = localAdj.advanceSalaryNote !== undefined ? localAdj.advanceSalaryNote : (adjustment.advanceSalaryNote || '');
  const ttnPercentageNote = localAdj.ttnPercentageNote !== undefined ? localAdj.ttnPercentageNote : (adjustment.ttnPercentageNote || '');
  
  const hoursForTtn = calculatedTimesheets
    .filter(cc => !cc.isAbandonedShift)
    .reduce((sum, cc) => sum + cc._computedTotalHours, 0);
    
  const responsibilityBonusTotal = roundToUnit(hoursForTtn * currentResponsibilityBonus * (finalTtnPercentage / 100));
  const finalLateCount = (localAdj.overrideLateCount !== undefined ? localAdj.overrideLateCount : adjustment.overrideLateCount);
  const resolvedLateCount = (finalLateCount === null || finalLateCount === undefined) ? lateCount : finalLateCount;

  const finalLateMinutesRaw = (localAdj.overrideLateMinutes !== undefined ? localAdj.overrideLateMinutes : adjustment.overrideLateMinutes);
  const resolvedLatePenaltyMinutes = (finalLateMinutesRaw === null || finalLateMinutesRaw === undefined) ? totalLatePenaltyMinutes : finalLateMinutesRaw;

  const rawLatePenaltyTotal = roundToUnit(totalLatePenaltyMinutes * (currentHourlyRate / 60));
  
  const latePenaltyTotalRaw = (localAdj.overrideLatePenalty !== undefined ? localAdj.overrideLatePenalty : adjustment.overrideLatePenalty);
  
  let latePenaltyTotal;
  if (latePenaltyTotalRaw !== undefined && latePenaltyTotalRaw !== null) {
    latePenaltyTotal = latePenaltyTotalRaw;
  } else if (finalLateMinutesRaw !== undefined && finalLateMinutesRaw !== null || finalLateCount !== undefined && finalLateCount !== null) {
    // If either minutes or count is overridden (and not null), calculate from minutes
    latePenaltyTotal = roundToUnit(resolvedLatePenaltyMinutes * (currentHourlyRate / 60));
  } else {
    // Default to system minutes calculation
    latePenaltyTotal = roundToUnit(totalLatePenaltyMinutes * (currentHourlyRate / 60));
  }

  const hr = Number(currentHourlyRate) || 0;

  const phonePenaltyTotal = 0;

  const extraAdditionsTotal = finalExtraAdditions + finalReturnRetained;
  const otherDeductionsTotal = finalRetained + finalAdvance + finalMaterialLoss;

  const totalEarnings = baseSalaryTotal + responsibilityBonusTotal + holidayBonusTotal + extraAdditionsTotal;
  const totalDeductions = latePenaltyTotal + finalPenalty + otherDeductionsTotal;

  let actualSalary = Math.max(0, roundToUnit(totalEarnings - totalDeductions));
  const deductionExceeded = roundToUnit(totalEarnings - totalDeductions) < 0;

  return {
    totalHours,
    baseSalaryTotal,
    responsibilityBonusTotal,
    holidayBonusTotal,
    extraAdditionsTotal,
    latePenaltyTotal,
    phonePenaltyTotal: 0,
    phonePenaltyCount: 0,
    phonePenaltyMinutes: 0,
    rawLatePenaltyTotal, // This is system reference
    rawPhonePenaltyTotal: 0, // This is system reference
    systemLatePenaltyMinutes: totalLatePenaltyMinutes, // Original minutes
    systemLateMinutes: totalLateMinutes, // Un-multiplied late minutes
    systemPhonePenaltyCount: 0, // Original count
    systemPhoneMinutes: 0,
    finalPenalty,
    penaltyNote,
    otherDeductionsTotal,
    actualSalary,
    deductionExceeded,
    totalLatePenaltyMinutes: resolvedLatePenaltyMinutes,
    lateCount: resolvedLateCount,
    systemLateCount: lateCount,
    totalLateMinutes,
    lateDetails,
    ttnPenalty,
    finalTtnPercentage,
    currentHourlyRate,
    currentResponsibilityBonus,
    finalRetained,
    finalReturnRetained,
    finalAdvance,
    finalMaterialLoss,
    finalMaterialLossShared,
    finalMaterialLossIndividual,
    finalExtraAdditions,
    finalNote,
    materialLossNote,
    extraAdditionsNote,
    retainedSalaryNote,
    advanceSalaryNote,
    ttnPercentageNote,
    hoursForTtn
  };
}
