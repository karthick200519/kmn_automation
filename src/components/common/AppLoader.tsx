import React, { useEffect, useState } from 'react';
import { Cpu, Activity, ShieldCheck, Zap } from 'lucide-react';

interface AppLoaderProps {
  fullScreen?: boolean;
  message?: string;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  fullScreen = true,
  message,
}) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Initializing KMN Automation Engine...');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(45);
      setStatusText('Connecting Edge Gateway & Sensor Telemetry...');
    }, 300);

    const timer2 = setTimeout(() => {
      setProgress(80);
      setStatusText('Loading AI Diagnostic Models & Realtime Specs...');
    }, 600);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('System Operational & Ready');
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div
      className={`${
        fullScreen
          ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none'
          : 'flex flex-col items-center justify-center p-12 bg-slate-900 rounded-2xl text-white'
      } transition-opacity duration-500`}
    >
      {/* Background Ambient Glow Effects */}
      <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl -top-20 -left-20 pointer-events-none animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6">
        
        {/* Animated Tech Spinner Emblem */}
        <div className="relative flex items-center justify-center">
          {/* Outer Rotating Pulse Ring */}
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-blue-500/40 animate-[spin_8s_linear_infinite]"></div>
          
          {/* Middle Fast Reverse Ring */}
          <div className="absolute w-18 h-18 rounded-full border-2 border-t-blue-400 border-r-emerald-400 border-b-transparent border-l-transparent animate-[spin_1.5s_linear_infinite_reverse]"></div>
          
          {/* Center Brand Badge */}
          <div className="absolute w-12 h-12 bg-gradient-to-br from-blue-600 to-slate-900 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center border border-blue-400/40">
            <Cpu className="w-6 h-6 text-blue-200 animate-pulse" />
          </div>
        </div>

        {/* Title & Branding */}
        <div className="space-y-1">
          <h1 className="text-lg font-black tracking-widest bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent uppercase">
            KMN AUTOMATION
          </h1>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Induction Motor Telemetry & AI Diagnostic Platform
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-2">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 font-sans font-semibold text-slate-300">
              <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>{message || statusText}</span>
            </span>
            <span className="font-bold text-blue-400">{progress}%</span>
          </div>
        </div>

        {/* Security / System Badges Footer */}
        <div className="pt-4 flex items-center justify-center space-x-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-800/80 w-full">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure Edge Gateway</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>KMN Modbus RTU</span>
          </span>
        </div>

      </div>
    </div>
  );
};
