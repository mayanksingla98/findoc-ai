import { z } from 'zod';

declare module 'zod' {
  interface ZodType {
    needs(envVar: string, expected: string): this;
  }
}

z.ZodType.prototype.needs = function (envVar, expected) {
  return this.superRefine((v: unknown, ctx) => {
    if (process.env[envVar] === expected && !v) {
      const key = ctx.path[ctx.path.length - 1] ?? 'value';
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${String(key)} is required when ${envVar}=${expected}`,
      });
    }
  }) as never;
};
