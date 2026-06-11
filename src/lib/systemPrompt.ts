/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SARDYX AI — System Prompt Manager
 * Loads and manages the premium response formatting system prompt
 */

import fs from 'fs';
import path from 'path';
import { SARDYX_SYSTEM_PROMPT, injectUserContext as injectContext } from './systemPromptConstants';

/**
 * Load the system prompt from disk (with fallback to constants)
 */
export function loadSystemPrompt(): string {
  try {
    const promptPath = path.resolve(process.cwd(), 'system-prompt.md');
    if (fs.existsSync(promptPath)) {
      const fileContent = fs.readFileSync(promptPath, 'utf-8');
      return fileContent || SARDYX_SYSTEM_PROMPT;
    }
  } catch (err) {
    console.error('[PROMPT] Failed to load system prompt:', err);
  }
  return SARDYX_SYSTEM_PROMPT;
}

/**
 * Inject user context into system prompt
 */
export function injectUserContext(
  systemPrompt: string,
  customInstructions?: string,
  userMemory?: string
): string {
  let prompt = systemPrompt;

  if (customInstructions) {
    prompt += `\n\n# CUSTOM INSTRUCTIONS\n\n${customInstructions}`;
  }

  if (userMemory) {
    prompt += `\n\n# USER CONTEXT\n\n${userMemory}`;
  }

  return prompt.trim();
}

export default {
  loadSystemPrompt,
  injectUserContext,
};
