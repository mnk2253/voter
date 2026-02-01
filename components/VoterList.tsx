
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Search, 
  MessageSquare, 
  CreditCard, 
  User as UserIcon, 
  Briefcase, 
  PhoneCall, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  RefreshCw,
  Calendar,
  Users
} from 'lucide-react';

interface VoterListProps {
  currentUser: UserProfile;
  onMessageClick: (member: UserProfile) => void;
}

export const VoterList: React.FC<VoterListProps> = ({ currentUser, onMessageClick }) => {
  const [voters, setVoters] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingVoter, setEditingVoter] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    birthDate: '',
    voterNumber: '',
    slNo: '',
    occupation: ''
  });

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    // Now fetching from 'voters' collection
    const q = query(collection(db, 'voters'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVoters(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDelete = async (voterId: string, voterName: string) => {
    if (window.confirm(`${voterName}-কে কি মুছে ফেলতে চান?`)) {
      try {
        await deleteDoc(doc(db, 'voters', voterId));
        alert('মুছে ফেলা হয়েছে।');
      } catch (err) {
        alert('সমস্যা হয়েছে।');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoter || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'voters', editingVoter.id), editData);
      setEditingVoter(null);
      alert('আপডেট হয়েছে।');
    } catch (err) {
      alert('আপডেট ব্যর্থ।');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredVoters = voters.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.voterNumber && v.voterNumber.includes(searchTerm))
  );

  if (loading) return <div className="text-center py-20 animate-pulse">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <div className="bg-gradient-to-br from-indigo-700 to-blue-800 rounded-[32px] p-8 text-white shadow-xl flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black">ভোটার তালিকা (Official)</h2>
          <p className="text-indigo-100 text-xs mt-1">শ্রীদাসগাতী গ্রামের ভোটার ডাটাবেস।</p>
          <div className="mt-4 bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold w-fit">Total: {voters.length}</div>
        </div>
        <CreditCard size={60} className="opacity-20" />
      </div>

      <div className="relative px-2">
        <Search className="absolute left-6 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="নাম বা ভোটার আইডি দিয়ে খুঁজুন..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
        {filteredVoters.map(voter => (
          <div key={voter.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all relative group">
            {isAdmin && (
              <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingVoter(voter); setEditData(voter); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(voter.id, voter.name)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            )}
            <div className="flex space-x-4">
              <div className="relative">
                <img src={voter.photoUrl} className="h-20 w-20 rounded-2xl object-cover border" />
                <span className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-lg">SL: {voter.slNo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 leading-tight break-words">{voter.name}</h3>
                <div className="mt-2 space-y-1 text-[11px] text-gray-500 font-bold">
                  <p className="flex items-center"><UserIcon size={12} className="mr-1" /> পিতা: {voter.fatherName}</p>
                  <p className="flex items-center"><Users size={12} className="mr-1" /> মাতা: {voter.motherName || 'নেই'}</p>
                  <p className="flex items-center"><Calendar size={12} className="mr-1" /> জন্ম: {voter.birthDate}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Voter ID</p>
               <p className="text-indigo-800 font-black text-sm font-mono">{voter.voterNumber}</p>
            </div>
          </div>
        ))}
      </div>

      {editingVoter && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">ভোটার তথ্য সংশোধন</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="নাম" value={editData.name} onChange={v => setEditData({...editData, name: v})} />
                <InputGroup label="পিতা" value={editData.fatherName} onChange={v => setEditData({...editData, fatherName: v})} />
                <InputGroup label="মাতা" value={editData.motherName} onChange={v => setEditData({...editData, motherName: v})} />
                <InputGroup label="জন্ম" value={editData.birthDate} onChange={v => setEditData({...editData, birthDate: v})} />
                <InputGroup label="ID No" value={editData.voterNumber} onChange={v => setEditData({...editData, voterNumber: v})} />
                <InputGroup label="SL No" value={editData.slNo} onChange={v => setEditData({...editData, slNo: v})} />
              </div>
              <div className="flex space-x-2 pt-4">
                <button type="button" onClick={() => setEditingVoter(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">বাতিল</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">সেভ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
    <input className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);
