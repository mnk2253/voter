
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  ShieldCheck, 
  LayoutGrid, 
  X,
  Menu as MenuIcon,
  ChevronRight,
  CreditCard,
  LogOut
} from 'lucide-react';
// Fix: Use direct @firebase/firestore package to resolve missing named exports
import { 
  doc, 
  onSnapshot,
  updateDoc
} from '@firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './types';

// Components
import { AuthView } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { VoterList } from './components/VoterList';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (!user?.id) return;

    const userRef = doc(db, 'users', user.id);
    
    const setOnline = () => updateDoc(userRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
    const setOffline = () => updateDoc(userRef, { isOnline: false, lastSeen: Date.now() }).catch(() => {});

    setOnline();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') setOnline();
      else setOffline();
    };

    const handleBeforeUnload = () => setOffline();

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setOffline();
    };
  }, [user?.id]);

  useEffect(() => {
    const savedUser = localStorage.getItem('sridasgati_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const userRef = doc(db, 'users', parsedUser.id);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            if (userData.status === 'active' || userData.role === 'admin') {
              setUser({ ...userData, id: docSnap.id });
            } else {
              handleLogout();
            }
          } else {
            handleLogout();
          }
          setLoading(false);
        }, (err) => {
          setLoading(false);
        });
        return () => unsubUser();
      } catch (e) {
        localStorage.removeItem('sridasgati_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    if (user?.id) {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { isOnline: false, lastSeen: Date.now() });
    }
    localStorage.removeItem('sridasgati_user');
    setUser(null);
    setActiveTab('home');
    setIsSidebarOpen(false);
  };

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthView onLoginSuccess={(u) => {
      setUser(u);
      localStorage.setItem('sridasgati_user', JSON.stringify(u));
    }} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return (
        <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
          <div className="bg-green-600 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl font-black">শ্রীদাসগাতী গ্রাম পোর্টাল</h1>
              <p className="text-green-100 text-sm mt-2 opacity-90 font-medium">আমাদের গ্রাম, আমাদের ডিজিটাল পরিচয়।</p>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-6 px-2">
              <LayoutGrid size={20} className="text-green-600" />
              <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight">প্রধান মেনু</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MenuCard 
                onClick={() => navigateTo('voters')} 
                icon={<CreditCard size={32} className="text-indigo-600" />} 
                label="ভোটার তালিকা" 
                desc="গ্রামের ভোটার তথ্য দেখুন"
                color="bg-indigo-50" 
              />
              
              {user.role === 'admin' && (
                <MenuCard 
                  onClick={() => navigateTo('admin')} 
                  icon={<ShieldCheck size={32} className="text-red-600" />} 
                  label="অ্যাডমিন ড্যাশবোর্ড" 
                  desc="সদস্য ও ভোটার ব্যবস্থাপনা"
                  color="bg-red-50" 
                />
              )}
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 flex items-center space-x-4">
             <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
                <Home size={24} />
             </div>
             <div>
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">বর্তমান অবস্থান</p>
                <h4 className="font-bold text-gray-800">হোম পেজ</h4>
             </div>
          </div>
        </div>
      );
      case 'voters': return <div className="p-4 pb-24"><VoterList currentUser={user} onMessageClick={() => {}} /></div>;
      case 'admin': return <div className="p-4 pb-24"><AdminPanel /></div>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sidebar Drawer */}
      <div 
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div 
          className={`absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-green-600 p-8 text-white flex flex-col items-center">
            <div className="relative">
              <img src={user.photoUrl} className="w-24 h-24 rounded-[32px] object-cover border-4 border-white/20 shadow-2xl mb-4" alt="" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-4 border-green-600 rounded-full"></div>
            </div>
            <h2 className="font-black text-xl">{user.name}</h2>
            <p className="text-xs text-green-100 font-bold uppercase tracking-widest mt-1 opacity-80">{user.occupation}</p>
            <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full"><X size={24} /></button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-4">নেভিগেশন</p>
            <div className="space-y-2">
              <SidebarItem icon={<Home size={22} />} label="হোম পেজ" onClick={() => navigateTo('home')} active={activeTab === 'home'} />
              <SidebarItem icon={<CreditCard size={22} />} label="ভোটার তালিকা" onClick={() => navigateTo('voters')} active={activeTab === 'voters'} />
              {user.role === 'admin' && (
                <SidebarItem icon={<ShieldCheck size={22} />} label="অ্যাডমিন ড্যাশবোর্ড" onClick={() => navigateTo('admin')} active={activeTab === 'admin'} />
              )}
            </div>
            <div className="mt-10 pt-6 border-t border-gray-100">
              <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-4 text-red-500 font-black hover:bg-red-50 rounded-2xl transition-all active:scale-95"><LogOut size={22} /><span>লগআউট</span></button>
            </div>
          </div>
        </div>
      </div>

      <nav className="bg-green-600 text-white shadow-md sticky top-0 z-50 px-4 py-3 border-b border-green-500/30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-2xl relative transition-colors">
                <MenuIcon size={26} />
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-white text-green-600 h-9 w-9 rounded-xl flex items-center justify-center font-black shadow-lg">শ্রী</div>
                <h1 className="font-black text-xl hidden sm:block tracking-tight">শ্রীদাসগাতী পোর্টাল</h1>
                <h1 className="font-black text-xl sm:hidden tracking-tight">শ্রীদাসগাতী</h1>
              </div>
            </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto flex-1 w-full">{renderContent()}</main>

      {/* Bottom Tab Bar for Mobile */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-white/50 flex justify-around py-3.5 z-50 rounded-[32px] shadow-2xl">
        <TabBtn active={activeTab === 'home'} onClick={() => navigateTo('home')} icon={<Home size={22} />} label="হোম" />
        <TabBtn active={activeTab === 'voters'} onClick={() => navigateTo('voters')} icon={<CreditCard size={22} />} label="ভোটার" />
        {user.role === 'admin' && (
          <TabBtn active={activeTab === 'admin'} onClick={() => navigateTo('admin')} icon={<ShieldCheck size={22} />} label="অ্যাডমিন" />
        )}
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, active?: boolean }> = ({ icon, label, onClick, active }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all group ${active ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}>
    <div className="flex items-center space-x-4">
      <div className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-green-500'}`}>{icon}</div>
      <span className={`text-sm font-black ${active ? 'text-white' : 'text-gray-700'}`}>{label}</span>
    </div>
    <div className="flex items-center">
      <ChevronRight size={18} className={`${active ? 'text-green-200' : 'text-gray-300'}`} />
    </div>
  </button>
);

const TabBtn: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center px-6 transition-all active:scale-90 ${active ? 'text-green-600' : 'text-gray-400'}`}>
    <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-green-50' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] mt-1 font-black uppercase tracking-widest">{label}</span>
  </button>
);

const MenuCard: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, desc: string, color: string }> = ({ onClick, icon, label, desc, color }) => (
  <button onClick={onClick} className={`${color} p-6 rounded-[32px] flex items-center space-x-5 transition-all active:scale-95 border-2 border-white shadow-sm hover:shadow-md text-left`}>
    <div className="bg-white p-4 rounded-2xl shadow-sm shrink-0">{icon}</div>
    <div className="min-w-0">
      <h4 className="font-black text-gray-800 text-lg leading-tight truncate">{label}</h4>
      <p className="text-[11px] text-gray-500 font-bold mt-1 opacity-80">{desc}</p>
    </div>
  </button>
);

export default App;
