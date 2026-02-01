
import React, { useState, useEffect, useRef } from 'react';
// Always use import {GoogleGenAI} from "@google/genai";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  RefreshCw, 
  ImageIcon, 
  X, 
  Info,
  ChevronDown,
  BrainCircuit,
  Zap
} from 'lucide-react';
// Fix: Use direct @firebase/firestore to resolve missing export errors
import { collection, query, orderBy, limit, getDocs } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Post } from '../types';

interface Message {
  role: 'user' | 'model';
  content: string;
  isImage?: boolean;
}

export const AIAssistant: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      content: `নমস্কার ${currentUser.name}! আমি শ্রীদাসগাতী গ্রামের ডিজিটাল সহকারী। আমি আপনাকে গ্রামের তথ্য, খবর এবং ছবি তৈরিতে সাহায্য করতে পারি। আজ আপনাকে কিভাবে সাহায্য করতে পারি?` 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecentPosts();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const fetchRecentPosts = async () => {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post));
      setRecentPosts(posts);
    } catch (err) {
      console.error("Error fetching posts for AI context:", err);
    }
  };

  const generateAIResponse = async (userPrompt: string) => {
    setIsTyping(true);
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    setInputText('');

    try {
      // Create a new GoogleGenAI instance right before making an API call to ensure it uses the latest config.
      // Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
      const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
      
      // Determine if the user wants an image
      const imageKeywords = ['ছবি', 'image', 'photo', 'picture', 'তৈরি করো', 'আঁকো'];
      const isImageRequest = imageKeywords.some(kw => userPrompt.toLowerCase().includes(kw)) && 
                            (userPrompt.length < 100);

      if (isImageRequest) {
        // Use gemini-2.5-flash-image for image generation tasks as per guidelines
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `A beautiful realistic scene of a Bangladeshi village called Sri Dasgati. Features: lush green fields, palm trees, simple houses, serene atmosphere. Topic: ${userPrompt}` }],
          },
          config: {
            imageConfig: { aspectRatio: "1:1" }
          }
        });

        // The output response may contain both image and text parts; iterate through all parts to find the image part.
        let textResponseContent = '';
        let foundImage = false;

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64EncodeString: string = part.inlineData.data;
              const imageUrl = `data:image/png;base64,${base64EncodeString}`;
              setMessages(prev => [...prev, { role: 'model', content: imageUrl, isImage: true }]);
              foundImage = true;
            } else if (part.text) {
              textResponseContent += part.text;
            }
          }
        }

        if (textResponseContent) {
          setMessages(prev => [...prev, { role: 'model', content: textResponseContent }]);
        } else if (!foundImage) {
          setMessages(prev => [...prev, { role: 'model', content: 'দুঃখিত, ছবিটি তৈরি করা সম্ভব হয়নি।' }]);
        }
      } else {
        // Use gemini-3-flash-preview for Basic Text Tasks (simple Q&A)
        const postContext = recentPosts.map(p => `[${p.userName}: ${p.content}]`).join('\n');
        
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: userPrompt,
          config: {
            systemInstruction: `You are the Official AI Assistant for the Sri Dasgati village portal. 
            Respond strictly in Bengali. Be helpful, polite, and community-focused. 
            The user is ${currentUser.name}.
            Current Village News context: ${postContext}.
            If asked about recent events, use this context. If not known, say you don't have the update.
            Keep responses concise and useful for village members.`,
          },
        });

        // Use response.text getter directly to extract generated text content
        setMessages(prev => [...prev, { role: 'model', content: response.text || 'দুঃখিত, আমি বুঝতে পারিনি।' }]);
      }
    } catch (err) {
      console.error("AI Error:", err);
      setMessages(prev => [...prev, { role: 'model', content: "দুঃখিত, এআই সার্ভারে সমস্যা হচ্ছে। অনুগ্রহ করে পরে চেষ্টা করুন।" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    generateAIResponse(action);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[700px] bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100">
      {/* AI Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">শ্রীদাসগাতী এআই</h2>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">সক্রিয় সহকারী</p>
            </div>
          </div>
        </div>
        <button onClick={fetchRecentPosts} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 no-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.role === 'user';
          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center space-x-1.5 mb-1 px-1`}>
                  {!isMe && <Sparkles size={10} className="text-indigo-500" />}
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {isMe ? 'আপনি' : 'এআই সহকারী'}
                  </span>
                </div>
                
                <div className={`p-4 rounded-3xl shadow-sm text-sm leading-relaxed ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
                }`}>
                  {msg.isImage ? (
                    <img src={msg.content} className="w-full h-auto rounded-xl shadow-md border-2 border-indigo-50" alt="Generated" />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
              </div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">এআই ভাবছে...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar border-t border-gray-50">
        <QuickBtn icon={<Info size={14} />} label="আজকের খবর?" onClick={() => handleQuickAction("আজকের গ্রামের খবর কি?")} />
        <QuickBtn icon={<ImageIcon size={14} />} label="গ্রামের ছবি" onClick={() => handleQuickAction("গ্রামের একটি সুন্দর ছবি তৈরি করো")} />
        <QuickBtn icon={<UserIcon size={14} />} label="কেমন আছো?" onClick={() => handleQuickAction("তুমি কেমন আছো?")} />
      </div>

      {/* Input Form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); if(inputText.trim()) generateAIResponse(inputText); }}
        className="p-4 bg-white border-t border-gray-100 flex items-center space-x-2"
      >
        <div className="flex-1 relative group">
          <input
            type="text"
            placeholder="কিছু জিজ্ঞাসা করুন..."
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:bg-white group-hover:border-indigo-100"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping}
          />
          <div className="absolute right-3 top-3.5 text-indigo-300">
            <BrainCircuit size={18} />
          </div>
        </div>
        <button 
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-4 rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
        >
          <Send size={20} fill="currentColor" />
        </button>
      </form>
    </div>
  );
};

const QuickBtn: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 text-[11px] font-bold"
  >
    {icon}
    <span>{label}</span>
  </button>
);
