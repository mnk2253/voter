
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, orderBy, limit } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Search, 
  CreditCard, 
  User as UserIcon, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Calendar,
  ChevronDown,
  X,
  Save
} from 'lucide-react';

interface VoterListProps {
  currentUser: UserProfile;
  onMessageClick: (member: UserProfile) => void;
}

export const VoterList: React.FC<VoterListProps> = ({ currentUser }) => {
  const [voters, setVoters] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  
  const [editingVoter, setEditingVoter] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const q = query(
      collection(db, 'voters'), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(1000) 
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVoters(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDelete = async (voterId: string, voterName: string) => {
    if (window.confirm(`${voterName}-কে মুছে ফেলবেন?`)) {
      await deleteDoc(doc(db, 'voters', voterId));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoter || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'voters', editingVoter.id), editData);
      setEditingVoter(null);
    } catch (err) { 
      alert('তথ্য আপডেট করতে সমস্যা হয়েছে।'); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const filteredVoters = voters.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.voterNumber && v.voterNumber.includes(searchTerm))
  );

  const displayedVoters = filteredVoters.slice(0, visibleCount);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-indigo-500">
      <RefreshCw className="animate-spin mb-4" size={32} />
      <p className="font-bold text-sm">ভোটার ডাটাবেস লোড হচ্ছে...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[32px] p-8 text-white shadow-xl flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black">ভোটার তালিকা</h2>
          <p className="text-indigo-100 text-xs mt-1">শ্রীদাসগাতী গ্রামের ডিজিটাল ভোটার তথ্য।</p>
          <div className="mt-4 bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black w-fit uppercase">মোট রেকর্ড: {voters.length}</div>
        </div>
        <CreditCard size={60} className="opacity-10" />
      </div>

      <div className="relative px-2">
        <Search className="absolute left-6 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="নাম বা ভোটার আইডি দিয়ে খুঁজুন..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(50); }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
        {displayedVoters.map(voter => (
          <div key={voter.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 hover:shadow-md transition-all group relative">
            {isAdmin && (
              <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => { setEditingVoter(voter); setEditData(voter); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg transition-colors hover:bg-blue-100"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(voter.id, voter.name)} className="p-2 text-red-600 bg-red-50 rounded-lg transition-colors hover:bg-red-100"><Trash2 size={16} /></button>
              </div>
            )}
            <div className="flex space-x-4">
              <div className="relative flex-shrink-0">
                <img src={voter.photoUrl} className="h-20 w-20 rounded-2xl object-cover bg-gray-50 border border-gray-100 shadow-sm" alt="" />
                <span className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-lg shadow-sm font-black">SL: {voter.slNo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 leading-tight text-lg truncate">{voter.name}</h3>
                <div className="mt-2 space-y-1 text-[11px] text-gray-500 font-bold">
                  <p className="truncate flex items-center"><UserIcon size={12} className="mr-1.5 text-indigo-400" /> পিতা: {voter.fatherName}</p>
                  <p className="truncate flex items-center"><UserIcon size={12} className="mr-1.5 text-pink-400" /> মাতা: {voter.motherName || 'তথ্য নেই'}</p>
                  <p className="flex items-center"><Calendar size={12} className="mr-1.5 text-amber-500" /> জন্ম: {voter.birthDate}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
               <p className="text-indigo-800 font-black text-xs font-mono">{voter.voterNumber}</p>
               <p className="text-indigo-600 font-bold text-[10px] bg-white px-2 py-0.5 rounded-md border border-indigo-100">{voter.occupation || 'ভোটার'}</p>
            </div>
          </div>
        ))}
      </div>

      {visibleCount < filteredVoters.length && (
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => setVisibleCount(prev => prev + 50)}
            className="flex items-center space-x-2 bg-white text-indigo-700 px-8 py-3 rounded-2xl font-black text-xs border border-indigo-100 shadow-sm active:scale-95 transition-all"
          >
            <ChevronDown size={18} />
            <span>আরও দেখুন</span>
          </button>
        </div>
      )}

      {editingVoter && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <h3 className="font-black text-lg uppercase tracking-widest flex items-center">
                <Edit2 size={20} className="mr-2" /> তথ্য আপডেট করুন
              </h3>
              <button onClick={() => setEditingVoter(null)} className="p-1 hover:bg-white/10 rounded-lg"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ভোটারের নাম</label>
                   <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">পিতার নাম</label>
                   <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editData.fatherName} onChange={e => setEditData({...editData, fatherName: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">মাতার নাম</label>
                   <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editData.motherName || ''} onChange={e => setEditData({...editData, motherName: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">জন্ম তারিখ</label>
                   <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editData.birthDate || ''} onChange={e => setEditData({...editData, birthDate: e.target.value})} placeholder="DD/MM/YYYY" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ভোটার আইডি নং</label>
                   <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editData.voterNumber} onChange={e => setEditData({...editData, voterNumber: e.target.value})} />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setEditingVoter(null)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors">বাতিল</button>
                <button 
                  type="submit" 
                  disabled={isUpdating} 
                  className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  {isUpdating ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
