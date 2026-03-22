export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: string | null;
  message?: string | null;
  meta?: Record<string, any> | null;
}
