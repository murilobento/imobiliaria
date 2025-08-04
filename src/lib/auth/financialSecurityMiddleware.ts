/**
 * Security middleware specifically for financial APIs
 * Provides role-based access control, audit logging, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateSupabaseUser } from './supabase-auth-utils';
import { hasPermission, Permission } from './permissions';
import { rateLimitMiddleware, handleFailedAuth, handleSuccessfulAuth } from './rateLimitMiddleware';
import { logSecurityEvent } from './securityLogger';
import { createClient } from '@/lib/supabase-server';

export interface FinancialSecurityOptions {
  requiredPermission: Permission;
  operation: string;
  sensitiveData?: boolean;
  auditDetails?: Record<string, any>;
  rateLimitKey?: string;
}

export interface SecurityValidationResult {
  success: boolean;
  user?: any;
  response?: NextResponse;
  auditData?: {
    userId: string;
    userRole: string;
    operation: string;
    ipAddress: string;
    userAgent: string;
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return 'unknown';
}

/**
 * Validate financial operation security
 */
export async function validateFinancialSecurity(
  request: NextRequest,
  options: FinancialSecurityOptions
): Promise<SecurityValidationResult> {
  const startTime = Date.now();
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Step 1: Rate limiting check
    const rateLimitResult = await rateLimitMiddleware(request);
    if (!rateLimitResult.success) {
      // Log rate limit violation
      await logSecurityEvent({
        type: 'login_failure',
        user_id: null,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date(),
        details: {
          reason: 'rate_limited',
          operation: options.operation,
          limit_type: rateLimitResult.ipLimit.type
        }
      });

      return {
        success: false,
        response: rateLimitResult.response
      };
    }

    // Step 2: Authentication
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      await handleFailedAuth(request);
      
      // Log authentication failure
      await logSecurityEvent({
        type: 'login_failure',
        user_id: null,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date(),
        details: {
          reason: 'authentication_failed',
          operation: options.operation
        }
      });

      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Não autorizado',
            message: 'Você precisa estar logado para acessar esta funcionalidade'
          },
          { status: 401 }
        )
      };
    }

    const user = authResult.user!;

    // Step 3: Permission check
    if (!hasPermission(user.role, options.requiredPermission)) {
      // Log authorization failure
      await logSecurityEvent({
        type: 'login_failure',
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date(),
        details: {
          reason: 'insufficient_permissions',
          operation: options.operation,
          required_permission: options.requiredPermission,
          user_role: user.role
        }
      });

      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Permissão negada',
            message: 'Você não tem permissão para executar esta operação'
          },
          { status: 403 }
        )
      };
    }

    // Step 4: Data integrity validation for sensitive operations
    if (options.sensitiveData) {
      const integrityCheck = await validateDataIntegrity(request, user.id);
      if (!integrityCheck.valid) {
        // Log data integrity violation
        await logSecurityEvent({
          type: 'login_failure',
          user_id: user.id,
          ip_address: ipAddress,
          user_agent: userAgent,
          timestamp: new Date(),
          details: {
            reason: 'data_integrity_violation',
            operation: options.operation,
            violation_details: integrityCheck.errors
          }
        });

        return {
          success: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'Violação de integridade',
              message: 'Os dados fornecidos não passaram na validação de integridade'
            },
            { status: 400 }
          )
        };
      }
    }

    // Step 5: Success - handle successful authentication
    await handleSuccessfulAuth(request, user.email);

    // Log successful access
    await logSecurityEvent({
      type: 'login_success',
      user_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        operation: options.operation,
        permission: options.requiredPermission,
        execution_time_ms: Date.now() - startTime,
        ...options.auditDetails
      }
    });

    return {
      success: true,
      user,
      auditData: {
        userId: user.id,
        userRole: user.role,
        operation: options.operation,
        ipAddress,
        userAgent
      }
    };

  } catch (error) {
    // Log system error
    await logSecurityEvent({
      type: 'login_failure',
      user_id: null,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        reason: 'system_error',
        operation: options.operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Erro interno do servidor',
          message: 'Erro na validação de segurança'
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Validate data integrity for financial operations
 */
async function validateDataIntegrity(
  request: NextRequest,
  userId: string
): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  try {
    // Only validate for POST/PUT/PATCH requests with body
    if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return { valid: true };
    }

    const body = await request.clone().json();

    // Validate financial values
    if (body.valor_aluguel !== undefined) {
      const valor = parseFloat(body.valor_aluguel);
      if (isNaN(valor) || valor <= 0 || valor > 1000000) {
        errors.push('Valor do aluguel inválido');
      }
    }

    if (body.valor_pago !== undefined) {
      const valor = parseFloat(body.valor_pago);
      if (isNaN(valor) || valor < 0 || valor > 1000000) {
        errors.push('Valor pago inválido');
      }
    }

    if (body.valor_devido !== undefined) {
      const valor = parseFloat(body.valor_devido);
      if (isNaN(valor) || valor <= 0 || valor > 1000000) {
        errors.push('Valor devido inválido');
      }
    }

    // Validate dates
    if (body.data_inicio && body.data_fim) {
      const inicio = new Date(body.data_inicio);
      const fim = new Date(body.data_fim);
      
      if (fim <= inicio) {
        errors.push('Data de fim deve ser posterior à data de início');
      }
      
      // Check for reasonable date ranges (not more than 10 years)
      const diffYears = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (diffYears > 10) {
        errors.push('Período do contrato não pode exceder 10 anos');
      }
    }

    // Validate percentage values
    if (body.taxa_juros_mensal !== undefined) {
      const taxa = parseFloat(body.taxa_juros_mensal);
      if (isNaN(taxa) || taxa < 0 || taxa > 0.1) { // Max 10% monthly
        errors.push('Taxa de juros mensal inválida');
      }
    }

    if (body.taxa_multa !== undefined) {
      const taxa = parseFloat(body.taxa_multa);
      if (isNaN(taxa) || taxa < 0 || taxa > 0.2) { // Max 20%
        errors.push('Taxa de multa inválida');
      }
    }

    // Validate UUIDs
    const uuidFields = ['imovel_id', 'inquilino_id', 'proprietario_id', 'contrato_id'];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    for (const field of uuidFields) {
      if (body[field] && !uuidRegex.test(body[field])) {
        errors.push(`${field} deve ser um UUID válido`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    return {
      valid: false,
      errors: ['Erro na validação de integridade dos dados']
    };
  }
}

/**
 * Log financial operation audit trail
 */
export async function logFinancialAudit(
  operation: string,
  type: 'create' | 'update' | 'delete' | 'view' | 'process',
  auditData: {
    userId: string;
    userRole: string;
    operation: string;
    ipAddress: string;
    userAgent: string;
  },
  details: {
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    affectedRecords?: number;
    executionTimeMs?: number;
  }
): Promise<void> {
  try {
    const supabase = createClient();

    // Create audit log entry
    const auditEntry = {
      operacao: `${operation}_${type}`,
      tipo: 'operacao_financeira' as const,
      detalhes: {
        entity_type: details.entityType,
        entity_id: details.entityId,
        user_role: auditData.userRole,
        ip_address: auditData.ipAddress,
        user_agent: auditData.userAgent,
        old_values: details.oldValues,
        new_values: details.newValues,
        operation_type: type
      },
      resultado: 'sucesso' as const,
      mensagem: `${operation} executado com sucesso`,
      user_id: auditData.userId,
      data_execucao: new Date().toISOString(),
      tempo_execucao_ms: details.executionTimeMs || 0,
      registros_afetados: details.affectedRecords || 1
    };

    const { error } = await supabase
      .from('logs_auditoria')
      .insert([auditEntry]);

    if (error) {
      console.error('Erro ao criar log de auditoria:', error);
    }

  } catch (error) {
    console.error('Erro no sistema de auditoria:', error);
  }
}

/**
 * Wrapper function for financial API routes with comprehensive security
 */
export function withFinancialSecurity<T extends any[]>(
  handler: (request: NextRequest, user: any, auditData: any, ...args: T) => Promise<NextResponse>,
  options: FinancialSecurityOptions
) {
  return async function secureFinancialHandler(
    request: NextRequest,
    ...args: T
  ): Promise<NextResponse> {
    const startTime = Date.now();

    // Validate security
    const securityResult = await validateFinancialSecurity(request, options);
    
    if (!securityResult.success) {
      return securityResult.response!;
    }

    try {
      // Execute the handler
      const response = await handler(
        request,
        securityResult.user,
        securityResult.auditData,
        ...args
      );

      // Log successful operation
      const executionTime = Date.now() - startTime;
      await logFinancialAudit(
        options.operation,
        request.method.toLowerCase() as any,
        securityResult.auditData!,
        {
          entityType: 'financial_operation',
          executionTimeMs: executionTime,
          ...options.auditDetails
        }
      );

      return response;

    } catch (error) {
      // Log failed operation
      await logFinancialAudit(
        options.operation,
        'process',
        securityResult.auditData!,
        {
          entityType: 'financial_operation',
          executionTimeMs: Date.now() - startTime,
          newValues: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      );

      throw error;
    }
  };
}

/**
 * Check if user owns the financial data they're trying to access
 */
export async function validateDataOwnership(
  userId: string,
  entityType: 'contrato' | 'pagamento' | 'despesa' | 'configuracao',
  entityId: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    let tableName: string;
    switch (entityType) {
      case 'contrato':
        tableName = 'contratos_aluguel';
        break;
      case 'pagamento':
        tableName = 'pagamentos_aluguel';
        break;
      case 'despesa':
        tableName = 'despesas_imoveis';
        break;
      case 'configuracao':
        tableName = 'configuracoes_financeiras';
        break;
      default:
        return false;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('user_id')
      .eq('id', entityId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.user_id === userId;

  } catch (error) {
    console.error('Erro na validação de propriedade dos dados:', error);
    return false;
  }
}