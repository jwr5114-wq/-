import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '10mb' }));

// Helper to execute Gemini requests with retry and fallback across supported flash models
async function executeGeminiWithFallback(
  createPayload: (model: string) => { contents: string; config: any }
) {
  // Ordered models to try in case of temporary 503 high demand spikes
  const candidateModels = [
    { name: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
    { name: 'gemini-flash-latest', thinkingLevel: null },
    { name: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  let lastError: any = null;

  for (const candidate of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const payload = createPayload(candidate.name);
        const configWithThinking = {
          ...payload.config,
          ...(candidate.thinkingLevel
            ? { thinkingConfig: { thinkingLevel: candidate.thinkingLevel } }
            : {}),
        };

        const response = await ai.models.generateContent({
          model: candidate.name,
          contents: payload.contents,
          config: configWithThinking,
        });

        const text = response.text;
        if (!text) {
          throw new Error('AI 모델 응답 텍스트가 비어 있습니다.');
        }

        return text;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isTransient =
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('overloaded');

        console.warn(
          `[Gemini Call] model=${candidate.name} attempt=${attempt} failed: ${msg.slice(0, 150)}`
        );

        if (!isTransient) {
          throw err;
        }

        // Wait with brief backoff
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }

  throw lastError;
}

// Format error message to be human-friendly
function formatErrorMessage(err: any): string {
  const msg = String(err?.message || err);
  if (
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('overloaded')
  ) {
    return '현재 AI 서비스 이용량이 일시적으로 급증했습니다. 잠시 후 [다시 시도하기] 버튼을 눌러주세요.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return '일시적인 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (msg.includes('GEMINI_API_KEY')) {
    return '서버 환경에 GEMINI_API_KEY가 연결되지 않았습니다.';
  }
  return '일시적인 서버 통신 지연이 발생했습니다. 다시 시도하기를 눌러주세요.';
}

// Health / status endpoint (doesn't expose secrets)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    configured: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: Generate interview questions based on student record and target major
app.post('/api/generate-questions', async (req: Request, res: Response) => {
  try {
    const { major, recordContent, questionCount = 5, interviewType = '학생부종합전형 (서류 기반 면접)' } = req.body;

    if (!major || typeof major !== 'string' || !major.trim()) {
      return res.status(400).json({ error: '지원 학과/전공을 입력해주세요.' });
    }

    if (!recordContent || typeof recordContent !== 'string' || recordContent.trim().length < 20) {
      return res.status(400).json({ error: '학교생활기록부 내용을 충분히(20자 이상) 입력해주세요.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: '서버 환경에 GEMINI_API_KEY가 설정되어 있지 않습니다. AI Studio Secrets를 확인해주세요.',
      });
    }

    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 3), 7);

    const systemInstruction = `당신은 대학교 입학사정관 및 학생부종합전형 심층 면접관이자 전문 수시 컨설턴트입니다.
지원자가 제출한 고등학교 학교생활기록부(교과 세특, 창체활동, 자율/진로/동아리 활동, 독서 등)와 지원 학과/전공을 면밀히 분석하여, 실제 대입 면접에서 물어볼 법한 날카롭고 변별력 있는 심층 질문 ${count}개를 생성하세요.

[핵심 평가 및 답변 구성 지침]
1. 단순 사실 확인을 지양하고, 구체적인 탐구 동기, 실험/연구 과정의 어려움 극복, 이론의 수학적/과학적/인문학적 원리 이해도, 전공 학문과의 연계성을 검증하는 '심층 압박 및 탐구형' 질문을 포함하세요.
2. 학생의 생기부 속 구체적인 키워드, 도서명, 프로젝트명, 탐구 보고서 주제를 직접 인용하여 신뢰도와 구체성을 극대화하세요.
3. 각 질문마다 [서론·본론·결론 구조화]와 이를 바탕으로 한 [실전 구술 모범 답변]을 단계별로 작성하세요.
   - 서론: 질문에 대한 핵심 입장이나 답변 방향을 짧고 명확하게 제시
   - 본론: 핵심 근거, 경험, 실천 방안 등을 2~3개의 핵심 내용으로 구체적으로 구조화
   - 결론: 본론의 핵심을 정리하고, 교사/전공자로서의 태도나 실천 의지로 자연스럽게 마무리
   - 실전 구술 모범 답변: 위의 서론·본론·결론 내용을 자연스럽게 연결해서 실제 면접에서 바로 말할 수 있는 완성형 구술 스크립트 제공.
     * 실제 면접장에서 바로 말할 수 있는 자연스러운 구어체
     * 화면/대본에는 '서론', '본론', '결론'이라는 구분 표시 없이 자연스러운 말하기 문장으로 제공
     * STAR 구조(Situation, Task, Action, Result)는 일체 사용하지 않음
     * 지나치게 길거나 문어적인 표현은 피하고 실제 말하기 좋은 분량(약 40~60초)으로 구성
     * 처음부터 끝까지 그대로 말할 수 있는 완성형 스크립트로 제공
   - 중요: 별도의 '종합 논술 답변'이나 '논술 완성문'은 일체 작성하지 마세요.`;

    const prompt = `[지원 학과/전공]: ${major.trim()}
[면접 전형 유형]: ${interviewType}
[학교생활기록부 내용]:
${recordContent.trim()}

위 생기부 기록을 바탕으로 실제 대학 교수 면접관의 시선에서 검증하고자 하는 핵심 심층 면접 질문 ${count}개와 상세 분석, 그리고 [서론-본론-결론 답변 구조화] 및 실제 면접장에서 바로 말할 수 있는 완성형 '실전 구술 모범 답변' 스크립트를 작성해 주세요. (종합 논술 답변은 작성하지 마세요.)`;

    const text = await executeGeminiWithFallback((model) => ({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: '질문 고유 ID (예: q-1)' },
              category: {
                type: Type.STRING,
                description: '평가 영역 (예: 전공 적합성, 학업 및 탐구 역량, 융합 발전 가능성, 공동체 및 인성)',
              },
              question: {
                type: Type.STRING,
                description: '실제 면접관이 학생에게 구술로 질문하는 문장 (명확하고 날카로운 말투)',
              },
              intention: {
                type: Type.STRING,
                description: '질문 의도 및 생기부 기록과 연계된 채점 기준',
              },
              studentActivitySource: {
                type: Type.STRING,
                description: '이 질문의 근거가 된 학생의 생기부 속 핵심 활동/키워드 요약',
              },
              essayStructure: {
                type: Type.OBJECT,
                description: '서론-본론-결론 답변 구조화',
                properties: {
                  introduction: {
                    type: Type.OBJECT,
                    description: '서론: 질문에 대한 핵심 입장이나 답변 방향을 짧고 명확하게 제시',
                    properties: {
                      point: { type: Type.STRING, description: '서론 핵심 포인트 요약 (예: 핵심 입장 명시 및 답변 방향 제시)' },
                      content: { type: Type.STRING, description: '서론 구체적 내용' },
                    },
                    required: ['point', 'content'],
                  },
                  body: {
                    type: Type.OBJECT,
                    description: '본론: 핵심 근거, 경험, 실천 방안 등을 2~3개의 핵심 내용으로 구체화',
                    properties: {
                      point: { type: Type.STRING, description: '본론 핵심 포인트 요약 (예: 2~3가지 핵심 근거 및 구체적 경험·실천 방안)' },
                      content: { type: Type.STRING, description: '본론 구체적 내용' },
                    },
                    required: ['point', 'content'],
                  },
                  conclusion: {
                    type: Type.OBJECT,
                    description: '결론: 본론의 핵심 정리 및 교사/전공자로서의 태도와 실천 의지 마무리',
                    properties: {
                      point: { type: Type.STRING, description: '결론 핵심 포인트 요약 (예: 내용 요약 및 향후 발전적 실천 의지)' },
                      content: { type: Type.STRING, description: '결론 구체적 내용' },
                    },
                    required: ['point', 'content'],
                  },
                },
                required: ['introduction', 'body', 'conclusion'],
              },
              sampleAnswerDraft: {
                type: Type.STRING,
                description:
                  '실제 면접장에서 바로 말할 수 있는 완성형 실전 구술 모범 답변 스크립트 (자연스러운 구어체, 두괄식 핵심 답변, 구체적 근거/경험/실천의지 포함, 서론/본론/결론/STAR 표시 없음, 약 40~60초 분량)',
              },
            },
            required: [
              'id',
              'category',
              'question',
              'intention',
              'studentActivitySource',
              'essayStructure',
              'sampleAnswerDraft',
            ],
          },
        },
      },
    }));

    const questions = JSON.parse(text);
    return res.json({ success: true, data: questions });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return res.status(500).json({
      error: formatErrorMessage(error),
    });
  }
});

// Endpoint: AI review and feedback for student's custom answer draft
app.post('/api/review-answer', async (req: Request, res: Response) => {
  try {
    const { question, intention, major, studentDraft } = req.body;

    if (!question || !studentDraft || studentDraft.trim().length < 10) {
      return res.status(400).json({ error: '질문과 학생의 답변 초안을 10자 이상 입력해주세요.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: '서버 환경에 GEMINI_API_KEY가 설정되어 있지 않습니다.',
      });
    }

    const systemInstruction = `당신은 최상위권 명문대 입학사정관 및 학생부종합 심층 면접관입니다.
지원자가 작성한 면접 답변 초안을 꼼꼼하게 첨삭하고, 합격 가능성을 높이는 구체적인 피드백을 제공하세요.
평가 기준:
1. 두괄식 명확성 (첫 문장에서 질문에 대한 핵심 주장/결론이 드러나는가?)
2. 구체적 근거 (단순 나열이 아닌 본인의 주도적 노력과 지적 깊이가 전달되는가?)
3. 전공 적합성 및 진정성 (지원 학과와의 연결이 자연스러운가?)
4. 태도 및 표현력 (면접관에게 신뢰감을 주는 구술 표현인가?)`;

    const prompt = `[지원 전공]: ${major || '미지정'}
[면접 질문]: ${question}
[질문 의도]: ${intention || '전공 역량 및 지적 탐구력 검증'}
[학생의 작성 답변 초안]:
${studentDraft}

위 답변을 다각도로 정밀 진단하여 장점, 보완해야 할 점, 면접관 시점의 날카로운 반론/꼬리질문, 그리고 완성도 높은 추천 모범 수정본(구술형)을 작성해주세요.`;

    const text = await executeGeminiWithFallback((model) => ({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: '100점 만점 기준 예상 평가 점수' },
            ratingLabel: { type: Type.STRING, description: '평가 등급 (예: 우수, 양호, 보완 필요)' },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '답변에서 돋보이는 긍정적인 요소들 2~3가지',
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '면접관 입장에서 아쉽거나 부족한 논리적 취약점 2~3가지',
            },
            expectedFollowUp: {
              type: Type.STRING,
              description: '이 답변을 들었을 때 면접관이 즉석에서 물어볼 만한 후속 질문',
            },
            refinedAnswerScript: {
              type: Type.STRING,
              description: '학생의 원래 경험을 살려 전문적이고 세련되게 다듬은 추천 최종 구술 답변',
            },
          },
          required: [
            'score',
            'ratingLabel',
            'strengths',
            'improvements',
            'expectedFollowUp',
            'refinedAnswerScript',
          ],
        },
      },
    }));

    const review = JSON.parse(text);
    return res.json({ success: true, data: review });
  } catch (error: any) {
    console.error('Error reviewing answer:', error);
    return res.status(500).json({
      error: formatErrorMessage(error),
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
