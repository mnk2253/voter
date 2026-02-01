
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, addDoc, getDocs, where, limit, writeBatch } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, Post } from '../types';
import { 
  ShieldCheck, 
  Trash2,
  X,
  RefreshCw,
  UserPlus,
  Camera,
  AlertTriangle,
  Users,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Comprehensive map for high-performance replacement of PDF artifacts
const EC_CHAR_MAP: Record<string, string> = {
  'ĺ': 'ব্দ', 'Ĩ': 'সা', 'ę': 'দ্র', 'Ľ': 'ব্র', 'Ō': 'ছা', 'Ž': 'জ', 'ñ': 'ন', 'ĥ': 'ন্ম', 'ń': 'ম্ব', 'İ': 'ি', 'Ï': 'ো',
  // Fix: Removed duplicate key 'ý' on line 25
  'Ř': 'শ্র', 'ý': 'গঞ্জ', 'ঁ': 'া'
};

const cleanSmallString = (text: string): string => {
  if (!text) return "";
  
  // 1. Initial character mapping replacement
  let result = text.replace(/[ĺĨęĽŌŽñĥńİÏŘýঁ]/g, match => EC_CHAR_MAP[match] || match);
  
  // 2. Complex replacements for broken words and vowel signs
  const replacements: [RegExp, string][] = [
    [/োমাছাঃ/g, 'মোছাঃ'], 
    [/োমাঃ/g, 'মোঃ'], 
    [/োভাটার\s*নং/g, 'ভোটার নং'],
    [/োভাটার/g, 'ভোটার'], 
    [/িপতা/g, 'পিতা'], 
    [/ামাতা/g, 'মাতা'],
    [/োপশা/g, 'পেশা'],
    [/োপেশা/g, 'পেশা'],
    [/জ[ĥন্ম]\s*তািরখ/g, 'জন্ম তারিখ'],
    [/জন্ম\s*তািরখ/g, 'জন্ম তারিখ'],
    [/ে\s*া/g, 'ো'], 
    [/ে\s*ৗ/g, 'ৌ'], 
    [/ি\s+/g, 'ি'],
    [/ু\s+/g, 'ু'], 
    [/র্\s+/g, 'র্'],
    [/([ক-হ])\s*ি/g, '$1ি'],
    [/ি([ক-হ])/g, '$1ি'],
    [/ঃ/g, ':'], 
    [/।/g, ''],
    [/(\s*\:\s*)/g, ': ']
  ];

  for (const [pattern, rep] of replacements) {
    result = result.replace(pattern, rep);
  }

  return result.replace(/\s+/g, ' ').trim();
};

const bnToEn = (str: string) => {
  if (!str) return "";
  const digits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (d) => digits[d]);
};

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedVoters, setDetectedVoters] = useState<any[]>([]);
  const [processStatus, setProcessStatus] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100)), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
      setLoading(false);
    });
    return () => unsubUsers();
  }, []);

  const handleDetectVoters = async () => {
    if (!bulkText.trim() || isDetecting) return;
    
    setIsDetecting(true);
    setDetectedVoters([]);
    setProcessStatus('তথ্য খোঁজা শুরু হচ্ছে...');

    setTimeout(() => {
      try {
        const lines = bulkText.split('\n');
        const results: any[] = [];
        
        // Strategy A: Row-based Tabular Data (Standard table copy)
        // Format: [SL] [VoterID] [Name] [Father] [Mother] [BirthDate]
        const rowPattern = /^([০-৯0-9]+)\s+([০-৯0-9]{10,17}|—)\s+(.*?)\s+(.*?)\s+(.*?)\s+([০-৯0-9\/\-]+|—)$/;
        
        // Strategy B: Label-based block data (PDF Detail View)
        const blockPattern = /([০-৯0-9]+)?[\.\s]*নাম\s*[:\s]*(.*?)\s*ভোটার নং\s*[:\s]*([০-৯0-9]+)\s*পিতা\s*[:\s]*(.*?)\s*মাতা\s*[:\s]*(.*?)\s*পেশা\s*[:\s]*(.*?)\s*[,।]?\s*জন্ম তারিখ\s*[:\s]*([০-৯0-9\/\-]+)/gs;

        // Try Strategy A first (Line by line)
        lines.forEach((line, idx) => {
          const cleanLine = line.trim();
          if (!cleanLine || cleanLine.includes('ক্রমিক নং')) return;
          
          const match = cleanLine.match(rowPattern);
          if (match) {
            if (match[2] === '—' || match[3].includes('মাইগ্রেট')) return; // Skip invalid entries
            results.push({
              slNo: bnToEn(match[1]),
              voterNumber: bnToEn(match[2]),
              name: cleanSmallString(match[3]),
              fatherName: cleanSmallString(match[4]),
              motherName: cleanSmallString(match[5]),
              birthDate: bnToEn(match[6]),
              occupation: 'ভোটার'
            });
          }
        });

        // If Strategy A found nothing, try Strategy B (Global block match)
        if (results.length === 0) {
          const normalizedForMatching = bulkText
            .replace(/ঃ/g, ':')
            .replace(/।/g, ' ')
            .replace(/Ïনাম/g, 'নাম')
            .replace(/Ïভাটার\s*নং/g, 'ভোটার নং')
            .replace(/িপতা/g, 'পিতা')
            .replace(/ামাতা/g, 'মাতা')
            .replace(/Ïপশা/g, 'পেশা')
            .replace(/জ[ĥন্ম]\s*তািরখ/g, 'জন্ম তারিখ');
            
          let match;
          while ((match = blockPattern.exec(normalizedForMatching)) !== null) {
            results.push({
              slNo: match[1] ? bnToEn(match[1].trim()) : (results.length + 1).toString(),
              name: cleanSmallString(match[2].trim()), 
              voterNumber: bnToEn(match[3].trim()),
              fatherName: cleanSmallString(match[4].trim()),
              motherName: cleanSmallString(match[5].trim()),
              occupation: cleanSmallString(match[6].trim()),
              birthDate: bnToEn(match[7].trim())
            });
          }
        }

        setDetectedVoters(results);
        setIsDetecting(false);
        setProcessStatus(results.length > 0 ? `মোট ${results.length} জন ভোটার সফলভাবে সনাক্ত করা হয়েছে।` : 'কোনো ভোটার তথ্য পাওয়া যায়নি। অনুগ্রহ করে টেক্সট চেক করুন।');
      } catch (err) {
        console.error(err);
        setProcessStatus('প্রসেসিং এর সময় সমস্যা হয়েছে।');
        setIsDetecting(false);
      }
    }, 100);
  };

  const handleBulkSave = async () => {
    if (detectedVoters.length === 0 || isImporting) return;
    if (!window.confirm(`${detectedVoters.length} জন ভোটার সেভ করতে চান?`)) return;

    setIsImporting(true);
    try {
      const batchSize = 400;
      let totalSaved = 0;

      for (let i = 0; i < detectedVoters.length; i += batchSize) {
        const chunk = detectedVoters.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach(voter => {
          const newDocRef = doc(collection(db, 'voters'));
          batch.set(newDocRef, {
            ...voter,
            photoUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            createdAt: Date.now(),
            status: 'active'
          });
          totalSaved++;
        });
        
        await batch.commit();
        setProcessStatus(`${totalSaved} জন সেভ করা হয়েছে...`);
      }

      alert(`${totalSaved} জন ভোটার সফলভাবে যুক্ত হয়েছে।`);
      setShowBulkImport(false);
      setBulkText('');
      setDetectedVoters([]);
    } catch (err) {
      alert('সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsImporting(false);
      setProcessStatus('');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <ShieldCheck className="mr-2 text-amber-500" /> অ্যাডমিন প্যানেল
          </h2>
          <div className="flex space-x-2">
             <button onClick={() => setShowBulkImport(true)} className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center space-x-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
                <Database size={18} /><span>ডেটা ইম্পোর্ট</span>
              </button>
          </div>
        </div>
      </div>

      {showBulkImport && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">অফিসিয়াল ভোটার ইম্পোর্ট (Pro)</h3>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-0.5">Advanced Data Detection</p>
              </div>
              <button onClick={() => {if(!isDetecting && !isImporting) {setShowBulkImport(false); setDetectedVoters([]);}}} className="p-1 hover:bg-white/10 rounded-lg"><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3">
                <AlertCircle className="text-amber-600 shrink-0" size={18} />
                <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
                  পরামর্শ: আপনি দুই ধরণের ডেটা দিতে পারেন - তালিকার পুরো রো (যেমন: ০১৮ ৮৮০... নাম...) অথবা বিস্তারিত তথ্য ব্লক (নাম: ...)। অ্যাপটি অটো ডিটেক্ট করবে।
                </p>
              </div>

              <div className="relative">
                <textarea 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm h-40 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="এখানে টেক্সট পেস্ট করুন..."
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  disabled={isDetecting || isImporting}
                />
                {isDetecting && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center space-y-3 z-20">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                    <p className="text-sm font-black text-indigo-700 uppercase tracking-widest">ডিটেক্ট করা হচ্ছে...</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={handleDetectVoters} 
                  disabled={isDetecting || isImporting || !bulkText.trim()}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-gray-200 transition-all flex items-center justify-center space-x-2"
                >
                  {isDetecting ? <RefreshCw className="animate-spin" size={18} /> : null}
                  <span>তথ্য ডিটেক্ট করুন</span>
                </button>
                <button onClick={() => {setBulkText(''); setDetectedVoters([]); setProcessStatus('');}} className="bg-gray-100 text-gray-500 px-6 py-4 rounded-xl font-bold">Clear</button>
              </div>

              {processStatus && !isDetecting && (
                <div className={`p-3 border rounded-xl flex items-center space-x-2 text-xs font-bold ${detectedVoters.length > 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  {detectedVoters.length > 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{processStatus}</span>
                </div>
              )}
              
              {detectedVoters.length > 0 && (
                <div className="space-y-4">
                  <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50/50 shadow-inner">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white border-b sticky top-0 z-10">
                        <tr>
                          <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">SL</th>
                          <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">ভোটারের নাম</th>
                          <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">ভোটার আইডি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detectedVoters.slice(0, 200).map((v, i) => (
                          <tr key={i} className="hover:bg-white transition-colors">
                            <td className="p-3 font-mono text-gray-400">{v.slNo}</td>
                            <td className="p-3 font-bold text-gray-800 break-words">{v.name}</td>
                            <td className="p-3 font-mono text-indigo-600 font-bold">{v.voterNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <button 
                    onClick={handleBulkSave}
                    disabled={isImporting}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-green-700 disabled:bg-gray-300 transition-all flex items-center justify-center space-x-2"
                  >
                    {isImporting ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />}
                    <span>তালিকায় সেভ করুন ({detectedVoters.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Management List */}
      <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex items-center">
          <Users className="mr-2 text-green-600" size={18} />
          <h3 className="font-bold text-gray-800">নিবন্ধিত সদস্য অ্যাকাউন্টস</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center space-x-4">
                    <img src={user.photoUrl} className="h-10 w-10 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="text-sm font-bold text-gray-800">{user.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { if(window.confirm(`${user.name}-এর অ্যাকাউন্ট মুছতে চান?`)) deleteDoc(doc(db, 'users', user.id)) }} className="p-2 text-gray-300 hover:text-red-500">
                      <Trash2 size={18}/>
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
