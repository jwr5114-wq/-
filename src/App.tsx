import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PresetSelector } from './components/PresetSelector';
import { QuestionSlideViewer } from './components/QuestionSlideViewer';
import { Toast } from './components/Toast';
import { InterviewQuestion } from './types/interview';
import { SamplePreset } from './data/samplePresets';
import {
  Wand2,
  Trash2,
  Sparkles,
  BookOpen,
  AlertCircle,
  FileText,
} from 'lucide-react';

const LOADING_TIPS = [
  '지원 학과의 인재상과 생기부 교과 세특 키워드를 매칭하는 중입니다...',
  '입학사정관 시점의 날카로운 심층 면접 질문을 도출하고 있습니다...',
  '면접장에서 바로 말할 수 있는 실전 구술 모범 답변을 작성하고 있습니다...',
];

const FIXED_INTERVIEW_TYPE = '학생부종합전형 (서류 기반 면접)';

export default function App() {
  const [major, setMajor] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [recordContent, setRecordContent] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  };

  // Rotate loading tips
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Preset selector
  const handleSelectPreset = (preset: SamplePreset) => {
    setSelectedPresetId(preset.id);
    setMajor(preset.major);
    setRecordContent(preset.recordContent);
    showToast(`'${preset.name}' 생기부 내용이 입력되었습니다.`);
  };

  // Quick insertion helpers for student record tags
  const handleInsertTag = (tag: string) => {
    setRecordContent((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n[${tag}]\n` : `[${tag}]\n`;
    });
  };

  // Reset form
  const handleReset = () => {
    if (window.confirm('입력한 내용과 생성된 질문을 모두 초기화하시겠습니까?')) {
      setMajor('');
      setRecordContent('');
      setQuestions([]);
      setSelectedPresetId(null);
      setErrorMessage(null);
      showToast('초기화되었습니다.');
    }
  };

  // Generate Questions via Server API
  const triggerGenerate = async () => {
    if (!major.trim()) {
      showToast('지원 학과/전공을 입력해주세요.', 'error');
      return;
    }
    if (!recordContent.trim() || recordContent.trim().length < 20) {
      showToast('생기부 내용을 최소 20자 이상 입력해주세요.', 'error');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingTipIndex(0);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          major: major.trim(),
          interviewType: FIXED_INTERVIEW_TYPE,
          questionCount,
          recordContent: recordContent.trim(),
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || '면접 질문 생성에 실패했습니다.');
      }

      setQuestions(resData.data);
      showToast(`총 ${resData.data.length}개의 맞춤형 심층 면접 질문이 생성되었습니다!`);
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(
        err.message ||
          '현재 AI 모델 서비스 요청이 집중되어 일시적인 지연이 발생했습니다. 다시 시도하기를 누르면 정상 처리됩니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    triggerGenerate();
  };

  // Copy all questions
  const handleCopyAll = () => {
    if (questions.length === 0) return;

    let fullText = `==============================\n`;
    fullText += `[${major} 지원 맞춤형 대입 심층 면접 예상 질문 및 실전 구술 모범 답변집]\n`;
    fullText += `전형 유형: ${FIXED_INTERVIEW_TYPE}\n`;
    fullText += `생성 일자: ${new Date().toLocaleDateString('ko-KR')}\n`;
    fullText += `==============================\n\n`;

    questions.forEach((q, idx) => {
      fullText += `[질문 ${idx + 1}] (${q.category})\n`;
      fullText += `Q. ${q.question}\n\n`;

      if (q.essayStructure) {
        fullText += `[답변 구조화 (서론·본론·결론)]\n`;
        fullText += `• 서론: ${q.essayStructure.introduction.content}\n`;
        fullText += `• 본론: ${q.essayStructure.body.content}\n`;
        fullText += `• 결론: ${q.essayStructure.conclusion.content}\n\n`;
      }

      fullText += `[실전 구술 모범 답변]\n${q.sampleAnswerDraft}\n`;
      fullText += `--------------------------------------------------\n\n`;
    });

    navigator.clipboard
      .writeText(fullText)
      .then(() => showToast('전체 질문 및 실전 구술 답변이 클립보드에 복사되었습니다.'))
      .catch(() => showToast('클립보드 복사에 실패했습니다.', 'error'));
  };

  // Download as markdown text file
  const handleDownloadFile = () => {
    if (questions.length === 0) return;

    let md = `# [${major}] 대입 심층 면접 질문 및 실전 구술 모범 답변집\n\n`;
    md += `- **지원 전공**: ${major}\n`;
    md += `- **면접 유형**: ${FIXED_INTERVIEW_TYPE}\n`;
    md += `- **생성 시각**: ${new Date().toLocaleString('ko-KR')}\n\n`;
    md += `---\n\n`;

    questions.forEach((q, idx) => {
      md += `## 질문 ${idx + 1}. [${q.category}] ${q.question}\n\n`;

      if (q.essayStructure) {
        md += `### 📝 서론 · 본론 · 결론 구조화\n`;
        md += `- **서론** (${q.essayStructure.introduction.point || '핵심 입장과 답변 방향'}): ${q.essayStructure.introduction.content}\n`;
        md += `- **본론** (${q.essayStructure.body.point || '핵심 근거 및 실천 방안'}): ${q.essayStructure.body.content}\n`;
        md += `- **결론** (${q.essayStructure.conclusion.point || '내용 정리 및 실천 의지'}): ${q.essayStructure.conclusion.content}\n\n`;
      }

      md += `### 🗣️ 실전 구술 모범 답변\n`;
      md += `\`\`\`text\n${q.sampleAnswerDraft}\n\`\`\`\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `면접질문_${major.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('면접 질문집 파일(.md)이 다운로드되었습니다.');
  };

  // Handle single question copy
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(label))
      .catch(() => showToast('클립보드 복사에 실패했습니다.', 'error'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60">
      <Header onReset={handleReset} hasData={Boolean(major || recordContent || questions.length)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        
        {/* Minimal Clean Header Banner */}
        <div className="mb-6 bg-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              생기부 기반 면접 연습
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              지원 학과와 생기부 내용을 입력하면 맞춤 질문이 생성됩니다.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI 심층 첨삭 연동</span>
          </div>
        </div>

        {/* Preset Selector */}
        <PresetSelector onSelect={handleSelectPreset} selectedId={selectedPresetId} />

        {/* Grid Layout: Input Form (Left) & Results (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>면접 기본 정보 & 생기부 입력</span>
                </h3>
                {(major || recordContent) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMajor('');
                      setRecordContent('');
                      setSelectedPresetId(null);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 지우기
                  </button>
                )}
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Major & Question Count Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="majorInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                      지원 학과 / 전공 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="majorInput"
                      type="text"
                      value={major}
                      onChange={(e) => {
                        setMajor(e.target.value);
                        setSelectedPresetId(null);
                      }}
                      placeholder="예: 컴퓨터공학과, 의예과, 경영학과, 국어교육과"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all placeholder-slate-400 text-sm text-slate-800 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="questionCountSelect" className="block text-xs font-bold text-slate-700 mb-1.5">
                      생성 질문 개수
                    </label>
                    <select
                      id="questionCountSelect"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden text-xs text-slate-800 bg-white h-[42px]"
                    >
                      <option value={3}>3개 (핵심 질문)</option>
                      <option value={5}>5개 (추천 표준)</option>
                      <option value={7}>7개 (심층 종합)</option>
                    </select>
                  </div>
                </div>

                {/* Student Record Content */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="recordContentTextarea" className="text-xs font-bold text-slate-700">
                      학교생활기록부 내용 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {recordContent.length}자
                    </span>
                  </div>

                  {/* Quick tag helpers */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] text-slate-400 mr-0.5">빠른 태그:</span>
                    {['세부능력 및 특기사항', '동아리활동', '진로활동', '자율활동', '독서기록'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleInsertTag(tag)}
                        className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded transition-colors"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    id="recordContentTextarea"
                    rows={12}
                    value={recordContent}
                    onChange={(e) => {
                      setRecordContent(e.target.value);
                      setSelectedPresetId(null);
                    }}
                    placeholder="면접에 활용하고 싶은 생기부 내용을 붙여넣으세요.&#13;&#10;&#13;&#10;예시:&#13;&#10;[세부능력 및 특기사항: 수학] 확률과 통계 시간에 나이브 베이즈 분류 알고리즘의 원리를 탐구하고...&#13;&#10;[동아리활동] 컴퓨터 동아리에서 공공 데이터를 활용하여..."
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all placeholder-slate-400 text-xs sm:text-sm text-slate-800 resize-none font-mono"
                    required
                  ></textarea>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-xs flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>예상 면접 질문 생성하기</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7 flex flex-col min-h-[620px]">
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-8 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1.5">
                  면접 질문 및 단계별 답변을 생성하고 있습니다
                </h4>
                <p className="text-xs sm:text-sm text-blue-600 font-medium max-w-md h-10 flex items-center justify-center animate-fadeIn">
                  {LOADING_TIPS[loadingTipIndex]}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>서버 연동을 통해 안정적으로 처리 중입니다</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMessage && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 sm:p-7 text-center shadow-xs mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900 mb-1.5">
                  AI 서비스 안내
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
                  {errorMessage}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={triggerGenerate}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>지금 바로 다시 시도하기</span>
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !errorMessage && questions.length === 0 && (
              <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600 shadow-2xs">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  면접 연습을 시작해보세요
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                  좌측에 학과와 생기부 내용을 입력하거나,<br className="hidden sm:inline" />
                  상단의 <strong className="text-slate-700">추천 예시 생기부</strong>를 선택하면 즉시 연습 카드가 생성됩니다.
                </p>
              </div>
            )}

            {/* Questions List -> One-by-One Slide Viewer */}
            {!isLoading && questions.length > 0 && (
              <QuestionSlideViewer
                questions={questions}
                major={major}
                onCopyText={handleCopyText}
                onDownloadFile={handleDownloadFile}
              />
            )}

          </div>

        </div>

      </main>

      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200/80 bg-white py-5 text-center text-xs text-slate-500">
        <p className="max-w-2xl mx-auto px-4">
          본 서비스는 Google AI Studio의 서버 측 Gemini 연동을 바탕으로 구동되며, 사용자의 API 키를 요구하거나 브라우저에 노출하지 않습니다.
        </p>
      </footer>
    </div>
  );
}
