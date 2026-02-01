
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, limit } from '@firebase/firestore';
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
  Save,
  Filter,
  CheckCircle2
} from 'lucide-react';

// Character mapping for fixing broken artifacts
const CHAR_MAP: Record<string, string> = {
  'ĺ': 'ব্দ', 'Ĩ': 'সা', 'ę': 'দ্র', 'Ľ': 'ব্র', 'Ō': 'ছা', 'Ž': 'জ', 'ñ': 'ন', 'ĥ': 'ন্ম', 'ń': 'ম্ব', 'İ': 'ি', 'Ï': 'ো',
  'Ř': 'শ্র', 'ý': 'গঞ্জ', 'ঁ': 'া'
};

const cleanText = (text: string): string => {
  if (!text) return "";
  let result = text.replace(/[ĺĨęĽŌŽñĥńİÏŘýঁ]/g, match => CHAR_MAP[match] || match);
  const replacements: [RegExp, string][] = [
    [/োমাছাঃ/g, 'মোছাঃ'], [/োমাঃ/g, 'মোঃ'], [/োভাটার/g, 'ভোটার'],
    [/িপতা/g, 'পিতা'], [/ামাতা/g, 'মাতা'], [/োপেশা/g, 'পেশা'],
    [/ে\s*া/g, 'ো'], [/ে\s*ৗ/g, 'ৌ'], [/ি\s+/g, 'ি'],
    [/ু\s+/g, 'ু'], [/র্\s+/g, 'র্'], [/(\s*\:\s*)/g, ': ']
  ];
  for (const [pattern, rep] of replacements) {
    result = result.replace(pattern, rep);
  }
  return result.trim();
};

interface VoterListProps {
  currentUser: UserProfile;
  onMessageClick: (member: UserProfile) => void;
}

export const VoterList: React.FC<VoterListProps> = ({ currentUser }) => {
  const [voters, setVoters] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
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
      limit(2000) 
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a: any, b: any) => (parseInt(a.slNo) || 9999) - (parseInt(b.slNo) || 9999));
      setVoters(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDelete = async (voterId: string, voterName: string) => {
    if (window.confirm(`${cleanText(voterName)}-কে মুছে ফেলবেন?`)) {
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

  const filteredVoters = voters.filter(v => {
    const s = searchTerm.toLowerCase().trim();
    const searchable = `${v.name} ${v.fatherName} ${v.voterNumber} ${v.slNo} ${v.birthDate}`.toLowerCase();
    
    const matchesSearch = searchable.includes(s);
    const matchesGender = genderFilter === 'All' || v.gender === genderFilter;
    
    return matchesSearch && matchesGender;
  });

  const displayedVoters = filteredVoters.slice(0, visibleCount);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
      <RefreshCw className="animate-spin mb-4" size={32} />
      <p className="font-bold text-sm">অফিসিয়াল ডাটাবেস লোড হচ্ছে...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 px-2">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden border-b-8 border-indigo-500">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight">অফিসিয়াল ভোটার তালিকা</h2>
          <p className="text-slate-400 text-sm mt-1 font-medium">শ্রীদাসগাতী গ্রামের নির্ভুল ডিজিটাল ডাটাবেস।</p>
          <div className="mt-5 flex items-center space-x-3">
            <div className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 backdrop-blur-sm">
              মোট রেকর্ড: {voters.length}
            </div>
          </div>
        </div>
        <CreditCard size={120} className="absolute -right-6 -bottom-6 text-white/5 rotate-12" />
      </div>

      {/* Prominent Search Bar */}
      <div className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={22} />
          </div>
          <input
            type="text"
            placeholder="নাম, ভোটার আইডি, জন্ম তারিখ বা সিরিয়াল নং দিয়ে খুঁজুন..."
            className="w-full pl-14 pr-12 py-5 bg-white border-2 border-slate-100 rounded-[28px] shadow-sm outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-medium"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(50); }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-5 flex items-center text-slate-400 hover:text-slate-900 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Gender Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center mr-2 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50">
            <Filter size={10} className="mr-1.5" /> ফিল্টার:
          </div>
          {[
            { id: 'All', label: 'সবাই', count: voters.length, color: 'bg-slate-900' },
            { id: 'Male', label: 'পুরুষ', count: voters.filter(v => v.gender === 'Male').length, color: 'bg-blue-600' },
            { id: 'Female', label: 'মহিলা', count: voters.filter(v => v.gender === 'Female').length, color: 'bg-rose-600' }
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => setGenderFilter(f.id as any)}
              className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border-2 ${
                genderFilter === f.id ? `${f.color} text-white border-transparent shadow-lg` : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* List Display */}
      {filteredVoters.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 mx-2 animate-in fade-in zoom-in-95">
          <Search size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-slate-500 font-black text-lg">দুঃখিত, কোনো তথ্য পাওয়া যায়নি!</h3>
          <p className="text-slate-400 text-xs mt-1">ভিন্ন কীওয়ার্ড দিয়ে চেষ্টা করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-2">
          {displayedVoters.map((voter) => (
            <div key={voter.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 group relative">
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {isAdmin && (
                  <>
                    <button onClick={() => { setEditingVoter(voter); setEditData(voter); }} className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(voter.id, voter.name)} className="p-2.5 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </>
                )}
              </div>
              
              <div className="flex space-x-5">
                <div className="relative flex-shrink-0">
                  <img src={voter.photoUrl} className="h-24 w-24 rounded-[30px] object-cover bg-slate-50 border border-slate-100 shadow-sm" alt="" />
                  <span className="absolute -top-3 -left-3 bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest shadow-xl border border-slate-800">নং: {voter.slNo}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-black text-slate-900 leading-tight text-xl truncate group-hover:text-indigo-600 transition-colors">
                    {cleanText(voter.name)}
                  </h3>
                  <div className="mt-3 space-y-1.5 text-[12px] font-bold">
                    <p className="truncate flex items-center text-slate-500"><UserIcon size={12} className="mr-2 text-slate-300" /> পিতা: <span className="text-slate-800 ml-1">{cleanText(voter.fatherName)}</span></p>
                    <p className="truncate flex items-center text-slate-500"><UserIcon size={12} className="mr-2 text-slate-300" /> মাতা: <span className="text-slate-800 ml-1">{cleanText(voter.motherName || 'তথ্য নেই')}</span></p>
                    <div className="flex items-center space-x-3 pt-1">
                      <p className="flex items-center text-slate-500"><Calendar size={12} className="mr-2 text-amber-500" /> {voter.birthDate || 'অজানা'}</p>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-black tracking-widest border ${voter.gender === 'Female' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {voter.gender === 'Female' ? 'মহিলা' : 'পুরুষ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/50 transition-colors">
                 <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">ভোটার আইডি নম্বর</p>
                    <p className="text-slate-900 font-black text-sm font-mono tracking-wider">{voter.voterNumber || 'প্রদান করা হয়নি'}</p>
                 </div>
                 <div className="flex items-center space-x-2">
                    <p className="text-indigo-600 font-black text-[10px] bg-white px-3 py-1 rounded-xl border border-indigo-100 shadow-sm">{voter.occupation || 'ভোটার'}</p>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {visibleCount < filteredVoters.length && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={() => setVisibleCount(prev => prev + 50)}
            className="flex items-center space-x-3 bg-white text-slate-900 px-12 py-4 rounded-[28px] font-black text-sm border-2 border-slate-100 shadow-xl hover:border-slate-900 active:scale-95 transition-all"
          >
            <ChevronDown size={20} />
            <span>আরও তালিকা দেখুন</span>
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingVoter && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
              <h3 className="font-black text-xl uppercase tracking-widest flex items-center relative z-10">
                <Edit2 size={24} className="mr-3 text-indigo-400" /> তথ্য সংশোধন
              </h3>
              <button onClick={() => setEditingVoter(null)} className="p-2 hover:bg-white/10 rounded-2xl relative z-10 transition-colors"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">ভোটারের পূর্ণ নাম</label>
                   <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:border-slate-900 outline-none transition-all font-bold" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">লিঙ্গ</label>
                   <select className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:border-slate-900 outline-none appearance-none transition-all font-bold" value={editData.gender || 'Male'} onChange={e => setEditData({...editData, gender: e.target.value})}>
                      <option value="Male">পুরুষ</option>
                      <option value="Female">মহিলা</option>
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">সিরিয়াল নং (SL)</label>
                   <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:border-slate-900 outline-none transition-all font-bold" value={editData.slNo || ''} onChange={e => setEditData({...editData, slNo: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">পিতার নাম</label>
                   <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:border-slate-900 outline-none transition-all font-bold" value={editData.fatherName} onChange={e => setEditData({...editData, fatherName: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">জন্ম তারিখ</label>
                   <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:border-slate-900 outline-none transition-all font-bold" value={editData.birthDate || ''} onChange={e => setEditData({...editData, birthDate: e.target.value})} placeholder="DD/MM/YYYY" />
                </div>
                <div className="col-span-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">ভোটার আইডি নম্বর</label>
                   <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:border-slate-900 outline-none transition-all font-mono font-bold" value={editData.voterNumber} onChange={e => setEditData({...editData, voterNumber: e.target.value})} />
                </div>
              </div>
              
              <div className="flex space-x-4 pt-6">
                <button type="button" onClick={() => setEditingVoter(null)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">বাতিল</button>
                <button 
                  type="submit" 
                  disabled={isUpdating} 
                  className="flex-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center space-x-2 px-10"
                >
                  {isUpdating ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>আপডেট সম্পন্ন করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
