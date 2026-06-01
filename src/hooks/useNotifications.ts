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
  serverTimestamp,
  arrayUnion 
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

    if (role === 'SuperAdmin' || role === 'Admin' || role === 'BranchAdmin') {
      // Admins see notifications for their branches or 'all'
      // Note: Firestore doesn't support multiple 'in' clauses
      if (role === 'SuperAdmin') {
        q = query(
          notificationsRef,
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      } else {
        const branches = locationIds.length > 0 ? locationIds : ['all'];
        q = query(
          notificationsRef,
          where('locationId', 'in', [...branches, 'all', 'All']),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }
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
      if (role === 'SuperAdmin') {
        fetched = fetched.filter(n => 
          n.recipientId === 'SuperAdmin' ||
          n.recipientId === 'all_admins' ||
          n.recipientId === 'all' ||
          n.recipientId === userId
        );
      } else if (role === 'Admin' || role === 'BranchAdmin') {
        fetched = fetched.filter(n => 
          n.recipientId === 'admin' || 
          n.recipientId === 'all_admins' ||
          n.recipientId === 'all' ||
          n.recipientId === userId
        );
      }

      let processedNotifications = fetched.map(n => ({
        ...n,
        isRead: n.readBy ? n.readBy.includes(userId) : n.isRead
      }));

      // Bỏ các thông báo "Cập nhật bảng lương"
      processedNotifications = processedNotifications.filter(n => n.title?.toLowerCase() !== 'cập nhật bảng lương');
      
      setNotifications(processedNotifications);
      setUnreadCount(processedNotifications.filter(n => !n.isRead).length);
    }, (error) => {
      console.error("Notification listener error:", error);
    });

    return () => unsubscribe();
  }, [role, userId, JSON.stringify(locationIds)]);

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    try {
      const notification = notifications.find(n => n.id === notificationId);
      const updateData: any = {
        readBy: arrayUnion(userId)
      };
      
      // If it's a direct notification to this user, also set isRead for backward compatibility
      if (notification?.recipientId === userId) {
        updateData.isRead = true;
      }
      
      await updateDoc(doc(db, 'Notifications', notificationId), updateData);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const unread = notifications.filter(n => !n.isRead);
      const promises = unread.map(n => {
        const updateData: any = {
          readBy: arrayUnion(userId)
        };
        if (n.recipientId === userId) {
          updateData.isRead = true;
        }
        return updateDoc(doc(db, 'Notifications', n.id), updateData);
      });
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
