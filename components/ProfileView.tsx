
import React, { useState } from 'react';
// Fix: Use direct @firebase/firestore package to resolve missing exports
import { updateDoc, doc } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile } from '../types';
import { Edit2, Save, X, Phone, User as UserIcon, Briefcase, Camera, Upload, CreditCard, Calendar, Users } from 'lucide-react';

export const ProfileView: React.FC<{ user: UserProfile, onUpdate: (u: UserProfile) => void }> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState(user.name);
  const [fatherName, setFatherName] = useState(user.fatherName);
  const [motherName, setMotherName] = useState(user.motherName || '');
  const [birthDate, setBirthDate] = useState(user.birthDate || '');
  const [gender, setGender] = useState(user.gender || 'Male');
  const [occupation, setOccupation] = useState(user.occupation);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user.photoUrl);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let photoUrl = user.photoUrl;

    try {
      if (photo) {
        const photoRef = ref(storage, `profiles/${user.phone}_${Date.now()}`);
        await uploadBytes(photoRef, photo);
        photoUrl = await getDownloadURL(photoRef);
      }

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name,
        fatherName,
        motherName,
        birthDate,
        gender,
        occupation,
        photoUrl
      });

      onUpdate({ ...user, name, fatherName, motherName, birthDate, gender, occupation, photoUrl });
      setIsEditing(false);
    } catch (err) {
      alert('তথ্য আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
        <div className="h-32 bg-gradient-to-r from-green-500 to-emerald-600"></div>
        <div className="px-6 pb-8">
          <div className="relative -mt-16 flex flex-col items-center">
            <div className="relative">
              <img 
                src={previewUrl} 
                className="h-32 w-32 rounded-3xl object-cover border-4 border-white shadow-xl" 
                alt={user.name} 
              />
              {isEditing && (
                <label className="absolute bottom-2 -right-2 bg-green-600 p-2 rounded-xl text-white shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
                  <Camera size={18} />
                  <input type="file" className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
            </div>
            <div className="text-center mt-4">
              <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {user.role === 'admin' ? 'এডমিন' : 'সদস্য'}
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <h3 className="font-bold text-gray-800 flex items-center">
                <UserIcon size={18} className="mr-2 text-green-600" /> ব্যক্তিগত তথ্য
              </h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Edit2 size={14} /> <span>এডিট</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => { setIsEditing(false); setPreviewUrl(user.photoUrl); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    disabled={loading}
                    onClick={handleSave}
                    className="flex items-center space-x-1 text-sm font-bold text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700 shadow-md transition-all active:scale-95"
                  >
                    {loading ? <div className="h-4 w-4 animate-spin border-b-2 border-white rounded-full"></div> : <><Save size={14} /> <span>সেভ করুন</span></>}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">পূর্ণ নাম</label>
                {isEditing ? (
                  <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500" value={name} onChange={(e) => setName(e.target.value)} />
                ) : (
                  <p className="text-gray-700 font-medium">{user.name}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">পিতার নাম</label>
                  {isEditing ? (
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                  ) : (
                    <p className="text-gray-700 font-medium">{user.fatherName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">মাতার নাম</label>
                  {isEditing ? (
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
                  ) : (
                    <p className="text-gray-700 font-medium">{user.motherName || 'তথ্য নেই'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">লিঙ্গ (Gender)</label>
                  {isEditing ? (
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 appearance-none" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                      <option value="Male">পুরুষ (Male)</option>
                      <option value="Female">মহিলা (Female)</option>
                      <option value="Other">অন্যান্য</option>
                    </select>
                  ) : (
                    <p className="text-gray-700 font-medium flex items-center">
                      <Users size={14} className="mr-2 text-indigo-500" /> {user.gender === 'Female' ? 'মহিলা' : user.gender === 'Male' ? 'পুরুষ' : 'অন্যান্য'}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">জন্ম তারিখ</label>
                  {isEditing ? (
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="DD/MM/YYYY" />
                  ) : (
                    <p className="text-gray-700 font-medium flex items-center">
                      <Calendar size={14} className="mr-2 text-rose-500" /> {user.birthDate || 'তথ্য নেই'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">পেশা</label>
                  {isEditing ? (
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                  ) : (
                    <p className="text-gray-700 font-medium flex items-center">
                      <Briefcase size={14} className="mr-2 text-green-600" /> {user.occupation}
                    </p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">মোবাইল নাম্বার</label>
                  <p className="text-gray-700 font-medium flex items-center">
                    <Phone size={14} className="mr-2 text-green-600" /> {user.phone}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">ভোটের নাম্বার</label>
                <p className="text-gray-700 font-medium flex items-center">
                  <CreditCard size={14} className="mr-2 text-indigo-500" /> 
                  <span className={user.voterNumber ? "text-gray-800 font-mono font-bold" : "text-gray-400 italic"}>
                    {user.voterNumber || 'অ্যাডমিন এখনো যুক্ত করেননি'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
