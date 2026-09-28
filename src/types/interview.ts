export interface EssayStructure {
  introduction: {
    point?: string;
    content: string;
  };
  body: {
    point?: string;
    content: string;
  };
  conclusion: {
    point?: string;
    content: string;
  };
}

export interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  intention: string;
  studentActivitySource: string;
  followUpQuestions?: string[];
  essayStructure?: EssayStructure;
  sampleAnswerDraft: string;
}

export interface AnswerReview {
  score: number;
  ratingLabel: string;
  strengths: string[];
  improvements: string[];
  expectedFollowUp: string;
  refinedAnswerScript: string;
}
