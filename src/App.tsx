
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

  const fetchInitialData = useCallback(async (monthYear?: string, force: boolean | string | string[] = false, options?: { empId?: string, docId?: string, onlyToday?: boolean, exactDate?: string, branchId?: string, isWeek?: boolean, weekStart?: string, weekEnd?: string }) => {
    const targetMonth = monthYear || format(new Date(), 'yyyy-MM');
    const cacheKey = `${targetMonth}_${options?.empId || 'all'}_${options?.exactDate || options?.onlyToday ? 'today' : 'month'}`;
    const now = Date.now();
    
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
    if (!force && dataCacheRef.current[cacheKey]) {
      setGlobalData((prev: any) => ({ ...prev, ...dataCacheRef.current[cacheKey], lastUpdated: new Date().toISOString() }));
      return dataCacheRef.current[cacheKey];
    }

    // 2. GLOBAL FETCH LOCK (Only apply if force is completely false)
    if (isFetchingInProgress.current && !force) {
      return;
    }

    // 3. THROTTLE (2 seconds) - allow targeted force updates
    const lastFetch = (window as any).lastGlobalFetchTime || 0;
    if (!force && (now - lastFetch < 2000)) {
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
      
      if (options?.isWeek && options.weekStart && options.weekEnd) {
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
      
      let timesheetQuery = options?.empId 
        ? (options.onlyToday 
            ? query(collection(db, 'timesheets'), where('date', '==', todayStr), where('empId', '==', options.empId), limit(5)) 
            : query(collection(db, 'timesheets'), where('date', '>=', startDate), where('date', '<=', endDate), where('empId', '==', options.empId), limit(100))) 
        : (options?.onlyToday
            ? query(collection(db, 'timesheets'), where('date', '==', todayStr), limit(200))
            : query(collection(db, 'timesheets'), where('date', '>=', startDate), where('date', '<=', endDate), limit(3000)));
        
      if (options?.exactDate) {
        if (options?.empId) {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '==', options.exactDate), where('empId', '==', options.empId), limit(5));
        } else {
           timesheetQuery = query(collection(db, 'timesheets'), where('date', '==', options.exactDate), limit(200));
        }
      }

      let scheduleQuery = (options?.empId || options?.docId) 
        ? (options.onlyToday 
            ? query(collection(db, 'LichLamViec'), where('date', '==', todayStr), where('empId', '==', options.docId || options.empId), limit(5)) 
            : query(collection(db, 'LichLamViec'), where('date', '>=', startDate), where('date', '<=', endDate), where('empId', '==', options.docId || options.empId), limit(100))) 
        : (options?.onlyToday
            ? query(collection(db, 'LichLamViec'), where('date', '==', todayStr), limit(200))
            : query(collection(db, 'LichLamViec'), where('date', '>=', startDate), where('date', '<=', endDate), limit(3000)));
        
      if (options?.exactDate) {
         if (options?.branchId) {
             scheduleQuery = query(collection(db, 'LichLamViec'), where('date', '==', options.exactDate), where('locationId', '==', options.branchId), limit(200));
         } else {
             scheduleQuery = query(collection(db, 'LichLamViec'), where('date', '==', options.exactDate), limit(200));
         }
      }

      let leaveQuery = options?.empId 
        ? query(collection(db, 'XinNghiPhep'), where('empId', '==', options.empId), where('leaveDate', '>=', startDate), where('leaveDate', '<=', endDate), limit(100)) 
        : query(collection(db, 'XinNghiPhep'), where('leaveDate', '>=', startDate), where('leaveDate', '<=', endDate), limit(1000));
        
      if (options?.exactDate) {
        if (options?.empId) {
          leaveQuery = query(collection(db, 'XinNghiPhep'), where('empId', '==', options.empId), where('leaveDate', '==', options.exactDate), limit(5));
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
        { key: 'payrollAdjustments', query: options?.empId ? query(collection(db, 'PayrollAdjustments'), where('monthYear', '==', targetMonth), where('empId', '==', options.empId)) : query(collection(db, 'PayrollAdjustments'), where('monthYear', '==', targetMonth)), type: 'lazy' },
        { key: 'violations', query: options?.empId ? query(collection(db, 'Violations'), where('monthYear', '==', targetMonth), where('empId', '==', options.empId)) : query(collection(db, 'Violations'), where('monthYear', '==', targetMonth)), type: 'lazy' },
        { key: 'materialLossLogs', query: query(collection(db, 'MaterialLossLogs'), where('monthYear', '==', targetMonth), orderBy('processedAt', 'desc'), limit(100)), type: 'lazy' },
        { key: 'retainedSalaryRecords', query: query(collection(db, 'RetainedSalaryRecords'), orderBy('createdAt', 'desc'), limit(500)), type: 'lazy' },
        { key: 'chamCongs', query: timesheetQuery, type: 'lazy' },
        { key: 'lichLamViecs', query: scheduleQuery, type: 'lazy' },
        { key: 'planningGoals', query: query(collection(db, 'PlanningGoals'), limit(100)), type: 'static' },
        { key: 'salaryHistories', query: query(collection(db, 'SalaryHistories'), limit(500)), type: 'lazy' }
      ];

      // If force is a targeted array/string, ONLY fetch those queries
      const forceKeys = Array.isArray(force) ? force : (typeof force === 'string' ? [force] : null);
      
      const activeQueries = config.filter(c => {
        if (forceKeys) {
          return forceKeys.includes(c.key);
        }
        if (force === true) {
          return true; // Fetch all if force is true
        }
        if (hasInitialLoadedRef.current) return false; // Initial load only fetches types: dynamic & static
        
        // OPTIMIZATION: If no one is logged in, don't fetch heavy global lists on mount!
        const hasSavedEmployee = !!localStorage.getItem('loggedInEmployee');
        const hasSavedAdmin = !!localStorage.getItem('currentAdmin');
        
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
        const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache to avoid staleness, but enough to survive the 5:30-6:00 rush
        const cacheStoreKey = `db_cache_${c.key}`;
        const cacheTimestampKey = `db_cache_time_${c.key}`;
        
        let shouldFetch = true;
        if (force !== true) {
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
        }
        
        if (shouldFetch) {
           return getDocs(c.query).then(snap => {
              const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
              // Cache dynamic/static collections natively to save big morning rushes
              if (c.type !== 'lazy') {
                 localStorage.setItem(cacheStoreKey, JSON.stringify(data));
                 localStorage.setItem(cacheTimestampKey, Date.now().toString());
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
           if (Array.isArray(items) && (options?.isWeek || options?.exactDate || options?.onlyToday) && prev[key]) {
              let qStart = startDate;
              let qEnd = endDate;
              if (options?.exactDate) {
                 qStart = options.exactDate;
                 qEnd = options.exactDate;
              } else if (options?.onlyToday) {
                 qStart = format(new Date(), 'yyyy-MM-dd');
                 qEnd = qStart;
              }

              const dateField = key === 'xinNghiPheps' ? 'leaveDate' : 'date';

              const filteredPrev = prev[key].filter((item: any) => {
                 const itemDate = item[dateField];
                 if (!itemDate) return true;
                 
                 const inDateRange = itemDate >= qStart && itemDate <= qEnd;
                 
                 let inEmpScope = true;
                 if (options?.empId || options?.docId) {
                    inEmpScope = item.empId === (options.empId || options.docId);
                 }
                 
                 let inBranchScope = true;
                 if (options?.branchId && key === 'lichLamViecs') {
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
    // Always fetch data on mount so we have data for login screen
    fetchInitialData();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    
    return () => {
      unsubscribe();
    };
  }, [fetchInitialData]);

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

