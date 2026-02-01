
import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Users, 
  MessageSquare, 
  User as UserIcon, 
  LogOut, 
  PlusCircle, 
  ShieldCheck, 
  LayoutGrid, 
  Smartphone, 
  Heart, 
  ImageIcon,
  MessageCircle,
  X,
  Volume2,
  Menu as MenuIcon,
  ChevronRight,
  PhoneCall,
  Sparkles,
  CreditCard
} from 'lucide-react';
// Fix: Use direct @firebase/firestore package to resolve missing named exports
import { 
  doc, 
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  updateDoc
} from '@firebase/firestore';
import { db } from './firebase';
import { UserProfile, Post, ChatMessage } from './types';

// Components
import { AuthView } from './components/Auth';
import { PostList } from './components/PostList';
import { MemberDirectory } from './components/MemberDirectory';
import { ChatSystem } from './components/ChatSystem';
import { AdminPanel } from './components/AdminPanel';
import { ProfileView } from './components/ProfileView';
import { EmergencyContacts } from './components/EmergencyContacts';
import { AIAssistant } from './components/AIAssistant';
import { VoterList } from './components/VoterList';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetChatUser, setTargetChatUser] = useState<UserProfile | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Notification states
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [newMessageNotification, setNewMessageNotification] = useState<{ senderName: string, text: string } | null>(null);

  const lastMessageTimeRef = useRef<number>(Date.now());
  const isFirstMsgLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
  }, []);

  // Presence Logic
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

  // Tracking Unread Messages Globally
  useEffect(() => {
    if (!user) return;
    const msgQuery = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(30));
    const unsubMsgs = onSnapshot(msgQuery, (snapshot) => {
      if (snapshot.empty) {
        isFirstMsgLoadRef.current = false;
        return;
      }

      const newCounts = { ...unreadCounts };
      let anyNewMessage = false;

      snapshot.docs.forEach(docSnap => {
        const msg = docSnap.data() as ChatMessage;
        const msgId = docSnap.id;
        const isForMe = msg.receiverId === user.id;
        const isFromOther = msg.senderId !== user.id;

        if (isForMe && isFromOther) {
          if (!isFirstMsgLoadRef.current && msg.createdAt > lastMessageTimeRef.current && !processedMessageIds.current.has(msgId)) {
            if (!(activeTab === 'chat' && targetChatUser?.id === msg.senderId)) {
              newCounts[msg.senderId] = (newCounts[msg.senderId] || 0) + 1;
              processedMessageIds.current.add(msgId);
              anyNewMessage = true;

              if (activeTab !== 'chat') {
                audioRef.current?.play().catch(() => {});
                setNewMessageNotification({
                  senderName: msg.senderName,
                  text: msg.text.substring(0, 30) + (msg.text.length > 30 ? '...' : '')
                });
                setTimeout(() => setNewMessageNotification(null), 5000);
              }
            }
          } else {
            processedMessageIds.current.add(msgId);
          }
        }
      });

      if (anyNewMessage) setUnreadCounts(newCounts);
      
      const latestTime = Math.max(...snapshot.docs.map(d => (d.data() as ChatMessage).createdAt));
      if (latestTime > lastMessageTimeRef.current) lastMessageTimeRef.current = latestTime;
      isFirstMsgLoadRef.current = false;
    });
    return () => unsubMsgs();
  }, [user, activeTab, targetChatUser, unreadCounts]);

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

  const startPrivateChat = (member: UserProfile) => {
    setTargetChatUser(member);
    setActiveTab('chat');
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });
  };

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    if (tab !== 'chat') setTargetChatUser(null);
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

  const hasAnyUnread = Object.keys(unreadCounts).length > 0;

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return (
        <div className="p-4 space-y-6 pb-24">
          <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <LayoutGrid size={20} className="text-green-600" />
                <h3 className="font-bold text-gray-800 text-base">মেনু লিস্ট - হোম</h3>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">সক্রিয়</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <MenuCard onClick={() => navigateTo('posts')} icon={<PlusCircle className="text-blue-600" />} label="নতুন পোস্ট" color="bg-blue-50" />
              <MenuCard 
                onClick={() => navigateTo('ai')} 
                icon={<Sparkles className="text-indigo-600 animate-pulse" />} 
                label="গ্রামের এআই" 
                color="bg-indigo-50 border-indigo-200" 
              />
              <MenuCard 
                onClick={() => navigateTo('chat')} 
                icon={
                  <div className="relative">
                    <MessageSquare className="text-orange-600" />
                    {hasAnyUnread && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-ping"></span>}
                    {hasAnyUnread && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] text-white font-black">!</span>}
                  </div>
                } 
                label="চ্যাটিং" 
                color="bg-orange-50" 
              />
              <MenuCard onClick={() => navigateTo('members')} icon={<Users className="text-green-600" />} label="সদস্যবৃন্দ" color="bg-green-50" />
              <MenuCard onClick={() => navigateTo('profile')} icon={<UserIcon className="text-blue-600" />} label="প্রোফাইল" color="bg-blue-50" />
              <MenuCard onClick={() => navigateTo('emergency')} icon={<PhoneCall className="text-rose-600" />} label="জরুরি নাম্বার" color="bg-rose-50" />
              
              {/* Voter list and Admin restricted to role === 'admin' only */}
              {user.role === 'admin' && (
                <>
                  <MenuCard onClick={() => navigateTo('voters')} icon={<CreditCard className="text-indigo-700" />} label="ভোটার তালিকা" color="bg-indigo-50" />
                  <MenuCard onClick={() => navigateTo('admin')} icon={<ShieldCheck className="text-red-600" />} label="অ্যাডমিন" color="bg-red-50" />
                </>
              )}
            </div>
          </div>

          <div className="bg-green-600 rounded-3xl p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">শ্রীদাসগাতী গ্রাম পোর্টাল</h1>
            <p className="text-green-100 text-sm mt-1 opacity-90">আমাদের গ্রাম, আমাদের ডিজিটাল পরিচয়।</p>
          </div>

          <div className="pt-2 px-1">
            <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center">
              <span className="w-1.5 h-4 bg-green-600 rounded-full mr-2"></span>
              গ্রামের নিউজফিড
            </h3>
          </div>
          <PostList currentUser={user} filterNotices={false} />
        </div>
      );
      case 'posts': return <div className="p-4 pb-24"><PostList currentUser={user} filterNotices={false} /></div>;
      case 'members': return <div className="p-4 pb-24"><MemberDirectory currentUser={user} onMessageClick={startPrivateChat} unreadCounts={unreadCounts} /></div>;
      case 'voters': return <div className="p-4 pb-24"><VoterList currentUser={user} onMessageClick={startPrivateChat} /></div>;
      case 'chat': return <div className="p-4 pb-24"><ChatSystem currentUser={user} initialTargetUser={targetChatUser} globalUnreadCounts={unreadCounts} /></div>;
      case 'ai': return <div className="p-4 pb-24"><AIAssistant currentUser={user} /></div>;
      case 'profile': return <div className="p-4 pb-24"><ProfileView user={user} onUpdate={(updated) => {
        setUser(updated);
        localStorage.setItem('sridasgati_user', JSON.stringify(updated));
      }} /></div>;
      case 'emergency': return <div className="p-4 pb-24"><EmergencyContacts currentUser={user} /></div>;
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
          <div className="bg-green-600 p-6 text-white flex flex-col items-center">
            <div className="relative">
              <img src={user.photoUrl} className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-lg mb-3" alt="" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-green-600 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
            <h2 className="font-bold text-lg">{user.name}</h2>
            <p className="text-xs text-green-100 opacity-80">{user.occupation}</p>
            <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full"><X size={24} /></button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(100vh-160px)] no-scrollbar">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2">নেভিগেশন</p>
            <SidebarItem icon={<Home size={20} />} label="হোম পেজ" onClick={() => navigateTo('home')} active={activeTab === 'home'} />
            <SidebarItem icon={<Sparkles size={20} />} label="গ্রামের এআই" onClick={() => navigateTo('ai')} active={activeTab === 'ai'} />
            {user.role === 'admin' && (
              <SidebarItem icon={<CreditCard size={20} />} label="ভোটার তালিকা" onClick={() => navigateTo('voters')} active={activeTab === 'voters'} />
            )}
            <SidebarItem icon={<PlusCircle size={20} />} label="নতুন পোস্ট" onClick={() => navigateTo('posts')} active={activeTab === 'posts'} />
            <SidebarItem icon={<MessageSquare size={20} />} label="চ্যাটিং" onClick={() => navigateTo('chat')} active={activeTab === 'chat'} badge={hasAnyUnread} />
            <SidebarItem icon={<Users size={20} />} label="সদস্যবৃন্দ" onClick={() => navigateTo('members')} active={activeTab === 'members'} />
            <SidebarItem icon={<PhoneCall size={20} />} label="জরুরি নাম্বার" onClick={() => navigateTo('emergency')} active={activeTab === 'emergency'} />
            <SidebarItem icon={<UserIcon size={20} />} label="আমার প্রোফাইল" onClick={() => navigateTo('profile')} active={activeTab === 'profile'} />
            {user.role === 'admin' && (
              <SidebarItem icon={<ShieldCheck size={20} />} label="অ্যাডমিন ড্যাশবোর্ড" onClick={() => navigateTo('admin')} active={activeTab === 'admin'} />
            )}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors"><LogOut size={20} /><span>লগআউট</span></button>
            </div>
          </div>
        </div>
      </div>

      {newMessageNotification && (
        <div 
          className="fixed top-20 left-4 right-4 z-[90] bg-white border border-green-100 rounded-2xl shadow-xl p-4 flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 pointer-events-auto cursor-pointer"
          onClick={() => { navigateTo('chat'); setNewMessageNotification(null); }}
        >
          <div className="bg-green-100 p-2 rounded-xl text-green-600"><MessageCircle size={20} /></div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-gray-800">{newMessageNotification.senderName}</p>
            <p className="text-[11px] text-gray-500 truncate">{newMessageNotification.text}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setNewMessageNotification(null); }} className="text-gray-300"><X size={18} /></button>
        </div>
      )}

      <nav className="bg-green-600 text-white shadow-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 hover:bg-white/10 rounded-lg relative">
                <MenuIcon size={24} />
                {hasAnyUnread && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-green-600"></span>}
              </button>
              <div className="flex items-center space-x-2">
                <div className="bg-white text-green-600 h-8 w-8 rounded-lg flex items-center justify-center font-black">শ্রি</div>
                <h1 className="font-bold text-lg hidden sm:block">শ্রীদাসগাতী গ্রাম পোর্টাল</h1>
                <h1 className="font-bold text-lg sm:hidden">শ্রীদাসগাতী</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
               <button onClick={() => navigateTo('profile')} className="relative h-9 w-9 rounded-xl border border-white/30 overflow-hidden bg-white/10">
                  <img src={user.photoUrl} className="h-full w-full object-cover" alt="" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-green-600 rounded-full"></div>
               </button>
            </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto flex-1 w-full">{renderContent()}</main>

      {/* Bottom Tab Bar for Mobile */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white border border-gray-100 flex justify-around py-3 z-50 rounded-2xl shadow-2xl">
        <TabBtn active={activeTab === 'home'} onClick={() => navigateTo('home')} icon={<Home size={20} />} label="হোম" />
        <TabBtn active={activeTab === 'members'} onClick={() => navigateTo('members')} icon={<Users size={20} />} label="সদস্য" />
        <TabBtn active={activeTab === 'posts'} onClick={() => navigateTo('posts')} icon={<PlusCircle size={20} />} label="পোস্ট" />
        <TabBtn 
          active={activeTab === 'chat'} 
          onClick={() => navigateTo('chat')} 
          icon={
            <div className="relative">
              <MessageSquare size={20} />
              {hasAnyUnread && activeTab !== 'chat' && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </div>
          } 
          label="চ্যাট" 
        />
      </div>

      {showDownloadModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 text-center shadow-2xl">
            <Smartphone size={40} className="mx-auto text-green-600 mb-3" />
            <h2 className="font-bold text-lg">অ্যাপ ডাউনলোড করুন</h2>
            <p className="text-gray-500 text-xs mt-2">ব্রাউজার অপশন থেকে "Add to Home Screen" ক্লিক করুন।</p>
            <button onClick={() => setShowDownloadModal(false)} className="mt-6 w-full bg-green-600 text-white py-2.5 rounded-xl font-bold">বুঝেছি</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, active?: boolean, badge?: boolean }> = ({ icon, label, onClick, active, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${active ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>
    <div className="flex items-center space-x-3">
      <div className={`${active ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'}`}>{icon}</div>
      <span className={`text-sm font-bold ${active ? 'text-green-700' : 'text-gray-700'}`}>{label}</span>
    </div>
    <div className="flex items-center">
      {badge && <span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2 border-2 border-white shadow-sm"></span>}
      <ChevronRight size={16} className={`${active ? 'text-green-400' : 'text-gray-300'}`} />
    </div>
  </button>
);

const TabBtn: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center px-4 ${active ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
    {icon}
    <span className="text-[10px] mt-0.5">{label}</span>
  </button>
);

const MenuCard: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, color: string }> = ({ onClick, icon, label, color }) => (
  <button onClick={onClick} className={`${color} p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 transition-transform active:scale-95 border border-white shadow-sm`}>
    <div className="bg-white p-2.5 rounded-xl shadow-sm">{icon}</div>
    <span className="font-bold text-gray-700 text-[11px]">{label}</span>
  </button>
);

export default App;
