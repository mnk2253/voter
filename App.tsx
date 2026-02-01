
import React, { useState, useMemo } from 'react';
import { Voter } from './types';
import { INITIAL_VOTERS } from './constants';
import VoterTable from './components/VoterTable';
import VoterForm from './components/VoterForm';
import PDFImportModal from './components/PDFImportModal';
import StatsCard from './components/StatsCard';
import AIChat from './components/AIChat';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const App: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>(INITIAL_VOTERS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = voters.length;
    const male = voters.filter(v => v.gender === 'পুরুষ').length;
    const female = voters.filter(v => v.gender === 'মহিলা').length;
    const other = voters.filter(v => v.gender === 'অন্যান্য').length;
    
    const wardDataMap: Record<string, number> = {};
    voters.forEach(v => {
      const wardName = v.ward || 'অজানা';
      wardDataMap[wardName] = (wardDataMap[wardName] || 0) + 1;
    });

    const wardChartData = Object.entries(wardDataMap).map(([name, value]) => ({ name, value }));
    const genderChartData = [
      { name: 'পুরুষ', value: male },
      { name: 'মহিলা', value: female },
      { name: 'অন্যান্য', value: other }
    ].filter(d => d.value > 0);

    return {
      total,
      male,
      female,
      other,
      wardChartData,
      genderChartData
    };
  }, [voters]);

  const COLORS = ['#10b981', '#f472b6', '#3b82f6'];

  const handleAddVoter = (newVoter: Omit<Voter, 'id'>) => {
    const voterWithId: Voter = {
      ...newVoter,
      id: Math.random().toString(36).substr(2, 9)
    };
    setVoters(prev => [voterWithId, ...prev]);
    setShowAddForm(false);
  };

  const handleBulkImport = (newVoters: Omit<Voter, 'id'>[]) => {
    const votersWithIds = newVoters.map(v => ({
      ...v,
      id: v.nid || Math.random().toString(36).substr(2, 9)
    }));
    setVoters(prev => [...votersWithIds, ...prev]);
    setShowImportModal(false);
  };

  const handleDeleteVoter = (id: string) => {
    if (confirm('আপনি কি নিশ্চিত যে এই ভোটার রেকর্ডটি মুছতে চান?')) {
      setVoters(prev => prev.filter(v => v.id !== id));
    }
  };

  const clearAllVoters = () => {
    if (confirm('আপনি কি নিশ্চিত যে সমস্ত তথ্য মুছে ফেলতে চান?')) {
      setVoters([]);
    }
  };

  const resetToInitial = () => {
    if (confirm('আপনি কি নিশ্চিত যে ডিফল্ট তথ্য ফিরে পেতে চান?')) {
      setVoters(INITIAL_VOTERS);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-emerald-700 text-white py-8 px-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">আমাদের গ্রাম: শ্রীদাসগাতী</h1>
              <p className="text-emerald-100">ডিজিটাল ও স্মার্ট ভোটার তালিকা ব্যবস্থাপনা</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
             <button 
              onClick={resetToInitial}
              className="bg-emerald-800 text-white px-4 py-3 rounded-xl font-medium hover:bg-emerald-900 transition-all flex items-center space-x-2 border border-emerald-600 shadow-md"
              title="ডিফল্ট ডাটা রিসেট করুন"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>রিসেট</span>
            </button>
            <button 
              onClick={() => setShowImportModal(true)}
              className="bg-emerald-600 border border-emerald-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center space-x-2 shadow-lg active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>পিডিএফ কপি</span>
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center space-x-2 shadow-xl shadow-emerald-900/20 active:scale-95 border-2 border-transparent"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>নতুন ভোটার</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard 
            title="মোট ভোটার" 
            value={stats.total} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            color="bg-emerald-500"
          />
          <StatsCard 
            title="পুরুষ ভোটার" 
            value={stats.male} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            color="bg-blue-500"
          />
          <StatsCard 
            title="মহিলা ভোটার" 
            value={stats.female} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            color="bg-pink-500"
          />
          <StatsCard 
            title="মোট ওয়ার্ড" 
            value={stats.wardChartData.length} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            color="bg-amber-500"
          />
        </div>

        {/* Analytics & Chat Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
              <h3 className="text-lg font-bold text-slate-800 mb-4">ওয়ার্ড ভিত্তিক ভোটার সংখ্যা</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.wardChartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 h-full">
            <AIChat voters={voters} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">লিঙ্গ ভিত্তিক অনুপাত</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.genderChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.genderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center space-y-4">
                  <h3 className="text-lg font-bold text-slate-800">তথ্য মুছে ফেলুন</h3>
                  <p className="text-slate-500 text-sm max-w-xs">তালিকায় থাকা সকল ভোটার রেকর্ড মুছে ফেলতে নিচের বাটনে ক্লিক করুন। এটি অপরিবর্তনযোগ্য।</p>
                  <button 
                    onClick={clearAllVoters}
                    className="flex items-center space-x-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl border border-red-200 hover:bg-red-100 transition-all font-bold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>সব মুছে ফেলুন</span>
                  </button>
              </div>
        </div>

        {/* Voter Table */}
        <VoterTable voters={voters} onDelete={handleDeleteVoter} />
      </main>

      {/* Modal for adding voter manually */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl">
            <VoterForm onAdd={handleAddVoter} onCancel={() => setShowAddForm(false)} />
          </div>
        </div>
      )}

      {/* Modal for bulk import from PDF copy */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <PDFImportModal onImport={handleBulkImport} onCancel={() => setShowImportModal(false)} />
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-slate-500 text-sm pb-8">
        <p>© ২০২৪ শ্রীদাসগাতী ডিজিটাল সেবা কেন্দ্র। সকল অধিকার সংরক্ষিত।</p>
        <p className="text-xs mt-1 italic">এআই প্রযুক্তি দ্বারা চালিত স্মার্ট ইউনিয়ন তথ্য সেবা</p>
      </footer>
    </div>
  );
};

export default App;
