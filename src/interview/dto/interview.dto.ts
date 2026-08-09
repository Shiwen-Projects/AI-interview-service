import { Expose, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
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

export class GetPaginatedInterviewSessionsDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? 1 : Number(value),
  )
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? 10 : Number(value),
  )
  @IsInt()
  @Min(1)
  limit: number = 10;
}

export class BatchDeleteInterviewSessionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  sessionIds!: string[];
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

export class PaginatedInterviewSessionResponseDto {
  @Expose()
  items!: {
    id: string;
    post: string;
    jobDescription: string;
  }[];
  @Expose()
  page!: number;
  @Expose()
  limit!: number;
  @Expose()
  total!: number;
  @Expose()
  totalPages!: number;
}