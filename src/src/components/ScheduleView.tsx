import React from 'react';
import { SmartScheduleBuilder } from './SmartScheduleBuilder';
import { db } from '../firebase';
import { collection, doc, serverTimestamp, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface ScheduleViewProps {
    nhanViens: any[];
    lichLamViecs: any[];
    filterBranch: string;
    currentAdmin: any;
    planningGoals: any[];
    adminTheme: any;
    setIsScheduleModalOpen: (isOpen: boolean) => void;
    fetchInitialData: () => Promise<void>;
    exportToCSV: () => void;
    BranchTabs: React.ComponentType;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
    nhanViens, lichLamViecs, filterBranch, currentAdmin, planningGoals, adminTheme,
    setIsScheduleModalOpen, fetchInitialData, exportToCSV, BranchTabs
}) => {
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
                onModalToggle={(isOpen) => setIsScheduleModalOpen(isOpen)}
                onAddShift={async (shift) => {
                    try {
                        const emp = nhanViens.find(e => e.id === shift.empId);
                        const shiftId = (shift as any).id || doc(collection(db, 'LichLamViec')).id;
                        
                        await setDoc(doc(db, 'LichLamViec', shiftId), {
                            ...shift,
                            empName: emp?.fullName || '',
                            shiftName: `${shift.startTime} - ${shift.endTime}`,
                            status: 'scheduled',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                        await fetchInitialData();
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
                        await setDoc(doc(db, 'LichLamViec', id), {
                            ...updateData,
                            updatedAt: serverTimestamp()
                        }, { merge: false });
                        
                        await fetchInitialData();
                    } catch (error) {
                        console.error('Error updating shift:', error);
                    }
                }}
                onDeleteShift={async (id) => {
                    try {
                        await deleteDoc(doc(db, 'LichLamViec', id));
                        await fetchInitialData();
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
                        await fetchInitialData();
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
                        await fetchInitialData();
                    } catch (error) {
                        console.error('Error batch saving shifts:', error);
                    }
                }}
            />
        </div>
    );
};
