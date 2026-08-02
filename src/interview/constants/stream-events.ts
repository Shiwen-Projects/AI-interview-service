export enum InterviewQuestionStreamEvent {
  Preparing = 'preparing',
  Generating = 'generating',  // tell FE still generating questions and it is NOT DONE
  Question = 'question',  // return a single question
  Done = 'done',
  Error = 'error',
}
