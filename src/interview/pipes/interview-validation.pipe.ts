import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { CREATE_INTERVIEW_SESSION_ERROR_MESSAGES } from '../constants';

export const CVFileValidationPipe = new ParseFilePipe({
  validators: [
    new FileTypeValidator({
      fileType: 'application/pdf',
      errorMessage: CREATE_INTERVIEW_SESSION_ERROR_MESSAGES.MUST_BE_PDF,
    }),
    new MaxFileSizeValidator({
      maxSize: 5 * 1024 * 1024,
      message: CREATE_INTERVIEW_SESSION_ERROR_MESSAGES.CV_TOO_LARGE,
    }),
  ],
});
