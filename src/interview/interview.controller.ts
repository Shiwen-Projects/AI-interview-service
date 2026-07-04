import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CVFileValidationPipe } from './pipes';
import { InterviewService } from './interview.service';
import { CreateInterviewSessionDto, InterviewSessionResponseDto } from './dto';

type UploadedFileType = Express.Multer.File;

@Controller('sessions')
export class InterviewController {
  // Inject the InterviewService to handle the business logic
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @UseInterceptors(FileInterceptor('cv'))
  createInterviewSession(
    @UploadedFile(CVFileValidationPipe) cv: UploadedFileType,
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

  // TODO: Implement this
  // @Get(':sessionId/questions/stream')
  // streamQuestions(
  //   @Param('sessionId') sessionId: string,
  //   @Res() response: Response,
  // ) {
  //   return this.interviewService.streamQuestions(sessionId, response);
  // }

  // @Get(':sessionId')
  // getSession(@Param('sessionId') sessionId: string) {
  //   return this.interviewService.getSession(sessionId);
  // }

  // @Post(':sessionId/questions/:questionId/answers')
  // submitAnswer(
  //   @Param('sessionId') sessionId: string,
  //   @Param('questionId') questionId: string,
  //   @Body() dto: SubmitAnswerDto,
  // ) {
  //   return this.interviewService.submitAnswer(sessionId, questionId, dto);
  // }
}
