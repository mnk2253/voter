
import React, { useState, useEffect, useRef } from 'react';
// Fix: Use @firebase/firestore to resolve exported member errors
import { collection, addDoc, query, orderBy, onSnapshot, limit, where, doc } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ChatMessage } from '../types';
import { Send, MessageSquare, ArrowLeft, Bell, Clock } from 'lucide-react';

interface ChatSystemProps {
  currentUser: UserProfile;
  initialTargetUser: UserProfile | null;
  globalUnreadCounts: { [key: string]: number };
}

export const ChatSystem: React.FC<ChatSystemProps> = ({ currentUser, initialTargetUser, globalUnreadCounts }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(initialTargetUser);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as UserProfile))
        .filter(m => m.id !== currentUser.id)
      );
    });
    return unsub;
  }, [currentUser.id]);

  useEffect(() => {
    if (initialTargetUser) {
      setSelectedUser(initialTargetUser);
    }
  }, [initialTargetUser]);

  // Handle selectedUser updates (online status)
  useEffect(() => {
    if (!selectedUser) return;
    const unsub = onSnapshot(doc(db, 'users', selectedUser.id), (docSnap) => {
      if (docSnap.exists()) {
        setSelectedUser({ ...docSnap.data(), id: docSnap.id } as UserProfile);
      }
    });
    return unsub;
  }, [selectedUser?.id]);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMsgs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChatMessage));
      
      if (!selectedUser) {
        setMessages(allMsgs.filter(m => !m.receiverId));
      } else {
        setMessages(allMsgs.filter(m => 
          (m.senderId === currentUser.id && m.receiverId === selectedUser.id) ||
          (m.senderId === selectedUser.id && m.receiverId === currentUser.id)
        ));
      }
    });

    return unsubscribe;
  }, [selectedUser?.id, currentUser.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: selectedUser?.id || null,
        text: inputText.trim(),
        createdAt: Date.now()
      });
      setInputText('');
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'অজানা';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex h-[calc(100vh-180px)] md:h-[600px] border border-gray-100">
      <div className={`${selectedUser ? 'hidden md:block' : 'block'} w-full md:w-80 bg-gray-50 border-r border-gray-100 overflow-y-auto`}>
        <div className="p-4 border-b border-gray-100 sticky top-0 bg-gray-50 z-10">
          <h2 className="text-lg font-bold text-gray-800">চ্যাটিং</h2>
        </div>
        
        <div className="p-2 space-y-1">
          <button 
            onClick={() => setSelectedUser(null)}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all ${!selectedUser ? 'bg-green-600 text-white shadow-md' : 'hover:bg-white text-gray-700'}`}
          >
            <div className={`p-2 rounded-lg ${!selectedUser ? 'bg-white/20' : 'bg-green-100'}`}>
              <MessageSquare size={20} className={!selectedUser ? 'text-white' : 'text-green-600'} />
            </div>
            <span className="font-bold">গ্রুপ চ্যাট</span>
          </button>

          <div className="px-3 pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">প্রাইভেট চ্যাট</div>
          
          {members.map(member => {
            const unreadCount = globalUnreadCounts[member.id] || 0;
            const isSelected = selectedUser?.id === member.id;
            const isOnline = member.isOnline;
            
            return (
              <button 
                key={member.id}
                onClick={() => setSelectedUser(member)}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all relative ${isSelected ? 'bg-green-600 text-white shadow-md' : 'hover:bg-white text-gray-700'}`}
              >
                <div className="relative flex-shrink-0">
                  <img src={member.photoUrl} className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {isOnline && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>}
                  </div>
                  {unreadCount > 0 && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm truncate">{member.name}</p>
                    {unreadCount > 0 && !isSelected && (
                      <span className="bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm border border-white/20">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 mt-0.5">
                    {isOnline && !isSelected && <span className="bg-green-100 text-green-700 text-[7px] font-black px-1 rounded-sm uppercase tracking-tighter">সক্রিয়</span>}
                    <p className={`text-[10px] truncate ${isSelected ? 'text-green-100' : (isOnline ? 'text-green-500 font-bold' : 'text-gray-400')}`}>
                      {isOnline ? 'Online' : formatLastSeen(member.lastSeen)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${!selectedUser && 'hidden md:flex'} flex-1 flex flex-col bg-white min-w-0`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-green-600">
              <ArrowLeft size={20} />
            </button>
            {selectedUser ? (
              <>
                <div className="relative flex-shrink-0">
                  <img src={selectedUser.photoUrl} className="h-10 w-10 rounded-full object-cover shadow-sm border border-gray-100" alt="" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {selectedUser.isOnline && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-gray-800 truncate">{selectedUser.name}</h3>
                    {selectedUser.isOnline && (
                      <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-green-200 uppercase tracking-widest animate-pulse">সক্রিয়</span>
                    )}
                  </div>
                  {selectedUser.isOnline ? (
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                      Online
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 flex items-center font-bold uppercase truncate">
                      <Clock size={10} className="mr-1 flex-shrink-0" /> Last seen: {formatLastSeen(selectedUser.lastSeen)}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 text-lg truncate">গ্রামের গ্রুপ চ্যাট</h3>
                <p className="text-[11px] text-gray-400 truncate">{members.length + 1} জন সদস্য যুক্ত আছেন</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50 space-y-2">
              <MessageSquare size={48} />
              <p className="text-sm italic">মেসেজ পাঠিয়ে কথা বলা শুরু করুন!</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
                  {!isMe && !selectedUser && (
                    <span className="text-[10px] font-bold text-gray-400 ml-1 mb-1 truncate max-w-full">
                      {msg.senderName}
                    </span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-[14px] shadow-sm break-words whitespace-pre-wrap overflow-hidden ${isMe ? 'bg-green-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-300 mt-1 uppercase">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 flex items-center space-x-2 bg-white">
          <input
            type="text"
            placeholder={selectedUser ? `${selectedUser.name}-কে...` : "গ্রুপে মেসেজ লিখুন..."}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
          />
          <button 
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl shadow-lg transition-all active:scale-95 disabled:bg-gray-300 flex items-center justify-center"
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send size={20} fill="currentColor" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
