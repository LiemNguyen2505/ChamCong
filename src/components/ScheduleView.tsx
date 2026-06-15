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
        // Do not fetch! The UI will be updated via setGlobalData locally
        // to strictly follow instructions: "CHỈ đẩy phần dữ liệu... lên database"
        return;
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
                        
                        // Mutate locally instead of fetching
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
                        
                        // Mutate locally
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
                        
                        // Mutate locally
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
                        await handleRefetchWeek();
                    } catch (error) {
                        console.error('Error batch deleting shifts:', error);
                    }
                }}
                onBatchSaveShifts={async (shifts) => {
                    try {
                        const batch = writeBatch(db);
                        shifts.forEach(shift => {
                            const emp = nhanViens.find(e => e.id === shift.empId);
                            const shiftId = (shift as any).id || doc(collection(db, 'LichLamViec')).id;
                            batch.set(doc(db, 'LichLamViec', shiftId), {
                                ...shift,
                                empName: emp?.fullName || '',
                                shiftName: `${shift.startTime} - ${shift.endTime}`,
                                status: 'scheduled',
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            });
                        });
                        await batch.commit();
                        await handleRefetchWeek();
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
                        shiftsToSave.forEach(shift => {
                            const emp = nhanViens.find(e => e.id === shift.empId);
                            const shiftId = (shift as any).id || doc(collection(db, 'LichLamViec')).id;
                            batch.set(doc(db, 'LichLamViec', shiftId), {
                                ...shift,
                                empName: emp?.fullName || '',
                                shiftName: `${shift.startTime} - ${shift.endTime}`,
                                status: 'scheduled',
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            });
                        });
                        
                        await batch.commit();
                        await handleRefetchWeek();
                    } catch (error) {
                        console.error('Error syncing week shifts:', error);
                    }
                }}
            />
        </div>
    );
};
