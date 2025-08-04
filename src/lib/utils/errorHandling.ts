import { ToastType } from '@/components/admin/Common/Toast';

// Tipos de erro da aplicação
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  AUTH = 'auth',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// Interface para erros da aplicação
export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  field?: string;
  code?: string;
  statusCode?: number;
}

// Interface para resposta de erro da API
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  errors?: Record<string, string[]>;
  details?: string;
}

// Interface para resposta de sucesso da API
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Classe personalizada para erros da aplicação
export class ApplicationError extends Error {
  public readonly type: ErrorType;
  public readonly details?: string;
  public readonly field?: string;
  public readonly code?: string;
  public readonly statusCode?: number;

  constructor(error: AppError) {
    super(error.message);
    this.name = 'ApplicationError';
    this.type = error.type;
    this.details = error.details;
    this.field = error.field;
    this.code = error.code;
    this.statusCode = error.statusCode;
  }
}

// Função para identificar o tipo de erro
export function identifyErrorType(error: any): ErrorType {
  // Erro de rede (fetch failed, connection refused, etc.)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorType.NETWORK;
  }

  // Erro de timeout
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return ErrorType.TIMEOUT;
  }

  // Erro HTTP baseado no status code
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    
    if (status === 400) return ErrorType.VALIDATION;
    if (status === 401 || status === 403) return ErrorType.AUTH;
    if (status === 404) return ErrorType.NOT_FOUND;
    if (status === 422) return ErrorType.VALIDATION;
    if (status >= 500) return ErrorType.SERVER;
  }

  // Erro de validação (baseado na mensagem)
  if (error.message && (
    error.message.includes('validation') ||
    error.message.includes('invalid') ||
    error.message.includes('required')
  )) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
}

// Função para extrair mensagem de erro amigável
export function extractErrorMessage(error: any): string {
  // Se é uma instância de ApplicationError
  if (error instanceof ApplicationError) {
    return error.message;
  }

  // Se é uma resposta de API estruturada
  if (error.response?.data) {
    const data = error.response.data;
    if (data.message) return data.message;
    if (data.error) return data.error;
  }

  // Se tem uma propriedade message
  if (error.message) {
    return error.message;
  }

  // Se é uma string
  if (typeof error === 'string') {
    return error;
  }

  return 'Ocorreu um erro inesperado';
}

// Função para processar erros de API
export function processApiError(error: any): AppError {
  const type = identifyErrorType(error);
  const message = extractErrorMessage(error);
  
  return {
    type,
    message,
    details: error.details || error.response?.data?.details,
    code: error.code || error.response?.data?.code,
    statusCode: error.status || error.statusCode || error.response?.status
  };
}

// Função para converter erro em toast
export function errorToToast(error: any): { type: ToastType; title: string; message?: string } {
  const appError = processApiError(error);
  
  const typeToToastType: Record<ErrorType, ToastType> = {
    [ErrorType.VALIDATION]: 'warning',
    [ErrorType.NETWORK]: 'error',
    [ErrorType.SERVER]: 'error',
    [ErrorType.AUTH]: 'error',
    [ErrorType.NOT_FOUND]: 'warning',
    [ErrorType.PERMISSION]: 'error',
    [ErrorType.TIMEOUT]: 'warning',
    [ErrorType.UNKNOWN]: 'error'
  };

  const titles: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: 'Dados inválidos',
    [ErrorType.NETWORK]: 'Erro de conexão',
    [ErrorType.SERVER]: 'Erro do servidor',
    [ErrorType.AUTH]: 'Erro de autenticação',
    [ErrorType.NOT_FOUND]: 'Não encontrado',
    [ErrorType.PERMISSION]: 'Sem permissão',
    [ErrorType.TIMEOUT]: 'Tempo esgotado',
    [ErrorType.UNKNOWN]: 'Erro inesperado'
  };

  return {
    type: typeToToastType[appError.type],
    title: titles[appError.type],
    message: appError.message
  };
}

// Função para retry automático
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    retryCondition?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    retryCondition = (error) => {
      const errorType = identifyErrorType(error);
      return errorType === ErrorType.NETWORK || errorType === ErrorType.TIMEOUT;
    }
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Se é a última tentativa ou não deve fazer retry, lança o erro
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // Calcula o delay (com backoff exponencial se habilitado)
      const currentDelay = backoff ? delay * Math.pow(2, attempt) : delay;
      
      // Aguarda antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError;
}

// Função para timeout em promises
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ApplicationError({
          type: ErrorType.TIMEOUT,
          message: `Operação excedeu o tempo limite de ${timeoutMs}ms`
        }));
      }, timeoutMs);
    })
  ]);
}

// Função para criar um cliente fetch com tratamento de erro
export function createApiClient(baseUrl: string = '/api') {
  return {
    async request<T>(
      endpoint: string,
      options: RequestInit & { timeout?: number } = {}
    ): Promise<T> {
      const { timeout = 30000, ...fetchOptions } = options;
      
      const url = `${baseUrl}${endpoint}`;
      
      try {
        const fetchPromise = fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers
          },
          ...fetchOptions
        });

        const response = await withTimeout(fetchPromise, timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApplicationError({
            type: identifyErrorType({ status: response.status }),
            message: errorData.message || errorData.error || `HTTP ${response.status}`,
            details: errorData.details,
            code: errorData.code,
            statusCode: response.status
          });
        }

        const data = await response.json();
        
        // Se a resposta tem success: false, trata como erro
        if (data.success === false) {
          throw new ApplicationError({
            type: ErrorType.SERVER,
            message: data.message || data.error || 'Erro na operação',
            details: data.details,
            code: data.code
          });
        }

        return data;
      } catch (error) {
        // Se já é um ApplicationError, re-lança
        if (error instanceof ApplicationError) {
          throw error;
        }

        // Processa outros tipos de erro
        throw new ApplicationError(processApiError(error));
      }
    },

    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
      return this.request<T>(endpoint, { ...options, method: 'GET' });
    },

    async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
      return this.request<T>(endpoint, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      });
    },

    async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
      return this.request<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      });
    },

    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
      return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
  };
}

// Cliente API padrão
export const apiClient = createApiClient();

// Função para lidar com erros de formulário
export function handleFormErrors(
  error: any,
  setFieldErrors: (errors: Record<string, string[]>) => void,
  showToast: (type: ToastType, title: string, message?: string) => void
) {
  const appError = processApiError(error);
  
  // Se tem erros de campo específicos
  if (error.response?.data?.errors || error.errors) {
    const fieldErrors = error.response?.data?.errors || error.errors;
    setFieldErrors(fieldErrors);
    
    showToast('warning', 'Dados inválidos', 'Corrija os erros nos campos indicados');
    return;
  }
  
  // Erro geral
  const toast = errorToToast(appError);
  showToast(toast.type, toast.title, toast.message);
}

// Função para logging de erros (pode ser integrada com serviços como Sentry)
export function logError(error: any, context?: Record<string, any>) {
  const appError = processApiError(error);
  
  console.error('Application Error:', {
    ...appError,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  });
  
  // Aqui você pode integrar com serviços de logging como Sentry
  // Sentry.captureException(error, { extra: context });
}

// Hook para tratamento de erros em componentes
export function useErrorHandler() {
  return {
    handleError: (error: any, context?: Record<string, any>) => {
      logError(error, context);
      return errorToToast(error);
    },
    
    handleFormError: (
      error: any,
      setFieldErrors: (errors: Record<string, string[]>) => void,
      showToast: (type: ToastType, title: string, message?: string) => void
    ) => {
      handleFormErrors(error, setFieldErrors, showToast);
    }
  };
}