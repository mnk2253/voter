
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, addDoc, getDocs, where, limit, writeBatch } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, Post } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  ShieldCheck, 
  Trash2,
  Megaphone, 
  Edit2,
  X,
  RefreshCw,
  UserPlus,
  Camera,
  Upload,
  CreditCard,
  Save,
  AlertTriangle,
  Zap,
  Check,
  Search,
  Calendar,
  User,
  Users,
  Database
} from 'lucide-react';

// Utility to convert Bengali digits to English
const bnToEn = (str: string) => {
  if (!str) return "";
  const digits: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (d) => digits[d]);
};

/**
 * Advanced Bengali Text Repair Tool
 * Specifically designed for Bangladesh Election Commission PDF artifacts
 */
const cleanEcText = (text: string) => {
  if (!text) return "";
  
  let cleaned = text
    // 1. Fix specific corrupted glyphs from EC PDF encoding
    .replace(/ĺ/g, 'ব্দ')  // আĺুল -> আব্দুল
    .replace(/Ĩ/g, 'সা')   // হাĨান -> হাসান
    .replace(/ę/g, 'দ্র')  // ইিęস -> ইদ্রিস
    .replace(/Ľ/g, 'ব্র')  // ইĽািহম -> ইব্রাহিম
    .replace(/Ō/g, 'ছা')   // োমাŌা -> মোছাঃ
    .replace(/Ž/g, 'জ')    // Žিন -> জনি/জৈন
    .replace(/ñ/g, 'ন')    // ñর -> নম্বর
    .replace(/ĥ/g, 'ন্ম')  // জĥ -> জন্ম
    .replace(/ń/g, 'ম্ব')  // ńর -> নম্বর
    .replace(/İ/g, 'ি')    // İলটন -> লিটন
    
    // 2. Fix specific common prefixes
    .replace(/Ïমাছাঃ/g, 'মোছাঃ')
    .replace(/Ïমাঃ/g, 'মোঃ')
    .replace(/Ïভাটার নং/g, 'ভোটার নং')
    .replace(/Ïভাটার/g, 'ভোটার')
    .replace(/িপতা/g, 'পিতা')
    .replace(/ামাতা/g, 'মাতা')
    .replace(/Ïপশা/g, 'পেশা')
    .replace(/জĥ তািরখ/g, 'জন্ম তারিখ')
    
    // 3. Fix vowel signs (Kar) and split characters
    .replace(/Ï/g, 'ো') 
    .replace(/ে\s*া/g, 'ো') 
    .replace(/ে\s*ৗ/g, 'ৌ') 
    .replace(/ি\s+/g, 'ি')
    .replace(/ু\s+/g, 'ু')
    .replace(/র্\s+/g, 'র্')
    
    // 4. Handle leading 'i-kar' artifacts (sometimes 'i' comes after the consonant in PDF)
    // This is a common issue where "Ki" becomes "K i"
    .replace(/([ক-হ])\s*ি/g, '$1ি') 
    
    // 5. General cleanup
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
};

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddMember, setShowAddMember] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    birthDate: '',
    occupation: '',
    phone: '',
    password: '',
    voterNumber: '',
    slNo: ''
  });
  const [newMemberPhoto, setNewMemberPhoto] = useState<File | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [bulkText, setBulkText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [detectedVoters, setDetectedVoters] = useState<any[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
      setLoading(false);
    });
    return () => unsubUsers();
  }, []);

  const handleDetectVoters = () => {
    if (!bulkText.trim()) return;
    
    // Pre-clean the input text aggressively
    const sanitizedInput = cleanEcText(bulkText);
    
    // Updated pattern to be more forgiving with spaces
    const voterPattern = /([০-৯0-9]+)\.?\s*নাম\s*[:\s]+(.*?)\s*ভোটার নং\s*[:\s]+([০-৯0-9]+)\s*পিতা\s*[:\s]+(.*?)\s*মাতা\s*[:\s]+(.*?)\s*পেশা\s*[:\s]+(.*?)\s*,?\s*জন্ম তারিখ\s*[:\s]+([০-৯0-9\/\-]+)/gs;
    
    const results = [];
    let match;
    while ((match = voterPattern.exec(sanitizedInput)) !== null) {
      results.push({
        slNo: match[1].trim(),
        name: cleanEcText(match[2].trim()), 
        voterNumber: bnToEn(match[3].trim()),
        fatherName: cleanEcText(match[4].trim()),
        motherName: cleanEcText(match[5].trim()),
        occupation: cleanEcText(match[6].trim()),
        birthDate: bnToEn(match[7].trim())
      });
    }

    if (results.length === 0) {
      // If full pattern fails, try a simpler name-only detection for preview
      alert('দুঃখিত, কোনো ভোটার তথ্য খুঁজে পাওয়া যায়নি। আপনার কপি করা টেক্সট ফরম্যাটটি কি সঠিক?');
    }
    
    setDetectedVoters(results);
  };

  const handleBulkSave = async () => {
    if (detectedVoters.length === 0 || isImporting) return;
    if (!window.confirm(`${detectedVoters.length} জন ভোটারকে তালিকায় যুক্ত করতে চান? এটি কোনো ইউজার অ্যাকাউন্ট তৈরি করবে না।`)) return;

    setIsImporting(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      const voterSnap = await getDocs(collection(db, 'voters'));
      const existingVoterNumbers = new Set(voterSnap.docs.map(d => d.data().voterNumber));

      for (const voter of detectedVoters) {
        if (!existingVoterNumbers.has(voter.voterNumber)) {
          const newDocRef = doc(collection(db, 'voters'));
          batch.set(newDocRef, {
            ...voter,
            photoUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            createdAt: Date.now(),
            status: 'active'
          });
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        alert(`${count} জন ভোটার সফলভাবে তালিকায় যুক্ত হয়েছে।`);
      } else {
        alert('সব ভোটার ইতিপূর্বেই ডাটাবেসে আছে।');
      }
      setShowBulkImport(false);
      setBulkText('');
      setDetectedVoters([]);
    } catch (err) {
      alert('ইম্পোর্ট করতে সমস্যা হয়েছে।');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingMember) return;
    
    const { name, phone, password } = newMemberData;
    if (!name || !phone || !password || !newMemberPhoto) {
      alert('সব তথ্য পূরণ করুন এবং ছবি আপলোড করুন।');
      return;
    }

    setIsAddingMember(true);
    try {
      const q = query(collection(db, 'users'), where('phone', '==', phone.trim()), limit(1));
      const checkSnap = await getDocs(q);
      if (!checkSnap.empty) {
        alert('এই নাম্বারটি ইতিমধ্যে সদস্য হিসেবে নিবন্ধিত।');
        setIsAddingMember(false);
        return;
      }

      let photoUrl = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
      const photoRef = ref(storage, `profiles/${phone.trim()}_${Date.now()}`);
      const res = await uploadBytes(photoRef, newMemberPhoto);
      photoUrl = await getDownloadURL(res.ref);

      await addDoc(collection(db, 'users'), {
        ...newMemberData,
        photoUrl,
        role: 'user',
        status: 'active',
        createdAt: Date.now()
      });

      alert('নতুন সদস্য সফলভাবে যুক্ত হয়েছে।');
      setShowAddMember(false);
      setNewMemberData({
        name: '', fatherName: '', motherName: '', birthDate: '', occupation: '',
        phone: '', password: '', voterNumber: '', slNo: ''
      });
      setNewMemberPhoto(null);
    } catch (err) {
      alert('সদস্য যোগ করতে সমস্যা হয়েছে।');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`${userName}-এর অ্যাকাউন্ট কি মুছে ফেলতে চান?`)) {
      await deleteDoc(doc(db, 'users', userId));
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <ShieldCheck className="mr-2 text-amber-500" /> অ্যাডমিন কন্ট্রোল প্যানেল
          </h2>
          <div className="flex space-x-2">
             <button 
                onClick={() => setShowBulkImport(true)}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center space-x-2 shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
              >
                <Database size={18} />
                <span>ভোটার ইম্পোর্ট (Data)</span>
              </button>
              <button 
                onClick={() => setShowAddMember(true)}
                className="bg-green-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center space-x-2 shadow-lg hover:bg-green-700 transition-all active:scale-95"
              >
                <UserPlus size={20} />
                <span>সদস্য যোগ (Account)</span>
              </button>
          </div>
        </div>
        
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
            সতর্কতা: 'ভোটার ইম্পোর্ট' টুলটি এখন উন্নত ফন্ট ফিক্সিং সাপোর্ট করে। ইসি পিডিএফ থেকে ডেটা দিলে স্বয়ংক্রিয়ভাবে সঠিক বাংলা শব্দ তৈরি হবে।
          </p>
        </div>
      </div>

      {/* Bulk Voter Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">অফিসিয়াল ভোটার ইম্পোর্ট টুল (Pro)</h3>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-0.5">Auto-Repairing Bengali Fonts & Conjuncts</p>
              </div>
              <button onClick={() => {setShowBulkImport(false); setDetectedVoters([]);}} className="p-1 hover:bg-white/10 rounded-lg"><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4">
              <textarea 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm h-40 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="পিডিএফ থেকে কপি করা টেক্সট এখানে পেস্ট করুন (যেমন: মোঃ আĺুল হাĨান)..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <div className="flex space-x-2">
                <button onClick={handleDetectVoters} className="flex-1 bg-indigo-100 text-indigo-700 py-3.5 rounded-xl font-bold hover:bg-indigo-200 transition-all active:scale-[0.99]">ডেটা ডিটেক্ট ও রিপেয়ার করুন</button>
                <button onClick={() => setBulkText('')} className="bg-gray-100 text-gray-500 px-6 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all">পরিষ্কার করুন</button>
              </div>
              
              {detectedVoters.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">সনাক্তকৃত ভোটার ({detectedVoters.length})</p>
                    <p className="text-[10px] text-green-500 font-black">সফলভাবে ফন্ট সংশোধন করা হয়েছে!</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl no-scrollbar shadow-inner bg-gray-50/50">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white border-b sticky top-0">
                        <tr><th className="p-3 font-bold text-gray-400">SL</th><th className="p-3 font-bold text-gray-400">Name (Repaired)</th><th className="p-3 font-bold text-gray-400">Voter ID</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detectedVoters.map((v, i) => (
                          <tr key={i} className="hover:bg-white transition-colors">
                            <td className="p-3 font-mono">{v.slNo}</td>
                            <td className="p-3 font-bold text-gray-800 break-words min-w-[150px] leading-tight">
                              {v.name}
                              <div className="text-[9px] text-gray-400 mt-1">পিতা: {v.fatherName}</div>
                            </td>
                            <td className="p-3 font-mono text-indigo-600 font-bold">{v.voterNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    onClick={handleBulkSave}
                    disabled={isImporting}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center space-x-2 shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
                  >
                    {isImporting ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />}
                    <span>ভোটার তালিকায় ডেটা সেভ করুন</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Member Form Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-green-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl">নতুন সদস্য যুক্ত করুন</h3>
                <p className="text-xs text-green-100 mt-1 opacity-80 uppercase tracking-widest font-bold">Creating Login Account</p>
              </div>
              <button onClick={() => setShowAddMember(false)} className="p-1 hover:bg-white/10 rounded-lg"><X size={28}/></button>
            </div>
            <form onSubmit={handleAddMember} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <InputGroup label="পূর্ণ নাম" value={newMemberData.name} onChange={v => setNewMemberData({...newMemberData, name: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="ফোন নাম্বার" value={newMemberData.phone} onChange={v => setNewMemberData({...newMemberData, phone: v})} />
                  <InputGroup label="পাসওয়ার্ড" value={newMemberData.password} onChange={v => setNewMemberData({...newMemberData, password: v})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="পিতার নাম" value={newMemberData.fatherName} onChange={v => setNewMemberData({...newMemberData, fatherName: v})} />
                  <InputGroup label="পেশা" value={newMemberData.occupation} onChange={v => setNewMemberData({...newMemberData, occupation: v})} />
                </div>
                <div className="p-5 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50 text-center">
                  <Camera size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">সদস্যের ছবি আপলোড করুন</p>
                  <input type="file" className="text-xs w-full cursor-pointer" accept="image/*" onChange={e => e.target.files && setNewMemberPhoto(e.target.files[0])} />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isAddingMember} 
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-green-50 hover:bg-green-700 transition-all active:scale-95 disabled:bg-gray-200"
              >
                {isAddingMember ? 'সেভ হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Member/User Account List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-bold text-gray-800 flex items-center">
            <Users className="mr-2 text-green-600" size={18} /> নিবন্ধিত সদস্য (অ্যাকাউন্ট) - {users.length}
          </h3>
        </div>
        <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-gray-50/50 border-b border-gray-50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">সদস্য</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">পাসওয়ার্ড</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">ম্যানেজ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-5 flex items-center space-x-4">
                    <img src={user.photoUrl} className="h-10 w-10 rounded-xl object-cover border border-white shadow-sm shrink-0" alt="" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 break-words leading-tight">{user.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{user.phone}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="bg-gray-100 px-3 py-1 rounded-lg w-fit">
                      <code className="text-[11px] font-bold text-indigo-600">{user.password}</code>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDeleteUser(user.id, user.name)} 
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20}/>
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-gray-400 italic text-sm">কোন সদস্য নিবন্ধিত নেই।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all focus:bg-white" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);
