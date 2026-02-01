
import React, { useState, useEffect } from 'react';
// Fix: Use direct @firebase/firestore package to resolve missing exports
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from '@firebase/firestore';
import { db } from '../firebase';
import { EmergencyContact, UserProfile } from '../types';
import { 
  Phone, 
  Shield, 
  Truck, 
  Flame, 
  HeartPulse, 
  User, 
  PhoneCall, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save,
  Grid
} from 'lucide-react';

interface EmergencyContactsProps {
  currentUser: UserProfile;
}

// Fixed: Store components instead of elements to avoid cloneElement typing issues with className
const ICON_MAP: { [key: string]: React.ElementType } = {
  'shield': Shield,
  'truck': Truck,
  'flame': Flame,
  'heartpulse': HeartPulse,
  'user': User,
  'phonecall': PhoneCall,
  'grid': Grid
};

export const EmergencyContacts: React.FC<EmergencyContactsProps> = ({ currentUser }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [category, setCategory] = useState('');
  const [iconName, setIconName] = useState('phonecall');

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'emergency_contacts'), orderBy('category', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as EmergencyContact));
      setContacts(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const resetForm = () => {
    setName('');
    setNumber('');
    setCategory('');
    setIconName('phonecall');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (contact: EmergencyContact) => {
    setName(contact.name);
    setNumber(contact.number);
    setCategory(contact.category);
    setIconName(contact.iconName || 'phonecall');
    setEditingId(contact.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim() || !category.trim()) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'emergency_contacts', editingId), {
          name, number, category, iconName
        });
      } else {
        await addDoc(collection(db, 'emergency_contacts'), {
          name, number, category, iconName
        });
      }
      resetForm();
    } catch (err) {
      alert('তথ্যটি সেভ করা সম্ভব হয়নি।');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই নাম্বারটি মুছে ফেলতে চান?')) {
      try {
        await deleteDoc(doc(db, 'emergency_contacts', id));
      } catch (err) {
        alert('মুছে ফেলা সম্ভব হয়নি।');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        <p className="mt-4 text-gray-400 text-sm">লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="bg-rose-600 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="bg-white/20 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md">
            <PhoneCall size={28} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">জরুরি নাম্বার সমূহ</h2>
              <p className="text-rose-100 text-sm mt-1 opacity-90">যেকোনো বিপদে বা প্রয়োজনে দ্রুত কল করুন।</p>
            </div>
            {isAdmin && !isFormOpen && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-white text-rose-600 p-3 rounded-2xl shadow-lg hover:bg-rose-50 transition-all active:scale-95"
              >
                <Plus size={24} />
              </button>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Phone size={120} />
        </div>
      </div>

      {isFormOpen && isAdmin && (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-rose-100 mx-2 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg flex items-center">
              {editingId ? <Edit2 className="mr-2 text-rose-500" size={20} /> : <Plus className="mr-2 text-rose-500" size={20} />}
              {editingId ? 'নাম্বার আপডেট করুন' : 'নতুন নাম্বার যোগ করুন'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1"><X size={24} /></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">পরিষেবার নাম</label>
                <input 
                  type="text" 
                  placeholder="যেমন: অ্যাম্বুলেন্স" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ফোন নাম্বার</label>
                <input 
                  type="tel" 
                  placeholder="যেমন: 01300000000" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ক্যাটাগরি</label>
                <input 
                  type="text" 
                  placeholder="যেমন: চিকিৎসা" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">আইকন সিলেক্ট করুন</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none appearance-none"
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                >
                  <option value="phonecall">কল আইকন</option>
                  <option value="shield">নিরাপত্তা (Shield)</option>
                  <option value="truck">অ্যাম্বুলেন্স (Truck)</option>
                  <option value="flame">ফায়ার সার্ভিস (Flame)</option>
                  <option value="heartpulse">চিকিৎসা (Heart)</option>
                  <option value="user">ব্যক্তিগত (User)</option>
                  <option value="grid">অন্যান্য (Grid)</option>
                </select>
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-rose-600 text-white py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Save size={18} />
              <span>{editingId ? 'আপডেট সেভ করুন' : 'নতুন নাম্বার সেভ করুন'}</span>
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-2">
        {contacts.map((contact) => {
          // Resolve icon component from map, fallback to PhoneCall
          const Icon = (ICON_MAP[contact.iconName || 'phonecall'] || PhoneCall) as React.ElementType;
          
          return (
            <div key={contact.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all active:scale-[0.98]">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="bg-gray-50 p-3 rounded-2xl group-hover:bg-rose-50 transition-colors flex-shrink-0">
                  {/* Fixed: Use component directly instead of cloneElement to avoid prop type error */}
                  <Icon className="text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{contact.category}</p>
                  <h3 className="font-bold text-gray-800 text-lg leading-tight truncate">{contact.name}</h3>
                  <p className="text-rose-600 font-mono font-black text-sm mt-1">{contact.number}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
                    <button 
                      onClick={() => handleEdit(contact)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                <a 
                  href={`tel:${contact.number}`}
                  className="bg-green-600 text-white p-3.5 rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 active:scale-90 transition-all flex items-center justify-center"
                >
                  <Phone size={20} fill="currentColor" />
                </a>
              </div>
            </div>
          );
        })}

        {contacts.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 mx-2">
            <Phone size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">কোন জরুরি নাম্বার পাওয়া যায়নি।</p>
            {isAdmin && <button onClick={() => setIsFormOpen(true)} className="mt-4 text-rose-600 font-bold text-sm">নতুন নাম্বার যোগ করুন</button>}
          </div>
        )}
      </div>

      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 mx-2">
        <div className="flex items-start space-x-3">
          <Shield className="text-amber-600 mt-1 shrink-0" size={20} />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            যদি আপনার কাছে গ্রামের জন্য গুরুত্বপূর্ণ কোনো নাম্বার থাকে যা এখানে নেই, তাহলে অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
        </div>
      </div>
    </div>
  );
};
