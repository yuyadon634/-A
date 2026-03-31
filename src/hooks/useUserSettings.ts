import { useState, useEffect } from 'react';
import { User } from '@/types';

export function useUserSettings() {
  const [user1Name, setUser1Name] = useState('夫');
  const [user2Name, setUser2Name] = useState('妻');
  const [tempUser1Name, setTempUser1Name] = useState('夫');
  const [tempUser2Name, setTempUser2Name] = useState('妻');

  useEffect(() => {
    const savedUser1 = localStorage.getItem('user1Name');
    const savedUser2 = localStorage.getItem('user2Name');
    if (savedUser1) {
      setUser1Name(savedUser1);
      setTempUser1Name(savedUser1);
    }
    if (savedUser2) {
      setUser2Name(savedUser2);
      setTempUser2Name(savedUser2);
    }
  }, []);

  const saveSettings = (onClose: () => void) => {
    if (tempUser1Name.trim() && tempUser2Name.trim()) {
      setUser1Name(tempUser1Name);
      setUser2Name(tempUser2Name);
      localStorage.setItem('user1Name', tempUser1Name);
      localStorage.setItem('user2Name', tempUser2Name);
      onClose();
    } else {
      alert('ユーザー名を入力してください');
    }
  };

  const cancelSettings = () => {
    setTempUser1Name(user1Name);
    setTempUser2Name(user2Name);
  };

  const getDisplayName = (userIdentifier: User | undefined): string => {
    if (!userIdentifier) return '';
    return userIdentifier === '夫' ? user1Name : user2Name;
  };

  return {
    user1Name,
    user2Name,
    tempUser1Name,
    tempUser2Name,
    setTempUser1Name,
    setTempUser2Name,
    saveSettings,
    cancelSettings,
    getDisplayName,
  };
}
