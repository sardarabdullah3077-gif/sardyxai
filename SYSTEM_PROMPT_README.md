# System Prompt Configuration

## Overview

Sardyx AI uses a professional, premium system prompt to guide AI responses toward high-quality, well-formatted, consultant-grade outputs.

---

## Files

### `system-prompt.md` (Root Directory)

Human-readable Markdown file containing the complete system prompt. This file can be edited without touching code.

**Use this if:**
- You want to easily edit the system prompt
- You prefer working with Markdown files
- You're in a Node.js or Docker environment

**Editable sections:**
- Response structure templates
- Formatting rules
- Tone and voice guidelines
- Quality checklist
- Special cases handling

### `src/lib/systemPromptConstants.ts`

TypeScript constant file with the system prompt embedded as a string. Used for consistency and serverless compatibility.

**Use this if:**
- You want the prompt in code form
- You're deploying to Vercel or AWS Lambda
- You want to avoid file I/O in serverless functions

### `src/lib/systemPrompt.ts`

System prompt manager that loads and injects context into prompts.

**Functions:**
- `loadSystemPrompt()`: Loads from disk or falls back to constants
- `injectUserContext()`: Merges custom instructions and user memory

---

## How to Update the System Prompt

### Option 1: Edit the Markdown File (Recommended)

```bash
# Edit the system prompt file
nano system-prompt.md
# or use VS Code
code system-prompt.md
```

**Then**, rebuild `systemPromptConstants.ts` by copying the content from `system-prompt.md` between the backticks in the `SARDYX_SYSTEM_PROMPT` constant.

### Option 2: Edit the Constant Directly

```typescript
// src/lib/systemPromptConstants.ts

export const SARDYX_SYSTEM_PROMPT = `
Your changes here...
`;
```

Both changes will be used on the next deployment.

---

## Response Structure Templates

The system prompt includes templates for different question types:

### 1. **General Questions**
Direct answer → Key details → Additional info → Next steps

### 2. **Technical/Coding**
Solution first → Explanation → Best practices → Next steps

### 3. **Complex Topics**
Quick summary → Main answer → Important points → Recommendations → Next steps

### 4. **Biography/About**
Structured format for questions about Sardar Abdullah Fazal

---

## Custom Instructions & User Memory

When a user provides custom instructions or has saved context:

```typescript
const finalPrompt = injectUserContext(
  basePrompt,
  "Use technical terminology",  // Custom instructions
  "User likes Python, hates XML"  // User memory
);
```

This automatically adds:
```
# CUSTOM INSTRUCTIONS

Use technical terminology

# USER CONTEXT

User likes Python, hates XML
```

---

## Deployment Notes

### Local Development
```bash
npm run dev
```
- Loads from `system-prompt.md` if available
- Falls back to `systemPromptConstants.ts`

### Production Build
```bash
npm run build
```
- Uses `systemPromptConstants.ts` for all deployments
- No file I/O required in serverless environments

### Vercel
- Automatically uses `systemPromptConstants.ts`
- No configuration needed
- Optimal cold start performance

---

## Formatting Rules

Key formatting guidelines enforced:

- **Layout**: Proper spacing between sections
- **Headings**: H1 for main topics, H2 for subsections
- **Lists**: Bullet points for unranked, numbered for ranked
- **Code**: Always with language specification
- **Mobile**: Readable on all screen sizes
- **Tone**: Professional, consultant-grade, direct

---

## Quality Checklist

Every response should verify:

✓ Accuracy — Correct information?
✓ Completeness — Question fully answered?
✓ Conciseness — Every sentence necessary?
✓ Clarity — Easy to understand?
✓ Structure — Scannable layout?
✓ Tone — Sounds professional?
✓ Mobile — Works on small screens?

---

## Examples

### Before (Without Premium Prompt)
```
You can build a website using HTML, CSS, and JavaScript. 
HTML is for structure, CSS is for styling, and JavaScript 
is for interactivity. You should learn these basics first 
before moving to frameworks.
```

### After (With Premium Prompt)
```
# Web Development Roadmap

**Start with:** HTML, CSS, and JavaScript fundamentals.

---

## Step-by-Step Path

1. **HTML** — Learn semantic structure and accessibility
2. **CSS** — Master layouts, flexbox, and responsive design
3. **JavaScript** — Understand DOM manipulation and async

---

## Timeline

• Week 1-2: HTML fundamentals
• Week 2-3: CSS and styling
• Week 3-4: JavaScript basics

---

## Next Steps

Build a portfolio project using all three technologies.
Deploy to GitHub Pages for practice.
```

---

## Troubleshooting

### Responses not formatted correctly?
- Clear browser cache
- Redeploy the application
- Verify system prompt loaded correctly

### Custom instructions not working?
- Check if `customInstructions` is being passed
- Verify `injectUserContext()` is called
- Check final prompt content in logs

### Serverless environment issues?
- Ensure `systemPromptConstants.ts` exists
- Don't use file I/O in serverless functions
- Use `SARDYX_SYSTEM_PROMPT` constant directly

---

## Support

For issues or suggestions:
1. Check this documentation
2. Review the system prompt content
3. Test with a simpler question
4. Check server logs for errors

---

**Last Updated:** 2026-06-12

**Maintained By:** Sardyx AI Development Team
