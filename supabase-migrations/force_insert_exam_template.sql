-- Force insert/update the Exam Questions template
-- This script will replace the existing template if it exists

-- Delete existing Exam Questions template
DELETE FROM structure_templates WHERE name = 'Exam Questions';

-- Insert the updated Exam Questions template
INSERT INTO structure_templates (name, description, template_schema, is_public)
VALUES (
  'Exam Questions',
  'Extract exam questions with MCQ options, answers, solutions, difficulty levels, and tags',
  '{
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "stem": {
          "type": "string",
          "description": "The question text or prompt"
        },
        "options": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Multiple choice options (A, B, C, D) - omit for short answer questions"
        },
        "correctAnswer": {
          "type": "string",
          "description": "The correct answer (letter for MCQ, full answer for short response)"
        },
        "solution": {
          "type": "string",
          "description": "Detailed explanation of the correct answer"
        },
        "difficulty": {
          "type": "number",
          "description": "Difficulty level from 1 (easy) to 5 (very hard)"
        },
        "format": {
          "type": "string",
          "enum": ["mcq", "short", "essay", "true-false"],
          "description": "Question format type"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Topic tags and keywords for categorization"
        }
      },
      "required": ["stem", "correctAnswer", "format"]
    }
  }'::jsonb,
  true
);

-- Verify the insertion
SELECT id, name, description, is_public 
FROM structure_templates 
WHERE name = 'Exam Questions';

