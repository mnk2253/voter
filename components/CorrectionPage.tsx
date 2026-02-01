
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, limit } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Search, 
  RefreshCw,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Save,
  X,
  ChevronRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

// Character mapping for fixing common artifacts
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
    [/ু\s+/g, 'ু'], [/র্\s+/g, 'র্']
  ];
  for (const [pattern, rep] of replacements) {
    result = result.replace(pattern, rep);
  }
  return result.replace(/\s+/g, ' ').trim();
};

export const CorrectionPage: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'voters'), where('status', '==', 'active'), limit(2000));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setVoters(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const hasArtifacts = (text: string) => /[ĺĨęĽŌŽñĥńİÏŘýঁ]/.test(text || "");

  const filteredVoters = voters.filter(v => {
    const s = searchTerm.toLowerCase().trim();
    const searchable = `${v.name} ${v.fatherName} ${v.voterNumber} ${v.slNo}`.toLowerCase();
    
    // Auto-detect errors if no search term, otherwise filter by term
    if (!s) return hasArtifacts(v.name) || hasArtifacts(v.fatherName);
    return searchable.includes(s);
  });

  const handleQuickFix = async (voter: any) => {
    setIsUpdating(voter.id);
    try {
      await updateDoc(doc(db, 'voters', voter.id), {
        name: cleanText(voter.name),
        fatherName: cleanText(voter.fatherName),
        motherName: cleanText(voter.motherName || ''),
        occupation: cleanText(voter.occupation || 'ভোটার')
      });
    } catch (err) {
      alert('সংশোধন করা সম্ভব হয়নি।');
    } finally {
      setIsUpdating(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
      <RefreshCw className="animate-spin mb-4" size={32} />
      <p className="font-bold text-sm">ত্রুটিযুক্ত ডাটা স্ক্যান করা হচ্ছে...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 px-2">
      {/* Header */}
      <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden border-b-8 border-emerald-500">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-3">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
                <Wand2 size={18} className="text-white" />
            </div>
            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Smart Correction Hub</span>
          </div>
          <h2 className="text-3xl font-black leading-none mb-2">তথ্য সংশোধনী কেন্দ্র</h2>
          <p className="text-slate-400 text-sm font-medium">ভাঙা ফন্ট ও ভুল নাম সংশোধনের আধুনিক সিস্টেম</p>
        </div>
        <FileText size={120} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
      </div>

      {/* Control Section */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div className="flex items-center space-x-3">
                <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-800">ত্রুটি শনাক্ত হয়েছে</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{voters.filter(v => hasArtifacts(v.name) || hasArtifacts(v.fatherName)).length} টি সম্ভাব্য ত্রুটি</p>
                </div>
            </div>
            <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="নাম বা আইডি দিয়ে ফিল্টার করুন..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-emerald-500 transition-all text-sm font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filteredVoters.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100 mx-2">
            <CheckCircle2 size={48} className="mx-auto text-emerald-200 mb-4" />
            <h3 className="text-slate-600 font-black text-lg">অভিনন্দন! কোনো ডাটা ত্রুটি পাওয়া যায়নি</h3>
            <p className="text-slate-400 text-sm mt-1">সবগুলো রেকর্ড প্রমিত বাংলায় রয়েছে।</p>
          </div>
        ) : (
          filteredVoters.map((voter) => (
            <div key={voter.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group overflow-hidden">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start space-x-5 flex-1">
                    <div className="h-16 w-16 rounded-[24px] bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-slate-400 font-black text-xs">নং: {voter.slNo}</span>
                    </div>
                    <div className="space-y-4 flex-1 min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">বর্তমানে আছে (Broken Artifacts)</p>
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 font-bold text-sm flex items-center truncate">
                                    <X size={14} className="mr-2 shrink-0" /> {voter.name}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">প্রস্তাবিত সংশোধন (Suggested Fix)</p>
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 font-bold text-sm flex items-center truncate">
                                    <CheckCircle2 size={14} className="mr-2 shrink-0" /> {cleanText(voter.name)}
                                </div>
                            </div>
                        </div>
                        {(hasArtifacts(voter.fatherName) || hasArtifacts(voter.motherName)) && (
                           <div className="pt-2 border-t border-slate-50">
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">পিতা/মাতার নাম সংশোধন</p>
                              <div className="flex items-center space-x-3 text-xs font-bold text-slate-600">
                                 <span className="line-through text-slate-300 truncate max-w-[100px]">{voter.fatherName}</span>
                                 <ChevronRight size={14} className="text-slate-400" />
                                 <span className="text-emerald-600 truncate">{cleanText(voter.fatherName)}</span>
                              </div>
                           </div>
                        )}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleQuickFix(voter)}
                    disabled={isUpdating === voter.id}
                    className="shrink-0 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-emerald-600 hover:shadow-emerald-200 transition-all flex items-center justify-center space-x-2 active:scale-95"
                  >
                    {isUpdating === voter.id ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    <span>সংশোধন নিশ্চিত করুন</span>
                  </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
