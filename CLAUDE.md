### Rules for writing TypeScript Code

- Don't cast types. For example: `something as Something`. Especially `as any` and `as unknown`. Instead, create a new variable with the correct type.
- On writing function, prefer arrow functions. For example: `const myFunction = () => {}` instead of `function myFunction() {}`.
- For checking array length, prefer `array.length` instead of `array.length !== 0` or `array.length > 0`.
- Use `date-fns` for anything related to date. Including date formatting, and checking if a date is in the past or future.
- Use `randomUUID` of `node:crypto` for random text generation (instead of uuid v4)
- Always add `satisfies ExpectedType` when using zod's `safeParse` so can detect wrong response

### Rules for Comments & Documentations

- don't add comments in code at all, I'll ask you to add comments if I need it
- for docs, always answer in markdown format
- don't use any emojis, and don't use any markdown styling (bold, italic, etc)
- keep it brief, short, but cover the details needed
