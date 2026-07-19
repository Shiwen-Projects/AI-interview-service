import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { extractTextFromPdf } from '@/utils/files';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewSessionResponseDto } from './dto/interview.dto';
import {
  getPromptMessage,
  InterviewQuestionStreamEvent,
  InterviewSessionStatus,
} from './constants';
import { Response } from 'express';
import { InterviewQuestion } from './entities/interview-question.entity';
import type { DeepSeekStreamChunk, GeneratedQuestion } from './types';

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(InterviewSession)
    private readonly interviewSessionRepository: Repository<InterviewSession>,
    @InjectRepository(InterviewQuestion)
    private readonly interviewQuestionRepository: Repository<InterviewQuestion>,

    private readonly supabaseStorageService: SupabaseStorageService,
    private readonly configService: ConfigService,
  ) {}

  async createInterviewSession(input: {
    cv: Express.Multer.File;
    post: string;
    jobDescription: string;
  }): Promise<{ sessionId: string }> {
    const sessionId = randomUUID();
    const cvId = await this.supabaseStorageService.uploadCv(input.cv);

    const session = this.interviewSessionRepository.create({
      id: sessionId,
      cvId,
      status: InterviewSessionStatus.Created,
      post: input.post,
      jobDescription: input.jobDescription,
    });
    await this.interviewSessionRepository.save(session);

    return { sessionId: session.id };
  }

  async getInterviewSession(
    sessionId: string,
  ): Promise<InterviewSessionResponseDto> {
    const session: InterviewSession | null = await this.interviewSessionRepository.findOne({
      where: { id: sessionId },
      select: {
        id: true,
        jobDescription: true,
        post: true,
        cvId: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const questions: InterviewQuestion[] = await this.interviewQuestionRepository.find({
      where: { sessionId: session.id },
      select: {
        id: true,
        question: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return {
      id: session.id,
      jobDescription: session.jobDescription,
      post: session.post,
      cvId: session.cvId,
      questions: questions.map((question) => ({
        id: question.id,
        question: question.question,
      })),
    };
  }

  /*
    This method creates a stream of interview questions for a given session.
  */
  async createInterviewStreamQuestions(
    sessionId: string,
    response: Response,
  ): Promise<void> {
    const session = await this.interviewSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Set headers to tell the browser to keep the HTTP connection open for SSE.
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders?.();

    // Flag to track if the browser closed the SSE connection.
    let closed = false;
    // Controller to abort the DeepSeek request if the browser closes the SSE connection.
    const abortController = new AbortController();
    // Event listener to set the closed flag and abort the DeepSeek request if the browser closes the SSE connection.
    response.on('close', () => {
      closed = true;
      abortController.abort();
    });

    try {
      this.writeSseEvent(response, InterviewQuestionStreamEvent.Preparing, {
        message: 'Reading CV, position and job description...',
      });

      const cvFile = await this.supabaseStorageService.getCvFile(session.cvId);
      const cvText = await extractTextFromPdf(cvFile);
      const prompt = getPromptMessage(
        cvText,
        session.post,
        session.jobDescription,
      );

      const emittedQuestions: Array<
        GeneratedQuestion & { questionId: string }
      > = [];

      this.writeSseEvent(response, InterviewQuestionStreamEvent.Generating, {
        message: 'Generating interview questions...',
      });

      // Update the session status to generating.
      await this.interviewSessionRepository.update(sessionId, {
        status: InterviewSessionStatus.Generating,
      });

      // DeepSeek streams raw JSON tokens; this callback runs each time one full
      // question object can be parsed from the partial JSON buffer.
      await this.streamDeepSeekQuestions(
        prompt,
        abortController.signal,
        async (generatedQuestion) => {
          // If the browser closed the SSE connection, stop generating questions.
          if (closed) {
            return;
          }

          // Save the question to the database.
          const question = await this.interviewQuestionRepository.save(
            this.interviewQuestionRepository.create({
              id: randomUUID(),
              sessionId,
              question: generatedQuestion.question,
            }),
          );

          // Prepare the payload to be sent to the client.
          const payload = {
            questionId: question.id,
            question: question.question,
          };

          emittedQuestions.push(payload);

          // Send the question to the client every time a new question is generated.
          this.writeSseEvent(
            response,
            InterviewQuestionStreamEvent.Question,
            payload,
          );
        },
      );

      // If the browser closed the SSE connection, stop sending questions.
      if (closed) {
        return;
      }

      await this.interviewSessionRepository.update(sessionId, {
        status: InterviewSessionStatus.Ready,
      });
      this.writeSseEvent(response, InterviewQuestionStreamEvent.Done, {
        count: emittedQuestions.length,
      });
      response.end();
    } catch (error) {
      if (closed) {
        return;
      }

      await this.interviewSessionRepository.update(sessionId, {
        status: InterviewSessionStatus.Error,
      });
      this.writeSseEvent(response, InterviewQuestionStreamEvent.Error, {
        message:
          error instanceof Error ? error.message : 'Question generation failed',
      });
      response.end();
    }
  }

  private async streamDeepSeekQuestions(
    prompt: string,
    signal: AbortSignal,
    onQuestion: (question: GeneratedQuestion) => Promise<void>,
  ): Promise<void> {
    const apiKey = this.deepSeekApiKey;
    const baseUrl = this.deepSeekBaseUrl;
    const model = this.deepSeekModel;

    const apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You generate interview questions and return only valid json.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        stream: true,
        response_format: { type: 'json_object' },
      }),
    });

    if (!apiResponse.ok) {
      throw new BadGatewayException(
        `DeepSeek request failed with status ${apiResponse.status}`,
      );
    }

    if (!apiResponse.body) {
      throw new BadGatewayException('DeepSeek response did not include a body');
    }

    const reader = apiResponse.body.getReader();
    // Decode the response body as text.
    const decoder = new TextDecoder();
    // Track DeepSeek's event frames.
    let sseBuffer = '';
    // Track the model's streamed JSON text inside those frames.
    let contentBuffer = '';
    // Track the number of questions emitted.
    let emittedQuestionCount = 0;
    // Read the response body chunk by chunk.
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      sseBuffer += decoder.decode(value, { stream: true });
      // DeepSeek sends SSE frames separated by a blank line. The final split
      // item may be incomplete, so keep it for the next chunk.
      const events = sseBuffer.split('\n\n');
      sseBuffer = events.pop() ?? '';

      for (const event of events) {
        const data = this.getSseData(event);

        if (!data || data === '[DONE]') {
          continue;
        }

        const chunk = JSON.parse(data) as DeepSeekStreamChunk;
        const delta = chunk.choices?.[0]?.delta?.content;

        if (!delta) {
          continue;
        }

        contentBuffer += delta;

        // JSON mode still arrives token-by-token, so parse only completed
        // question objects instead of waiting for the full response.
        const questions = this.extractQuestionsFromJsonStream(contentBuffer);

        while (emittedQuestionCount < questions.length) {
          await onQuestion(questions[emittedQuestionCount]);
          emittedQuestionCount += 1;
        }
      }
    }

    // Do it again for the last time to ensure we get all the questions
    const questions = this.extractQuestionsFromJsonStream(contentBuffer);
    while (emittedQuestionCount < questions.length) {
      await onQuestion(questions[emittedQuestionCount]);
      emittedQuestionCount += 1;
    }

    if (emittedQuestionCount === 0) {
      throw new BadGatewayException('DeepSeek did not return any questions');
    }
  }

  /*
    Parse the sse data (e.g. data: {"choices":[{"delta":{"content":"{\"question\":\"What is your name?\"}"}}]}) 
    into a string (e.g. {"question":"What is your name?"}).
  */
  private getSseData(event: string): string {
    return event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, ''))
      .join('\n')
      .trim();
  }

  /*
  @description: This method extracts questions from a JSON stream.
    @param content: The JSON stream to extract questions from.
    @example:
    ```json
    {
      "questions": [
        { "question": "What is your name?" }
      ]
    }
    ```
    @returns An array of generated questions.
  */
  private extractQuestionsFromJsonStream(content: string): GeneratedQuestion[] {
    // The full JSON object may not be complete yet, but individual objects in
    // "questions" can already be complete enough to parse and stream onward.
    const questionsKeyIndex = content.indexOf('"questions"');

    if (questionsKeyIndex === -1) {
      return [];
    }

    const arrayStartIndex = content.indexOf('[', questionsKeyIndex);

    if (arrayStartIndex === -1) {
      return [];
    }

    const questions: GeneratedQuestion[] = [];
    let objectStartIndex = -1;
    // Track the depth of the JSON object: meet { depth += 1, meet } depth -= 1
    let depth = 0;
    // Track if the current character is inside a string: meet " isInString = true, meet " again isInString = false
    let isInString = false;
    // Track if the current character is escaped: meet \ isEscaped = true, meet \ again isEscaped = false
    let isEscaped = false;

    // Walk the partial JSON manually so braces inside markdown/text do not
    // accidentally look like object boundaries.
    for (let index = arrayStartIndex + 1; index < content.length; index += 1) {
      const char = content[index];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        isInString = !isInString;
        continue;
      }

      if (isInString) {
        continue;
      }

      if (char === '{') {
        if (depth === 0) {
          objectStartIndex = index;
        }

        depth += 1;
        continue;
      }

      if (char === '}') {
        depth -= 1;

        // when a question object is complete, parse it and add it to the questions array
        if (depth === 0 && objectStartIndex !== -1) {
          const question = this.parseGeneratedQuestion(
            content.slice(objectStartIndex, index + 1), // e.g. { "question": "What is your name?", "category": ["React", "TypeScript", "JavaScript"] }
          );

          if (question) {
            questions.push(question);
          }

          objectStartIndex = -1;
        }
      }
    }

    return questions;
  }

  private parseGeneratedQuestion(rawJson: string): GeneratedQuestion | null {
    try {
      const value = JSON.parse(rawJson) as Record<string, unknown>;
      const question = String(value.question ?? '').trim();

      if (!question) {
        return null;
      }

      return {
        question,
      };
    } catch {
      return null;
    }
  }

  private writeSseEvent(
    response: Response,
    event: InterviewQuestionStreamEvent,
    payload?: unknown,
  ): void {
    // SSE format requires "event" and "data" lines followed by a blank line.
    response.write(`event: ${event}\n`);

    if (payload) {
      response.write(`data: ${JSON.stringify(payload)}\n`);
    }

    response.write('\n');
  }

  private get deepSeekApiKey(): string {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'DeepSeek API key is not configured',
      );
    }

    return apiKey;
  }

  private get deepSeekBaseUrl(): string {
    const baseUrl = this.configService.get<string>('DEEPSEEK_BASE_URL');
    if (!baseUrl) {
      throw new InternalServerErrorException(
        'DeepSeek base URL is not configured',
      );
    }

    return baseUrl;
  }

  private get deepSeekModel(): string {
    const model = this.configService.get<string>('DEEPSEEK_MODEL');
    if (!model) {
      throw new InternalServerErrorException(
        'DeepSeek model is not configured',
      );
    }

    return model;
  }
}
