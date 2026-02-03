declare module "@babel/core" {
  export type TransformOptions = unknown;
  export const transformAsync: (code: string, options?: TransformOptions) => Promise<{ code?: string }>;
}
