
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { Search, Phone, MessageSquare, Briefcase, User as UserIcon, Copy, Check, Bell, Clock } from 'lucide-react';

interface MemberDirectoryProps {
  currentUser: UserProfile;
  onMessageClick: (member: UserProfile) => void;
  unreadCounts: { [key: string]: number };
}

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({ currentUser, onMessageClick, unreadCounts }) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Now users collection ONLY contains registered people, no more imported voters
    const q = query(collection(db, 'users'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMembers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
      const filtered = allMembers.filter(m => m.id !== currentUser.id);
      setMembers(filtered);
    });
    return unsubscribe;
  }, [currentUser.id]);

  const handleCopy = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.phone.includes(searchTerm) ||
    m.occupation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="সদস্য খুঁজুন (নাম, নাম্বার বা পেশা)..."
          className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredMembers.map(member => {
          const unreadCount = unreadCounts[member.id] || 0;
          return (
            <div key={member.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex items-start space-x-4 hover:shadow-md transition-all relative">
              {unreadCount > 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-bounce shadow-sm">
                  {unreadCount} New
                </div>
              )}
              <img src={member.photoUrl} className="h-16 w-16 rounded-2xl object-cover border shadow-sm" alt="" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-lg truncate">{member.name}</h3>
                <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">{member.isOnline ? 'Online' : 'Offline'}</p>
                <p className="text-[11px] text-gray-500 mt-1 truncate flex items-center"><UserIcon size={12} className="mr-1" /> {member.fatherName}</p>
                <p className="text-[11px] text-gray-600 font-medium mt-0.5 truncate flex items-center"><Briefcase size={12} className="mr-1" /> {member.occupation}</p>
                
                <div className="mt-3 flex space-x-2">
                  <a href={`tel:${member.phone}`} className="flex-1 bg-green-50 text-green-700 py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center space-x-1">
                    <Phone size={12} /><span>কল</span>
                  </a>
                  <button onClick={() => onMessageClick(member)} className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center space-x-1">
                    <MessageSquare size={12} /><span>মেসেজ</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
