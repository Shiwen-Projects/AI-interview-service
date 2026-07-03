import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { CREATE_INTERVIEW_SESSION_ERROR_MESSAGES } from '../constants';

export class CreateInterviewSessionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({
    message: CREATE_INTERVIEW_SESSION_ERROR_MESSAGES.POST_REQUIRED,
  })
  post: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({
    message: CREATE_INTERVIEW_SESSION_ERROR_MESSAGES.JOB_DESCRIPTION_REQUIRED,
  })
  jobDescription: string;
}
