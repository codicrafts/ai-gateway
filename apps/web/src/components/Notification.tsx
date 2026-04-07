'use client';

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { hideNotification } from '@/store/slices/notificationSlice';

export default function Notification() {
  const { message, type, visible } = useAppSelector((s) => s.notification);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => dispatch(hideNotification()), 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, dispatch]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-5 right-5 z-[10000] flex items-center gap-2 px-6 py-4 rounded-lg shadow-lg text-white animate-slide-in ${
        type === 'success' ? 'bg-success' : 'bg-danger'
      }`}
    >
      <i className={`fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
      <span>{message}</span>
    </div>
  );
}
