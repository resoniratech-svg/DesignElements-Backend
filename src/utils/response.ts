export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

export const errorResponse = (message: string): ApiResponse<null> => ({
  success: false,
  data: null,
  message,
});

// Backward compatibility for existing modules
export const success = (res: any, message: string, data: any = {}) => {
  return res.status(200).json({
    success: true,
    message,
    data
  });
};

export const error = (res: any, message: string, status: number = 500) => {
  return res.status(status).json({
    success: false,
    message,
    data: {}
  });
};