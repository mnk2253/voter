
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, addDoc, limit, writeBatch, getDocs } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  ShieldCheck, 
  Trash2,
  X,
  RefreshCw,
  UserPlus,
  Users,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Phone,
  Lock,
  Briefcase,
  User as UserIcon,
  Wand2,
  LayoutGrid
} from 'lucide-react';

const EC_CHAR_MAP: Record<string, string> = {
  'ĺ': 'ব্দ', 'Ĩ': 'সা', 'ę': 'দ্র', 'Ľ': 'ব্র', 'Ō': 'ছা', 'Ž': 'জ', 'ñ': 'ন', 'ĥ': 'ন্ম', 'ń': 'ম্ব', 'İ': 'ি', 'Ï': 'ো',
  'Ř': 'শ্র', 'ý': 'গঞ্জ', 'ঁ': 'া'
};

const cleanDataString = (text: string): string => {
  if (!text) return "";
  let result = text.replace(/[ĺĨęĽŌŽñĥńİÏŘýঁ]/g, match => EC_CHAR_MAP[match] || match);
  const replacements: [RegExp, string][] = [
    [/োমাছাঃ/g, 'মোছাঃ'], [/োমাঃ/g, 'মোঃ'], [/োভাটার\s*নং/g, 'ভোটার নং'],
    [/োভাটার/g, 'ভোটার'], [/িপতা/g, 'পিতা'], [/ামাতা/g, 'মাতা'],
    [/োপেশা/g, 'পেশা'], [/জ[ĥন্ম]\s*তািরখ/g, 'জন্ম তারিখ'],
    [/ে\s*া/g, 'ো'], [/ে\s*ৗ/g, 'ৌ'], [/ি\s+/g, 'ি'],
    [/ু\s+/g, 'ু'], [/র্\s+/g, 'র্'], [/ঃ/g, ':'], [/(\s*\:\s*)/g, ': '],
    [/মাইগ্রেট\s*কৃত/g, '']
  ];
  for (const [pattern, rep] of replacements) {
    result = result.replace(pattern, rep);
  }
  return result.replace(/\s+/g, ' ').trim();
};

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [voterCount, setVoterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100)), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
    });
    
    const unsubVoters = onSnapshot(collection(db, 'voters'), (snapshot) => {
      setVoterCount(snapshot.size);
      setLoading(false);
    });

    return () => { unsubUsers(); unsubVoters(); };
  }, []);

  const handleGlobalDataClean = async () => {
    if (!window.confirm("আপনি কি ডাটাবেসের সকল রেকর্ড অটো-ফিক্স করতে চান? এটি করতে কিছুটা সময় লাগতে পারে।")) return;
    
    setIsCleaning(true);
    setProcessStatus("ডাটা স্ক্যান করা হচ্ছে...");
    
    try {
      const snapshot = await getDocs(collection(db, 'voters'));
      const batchSize = 400;
      let processed = 0;
      
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const chunk = docs.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach(d => {
          const data = d.data();
          const cleanedName = cleanDataString(data.name || "");
          const cleanedFather = cleanDataString(data.fatherName || "");
          
          if (cleanedName !== data.name || cleanedFather !== data.fatherName) {
            batch.update(d.ref, {
              name: cleanedName,
              fatherName: cleanedFather,
              motherName: cleanDataString(data.motherName || "")
            });
            processed++;
          }
        });
        
        await batch.commit();
        setProcessStatus(`${i + chunk.length} টি রেকর্ড যাচাই করা হয়েছে...`);
      }
      
      alert(`সফলভাবে ${processed} টি রেকর্ডের ফন্ট ত্রুটি সংশোধন করা হয়েছে।`);
    } catch (err) {
      alert("ডাটা ক্লিনিং এর সময় ত্রুটি হয়েছে।");
    } finally {
      setIsCleaning(false);
      setProcessStatus("");
    }
  };

  return (
    <div className="space-y-8 pb-10 max-w-4xl mx-auto px-2">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center">
              <ShieldCheck className="mr-3 text-emerald-500" size={28} /> অ্যাডমিন ড্যাশবোর্ড
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Village Database & User Control</p>
          </div>
          <div className="flex space-x-2">
              <button className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-sm">
                <Database size={18} /><span>ইম্পোর্ট</span>
              </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 border-b-4 border-emerald-500">
         <div className="flex items-center space-x-4">
            <div className="bg-emerald-500/20 p-4 rounded-3xl border border-emerald-500/30">
                <Wand2 size={32} className="text-emerald-400" />
            </div>
            <div>
                <h3 className="font-black text-xl">অটো ডাটা ক্লিনআপ</h3>
                <p className="text-slate-400 text-xs mt-1">ভাঙা ফন্ট ও ভুল অক্ষর এক ক্লিকে ঠিক করুন</p>
            </div>
         </div>
         <button 
           onClick={handleGlobalDataClean}
           disabled={isCleaning}
           className="w-full sm:w-auto bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-lg flex items-center justify-center space-x-3"
         >
           {isCleaning ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
           <span>{isCleaning ? "প্রসেসিং..." : "ডাটা ফিক্স করুন"}</span>
         </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট ভোটার</p>
            <h4 className="text-3xl font-black text-slate-800">{voterCount}</h4>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">নিবন্ধিত অ্যাকাউন্ট</p>
            <h4 className="text-3xl font-black text-slate-800">{users.length}</h4>
         </div>
      </div>

      <div className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-sm">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
             <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center"><Users size={20} className="mr-2 text-emerald-500" /> ইউজার লিস্ট</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 flex items-center space-x-4">
                    <img src={user.photoUrl} className="h-12 w-12 rounded-2xl object-cover shadow-sm" alt="" />
                    <div>
                      <p className="text-sm font-black text-slate-800">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{user.phone}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {user.role}
                      </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => { if(window.confirm(`${user.name}-এর অ্যাকাউন্ট মুছতে চান?`)) deleteDoc(doc(db, 'users', user.id)) }} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={20}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
