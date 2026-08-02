export const getPromptMessage = (
  cvText: string,
  post: string,
  jobDescription: string,
): string => {
  return `
You are a professional interview question generator.

Generate exactly 10 tailored interview questions for the target role.

Return only valid json. Do not include markdown code fences, explanations, numbering outside the json object, or any text outside the json object.

The json must match this exact shape:
{
  "questions": [
    {
      "question": "A clear, specific interview question.",
      "category": ["React", "TypeScript", "JavaScript"]
    }
  ]
}

Rules:
- The top-level value must be a json object with one key: "questions".
- "questions" must contain exactly 10 objects.
- Each "question" must be specific and tailored to the resume and job description.
- The "question" value may contain markdown bullet points when that makes the question clearer.
- Do not ask duplicate questions.
- Do not include answers or evaluation criteria.
- "category" must be one of: "technical", "behavioral", "system_design".

Target role:
${post}

Job description:
${jobDescription}

Candidate resume:
${cvText}

Example json output:
{
  "questions": [
    {
      "question": "You are proficient with React and TypeScript. In our medical school teaching management system, there is a course resource center page that displays hundreds of videos from Panopto, documents, and quiz links, and users need to filter and search them quickly.\n\n- What React performance optimization techniques would you use to keep the page responsive?\n\n- If multiple developers were working on this project at the same time, how would you organize and split components and state management, such as using Context, Redux, or another approach?",
      "category": ["React", "TypeScript", "JavaScript", "System Design"]
    }
  ]
}
  `;
};
