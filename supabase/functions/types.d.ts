// Ambient module declarations for Deno npm specifiers in Supabase Edge Functions

declare module 'npm:@supabase/server@^1' {
  export const withSupabase: any;
}

declare module 'npm:*' {
  const value: any;
  export default value;
  export const withSupabase: any;
}
