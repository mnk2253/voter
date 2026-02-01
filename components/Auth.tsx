
import React, { useState } from 'react';
import { collection, query, where, getDocs, limit, addDoc } from '@firebase/firestore';
import { signInAnonymously } from '@firebase/auth';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';
import { LogIn, Phone, Lock, User as UserIcon, AlertCircle, RefreshCw, ShieldCheck, HelpCircle } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const withTimeout = async (promise: Promise<any>, timeoutMs: number, errorMessage: string) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );
    return Promise.race([promise, timeout]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();

    if (!cleanPhone || !cleanPass) {
      setError('ফোন নাম্বার এবং পাসওয়ার্ড দিন।');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Anonymous Auth for security
      await withTimeout(signInAnonymously(auth), 8000, "Connection timeout.");
      
      const usersRef = collection(db, 'users');
      
      // Bootstrap Logic: If this is the master helpline number and no users exist
      if (cleanPhone === '01307085310' && cleanPass === 'admin123') {
        const allUsersSnap = await getDocs(query(usersRef, limit(1)));
        if (allUsersSnap.empty) {
          // Create the first Master Admin
          const newAdmin = {
            name: 'Master Admin',
            phone: cleanPhone,
            password: cleanPass,
            role: 'admin' as const,
            status: 'active' as const,
            fatherName: 'System',
            occupation: 'Administrator',
            photoUrl: 'https://cdn-icons-png.flaticon.com/512/6024/6024190.png',
            createdAt: Date.now()
          };
          const docRef = await addDoc(usersRef, newAdmin);
          onLoginSuccess({ ...newAdmin, id: docRef.id });
          return;
        }
      }

      // Step 2: Normal Login Query
      const q = query(usersRef, where('phone', '==', cleanPhone), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('এই মোবাইল নাম্বারটি নিবন্ধিত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;

      // Step 3: Verify Password
      if (userData.password !== cleanPass) {
        setError('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
        setLoading(false);
        return;
      }

      // Step 4: Check if account is active
      if (userData.status === 'pending' && userData.role !== 'admin') {
        setError('আপনার অ্যাকাউন্টটি এখনো অনুমোদিত হয়নি।');
        setLoading(false);
        return;
      }

      // Success
      onLoginSuccess({ ...userData, id: userDoc.id });
    } catch (err: any) {
      console.error("Login error:", err);
      setError("সার্ভারে সমস্যা হচ্ছে। ইন্টারনেট চেক করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden border border-white/20">
        <div className="bg-green-600 p-12 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-block p-5 bg-white/20 rounded-[32px] mb-4 backdrop-blur-xl border border-white/30 shadow-2xl">
              <ShieldCheck size={48} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">শ্রীদাসগাতী পোর্টাল</h1>
            <p className="text-green-100 mt-2 text-xs font-bold uppercase tracking-widest opacity-80">Member & Admin Login</p>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>
        </div>

        <div className="p-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-[11px] rounded-2xl flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="font-bold leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">মোবাইল নাম্বার</label>
              <div className="relative">
                <Phone className="absolute left-4 top-4 text-gray-300" size={18} />
                <input
                  type="tel"
                  placeholder="01XXX-XXXXXX"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all font-mono font-bold text-gray-700"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-gray-300" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all font-mono font-bold text-gray-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className={`w-full py-4 mt-2 rounded-[24px] text-white font-black text-lg shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all ${
                loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-100'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>লগইন করুন</span>
                </>
              )}
            </button>
            
            <div className="mt-8 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start space-x-3">
              <HelpCircle size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
                  অ্যাকাউন্ট না থাকলে বা পাসওয়ার্ড ভুলে গেলে অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
                <div className="flex items-center space-x-2">
                   <span className="text-[10px] text-indigo-400 font-black uppercase">হেল্পলাইন:</span>
                   <a href="tel:01307085310" className="text-[11px] text-indigo-800 font-black underline underline-offset-2">০১৩০৭০৮৫৩১০</a>
                </div>
              </div>
            </div>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.3em]">Village Portal &copy; 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
};
