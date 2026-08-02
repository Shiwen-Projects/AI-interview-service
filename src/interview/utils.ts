import type { GeneratedQuestion } from './types';

/**
 * Extracts complete question objects from a potentially incomplete JSON stream.
 */
export function extractQuestionsFromJsonStream(
  content: string,
): GeneratedQuestion[] {
  // The full JSON object may not be complete yet, but individual objects in
  // "questions" can already be complete enough to parse and stream onward.
  const questionsKeyIndex = content.indexOf('"questions"');

  if (questionsKeyIndex === -1) {
    return [];
  }

  const arrayStartIndex = content.indexOf('[', questionsKeyIndex);

  if (arrayStartIndex === -1) {
    return [];
  }

  const questions: GeneratedQuestion[] = [];
  let objectStartIndex = -1;
  let depth = 0;
  let isInString = false;
  let isEscaped = false;

  // Walk the partial JSON manually so braces inside markdown/text do not
  // accidentally look like object boundaries.
  for (let index = arrayStartIndex + 1; index < content.length; index += 1) {
    const char = content[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      isInString = !isInString;
      continue;
    }

    if (isInString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        objectStartIndex = index;
      }

      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;

      if (depth === 0 && objectStartIndex !== -1) {
        const question = parseGeneratedQuestion(
          content.slice(objectStartIndex, index + 1),
        );

        if (question) {
          questions.push(question);
        }

        objectStartIndex = -1;
      }
    }
  }

  return questions;
}

export function parseGeneratedQuestion(
  rawJson: string,
): GeneratedQuestion | null {
  try {
    const value = JSON.parse(rawJson) as Record<string, unknown>;
    const question =
      typeof value.question === 'string' ? value.question.trim() : '';

    if (!question) {
      return null;
    }

    return { question };
  } catch {
    return null;
  }
}
