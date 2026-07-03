import { BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

export const normalizeExtractedTextForPrompt = (text: string): string => {
  return text
    // Normalize line endings so later newline rules behave consistently.
    .replace(/\r/g, '\n')
    // PDF extraction often turns visual spacing into tabs or non-breaking spaces.
    .replace(/\t+/g, ' ')
    .replace(/[ \u00A0]+/g, ' ')
    // Remove common PDF page footers such as "-- 1 of 1 --".
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    // Keep paragraph breaks, but collapse excessive blank lines.
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    // Drop tiny isolated artifacts like page numbers or extraction leftovers.
    .filter((line) => line.length > 1)
    .join('\n')
    .trim();
};

export const extractTextFromPdf = async (
  file: Express.Multer.File,
): Promise<string> => {
  if (!file) {
    throw new BadRequestException('File is required');
  }

  if (file.mimetype !== 'application/pdf') {
    throw new BadRequestException('File must be a PDF');
  }

  const parser = new PDFParse({ data: file.buffer });

  try {
    const parsed = await parser.getText();
    const text = normalizeExtractedTextForPrompt(parsed.text);

    if (!text) {
      throw new BadRequestException('Could not extract text from PDF');
    }

    return text;
  } finally {
    await parser.destroy();
  }
};
