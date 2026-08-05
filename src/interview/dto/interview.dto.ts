import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { CREATE_INTERVIEW_SESSION_ERROR_MESSAGES } from '../messages';
import type { FileType, InterviewAnswer } from '../types';

export class CreateInterviewSessionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({
    message: CREATE_INTERVIEW_SESSION_ERROR_MESSAGES.POST_REQUIRED,
  })
  post!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({
    message: CREATE_INTERVIEW_SESSION_ERROR_MESSAGES.JOB_DESCRIPTION_REQUIRED,
  })
  jobDescription!: string;
}

export class QuestionDto {
  @Expose()
  id!: string;
  @Expose()
  question!: string;
  @Expose()
  answer?: InterviewAnswer | null;
}

export class InterviewSessionResponseDto {
  @Expose()
  id!: string;
  @Expose()
  post!: string;
  @Expose()
  jobDescription!: string;
  @Expose()
  cv!: FileType;
  @Expose()
  questions!: QuestionDto[];
}