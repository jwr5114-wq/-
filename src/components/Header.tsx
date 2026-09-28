import React from 'react';
import { GraduationCap, Sparkles, ShieldCheck, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasData }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                생기부 기반 AI 면접 질문 생성기
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
                <Sparkles className="w-3 h-3 text-blue-500" />
                대입 심층 면접 코칭
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              학교생활기록부 교과 세특 및 창체 활동을 정밀 분석하여 맞춤형 압박 질문과 실전 구술 모범 답변을 도출합니다.
            </p>
          </div>
        </div>

        {/* Server-Side AI Status & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>서버 AI 연동 완료 · API 키 불필요</span>
          </div>

          {hasData && (
            <button
              onClick={onReset}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              title="새로 작성하기"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
