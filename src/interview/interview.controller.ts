import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response as ExpressResponse } from 'express';
import { CVFileValidationPipe } from './pipes';
import { InterviewService } from './interview.service';
import {
  CreateInterviewSessionDto,
  InterviewSessionResponseDto,
  SaveInterviewAnswerDto,
} from './dto';
import { InterviewAnswerEvaluation } from './types';

@Controller('sessions')
export class InterviewController {
  // Inject the InterviewService to handle the business logic
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @UseInterceptors(FileInterceptor('cv'))
  createInterviewSession(
    @UploadedFile(CVFileValidationPipe) cv: Express.Multer.File,
    @Body() dto: CreateInterviewSessionDto,
  ): Promise<{ sessionId: string }> {
    return this.interviewService.createInterviewSession({ cv, ...dto });
  }

  @Get(':sessionId')
  async getInterviewSession(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ): Promise<InterviewSessionResponseDto> {
    return await this.interviewService.getInterviewSession(sessionId);
  }

  @Get(':sessionId/questions/stream')
  async createInterviewStreamQuestions(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Res() response: ExpressResponse,
  ): Promise<void> {
    return await this.interviewService.createInterviewStreamQuestions(
      sessionId,
      response,
    );
  }

  @Post(':sessionId/questions/:questionId/answer')
  async saveInterviewAnswer(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() dto: SaveInterviewAnswerDto,
  ): Promise<void> {
    return await this.interviewService.saveInterviewAnswer(
      sessionId,
      questionId,
      dto,
    );
  }

  @Post(':sessionId/questions/:questionId/evaluate')
  async evaluateInterviewAnswer(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() dto: SaveInterviewAnswerDto,
  ): Promise<InterviewAnswerEvaluation> {
    return await this.interviewService.evaluateInterviewAnswer(
      sessionId,
      questionId,
      dto,
    );
  }
}
