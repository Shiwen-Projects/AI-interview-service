import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewSessionResponseDto } from './dto/interview.dto';

type UploadedFile = Express.Multer.File;

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(InterviewSession)
    private readonly interviewSessionRepository: Repository<InterviewSession>,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  async createInterviewSession(input: {
    cv: UploadedFile;
    post: string;
    jobDescription: string;
  }): Promise<{ sessionId: string }> {
    const sessionId = randomUUID();
    const cvId = await this.supabaseStorageService.uploadCv(input.cv);

    const session = this.interviewSessionRepository.create({
      id: sessionId,
      cvId,
      post: input.post,
      jobDescription: input.jobDescription,
    });
    await this.interviewSessionRepository.save(session);

    return { sessionId: session.id };
  }

  async getInterviewSession(sessionId: string): Promise<InterviewSessionResponseDto> {
    const session = await this.interviewSessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    } else {
      return session;
    }
  }

  // TODO: Implement this
  // async streamQuestions(sessionId: string, response: Response): Promise<void> {
  //   const session = await this.sessionRepository.findOne({
  //     where: { id: sessionId },
  //     relations: {
  //       questions: true,
  //     },
  //   });

  //   if (!session) {
  //     throw new NotFoundException('Session not found');
  //   }

  //   response.setHeader('Content-Type', 'text/event-stream');
  //   response.setHeader('Cache-Control', 'no-cache, no-transform');
  //   response.setHeader('Connection', 'keep-alive');
  //   response.flushHeaders?.();

  //   let closed = false;
  //   const sentQuestionIds = new Set<string>();
  //   const emitter = this.getEmitter(sessionId);

  //   const cleanup = () => {
  //     if (closed) {
  //       return;
  //     }

  //     closed = true;
  //     emitter.off('question', onQuestion);
  //     emitter.off('done', onDone);
  //     emitter.off('error', onError);
  //   };

  //   const end = () => {
  //     cleanup();
  //     response.end();
  //   };

  //   const sendQuestion = (payload: QuestionEventPayload) => {
  //     if (closed || sentQuestionIds.has(payload.questionId)) {
  //       return;
  //     }

  //     sentQuestionIds.add(payload.questionId);
  //     this.writeSseEvent(response, 'question', payload);
  //   };

  //   const onQuestion = (payload: QuestionEventPayload) => sendQuestion(payload);
  //   const onDone = () => {
  //     this.writeSseEvent(response, 'done');
  //     end();
  //   };
  //   const onError = (payload: ErrorEventPayload) => {
  //     this.writeSseEvent(response, 'error', payload);
  //     end();
  //   };

  //   emitter.on('question', onQuestion);
  //   emitter.once('done', onDone);
  //   emitter.once('error', onError);
  //   response.on('close', cleanup);

  //   for (const question of this.sortQuestions(session.questions)) {
  //     sendQuestion(this.toQuestionEvent(question));
  //   }

  //   if (session.status === 'ready') {
  //     onDone();
  //     return;
  //   }

  //   if (session.status === 'error') {
  //     onError({ message: 'Question generation failed' });
  //     return;
  //   }

  //   if (!this.activeGenerations.has(session.id)) {
  //     void this.startQuestionGeneration(session.id);
  //   }
  // }

  // async getSession(sessionId: string) {
  //   const session = await this.sessionRepository.findOne({
  //     where: { id: sessionId },
  //     relations: {
  //       questions: {
  //         answer: true,
  //       },
  //     },
  //   });

  //   if (!session) {
  //     throw new NotFoundException('Session not found');
  //   }

  //   return {
  //     sessionId: session.id,
  //     post: session.post,
  //     status: session.status,
  //     questions: this.sortQuestions(session.questions).map((question) => ({
  //       questionId: question.id,
  //       question: question.question,
  //       category: question.category,
  //       answer: question.answer
  //         ? {
  //             answerId: question.answer.id,
  //             answer: question.answer.answer,
  //             overallScore: question.answer.overallScore,
  //             scoreBreakdown: question.answer.scoreBreakdown,
  //             suggestion: question.answer.suggestion,
  //           }
  //         : null,
  //     })),
  //   };
  // }

  // async submitAnswer(
  //   sessionId: string,
  //   questionId: string,
  //   dto: SubmitAnswerDto,
  // ) {
  //   if (!dto.answer?.trim()) {
  //     throw new BadRequestException('answer is required');
  //   }

  //   const question = await this.questionRepository.findOne({
  //     where: {
  //       id: questionId,
  //       sessionId,
  //     },
  //     relations: {
  //       session: true,
  //       answer: true,
  //     },
  //   });

  //   if (!question) {
  //     throw new NotFoundException('Question not found');
  //   }

  //   const answer =
  //     question.answer ??
  //     this.answerRepository.create({
  //       questionId: question.id,
  //     });

  //   answer.answer = dto.answer.trim();
  //   await this.answerRepository.save(answer);

  //   const evaluation = await this.interviewAiService.evaluateAnswer({
  //     question: question.question,
  //     answer: answer.answer,
  //     post: question.session.post,
  //     jobDescription: question.session.jobDescription,
  //   });

  //   answer.overallScore = evaluation.overallScore;
  //   answer.scoreBreakdown = evaluation.scoreBreakdown;
  //   answer.suggestion = evaluation.suggestion;
  //   const savedAnswer = await this.answerRepository.save(answer);

  //   return {
  //     answerId: savedAnswer.id,
  //     overallScore: savedAnswer.overallScore,
  //     scoreBreakdown: savedAnswer.scoreBreakdown,
  //     suggestion: savedAnswer.suggestion,
  //   };
  // }

  // private async startQuestionGeneration(sessionId: string): Promise<void> {
  //   if (this.activeGenerations.has(sessionId)) {
  //     return;
  //   }

  //   this.activeGenerations.add(sessionId);
  //   const emitter = this.getEmitter(sessionId);

  //   try {
  //     const session = await this.sessionRepository.findOne({
  //       where: { id: sessionId },
  //       relations: {
  //         questions: true,
  //       },
  //     });

  //     if (!session || session.status !== 'generating') {
  //       return;
  //     }

  //     const existingCount = session.questions?.length ?? 0;
  //     const questions = await this.interviewAiService.generateQuestions({
  //       cvText: session.cvText,
  //       post: session.post,
  //       jobDescription: session.jobDescription,
  //     });

  //     for (const [index, generatedQuestion] of questions.entries()) {
  //       const question = await this.questionRepository.save(
  //         this.questionRepository.create({
  //           sessionId,
  //           question: generatedQuestion.question,
  //           category: generatedQuestion.category,
  //           order: existingCount + index + 1,
  //         }),
  //       );

  //       emitter.emit('question', this.toQuestionEvent(question));
  //     }

  //     await this.sessionRepository.update(sessionId, { status: 'ready' });
  //     emitter.emit('done');
  //   } catch (error) {
  //     await this.sessionRepository.update(sessionId, { status: 'error' });
  //     emitter.emit('error', {
  //       message:
  //         error instanceof Error
  //           ? error.message
  //           : 'Question generation failed',
  //     });
  //   } finally {
  //     this.activeGenerations.delete(sessionId);
  //   }
  // }

  // private getEmitter(sessionId: string): EventEmitter {
  //   const existing = this.emitters.get(sessionId);

  //   if (existing) {
  //     return existing;
  //   }

  //   const emitter = new EventEmitter();
  //   this.emitters.set(sessionId, emitter);
  //   return emitter;
  // }

  // private toQuestionEvent(question: InterviewQuestion): QuestionEventPayload {
  //   return {
  //     questionId: question.id,
  //     question: question.question,
  //     category: question.category,
  //   };
  // }

  // private sortQuestions(questions: InterviewQuestion[] = []) {
  //   return [...questions].sort((left, right) => left.order - right.order);
  // }

  // private writeSseEvent(
  //   response: Response,
  //   event: string,
  //   payload?: unknown,
  // ): void {
  //   response.write(`event: ${event}\n`);

  //   if (payload) {
  //     response.write(`data: ${JSON.stringify(payload)}\n`);
  //   }

  //   response.write('\n');
  // }
}
