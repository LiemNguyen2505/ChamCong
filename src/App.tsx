
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, query, getDocs, limit, orderBy, where, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';
import EmployeeView from './components/EmployeeView';
import AdminView from './components/admin/AdminView';

export default function App() {
  const [globalData, setGlobalData] = useState<any>({
    nhanViens: [],
    admins: [],
    chamCongs: [],
    lichLamViecs: [],
    canhBaos: [],
    notifications: [],
    salaryHistories: [],
    auditLogs: [],
    holidays: [],
    materialItems: [],
    payrollAdjustments: [],
    planningGoals: [],
    violations: [],
    materialLossLogs: [],
    retainedSalaryRecords: []
  });

  const [dataCache, setDataCache] = useState<Record<string, any>>({});
  const dataCacheRef = useRef<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ message: string, code?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const hasInitialLoadedRef = useRef(false);
  const isFetchingInProgress = useRef(false); // GLOBAL FETCH LOCK

  const fetchInitialData = useCallback(async (monthYear?: string, force: boolean | string | string[] = false, baseOptions?: { empId?: string, docId?: string, onlyToday?: boolean, exactDate?: string, branchId?: string, isWeek?: boolean, weekStart?: string, weekEnd?: string, targetedKeys?: string[], ignoreEmpIdInjection?: boolean }) => {
    
    // Inject empId from localStorage if employee is logged in and no admin is logged in
    let options = baseOptions ? { ...baseOptions } : {};
    const savedEmpStr = localStorage.getItem('loggedInEmployee');
    const savedAdminStr = localStorage.getItem('currentAdmin');
    const hasSavedAdmin = !!savedAdminStr;
    const hasSavedEmployee = !!savedEmpStr;

    if (!hasSavedAdmin && hasSavedEmployee) {
       try {
          const emp = JSON.parse(savedEmpStr);
          if (!options.empId && (emp.empId || emp.id) && !options.ignoreEmpIdInjection) {
              options.empId = emp.empId || emp.id;
              options.docId = emp.id;
          }
       } catch(e){}
    }

    const empId = options.empId || options.docId;
    if (!hasSavedAdmin && (!empId || empId === 'undefined' || empId === null)) {
       console.warn("⛔ KILL SWITCH TRIGGERED: fetchInitialData blocked because empId is not resolved yet.");
       return;
    }

    const targetMonth = monthYear || format(new Date(), 'yyyy-MM');
    const todayLiteral = format(new Date(), 'yyyy-MM-dd');
    const routeSuffix = options.isWeek ? `_week_${options.weekStart}` : (options.onlyToday ? `_today_${todayLiteral}` : (options.exactDate ? `_${options.exactDate}` : ''));
    const cacheKey = `${targetMonth}_${options.empId || 'all'}_${options.exactDate || options.onlyToday ? 'today' : 'month'}${routeSuffix}`;
    const now = Date.now();
    
    if (!hasSavedAdmin && hasSavedEmployee && cacheKey === `${targetMonth}_all_month`) {
       const keysToCheck = options.targetedKeys || (Array.isArray(force) ? force : []);
       if (!keysToCheck.length || keysToCheck.some(k => ['chamCongs', 'lichLamViecs', 'violations', 'payrollAdjustments'].includes(k))) {
           console.warn(`⛔ [SECURITY] Blocked Employee from fetching heavy global data: ${cacheKey}`);
           return;
       }
    }
    
    // 0. AVOID FLOODING DURING CRASHES
    if ((window as any).isCriticalErrorLock) return;
    (window as any).fetchCallCount = ((window as any).fetchCallCount || 0) + 1;
    if ((window as any).fetchCallCount > 100) {
      console.error("⛔ [App] Too many fetch calls detected! Locking to prevent crash.");
      (window as any).isCriticalErrorLock = true;
      setErrorDetails({ message: 'Ứng dụng phát hiện vòng lặp yêu cầu dữ liệu. Vui lòng tải lại trang (F5).', code: 'LOOP_DETECTED' });
      return;
    }

    // 1. CACHE CHECK
    // If targetedKeys is specified, we must bypass this broad in-memory cache check and rely on the granular localStorage check per-key below.
    if (!force && !options.targetedKeys && dataCacheRef.current[cacheKey]) {
      setGlobalData((prev: any) => ({ ...prev, ...dataCacheRef.current[cacheKey], lastUpdated: new Date().toISOString() }));
      return dataCacheRef.current[cacheKey];
    }

    // 2. GLOBAL FETCH LOCK (Only apply if force is completely false)
    if (isFetchingInProgress.current && !force && !options.targetedKeys && !options.onlyToday && !options.isWeek) {
      return;
    }

    // 3. THROTTLE (2 seconds) - allow targeted force updates
    const lastFetch = (window as any).lastGlobalFetchTime || 0;
    if (!force && !options.targetedKeys && !options.onlyToday && !options.isWeek && (now - lastFetch < 2000)) {
       return;
    }
    (window as any).lastGlobalFetchTime = now;

    setIsLoading(true);
    setErrorDetails(null);
    isFetchingInProgress.current = true;
    
    try {
      console.log(`🚀 [App] Fetching data for: ${cacheKey}, force=${force}`);
      
      let startDate = "";
      let endDate = "";
      
      if (options.isWeek && options.weekStart && options.weekEnd) {
         startDate = options.weekStart;
         endDate = options.weekEnd;
      } else {
         const [year, month] = targetMonth.split('-').map(Number);
         const rawStart = new Date(year, month - 1, 1);
         const rawEnd = new Date(year, month, 0);
         
         const bufferStart = new Date(rawStart); bufferStart.setDate(bufferStart.getDate() - 7);
         const bufferEnd = new Date(rawEnd); bufferEnd.setDate(bufferEnd.getDate() + 7);
         
         const formatLocal = (d: Date) => {
           const y = d.getFullYear();
           const m = String(d.getMonth() + 1).padStart(2, '0');
           const day = String(d.getDate()).padStart(2, '0');
           return `${y}-${m}-${day}`;
         };
         startDate = formatLocal(bufferStart);
         endDate = formatLocal(bufferEnd);
      }
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      let timesheetQuery = (options.empId || options.docId) 
        ? (options.onlyToday 
            ? query(collection(db, 'timesheets'), where('date', '==', todayStr), where('empId', '==', options.docId || options.empId), limit(5)) 
            : query(collection(db, 'timesheets'), where('date', '>=', startDate), where('date', '<=', endDate), where('empId', '==', options.docId || options.empId), limit(35))) 
        : (options.onlyToday
            ? (options.branchId ? query(collection(db, 'timesheets'), where('date', '==', todayStr), where('locationId', '==', options.branchId), limit(150)) : query(collection(db, 'timesheets'), where('date', '==', todayStr), limit(150)))
            : (options.branchId ? query(collection(db, 'timesheets'), where('date', '>=', startDate), where('date', '<=', endDate), where('locationId', '==', options.branchId), limit(500)) : query(collection(db, 'timesheets'), where('date', '>=', startDate), where('date', '<=', endDate), limit(1000))));
        
      if (options.exactDate) {
        if (options.empId || options.docId) {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '==', options.exactDate), where('empId', '==', options.docId || options.empId), limit(5));
        } else if (options.branchId) {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '==', options.exactDate), where('locationId', '==', options.branchId), limit(150));
        } else {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '==', options.exactDate), limit(150));
        }
      } else if (options.isWeek && options.weekStart && options.weekEnd) {
        if (options.empId || options.docId) {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '>=', options.weekStart), where('date', '<=', options.weekEnd), where('empId', '==', options.docId || options.empId), limit(50));
        } else if (options.branchId) {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '>=', options.weekStart), where('date', '<=', options.weekEnd), where('locationId', '==', options.branchId), limit(250));
        } else {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '>=', options.weekStart), where('date', '<=', options.weekEnd), limit(500));
        }
      }

      let scheduleQuery = (options.empId || options.docId) 
        ? (options.onlyToday 
            ? query(collection(db, 'LichLamViec'), where('date', '==', todayStr), where('empId', '==', options.docId || options.empId), limit(5)) 
            : query(collection(db, 'LichLamViec'), where('date', '>=', startDate), where('date', '<=', endDate), where('empId', '==', options.docId || options.empId), limit(35))) 
        : (options.onlyToday
            ? query(collection(db, 'LichLamViec'), where('date', '==', todayStr), limit(150))
            : query(collection(db, 'LichLamViec'), where('date', '>=', startDate), where('date', '<=', endDate), limit(1000)));
        
      if (options.exactDate) {
         if (options.branchId) {
             scheduleQuery = query(collection(db, 'LichLamViec'), where('date', '==', options.exactDate), where('locationId', '==', options.branchId), limit(200));
         } else {
             scheduleQuery = query(collection(db, 'LichLamViec'), where('date', '==', options.exactDate), limit(200));
         }
      } else if (options.isWeek && options.weekStart && options.weekEnd) {
         if (options.empId) {
             scheduleQuery = query(collection(db, 'LichLamViec'), where('date', '>=', options.weekStart), where('date', '<=', options.weekEnd), where('empId', '==', options.docId || options.empId), limit(50));
         } else if (options.branchId) {
             scheduleQuery = query(collection(db, 'LichLamViec'), where('date', '>=', options.weekStart), where('date', '<=', options.weekEnd), where('locationId', '==', options.branchId), limit(500));
         } else {
             scheduleQuery = query(collection(db, 'LichLamViec'), where('date', '>=', options.weekStart), where('date', '<=', options.weekEnd), limit(1000));
         }
      }

      let leaveQuery = (options.empId || options.docId) 
        ? query(collection(db, 'XinNghiPhep'), where('empId', '==', options.docId || options.empId), where('leaveDate', '>=', startDate), where('leaveDate', '<=', endDate), limit(100)) 
        : query(collection(db, 'XinNghiPhep'), where('leaveDate', '>=', startDate), where('leaveDate', '<=', endDate), limit(1000));
        
      if (options.exactDate) {
        if (options.empId || options.docId) {
           leaveQuery = query(collection(db, 'XinNghiPhep'), where('empId', '==', options.docId || options.empId), where('leaveDate', '==', options.exactDate), limit(5));
        } else {
           leaveQuery = query(collection(db, 'XinNghiPhep'), where('leaveDate', '==', options.exactDate), limit(200));
        }
      }

      const config: { key: string; query: any; type: 'static' | 'dynamic' | 'lazy' }[] = [
        { key: 'nhanViens', query: query(collection(db, 'employees'), limit(500)), type: 'dynamic' },
        { key: 'admins', query: query(collection(db, 'Admins'), limit(100)), type: 'dynamic' },
        { key: 'canhBaos', query: query(collection(db, 'CanhBao'), orderBy('timestamp', 'desc'), limit(30)), type: 'lazy' },
        { key: 'notifications', query: query(collection(db, 'Notifications'), orderBy('createdAt', 'desc'), limit(30)), type: 'lazy' },
        { key: 'auditLogs', query: query(collection(db, 'AuditLogs'), orderBy('timestamp', 'desc'), limit(15)), type: 'lazy' },
        { key: 'holidays', query: query(collection(db, 'Holidays'), limit(50)), type: 'static' },
        { key: 'materialItems', query: query(collection(db, 'MaterialItems'), limit(50)), type: 'static' },
        { key: 'payrollAdjustments', query: (options.empId || options.docId) ? query(collection(db, 'PayrollAdjustments'), where('monthYear', '==', targetMonth), where('empId', '==', options.docId || options.empId)) : query(collection(db, 'PayrollAdjustments'), where('monthYear', '==', targetMonth)), type: 'lazy' },
        { key: 'violations', query: (options.empId || options.docId) ? query(collection(db, 'Violations'), where('monthYear', '==', targetMonth), where('empId', '==', options.docId || options.empId)) : query(collection(db, 'Violations'), where('monthYear', '==', targetMonth)), type: 'lazy' },
        { key: 'materialLossLogs', query: query(collection(db, 'MaterialLossLogs'), where('monthYear', '==', targetMonth), orderBy('processedAt', 'desc'), limit(100)), type: 'lazy' },
        { key: 'retainedSalaryRecords', query: query(collection(db, 'RetainedSalaryRecords'), orderBy('createdAt', 'desc'), limit(500)), type: 'lazy' },
        { key: 'chamCongs', query: timesheetQuery, type: 'lazy' },
        { key: 'lichLamViecs', query: scheduleQuery, type: 'lazy' },
        { key: 'planningGoals', query: query(collection(db, 'PlanningGoals'), limit(100)), type: 'static' },
        { key: 'salaryHistories', query: query(collection(db, 'SalaryHistories'), limit(500)), type: 'lazy' }
      ];

      // Security Limits for Employees to prevent Read Spikes
      if (options.empId) {
          const todayDate = new Date();
          const currentYear = todayDate.getFullYear();
          const currentMonthInt = todayDate.getMonth() + 1; // 1-12
          const currentDay = todayDate.getDate();

          const validMonths = [`${currentYear}-${String(currentMonthInt).padStart(2, '0')}`];
          if (currentDay <= 10) {
             const prevMonthDate = new Date(currentYear, currentMonthInt - 2, 1);
             validMonths.push(`${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`);
          }
          
          const isInvalidMonthRequest = targetMonth && !validMonths.includes(targetMonth);
          
          const mondayThisWeek = new Date(todayDate);
          mondayThisWeek.setDate(todayDate.getDate() - (todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1));
          const sundayNextWeek = new Date(mondayThisWeek);
          sundayNextWeek.setDate(mondayThisWeek.getDate() + 13);
          
          const formatLocal = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          const validSchedStart = formatLocal(mondayThisWeek);
          const validSchedEnd = formatLocal(sundayNextWeek);

          const isInvalidScheduleRequest = options.isWeek && options.weekStart && (options.weekStart < validSchedStart || options.weekEnd! > validSchedEnd);
          
          for (const c of config) {
              if (['payrollAdjustments', 'violations', 'chamCongs', 'salaryHistories'].includes(c.key)) {
                  if (isInvalidMonthRequest) c.query = null;
              }
              if (c.key === 'lichLamViecs') {
                  const isInvalidMonthSched = !options.isWeek && !options.onlyToday && !options.exactDate && isInvalidMonthRequest;
                  if (isInvalidScheduleRequest || isInvalidMonthSched) {
                      c.query = null;
                  }
              }
          }
      }

      // If force is a targeted array/string, ONLY fetch those queries
      const forceKeys = force && force !== true ? (Array.isArray(force) ? force : [force as string]) : (options.targetedKeys || null);
      
      const activeQueries = config.filter(c => {
        if (c.query === null) return false;
        if (forceKeys) {
          return forceKeys.includes(c.key);
        }
        if (force === true) {
          return true; // Fetch all if force is true
        }
        if (hasInitialLoadedRef.current) return false; // Initial load only fetches types: dynamic & static
        
        // OPTIMIZATION: If no one is logged in, don't fetch heavy global lists on mount!
        if (!hasSavedEmployee && !hasSavedAdmin) {
           return false; // Skip all automatic fetches on first screen to save reads, Login will query explicitly.
        }

        // NEW OPTIMIZATION: If ONLY employee is logged in, skip fetching heavy global admin lists on mount
        if (hasSavedEmployee && !hasSavedAdmin) {
           if (c.key === 'nhanViens' || c.key === 'admins' || c.key === 'planningGoals' || c.key === 'materialItems') {
               return false;
           }
        }

        return c.type !== 'lazy'; // Only fetch dynamic & static on start, ignore lazy
      });

      if (activeQueries.length === 0) {
          return {}; // Nothing to fetch
      }

      const results = await Promise.all(activeQueries.map(c => {
        // ALWAYS CACHE EVERYTHING TO PREVENT QUOTA EXHAUSTION
        // Admin: cache is extremely aggressive. Employee: use smaller cache slices.
        const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours for Admins / Users unless forced
        
        // SECURITY/PERFORMANCE: Global collections MUST NOT include empId in cache key, 
        // otherwise 50 employees sharing an iPad will create 50 identical cache sets and 50x read spike!
        const isGlobalCollection = ['nhanViens', 'admins', 'holidays', 'planningGoals', 'AppNotifications', 'materialItems'].includes(c.key);
        const cacheEmpScope = isGlobalCollection ? 'all' : (options.empId || 'all');
        const branchSuffix = options.branchId ? `_br_${options.branchId}` : '';
        const realRouteSuffix = routeSuffix + branchSuffix;
        
        const cacheStoreKey = `db_cache_${c.key}_${cacheEmpScope}_${targetMonth}${realRouteSuffix}`;
        const cacheTimestampKey = `db_cache_time_${c.key}_${cacheEmpScope}_${targetMonth}${realRouteSuffix}`;
        
        // Ensure Admin has total cutoff of read quota if F5
        let shouldFetch = true;
        // Only bypass cache if force is truthy and not using targetedKeys
        const isForcedForThisKey = force === true || (typeof force !== 'boolean' && force && (Array.isArray(force) ? force.includes(c.key) : force === c.key));
        
        if (!isForcedForThisKey) {
           const savedTime = localStorage.getItem(cacheTimestampKey);
           if (savedTime && (Date.now() - parseInt(savedTime)) < CACHE_TTL) {
              const cachedData = localStorage.getItem(cacheStoreKey);
              if (cachedData) {
                 shouldFetch = false;
                 try {
                   return { key: c.key, data: JSON.parse(cachedData) };
                 } catch(e) {}
               }
           }
           
           // CRITICAL OPTIMIZATION: If requesting today/week, check if we already have the FULL MONTH cached
           if (shouldFetch && routeSuffix !== '_month') {
               const monthStoreKey = `db_cache_${c.key}_${cacheEmpScope}_${targetMonth}_month${branchSuffix}`;
               const monthTimeKey = `db_cache_time_${c.key}_${cacheEmpScope}_${targetMonth}_month${branchSuffix}`;
               const monthSavedTime = localStorage.getItem(monthTimeKey);
               if (monthSavedTime && (Date.now() - parseInt(monthSavedTime)) < CACHE_TTL) {
                  const monthDataStr = localStorage.getItem(monthStoreKey);
                  if (monthDataStr) {
                     try {
                        const monthData = JSON.parse(monthDataStr);
                        if (Array.isArray(monthData)) {
                            let qStart = startDate;
                            let qEnd = endDate;
                            if (options.exactDate) { qStart = options.exactDate; qEnd = options.exactDate; }
                            else if (options.onlyToday) { qStart = format(new Date(), 'yyyy-MM-dd'); qEnd = qStart; }
                            else if (options.isWeek && options.weekStart && options.weekEnd) { qStart = options.weekStart; qEnd = options.weekEnd; }
                            
                            const dateField = 'date';
                            const filtered = monthData.filter((item: any) => {
                                const itemDate = item[dateField];
                                if (!itemDate) return true;
                                return itemDate >= qStart && itemDate <= qEnd;
                            });
                            console.log(`✅ [CACHE HIT] Found full month for ${c.key}, filtering locally for ${qStart} to ${qEnd}`);
                            return { key: c.key, data: filtered };
                        }
                     } catch(e) {}
                  }
               }
           }
        }
        
        if (shouldFetch) {
           return getDocs(c.query).then(snap => {
              const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
              // Cache ALL collections natively to save big morning rushes and comply with strict prompt instructions
              
              let finalDataToCache = data;
              if (options.isWeek || options.exactDate || options.onlyToday) {
                 const cachedDataStr = localStorage.getItem(cacheStoreKey);
                 if (cachedDataStr) {
                    try {
                        const parsedCache = JSON.parse(cachedDataStr);
                        if (Array.isArray(parsedCache)) {
                           let qStart = startDate;
                           let qEnd = endDate;
                           if (options.exactDate) {
                              qStart = options.exactDate;
                              qEnd = options.exactDate;
                           } else if (options.onlyToday) {
                              qStart = format(new Date(), 'yyyy-MM-dd');
                              qEnd = qStart;
                           } else if (options.isWeek && options.weekStart && options.weekEnd) {
                              qStart = options.weekStart;
                              qEnd = options.weekEnd;
                           }
                           const dateField = 'date';
                           
                           const filteredPrev = parsedCache.filter((item: any) => {
                               const itemDate = item[dateField];
                               if (!itemDate) return true;
                               const inDateRange = itemDate >= qStart && itemDate <= qEnd;
                               return !inDateRange;
                           });
                           
                           const existingMap = new Map(filteredPrev.map((item: any) => [item.id, item]));
                           (data as any[]).forEach(item => {
                              existingMap.set(item.id, item);
                           });
                           finalDataToCache = Array.from(existingMap.values());
                        }
                    } catch(e) {}
                 }
              }

              try {
                 localStorage.setItem(cacheStoreKey, JSON.stringify(finalDataToCache));
                 localStorage.setItem(cacheTimestampKey, Date.now().toString());
              } catch (e) {
                 console.warn("LocalStorage full, clearing old caches and retrying...");
                 // If storage is full, we clear ALL cache keys to free space
                 const keysToRemove = [];
                 for (let i = 0; i < localStorage.length; i++) {
                     const key = localStorage.key(i);
                     if (key && key.startsWith('db_cache_')) {
                         keysToRemove.push(key);
                     }
                 }
                 keysToRemove.forEach(k => localStorage.removeItem(k));
                 
                  // Retry once
                 try {
                     localStorage.setItem(cacheStoreKey, JSON.stringify(finalDataToCache));
                     localStorage.setItem(cacheTimestampKey, Date.now().toString());
                 } catch (e2) {
                     console.warn("LocalStorage still full after clearing, giving up.");
                 }
              }
              return { key: c.key, data };
           });
        }
        return Promise.resolve({ key: c.key, data: [] });
      }));
      
      const newData: any = {};
      results.forEach((res) => {
        newData[res.key] = res.data;
      });

      setGlobalData((prev: any) => {
        const merged = { ...prev };
        
        for (const [key, items] of Object.entries(newData)) {
           if (Array.isArray(items) && (options.isWeek || options.exactDate || options.onlyToday) && prev[key]) {
              let qStart = startDate;
              let qEnd = endDate;
              if (options.exactDate) {
                 qStart = options.exactDate;
                 qEnd = options.exactDate;
              } else if (options.onlyToday) {
                 qStart = format(new Date(), 'yyyy-MM-dd');
                 qEnd = qStart;
              } else if (options.isWeek && options.weekStart && options.weekEnd) {
                 qStart = options.weekStart;
                 qEnd = options.weekEnd;
              }

              const dateField = 'date';

              const filteredPrev = prev[key].filter((item: any) => {
                 const itemDate = item[dateField];
                 if (!itemDate) return true;
                 
                 const inDateRange = itemDate >= qStart && itemDate <= qEnd;
                 
                 let inEmpScope = true;
                 if (options.empId || options.docId) {
                    inEmpScope = item.empId === (options.empId || options.docId);
                 }
                 
                 let inBranchScope = true;
                 if (options.branchId && key === 'lichLamViecs') {
                    inBranchScope = item.locationId === options.branchId;
                 }
                 
                 // If the item matches the boundaries of our query, we drop it from the old cache
                 // and rely purely on the newly fetched `items` to provide up-to-date data.
                 if (inDateRange && inEmpScope && inBranchScope) {
                    return false;
                 }
                 return true;
              });

              const existingMap = new Map(filteredPrev.map((item: any) => [item.id, item]));
              (items as any[]).forEach(item => {
                 existingMap.set(item.id, item);
              });
              merged[key] = Array.from(existingMap.values());
           } else {
              merged[key] = items;
           }
        }
        
        merged.lastUpdated = new Date().toISOString();
        dataCacheRef.current[cacheKey] = merged;
        return merged;
      });
      
      hasInitialLoadedRef.current = true;
      setHasInitialLoaded(true);
      return newData;
    } catch (error: any) {
      if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota')) {
        console.warn("Critical Fetch Error (Quota exceeded):", error);
      } else {
        console.error("Critical Fetch Error:", error);
      }
      setErrorDetails({ message: 'Sếp ơi, không lấy được dữ liệu! Vui lòng kiểm tra lại kết nối mạng hoặc Firebase Key.', code: error.code });
      throw error;
    } finally {
      setIsLoading(false);
      isFetchingInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    if (hasInitialLoadedRef.current) return;
    hasInitialLoadedRef.current = true;

    // Only fetch minimal required data (nhanViens, admins) on mount for the login screen.
    // Dashboard and individual views will fetch their own heavy collections like chamCongs on demand.
    fetchInitialData(undefined, false, { targetedKeys: ['nhanViens', 'admins'] });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Router>
      <div className="h-[100dvh] w-full overflow-hidden bg-stone-50 flex flex-col">
        {errorDetails && (
          <div className="fixed inset-0 z-[9999] bg-red-600/95 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-red-200">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Lỗi Kết Nối Firebase</h2>
                <div className="p-4 bg-slate-50 rounded-2xl w-full border border-slate-100">
                  <p className="text-sm font-bold text-red-600 break-all">{errorDetails.message}</p>
                  {errorDetails.code && (
                    <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase tracking-widest">Error Code: {errorDetails.code}</p>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed px-4">
                  Vui lòng kiểm tra lại <b>Keys môi trường</b> đã nạp trên Vercel / Cloud Run. Đảm bảo <b>VITE_FIREBASE_PROJECT_ID</b> trùng với Project Firebase của bạn.
                </p>
                <button 
                  onClick={() => fetchInitialData(undefined, true)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.71 2.24"/><path d="M21 3v9h-9"/></svg>
                  Thử kết nối lại
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route 
              path="/" 
              element={
                <EmployeeView 
                  globalData={globalData} 
                  fetchInitialData={fetchInitialData} 
                  isLoading={isLoading} 
                />
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminView 
                  globalData={globalData} 
                  setGlobalData={setGlobalData}
                  fetchInitialData={fetchInitialData} 
                  isLoading={isLoading} 
                />
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

