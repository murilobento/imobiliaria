import {
    ValidationRule,
    ValidationError,
    ValidationResult,
    validationMessages,
    clienteValidationRules,
    imovelValidationRules,
    cidadeValidationRules,
    imageValidationRules,
    userValidationRules,
    profileUpdateValidationRules
} from '@/types/validation';

// Função principal de validação
export function validateField(
    fieldName: string,
    value: any,
    rule: ValidationRule,
    existingValues?: any[]
): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validação de campo obrigatório
    if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
            field: fieldName,
            message: validationMessages.required,
            code: 'REQUIRED'
        });
        return errors; // Se é obrigatório e está vazio, não precisa validar mais
    }

    // Se o campo está vazio e não é obrigatório, não precisa validar mais
    if (value === undefined || value === null || value === '') {
        return errors;
    }

    // Validação de tipo
    if (rule.type) {
        switch (rule.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    errors.push({
                        field: fieldName,
                        message: validationMessages.email,
                        code: 'INVALID_EMAIL'
                    });
                }
                break;
            case 'number':
                if (isNaN(Number(value))) {
                    errors.push({
                        field: fieldName,
                        message: 'Deve ser um número válido',
                        code: 'INVALID_NUMBER'
                    });
                }
                break;
            case 'url':
                try {
                    new URL(value);
                } catch {
                    errors.push({
                        field: fieldName,
                        message: 'Deve ser uma URL válida',
                        code: 'INVALID_URL'
                    });
                }
                break;
            case 'tel':
                const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
                if (!phoneRegex.test(value)) {
                    errors.push({
                        field: fieldName,
                        message: 'Telefone deve estar no formato (XX) XXXXX-XXXX',
                        code: 'INVALID_PHONE'
                    });
                }
                break;
        }
    }

    // Validação de padrão (regex)
    if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
            field: fieldName,
            message: validationMessages.pattern,
            code: 'INVALID_PATTERN'
        });
    }

    // Validação de comprimento mínimo
    if (rule.minLength && value.length < rule.minLength) {
        errors.push({
            field: fieldName,
            message: validationMessages.minLength(rule.minLength),
            code: 'MIN_LENGTH'
        });
    }

    // Validação de comprimento máximo
    if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
            field: fieldName,
            message: validationMessages.maxLength(rule.maxLength),
            code: 'MAX_LENGTH'
        });
    }

    // Validação de valor mínimo
    if (rule.min !== undefined && Number(value) < rule.min) {
        errors.push({
            field: fieldName,
            message: validationMessages.min(rule.min),
            code: 'MIN_VALUE'
        });
    }

    // Validação de valor máximo
    if (rule.max !== undefined && Number(value) > rule.max) {
        errors.push({
            field: fieldName,
            message: validationMessages.max(rule.max),
            code: 'MAX_VALUE'
        });
    }

    // Validação de enum
    if (rule.enum && !(rule.enum as (string | number)[]).includes(value)) {
        errors.push({
            field: fieldName,
            message: validationMessages.enum(rule.enum.map(String)),
            code: 'INVALID_ENUM'
        });
    }

    // Validação de unicidade
    if (rule.unique && existingValues && existingValues.includes(value)) {
        errors.push({
            field: fieldName,
            message: validationMessages.unique,
            code: 'NOT_UNIQUE'
        });
    }

    return errors;
}

// Validar objeto completo
export function validateObject<T extends Record<string, any>>(
    data: T,
    rules: Record<keyof T, ValidationRule>,
    existingData?: Record<string, any[]>
): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [fieldName, rule] of Object.entries(rules)) {
        const value = data[fieldName];
        const existingValues = existingData?.[fieldName];

        const fieldErrors = validateField(fieldName, value, rule, existingValues);
        errors.push(...fieldErrors);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validações específicas para cada entidade
export function validateCliente(data: any, existingEmails?: string[]): ValidationResult {
    return validateObject(data, clienteValidationRules, {
        email: existingEmails || []
    });
}

export function validateImovel(data: any): ValidationResult {
    // Validações customizadas para imóvel
    const result = validateObject(data, imovelValidationRules);

    // Validação específica para valores baseados na finalidade
    if (data.finalidade === 'venda' && (!data.valor_venda || data.valor_venda <= 0)) {
        result.errors.push({
            field: 'valor_venda',
            message: 'Valor de venda é obrigatório para imóveis à venda',
            code: 'REQUIRED_FOR_SALE'
        });
        result.isValid = false;
    }

    if (data.finalidade === 'aluguel' && (!data.valor_aluguel || data.valor_aluguel <= 0)) {
        result.errors.push({
            field: 'valor_aluguel',
            message: 'Valor de aluguel é obrigatório para imóveis para aluguel',
            code: 'REQUIRED_FOR_RENT'
        });
        result.isValid = false;
    }

    if (data.finalidade === 'ambos') {
        if ((!data.valor_venda || data.valor_venda <= 0) && (!data.valor_aluguel || data.valor_aluguel <= 0)) {
            result.errors.push({
                field: 'valor_venda',
                message: 'Pelo menos um valor (venda ou aluguel) deve ser informado',
                code: 'REQUIRED_ONE_VALUE'
            });
            result.errors.push({
                field: 'valor_aluguel',
                message: 'Pelo menos um valor (venda ou aluguel) deve ser informado',
                code: 'REQUIRED_ONE_VALUE'
            });
            result.isValid = false;
        }
    }

    return result;
}

export function validateCidade(data: any, existingNames?: string[]): ValidationResult {
    return validateObject(data, cidadeValidationRules, {
        nome: existingNames || []
    });
}

export function validateContrato(data: any): ValidationResult {
    // Import the validation rules from types/validation
    const contratoValidationRules = {
        imovel_id: {
            required: true,
            pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        },
        inquilino_id: {
            required: true,
            pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        },
        valor_aluguel: {
            required: true,
            type: 'number' as const,
            min: 0.01
        },
        valor_deposito: {
            type: 'number' as const,
            min: 0
        },
        data_inicio: {
            required: true,
            type: 'date' as const
        },
        data_fim: {
            required: true,
            type: 'date' as const
        },
        dia_vencimento: {
            required: true,
            type: 'number' as const,
            min: 1,
            max: 31
        },
        status: {
            required: true,
            enum: ['ativo', 'encerrado', 'suspenso']
        },
        observacoes: {
            maxLength: 1000
        }
    };

    return validateObject(data, contratoValidationRules);
}

export function validatePagamento(data: any, isUpdate: boolean = false): ValidationResult {
    // Import the validation rules from types/validation
    const pagamentoValidationRules = {
        contrato_id: {
            required: !isUpdate,
            pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        },
        mes_referencia: {
            required: !isUpdate,
            type: 'date' as const
        },
        valor_devido: {
            required: !isUpdate,
            type: 'number' as const,
            min: 0.01
        },
        valor_pago: {
            type: 'number' as const,
            min: 0
        },
        data_vencimento: {
            required: !isUpdate,
            type: 'date' as const
        },
        data_pagamento: {
            type: 'date' as const
        },
        valor_juros: {
            type: 'number' as const,
            min: 0
        },
        valor_multa: {
            type: 'number' as const,
            min: 0
        },
        status: {
            required: !isUpdate,
            enum: ['pendente', 'pago', 'atrasado', 'cancelado']
        },
        observacoes: {
            maxLength: 1000
        }
    };

    return validateObject(data, pagamentoValidationRules);
}

export function validateDespesa(data: any, isUpdate: boolean = false): ValidationResult {
    const despesaValidationRules = {
        imovel_id: {
            required: !isUpdate,
            pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        },
        categoria: {
            required: !isUpdate,
            enum: ['manutencao', 'impostos', 'seguros', 'administracao', 'outros']
        },
        descricao: {
            required: !isUpdate,
            minLength: 3,
            maxLength: 500
        },
        valor: {
            required: !isUpdate,
            type: 'number' as const,
            min: 0.01
        },
        data_despesa: {
            required: !isUpdate,
            type: 'date' as const
        },
        data_pagamento: {
            type: 'date' as const
        },
        status: {
            required: !isUpdate,
            enum: ['pendente', 'pago', 'cancelado']
        },
        observacoes: {
            maxLength: 1000
        }
    };

    return validateObject(data, despesaValidationRules);
}

export function validateConfiguracao(data: any, isUpdate: boolean = false): ValidationResult {
    const configuracaoValidationRules = {
        taxa_juros_mensal: {
            required: !isUpdate,
            type: 'number' as const,
            min: 0,
            max: 1 // 100%
        },
        taxa_multa: {
            required: !isUpdate,
            type: 'number' as const,
            min: 0,
            max: 1 // 100%
        },
        taxa_comissao: {
            required: !isUpdate,
            type: 'number' as const,
            min: 0,
            max: 1 // 100%
        },
        dias_carencia: {
            required: !isUpdate,
            type: 'number' as const,
            min: 0,
            max: 30
        }
    };

    return validateObject(data, configuracaoValidationRules);
}

// Validação de imagens
export function validateImage(file: File): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = imageValidationRules;

    // Validar tipo de arquivo
    if (!rules.allowedTypes.includes(file.type)) {
        errors.push({
            field: 'file',
            message: `Tipo de arquivo não permitido. Tipos aceitos: ${rules.allowedTypes.join(', ')}`,
            code: 'INVALID_FILE_TYPE'
        });
    }

    // Validar tamanho do arquivo
    if (file.size > rules.maxSize) {
        const maxSizeMB = rules.maxSize / (1024 * 1024);
        errors.push({
            field: 'file',
            message: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
            code: 'FILE_TOO_LARGE'
        });
    }

    return errors;
}

// Validar múltiplas imagens
export function validateImages(files: File[]): ValidationResult {
    const errors: ValidationError[] = [];
    const rules = imageValidationRules;

    // Validar número de arquivos
    if (files.length > rules.maxFiles) {
        errors.push({
            field: 'files',
            message: `Muitos arquivos. Máximo permitido: ${rules.maxFiles}`,
            code: 'TOO_MANY_FILES'
        });
    }

    // Validar cada arquivo
    files.forEach((file, index) => {
        const fileErrors = validateImage(file);
        fileErrors.forEach(error => {
            errors.push({
                ...error,
                field: `file_${index}`,
                message: `Arquivo ${index + 1}: ${error.message}`
            });
        });
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validação de dimensões de imagem (para usar após carregar a imagem)
export function validateImageDimensions(
    width: number,
    height: number,
    filename: string
): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = imageValidationRules;

    if (rules.minWidth && width < rules.minWidth) {
        errors.push({
            field: 'dimensions',
            message: `${filename}: Largura mínima é ${rules.minWidth}px`,
            code: 'MIN_WIDTH'
        });
    }

    if (rules.maxWidth && width > rules.maxWidth) {
        errors.push({
            field: 'dimensions',
            message: `${filename}: Largura máxima é ${rules.maxWidth}px`,
            code: 'MAX_WIDTH'
        });
    }

    if (rules.minHeight && height < rules.minHeight) {
        errors.push({
            field: 'dimensions',
            message: `${filename}: Altura mínima é ${rules.minHeight}px`,
            code: 'MIN_HEIGHT'
        });
    }

    if (rules.maxHeight && height > rules.maxHeight) {
        errors.push({
            field: 'dimensions',
            message: `${filename}: Altura máxima é ${rules.maxHeight}px`,
            code: 'MAX_HEIGHT'
        });
    }

    return errors;
}

// Função para sanitizar dados de entrada
export function sanitizeInput(input: any): any {
    if (typeof input === 'string') {
        return input.trim();
    }

    if (Array.isArray(input)) {
        return input.map(sanitizeInput);
    }

    if (typeof input === 'object' && input !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }

    return input;
}

// Função para validar relacionamentos (foreign keys)
export async function validateRelationships(
    data: any,
    relationships: Record<string, (id: string) => Promise<boolean>>
): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const [field, validator] of Object.entries(relationships)) {
        const id = data[field];
        if (id) {
            try {
                const exists = await validator(id);
                if (!exists) {
                    errors.push({
                        field,
                        message: `${field.replace('_id', '')} não encontrado`,
                        code: 'INVALID_RELATIONSHIP'
                    });
                }
            } catch (error) {
                errors.push({
                    field,
                    message: `Erro ao validar ${field.replace('_id', '')}`,
                    code: 'RELATIONSHIP_ERROR'
                });
            }
        }
    }

    return errors;
}

// Função para formatar erros para resposta da API
export function formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach(error => {
        if (!formatted[error.field]) {
            formatted[error.field] = [];
        }
        formatted[error.field].push(error.message);
    });

    return formatted;
}

// User Management Validation Functions

// Validar dados de criação de usuário
export function validateCreateUser(
    data: any, 
    existingUsernames?: string[], 
    existingEmails?: string[]
): ValidationResult {
    const result = validateObject(data, {
        fullName: {
            required: true,
            minLength: 2,
            maxLength: 100,
            pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
            message: 'Nome deve conter apenas letras e espaços'
        },
        username: userValidationRules.username,
        email: userValidationRules.email,
        password: userValidationRules.password,
        confirmPassword: userValidationRules.confirmPassword
    }, {
        username: existingUsernames || [],
        email: existingEmails || []
    });

    // Validação específica para confirmação de senha
    if (data.password !== data.confirmPassword) {
        result.errors.push({
            field: 'confirmPassword',
            message: 'As senhas não coincidem',
            code: 'PASSWORDS_DONT_MATCH'
        });
        result.isValid = false;
    }

    // Validação de força da senha
    const passwordStrengthErrors = validatePasswordStrength(data.password);
    if (passwordStrengthErrors.length > 0) {
        result.errors.push(...passwordStrengthErrors);
        result.isValid = false;
    }

    return result;
}

// Validar dados de atualização de perfil
export function validateUpdateProfile(
    data: any,
    currentUserId: string,
    existingUsernames?: string[],
    existingEmails?: string[]
): ValidationResult {
    // Filtrar dados existentes para excluir o usuário atual
    const filteredUsernames = existingUsernames?.filter(username => 
        // Assumindo que temos uma forma de identificar o username atual
        true // Esta lógica será implementada na camada de serviço
    ) || [];
    
    const filteredEmails = existingEmails?.filter(email => 
        // Assumindo que temos uma forma de identificar o email atual
        true // Esta lógica será implementada na camada de serviço
    ) || [];

    return validateObject(data, profileUpdateValidationRules, {
        username: filteredUsernames,
        email: filteredEmails
    });
}

// Validar dados de alteração de senha
export function validateChangePassword(data: any): ValidationResult {
    const result = validateObject(data, {
        currentPassword: userValidationRules.currentPassword,
        newPassword: userValidationRules.newPassword,
        confirmPassword: userValidationRules.confirmPassword
    });

    // Validação específica para confirmação de nova senha
    if (data.newPassword !== data.confirmPassword) {
        result.errors.push({
            field: 'confirmPassword',
            message: 'As senhas não coincidem',
            code: 'PASSWORDS_DONT_MATCH'
        });
        result.isValid = false;
    }

    // Validação de força da nova senha
    const passwordStrengthErrors = validatePasswordStrength(data.newPassword);
    if (passwordStrengthErrors.length > 0) {
        result.errors.push(...passwordStrengthErrors.map(error => ({
            ...error,
            field: 'newPassword'
        })));
        result.isValid = false;
    }

    // Verificar se a nova senha é diferente da atual
    if (data.currentPassword === data.newPassword) {
        result.errors.push({
            field: 'newPassword',
            message: 'A nova senha deve ser diferente da senha atual',
            code: 'SAME_PASSWORD'
        });
        result.isValid = false;
    }

    return result;
}

// Validar força da senha
export function validatePasswordStrength(password: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!password) {
        return errors; // Será capturado pela validação de campo obrigatório
    }

    // Verificar se tem pelo menos 8 caracteres
    if (password.length < 8) {
        errors.push({
            field: 'password',
            message: 'A senha deve ter pelo menos 8 caracteres',
            code: 'PASSWORD_TOO_SHORT'
        });
    }

    // Verificar se tem pelo menos uma letra minúscula
    if (!/[a-z]/.test(password)) {
        errors.push({
            field: 'password',
            message: 'A senha deve conter pelo menos uma letra minúscula',
            code: 'PASSWORD_NO_LOWERCASE'
        });
    }

    // Verificar se tem pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(password)) {
        errors.push({
            field: 'password',
            message: 'A senha deve conter pelo menos uma letra maiúscula',
            code: 'PASSWORD_NO_UPPERCASE'
        });
    }

    // Verificar se tem pelo menos um número
    if (!/\d/.test(password)) {
        errors.push({
            field: 'password',
            message: 'A senha deve conter pelo menos um número',
            code: 'PASSWORD_NO_NUMBER'
        });
    }

    // Verificar se tem pelo menos um caractere especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push({
            field: 'password',
            message: 'A senha deve conter pelo menos um caractere especial',
            code: 'PASSWORD_NO_SPECIAL'
        });
    }

    return errors;
}

// Validar formato de email (função específica para user management)
export function validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validar formato de username
export function validateUsernameFormat(username: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!username) {
        return errors; // Será capturado pela validação de campo obrigatório
    }

    // Verificar se contém apenas caracteres permitidos
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push({
            field: 'username',
            message: 'Username deve conter apenas letras, números, underscore (_) e hífen (-)',
            code: 'INVALID_USERNAME_FORMAT'
        });
    }

    // Verificar se não começa ou termina com underscore ou hífen
    if (/^[_-]|[_-]$/.test(username)) {
        errors.push({
            field: 'username',
            message: 'Username não pode começar ou terminar com underscore ou hífen',
            code: 'INVALID_USERNAME_BOUNDARIES'
        });
    }

    // Verificar se não tem caracteres consecutivos especiais
    if (/[_-]{2,}/.test(username)) {
        errors.push({
            field: 'username',
            message: 'Username não pode ter underscores ou hífens consecutivos',
            code: 'INVALID_USERNAME_CONSECUTIVE'
        });
    }

    return errors;
}

// Função para verificar unicidade de username (será usada com dados do banco)
export function checkUsernameUniqueness(
    username: string, 
    existingUsernames: string[], 
    excludeUserId?: string
): boolean {
    return !existingUsernames.includes(username);
}

// Função para verificar unicidade de email (será usada com dados do banco)
export function checkEmailUniqueness(
    email: string, 
    existingEmails: string[], 
    excludeUserId?: string
): boolean {
    return !existingEmails.includes(email);
}