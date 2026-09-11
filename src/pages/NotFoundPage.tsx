import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-100">
      <div className="w-16 h-16 bg-slate-800 text-blue-400 rounded-full flex items-center justify-center mb-4 border border-slate-700">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black mb-2">404 - Page Not Found</h1>
      <p className="text-slate-400 text-sm max-w-md mb-6">
        The requested resource path does not exist or has been relocated within the industrial platform navigation matrix.
      </p>
      <button
        onClick={() => navigate('/overview')}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to System Overview</span>
      </button>
    </div>
  );
};
