
import React, { useState } from 'react';
import { Voter } from '../types';

interface VoterTableProps {
  voters: Voter[];
  onDelete: (id: string) => void;
}

const VoterTable: React.FC<VoterTableProps> = ({ voters, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVoters = voters.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.nid.includes(searchTerm) ||
    v.ward.includes(searchTerm)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800">ভোটার তালিকা</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="নাম বা এনআইডি দিয়ে খুঁজুন..."
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ভোটারের নাম</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">পিতা/মাতা</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">এনআইডি</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">বয়স ও লিঙ্গ</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ওয়ার্ড</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredVoters.map((voter) => (
              <tr key={voter.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{voter.name}</div>
                  <div className="text-xs text-slate-500">{voter.address}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600">পি: {voter.fatherName}</div>
                  <div className="text-sm text-slate-600">মা: {voter.motherName}</div>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-slate-700">{voter.nid}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${voter.gender === 'পুরুষ' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                      {voter.gender}
                    </span>
                    <span className="text-sm text-slate-600">{voter.age} বছর</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{voter.ward}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onDelete(voter.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {filteredVoters.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  কোন ভোটার খুঁজে পাওয়া যায়নি
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VoterTable;
