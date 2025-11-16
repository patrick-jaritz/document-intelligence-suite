/**
 * Utility functions for parsing prompts and extracting placeholders
 */

import { FormField } from '../types/promptforge';

/**
 * Extract placeholders from prompt text
 * Supports {{placeholder}} and {{placeholder:type}} syntax
 */
export function extractPlaceholders(promptText: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const matches = promptText.matchAll(placeholderRegex);
  const placeholders = new Set<string>();

  for (const match of matches) {
    const placeholder = match[1].trim();
    // Extract name (before colon if type specified)
    const name = placeholder.split(':')[0].trim();
    placeholders.add(name);
  }

  return Array.from(placeholders);
}

/**
 * Parse placeholder to extract type and options
 * Supports: {{name}}, {{name:text}}, {{name:select:option1,option2}}
 */
export function parsePlaceholder(placeholder: string): {
  name: string;
  type: FormField['type'];
  options?: string[];
} {
  const parts = placeholder.split(':').map((p) => p.trim());
  const name = parts[0];

  if (parts.length === 1) {
    return { name, type: 'text' };
  }

  const typeStr = parts[1].toLowerCase();

  // Check for select type with options
  if (typeStr === 'select' && parts[2]) {
    const options = parts[2].split(',').map((o) => o.trim());
    return { name, type: 'select', options };
  }

  // Map type strings to FormField types
  const typeMap: Record<string, FormField['type']> = {
    text: 'text',
    textarea: 'textarea',
    number: 'number',
    email: 'email',
    url: 'url',
    select: 'select',
    checkbox: 'checkbox',
  };

  return {
    name,
    type: typeMap[typeStr] || 'text',
  };
}

/**
 * Generate form fields from prompt text
 */
export function generateFormFields(promptText: string): FormField[] {
  const placeholders = extractPlaceholders(promptText);
  const fields: FormField[] = [];

  placeholders.forEach((placeholder) => {
    const parsed = parsePlaceholder(placeholder);
    
    // Generate label from name (capitalize, add spaces)
    const label = parsed.name
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const field: FormField = {
      name: parsed.name,
      label,
      type: parsed.type,
      required: true, // Default to required
      placeholder: `Enter ${label.toLowerCase()}...`,
      options: parsed.options,
    };

    // Set defaults based on type
    if (parsed.type === 'textarea') {
      field.placeholder = `Enter ${label.toLowerCase()} (multiple lines)...`;
    } else if (parsed.type === 'number') {
      field.placeholder = `Enter a number...`;
    } else if (parsed.type === 'email') {
      field.placeholder = `example@email.com`;
    } else if (parsed.type === 'url') {
      field.placeholder = `https://example.com`;
    } else if (parsed.type === 'select' && parsed.options) {
      field.options = parsed.options;
    }

    fields.push(field);
  });

  return fields;
}

/**
 * Replace placeholders in prompt text with values
 */
export function replacePlaceholders(
  promptText: string,
  values: Record<string, any>
): string {
  let result = promptText;

  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  });

  return result;
}

/**
 * Validate form values against fields
 */
export function validateFormValues(
  fields: FormField[],
  values: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    const value = values[field.name];

    // Check required
    if (field.required && (!value || value.toString().trim() === '')) {
      errors[field.name] = `${field.label} is required`;
      return;
    }

    // Type validation
    if (value) {
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.name] = 'Invalid email address';
      } else if (field.type === 'url' && !/^https?:\/\/.+/.test(value)) {
        errors[field.name] = 'Invalid URL (must start with http:// or https://)';
      } else if (field.type === 'number' && isNaN(Number(value))) {
        errors[field.name] = 'Must be a valid number';
      }
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
