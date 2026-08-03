import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { InterviewAnswer } from './entities/interview-answer.entity';
import { InterviewQuestion } from './entities/interview-question.entity';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { SupabaseStorageModule } from '../supabase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewSession,
      InterviewQuestion,
    ]),
    SupabaseStorageModule,
  ],
  controllers: [InterviewController],
  providers: [InterviewService],
})
export class InterviewModule {}
