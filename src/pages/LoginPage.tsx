import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, profile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      navigate('/overview', { replace: true });
    }
  }, [profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/overview');
    } else {
      setErrorMessage(result.error || 'Unable to complete sign-in. Please verify your credentials.');
    }
  };

  const handleQuickDemoLogin = async (demoRole: 'admin' | 'engineer' | 'operator') => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const demoEmail = `${demoRole}@industrial.com`;
    const demoPass = 'Industrial@2026!';
    setEmail(demoEmail);
    setPassword(demoPass);

    const result = await signIn(demoEmail, demoPass);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/overview');
    } else {
      setErrorMessage(result.error || 'Unable to complete sign-in.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      
      {/* Light SCADA Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200 flex items-center justify-center mb-4 shadow-sm">
            <Activity className="w-8 h-8 animate-pulse text-blue-600" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            KMN Automation
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Industrial Control & Predictive AI System
          </p>
        </div>

        {/* Light Card */}
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-xl rounded-xl sm:px-10">
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-3 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@kmnautomation.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Password
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <span>Sign In to System</span>
                )}
              </button>
            </div>
          </form>

          {/* Demo Presets */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-3 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Quick Role Sign In Presets:</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('engineer')}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Engineer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('operator')}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Operator
              </button>
            </div>
          </div>

        </div>

        {/* Security Notice */}
        <p className="mt-6 text-center text-xs text-slate-500 font-medium">
          Protected KMN Automation System. Session auto-logs out after 2 hours.
        </p>

      </div>
    </div>
  );
};

