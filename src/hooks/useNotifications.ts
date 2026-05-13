import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { AppNotification } from '../types/admin';

export type NotificationRecipient = 'SuperAdmin' | 'Admin' | 'Employee' | 'BranchAdmin';

export const useNotifications = (
  role: NotificationRecipient | null,
  userId: string | null,
  locationIds: string[] = []
) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!role || !userId) return;

    // Filter logic based on user role
    let q;
    const notificationsRef = collection(db, 'Notifications');

    if (role === 'SuperAdmin') {
      // Super Admin sees all notifications, but we can still filter for relevant ones if needed
      q = query(
        notificationsRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (role === 'Admin' || role === 'BranchAdmin') {
      // Admin sees notifications for their branches
      const branches = locationIds.length > 0 ? locationIds : ['all'];
      q = query(
        notificationsRef,
        where('locationId', 'in', [...branches, 'all']),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      // Employee sees notifications addressed to them individually
      q = query(
        notificationsRef,
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetched: AppNotification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AppNotification));

      // Filter for Admin/SuperAdmin to only show notifications meant for them
      if (role === 'SuperAdmin' || role === 'Admin' || role === 'BranchAdmin') {
        fetched = fetched.filter(n => n.recipientId === 'admin' || n.recipientId === userId);
      }
      
      setNotifications(fetched);
      setUnreadCount(fetched.filter(n => !n.isRead).length);
    }, (error) => {
      console.error("Notification listener error:", error);
    });

    return () => unsubscribe();
  }, [role, userId, JSON.stringify(locationIds)]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'Notifications', notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      const promises = unread.map(n => 
        updateDoc(doc(db, 'Notifications', n.id), { isRead: true })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const sendNotification = async (notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'Notifications'), {
        ...notif,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    sendNotification
  };
};
