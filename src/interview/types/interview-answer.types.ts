export type InterviewAnswer = {
  answer: string;
  score: number;
  feedback: string;
};

export type InterviewAnswerEvaluation = Omit<InterviewAnswer, 'answer'>;