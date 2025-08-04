import { createApiClient, withRetry, withTimeout, ApplicationError, ErrorType } from '@/lib/utils/errorHandling';

// Configurações padrão para o cliente API
const DEFAULT_CONFIG = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  retryBackoff: true
};

// Cliente API com tratamento de erro avançado
class EnhancedApiClient {
  private baseClient = createApiClient();

  // Método genérico com retry e timeout
  private async requestWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
      retryBackoff?: boolean;
    } = {}
  ): Promise<T> {
    const config = { ...DEFAULT_CONFIG, ...options };

    return withRetry(
      () => withTimeout(operation(), config.timeout),
      {
        maxRetries: config.retries,
        delay: config.retryDelay,
        backoff: config.retryBackoff,
        retryCondition: (error) => {
          // Retry apenas para erros de rede e timeout
          if (error instanceof ApplicationError) {
            return error.type === ErrorType.NETWORK || error.type === ErrorType.TIMEOUT;
          }
          return false;
        }
      }
    );
  }

  // Métodos HTTP com tratamento de erro
  async get<T>(endpoint: string, options?: RequestInit & { timeout?: number; retries?: number }): Promise<T> {
    return this.requestWithRetry(
      () => this.baseClient.get<T>(endpoint, options),
      options
    );
  }

  async post<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestInit & { timeout?: number; retries?: number }
  ): Promise<T> {
    return this.requestWithRetry(
      () => this.baseClient.post<T>(endpoint, data, options),
      options
    );
  }

  async put<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestInit & { timeout?: number; retries?: number }
  ): Promise<T> {
    return this.requestWithRetry(
      () => this.baseClient.put<T>(endpoint, data, options),
      options
    );
  }

  async delete<T>(endpoint: string, options?: RequestInit & { timeout?: number; retries?: number }): Promise<T> {
    return this.requestWithRetry(
      () => this.baseClient.delete<T>(endpoint, options),
      options
    );
  }

  // Método para upload de arquivos
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options: {
      timeout?: number;
      retries?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<T> {
    const { timeout = 60000, retries = 1, onProgress } = options;

    return this.requestWithRetry(
      () => {
        return new Promise<T>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Configurar timeout
          xhr.timeout = timeout;

          // Configurar progress
          if (onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
              }
            });
          }

          // Configurar handlers
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (error) {
                reject(new ApplicationError({
                  type: ErrorType.SERVER,
                  message: 'Resposta inválida do servidor'
                }));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                reject(new ApplicationError({
                  type: ErrorType.SERVER,
                  message: errorResponse.message || errorResponse.error || `HTTP ${xhr.status}`,
                  statusCode: xhr.status
                }));
              } catch {
                reject(new ApplicationError({
                  type: ErrorType.SERVER,
                  message: `HTTP ${xhr.status}`,
                  statusCode: xhr.status
                }));
              }
            }
          };

          xhr.onerror = () => {
            reject(new ApplicationError({
              type: ErrorType.NETWORK,
              message: 'Erro de rede durante o upload'
            }));
          };

          xhr.ontimeout = () => {
            reject(new ApplicationError({
              type: ErrorType.TIMEOUT,
              message: `Upload excedeu o tempo limite de ${timeout}ms`
            }));
          };

          // Enviar requisição
          xhr.open('POST', `/api${endpoint}`);
          xhr.send(formData);
        });
      },
      { retries, retryDelay: 2000 }
    );
  }

  // Método para download de arquivos
  async download(
    endpoint: string,
    options: {
      filename?: string;
      timeout?: number;
    } = {}
  ): Promise<void> {
    const { filename, timeout = 60000 } = options;

    try {
      const response = await withTimeout(
        fetch(`/api${endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/octet-stream'
          }
        }),
        timeout
      );

      if (!response.ok) {
        throw new ApplicationError({
          type: ErrorType.SERVER,
          message: `Erro no download: HTTP ${response.status}`,
          statusCode: response.status
        });
      }

      const blob = await response.blob();
      
      // Criar link para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ApplicationError({
        type: ErrorType.UNKNOWN,
        message: 'Erro durante o download'
      });
    }
  }
}

// Instância singleton do cliente API
export const apiClient = new EnhancedApiClient();

// Funções específicas para cada entidade
export const clientesApi = {
  getAll: (params?: Record<string, any>) => 
    apiClient.get('/clientes', { 
      body: params ? JSON.stringify(params) : undefined 
    }),
  
  getById: (id: string) => 
    apiClient.get(`/clientes/${id}`),
  
  create: (data: any) => 
    apiClient.post('/clientes', data),
  
  update: (id: string, data: any) => 
    apiClient.put(`/clientes/${id}`, data),
  
  delete: (id: string) => 
    apiClient.delete(`/clientes/${id}`)
};

export const cidadesApi = {
  getAll: () => 
    apiClient.get('/cidades'),
  
  getById: (id: string) => 
    apiClient.get(`/cidades/${id}`),
  
  create: (data: any) => 
    apiClient.post('/cidades', data),
  
  update: (id: string, data: any) => 
    apiClient.put(`/cidades/${id}`, data),
  
  delete: (id: string) => 
    apiClient.delete(`/cidades/${id}`)
};

export const imoveisApi = {
  getAll: (params?: Record<string, any>) => 
    apiClient.get('/imoveis', { 
      body: params ? JSON.stringify(params) : undefined 
    }),
  
  getById: (id: string) => 
    apiClient.get(`/imoveis/${id}`),
  
  create: (data: any) => 
    apiClient.post('/imoveis', data),
  
  update: (id: string, data: any) => 
    apiClient.put(`/imoveis/${id}`, data),
  
  delete: (id: string) => 
    apiClient.delete(`/imoveis/${id}`),
  
  uploadImages: (imovelId: string, files: File[], onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('imovelId', imovelId);
    files.forEach(file => formData.append('images', file));
    
    return apiClient.upload('/imoveis/upload', formData, { onProgress });
  },
  
  deleteImage: (imageId: string) => 
    apiClient.delete(`/imoveis/upload?id=${imageId}`)
};

export default apiClient;