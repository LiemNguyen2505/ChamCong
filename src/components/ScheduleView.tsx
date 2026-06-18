import React from 'react';
import { SmartScheduleBuilder } from './SmartScheduleBuilder';
import { db } from '../firebase';
import { collection, doc, serverTimestamp, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface ScheduleViewProps {
    nhanViens: any[];
    lichLamViecs: any[];
    filterBranch: string;
    filterMonth: string;
    setGlobalData?: any;
    currentAdmin: any;
    planningGoals: any[];
    adminTheme: any;
    setIsScheduleModalOpen: (isOpen: boolean) => void;
    fetchInitialData: (month?: string, force?: any, options?: any) => Promise<any>;
    exportToCSV: () => void;
    BranchTabs: React.ComponentType;
    onDateChange?: (date: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
    nhanViens, lichLamViecs, filterBranch, filterMonth, setGlobalData, currentAdmin, planningGoals, adminTheme,
    setIsScheduleModalOpen, fetchInitialData, exportToCSV, BranchTabs, onDateChange
}) => {
    const currentWeekDateRef = React.useRef<string | null>(null);

    const handleRefetchWeek = async () => {
        if (currentWeekDateRef.current) {
            const [y, m, d] = currentWeekDateRef.current.split('-').map(Number);
            const dDate = new Date(y, m - 1, d);
            const wStart = new Date(dDate); wStart.setDate(wStart.getDate() - 3);
            const wEnd = new Date(dDate); wEnd.setDate(wEnd.getDate() + 10);
            const formatD = (dateObj: Date) => {
                return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            };
            
            await fetchInitialData(undefined, true, {
                targetedKeys: ['lichLamViecs'],
                isWeek: true,
                weekStart: formatD(wStart),
                weekEnd: formatD(wEnd)
            });
        }
    };

    return (
        <div className="pt-0 px-1 md:p-6 h-full flex flex-col overflow-hidden">
            <div className="px-3 md:px-0 mb-1">
                <BranchTabs />
            </div>
            <SmartScheduleBuilder
                employees={nhanViens}
                schedules={lichLamViecs}
                currentBranchFilter={filterBranch}
                managedBranches={currentAdmin?.locationIds || []}
                planningGoals={planningGoals}
                theme={adminTheme}
                exportToCSV={exportToCSV}
                filterMonth={filterMonth}
                onDateChange={(date) => {
                    currentWeekDateRef.current = date;
                    if (onDateChange) onDateChange(date);
                }}
                onModalToggle={(isOpen) => setIsScheduleModalOpen(isOpen)}
                onAddShift={async (shift) => {
                    try {
                        const emp = nhanViens.find(e => e.id === shift.empId);
                        const shiftId = (shift as any).id || doc(collection(db, 'LichLamViec')).id;
                        
                        const newShift = {
                            ...shift,
                            id: shiftId,
                            empName: emp?.fullName || '',
                            shiftName: `${shift.startTime} - ${shift.endTime}`,
                            status: 'scheduled',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        
                        // Push to DB
                        await setDoc(doc(db, 'LichLamViec', shiftId), newShift as any);
                        
                        if (setGlobalData) {
                            setGlobalData((prev: any) => ({
                                ...prev,
                                lichLamViecs: [...prev.lichLamViecs, newShift]
                            }));
                        }
                    } catch (error) {
                        console.error('Error adding shift:', error);
                    }
                }}
                onUpdateShift={async (id, shift) => {
                    try {
                        const updateData: any = {};
                        Object.keys(shift).forEach(key => {
                            if ((shift as any)[key] !== undefined) {
                                updateData[key] = (shift as any)[key];
                            }
                        });
                        if (updateData.startTime && updateData.endTime) {
                            updateData.shiftName = `${updateData.startTime} - ${updateData.endTime}`;
                        }
                        
                        // Push to DB
                        await setDoc(doc(db, 'LichLamViec', id), {
                            ...updateData,
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                        
                        if (setGlobalData) {
                            setGlobalData((prev: any) => ({
                                ...prev,
                                lichLamViecs: prev.lichLamViecs.map((item: any) => item.id === id ? { ...item, ...updateData } : item)
                            }));
                        }
                    } catch (error) {
                        console.error('Error updating shift:', error);
                    }
                }}
                onDeleteShift={async (id) => {
                    try {
                        // Push to DB
                        await deleteDoc(doc(db, 'LichLamViec', id));
                        
                        if (setGlobalData) {
                            setGlobalData((prev: any) => ({
                                ...prev,
                                lichLamViecs: prev.lichLamViecs.filter((item: any) => item.id !== id)
                            }));
                        }
                    } catch (error) {
                        console.error('Error deleting shift:', error);
                    }
                }}
                onBatchDeleteShifts={async (ids) => {
                    try {
                        const batch = writeBatch(db);
                        ids.forEach(id => {
                            batch.delete(doc(db, 'LichLamViec', id));
                        });
                        await batch.commit();
                        if (setGlobalData) {
                            setGlobalData((prev: any) => ({
                                ...prev,
                                lichLamViecs: prev.lichLamViecs.filter((item: any) => !ids.includes(item.id))
                            }));
                        }
                    } catch (error) {
                        console.error('Error batch deleting shifts:', error);
                    }
                }}
                onBatchSaveShifts={async (shifts) => {
                    try {
                        const batch = writeBatch(db);
                        const localShifts: any[] = [];
                        shifts.forEach(shift => {
                            const emp = nhanViens.find(e => e.id === shift.empId);
                            const shiftId = (shift as any).id || doc(collection(db, 'LichLamViec')).id;
                            const shiftDoc = {
                                ...shift,
                                id: shiftId,
                                empName: emp?.fullName || '',
                                shiftName: `${shift.startTime} - ${shift.endTime}`,
                                status: 'scheduled',
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            };
                            batch.set(doc(db, 'LichLamViec', shiftId), shiftDoc);
                            localShifts.push(shiftDoc);
                        });
                        await batch.commit();
                        if (setGlobalData) {
                            setGlobalData((prev: any) => {
                                const newIds = new Set(localShifts.map(s => s.id));
                                const filtered = prev.lichLamViecs.filter((s: any) => !newIds.has(s.id));
                                return { ...prev, lichLamViecs: [...filtered, ...localShifts] };
                            });
                        }
                    } catch (error) {
                        console.error('Error batch saving shifts:', error);
                    }
                }}
                onSyncWeekShifts={async (shiftsToSave, idsToDelete) => {
                    try {
                        const batch = writeBatch(db);
                        
                        // Delete all original shifts
                        idsToDelete.forEach(id => {
                            batch.delete(doc(db, 'LichLamViec', id));
                        });

                        // Add new shifts
                        const localShifts: any[] = [];
                        shiftsToSave.forEach(shift => {
                            const emp = nhanViens.find(e => e.id === shift.empId);
                            const shiftId = (shift as any).id || doc(collection(db, 'LichLamViec')).id;
                            const shiftDoc = {
                                ...shift,
                                id: shiftId,
                                empName: emp?.fullName || '',
                                shiftName: `${shift.startTime} - ${shift.endTime}`,
                                status: 'scheduled',
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            };
                            batch.set(doc(db, 'LichLamViec', shiftId), shiftDoc);
                            localShifts.push(shiftDoc);
                        });
                        
                        await batch.commit();
                        if (setGlobalData) {
                            setGlobalData((prev: any) => {
                                const filtered = prev.lichLamViecs.filter((s: any) => !idsToDelete.includes(s.id));
                                const newIds = new Set(localShifts.map(s => s.id));
                                const doubleFiltered = filtered.filter((s: any) => !newIds.has(s.id));
                                return { ...prev, lichLamViecs: [...doubleFiltered, ...localShifts] };
                            });
                        }
                    } catch (error) {
                        console.error('Error syncing week shifts:', error);
                    }
                }}
            />
        </div>
    );
};
