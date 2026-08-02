import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { InterviewAnswer } from './entities/interview-answer.entity';
import { InterviewQuestion } from './entities/interview-question.entity';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { SupabaseStorageService } from '../supabase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewSession,
      InterviewQuestion,
    ]),
  ],
  controllers: [InterviewController],
  providers: [InterviewService, SupabaseStorageService],
})
export class InterviewModule {}
