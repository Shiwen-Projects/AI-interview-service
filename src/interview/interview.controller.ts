import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
  BatchDeleteInterviewSessionsDto,
  GetPaginatedInterviewSessionsDto,
  InterviewSessionResponseDto,
  PaginatedInterviewSessionResponseDto,
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

  @Get()
  async getPaginatedInterviewSessions(
    @Query() query: GetPaginatedInterviewSessionsDto,
  ): Promise<PaginatedInterviewSessionResponseDto> {
    return await this.interviewService.getPaginatedInterviewSessions(query);
  }

  @Delete()
  async batchDeleteInterviewSessions(
    @Body() dto: BatchDeleteInterviewSessionsDto,
  ): Promise<void> {
    return await this.interviewService.batchDeleteInterviewSessions(
      dto.sessionIds,
    );
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

  @Delete(':sessionId')
  async deleteInterviewSession(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ): Promise<void> {
    return await this.interviewService.deleteInterviewSession(sessionId);
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
