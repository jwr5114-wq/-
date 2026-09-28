import React, { useState, useEffect, useRef } from 'react';
import { InterviewQuestion } from '../types/interview';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  FileCheck2,
  Download,
  BookOpen,
} from 'lucide-react';

interface QuestionSlideViewerProps {
  questions: InterviewQuestion[];
  major: string;
  onCopyText: (text: string, label: string) => void;
  onDownloadFile?: () => void;
}

export const QuestionSlideViewer: React.FC<QuestionSlideViewerProps> = ({
  questions,
  onCopyText,
  onDownloadFile,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Swipe gesture detection
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= questions.length) {
      setCurrentIndex(0);
    }
  }, [questions.length, currentIndex]);

  // Scroll to top when changing questions
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex]);

  // Keyboard navigation (ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions.length]);

  if (!questions || questions.length === 0) {
    return null;
  }

  const currentQ = questions[currentIndex];

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > minSwipeDistance && currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleCopyCurrent = () => {
    let fullText = `[질문 ${currentIndex + 1}]\nQ: ${currentQ.question}\n\n`;
    if (currentQ.essayStructure) {
      fullText += `[서론 / 본론 / 결론 구조화]\n`;
      fullText += `• 서론: ${currentQ.essayStructure.introduction.content}\n`;
      fullText += `• 본론: ${currentQ.essayStructure.body.content}\n`;
      fullText += `• 결론: ${currentQ.essayStructure.conclusion.content}\n\n`;
    }
    fullText += `[실전 구술 모범 답변]\n${currentQ.sampleAnswerDraft}`;

    onCopyText(fullText, `질문 ${currentIndex + 1} 전체 내용이 복사되었습니다.`);
    setCopiedSection('all');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopySampleAnswer = () => {
    onCopyText(currentQ.sampleAnswerDraft, '실전 구술 모범 답변이 복사되었습니다.');
    setCopiedSection('sample');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Top Bar: Number Navigation (Left) & Download Button (Right) */}
      <div className="flex items-center justify-between gap-3 px-0.5">
        {/* Simple Numbered Tabs: 1 | 2 | 3 | 4 | 5 */}
        <div className="inline-flex items-center p-1 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`min-w-8 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                currentIndex === idx
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={`질문 ${idx + 1}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Right Action: Download File Button */}
        {onDownloadFile && (
          <button
            onClick={onDownloadFile}
            className="text-xs text-slate-600 hover:text-blue-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-2xs font-medium shrink-0"
            title="전체 질문 및 답변 파일 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span>문서 다운로드</span>
          </button>
        )}
      </div>

      {/* Main Single Card: 예상 면접 질문 -> 서론 -> 본론 -> 결론 -> 실전 구술 모범 답변 */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm transition-all overflow-hidden flex flex-col"
      >
        {/* Card Scrollable Content Container */}
        <div
          ref={scrollContainerRef}
          className="max-h-[660px] overflow-y-auto p-5 sm:p-7 space-y-6"
        >
          {/* 1. 예상 면접 질문 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                질문 {currentIndex + 1}
              </span>
              <button
                onClick={handleCopyCurrent}
                className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                title="질문 및 전체 내용 복사"
              >
                {copiedSection === 'all' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>전체 복사</span>
              </button>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight">
              Q. {currentQ.question}
            </h3>
          </div>

          <hr className="border-slate-100" />

          {/* 2. 서론 · 본론 · 결론 구조화 */}
          {currentQ.essayStructure && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>답변 구조화 (서론 · 본론 · 결론)</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. 서론 */}
                <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-col">
                  <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                    <span className="text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-blue-200">
                      서론
                    </span>
                  </div>
                  {currentQ.essayStructure.introduction.point && (
                    <p className="text-[11px] text-blue-600 font-semibold mb-1.5">
                      {currentQ.essayStructure.introduction.point}
                    </p>
                  )}
                  <p className="text-slate-700 leading-relaxed text-xs">
                    {currentQ.essayStructure.introduction.content}
                  </p>
                </div>

                {/* 2. 본론 */}
                <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-col">
                  <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                    <span className="text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-indigo-200">
                      본론
                    </span>
                  </div>
                  {currentQ.essayStructure.body.point && (
                    <p className="text-[11px] text-indigo-600 font-semibold mb-1.5">
                      {currentQ.essayStructure.body.point}
                    </p>
                  )}
                  <p className="text-slate-700 leading-relaxed text-xs">
                    {currentQ.essayStructure.body.content}
                  </p>
                </div>

                {/* 3. 결론 */}
                <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-col">
                  <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                    <span className="text-slate-700 bg-slate-200/80 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-slate-300">
                      결론
                    </span>
                  </div>
                  {currentQ.essayStructure.conclusion.point && (
                    <p className="text-[11px] text-slate-600 font-semibold mb-1.5">
                      {currentQ.essayStructure.conclusion.point}
                    </p>
                  )}
                  <p className="text-slate-700 leading-relaxed text-xs">
                    {currentQ.essayStructure.conclusion.content}
                  </p>
                </div>
              </div>
            </div>
          )}

          <hr className="border-slate-100" />

          {/* 3. 실전 구술 모범 답변 (완성형 스크립트) */}
          {currentQ.sampleAnswerDraft && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>실전 구술 모범 답변</span>
                </h4>
                <button
                  onClick={handleCopySampleAnswer}
                  className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                >
                  {copiedSection === 'sample' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>답변 복사</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 rounded-xl p-4 sm:p-5 border border-emerald-200">
                <p className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-line bg-white/95 p-4 rounded-lg border border-emerald-100 shadow-2xs font-medium">
                  "{currentQ.sampleAnswerDraft}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Slide Bottom Navigation Controls */}
        <div className="border-t border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전 질문</span>
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-5 h-2 bg-blue-600'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`질문 ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex === questions.length - 1}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span>다음 질문</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
