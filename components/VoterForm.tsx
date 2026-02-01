
import React, { useState } from 'react';
import { Voter, Gender } from '../types';

interface VoterFormProps {
  onAdd: (voter: Omit<Voter, 'id'>) => void;
  onCancel: () => void;
}

const VoterForm: React.FC<VoterFormProps> = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    age: '',
    gender: 'পুরুষ' as Gender,
    nid: '',
    ward: '১ নম্বর ওয়ার্ড',
    address: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      age: parseInt(formData.age)
    });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">নতুন ভোটার নিবন্ধন</h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">নাম</label>
            <input
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">এনআইডি নম্বর</label>
            <input
              required
              maxLength={17}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.nid}
              onChange={e => setFormData({...formData, nid: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">পিতার নাম</label>
            <input
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.fatherName}
              onChange={e => setFormData({...formData, fatherName: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">মাতার নাম</label>
            <input
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.motherName}
              onChange={e => setFormData({...formData, motherName: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">বয়স</label>
            <input
              required
              type="number"
              min="18"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.age}
              onChange={e => setFormData({...formData, age: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">লিঙ্গ</label>
            <select
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.gender}
              onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
            >
              <option value="পুরুষ">পুরুষ</option>
              <option value="মহিলা">মহিলা</option>
              <option value="অন্যান্য">অন্যান্য</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">ওয়ার্ড</label>
            <select
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.ward}
              onChange={e => setFormData({...formData, ward: e.target.value})}
            >
              <option>১ নম্বর ওয়ার্ড</option>
              <option>২ নম্বর ওয়ার্ড</option>
              <option>৩ নম্বর ওয়ার্ড</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">গ্রাম/পাড়া</label>
            <input
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            বাতিল
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all font-semibold"
          >
            সংরক্ষণ করুন
          </button>
        </div>
      </form>
    </div>
  );
};

export default VoterForm;
