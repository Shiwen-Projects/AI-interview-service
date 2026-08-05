import { IsNotEmpty, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { INTERVIEW_QUESTION_ANSWER_ERROR_MESSAGES } from "../messages";

export class SaveInterviewAnswerDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({
    message: INTERVIEW_QUESTION_ANSWER_ERROR_MESSAGES.ANSWER_REQUIRED,
  })
  answer!: string;
}
