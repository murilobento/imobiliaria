import { useState, useCallback, useEffect } from 'react';
import { ValidationRule, ValidationError, FormState, FormField } from '@/types/validation';
import { validateField, sanitizeInput } from '@/lib/utils/validation';

// Hook para validação de formulários
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule>,
  options?: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    sanitizeOnChange?: boolean;
  }
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    sanitizeOnChange = true
  } = options || {};

  // Estado inicial dos campos
  const createInitialFields = useCallback(() => {
    const fields: { [K in keyof T]: FormField<T[K]> } = {} as any;
    
    for (const key in initialValues) {
      fields[key] = {
        value: initialValues[key],
        error: undefined,
        touched: false,
        valid: true
      };
    }
    
    return fields;
  }, [initialValues]);

  const [formState, setFormState] = useState<FormState<T>>(() => ({
    fields: createInitialFields(),
    isValid: true,
    isSubmitting: false,
    isDirty: false
  }));

  // Validar um campo específico
  const validateSingleField = useCallback((
    fieldName: keyof T, 
    value: any,
    existingValues?: any[]
  ): ValidationError[] => {
    const rule = validationRules[fieldName];
    if (!rule) return [];
    
    return validateField(String(fieldName), value, rule, existingValues);
  }, [validationRules]);

  // Atualizar valor de um campo
  const setFieldValue = useCallback((
    fieldName: keyof T, 
    value: any,
    shouldValidate = validateOnChange
  ) => {
    setFormState(prev => {
      const sanitizedValue = sanitizeOnChange ? sanitizeInput(value) : value;
      const errors = shouldValidate ? validateSingleField(fieldName, sanitizedValue) : [];
      const hasError = errors.length > 0;

      const newFields = {
        ...prev.fields,
        [fieldName]: {
          ...prev.fields[fieldName],
          value: sanitizedValue,
          error: hasError ? errors[0].message : undefined,
          valid: !hasError,
          touched: true
        }
      };

      // Verificar se o formulário inteiro é válido
      const isFormValid = Object.values(newFields).every(field => field.valid);
      
      // Verificar se o formulário foi modificado usando uma referência estável
      const isDirty = Object.keys(newFields).some(key => 
        newFields[key as keyof T].value !== initialValues[key as keyof T]
      );

      return {
        ...prev,
        fields: newFields,
        isValid: isFormValid,
        isDirty
      };
    });
  }, [validateOnChange, sanitizeOnChange, validateSingleField]); // Removido initialValues das dependências

  // Marcar campo como tocado (para validação onBlur)
  const setFieldTouched = useCallback((
    fieldName: keyof T,
    shouldValidate = validateOnBlur
  ) => {
    setFormState(prev => {
      const field = prev.fields[fieldName];
      const errors = shouldValidate ? validateSingleField(fieldName, field.value) : [];
      const hasError = errors.length > 0;

      const newFields = {
        ...prev.fields,
        [fieldName]: {
          ...field,
          touched: true,
          error: hasError ? errors[0].message : undefined,
          valid: !hasError
        }
      };

      const isFormValid = Object.values(newFields).every(field => field.valid);

      return {
        ...prev,
        fields: newFields,
        isValid: isFormValid
      };
    });
  }, [validateOnBlur, validateSingleField]);

  // Validar todos os campos
  const validateAllFields = useCallback((existingData?: Record<string, any[]>) => {
    setFormState(prev => {
      const newFields = { ...prev.fields };
      let hasAnyError = false;

      for (const fieldName in newFields) {
        const field = newFields[fieldName];
        const existingValues = existingData?.[String(fieldName)];
        const errors = validateSingleField(fieldName, field.value, existingValues);
        const hasError = errors.length > 0;

        newFields[fieldName] = {
          ...field,
          touched: true,
          error: hasError ? errors[0].message : undefined,
          valid: !hasError
        };

        if (hasError) hasAnyError = true;
      }

      return {
        ...prev,
        fields: newFields,
        isValid: !hasAnyError
      };
    });

    return !Object.values(formState.fields).some(field => !field.valid);
  }, [validateSingleField, formState.fields]);

  // Definir erros externos (vindos do servidor)
  const setFieldErrors = useCallback((errors: Record<string, string[]>) => {
    setFormState(prev => {
      const newFields = { ...prev.fields };

      // Limpar erros existentes
      for (const fieldName in newFields) {
        newFields[fieldName] = {
          ...newFields[fieldName],
          error: undefined,
          valid: true
        };
      }

      // Aplicar novos erros
      for (const [fieldName, fieldErrors] of Object.entries(errors)) {
        if (newFields[fieldName as keyof T]) {
          newFields[fieldName as keyof T] = {
            ...newFields[fieldName as keyof T],
            error: fieldErrors[0], // Mostrar apenas o primeiro erro
            valid: false,
            touched: true
          };
        }
      }

      const isFormValid = Object.values(newFields).every(field => field.valid);

      return {
        ...prev,
        fields: newFields,
        isValid: isFormValid
      };
    });
  }, []);

  // Resetar formulário
  const resetForm = useCallback((newValues?: Partial<T>) => {
    const valuesToUse = newValues ? { ...initialValues, ...newValues } : initialValues;
    
    setFormState({
      fields: createInitialFields(),
      isValid: true,
      isSubmitting: false,
      isDirty: false
    });
  }, [initialValues, createInitialFields]);

  // Definir estado de submissão
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setFormState(prev => ({
      ...prev,
      isSubmitting
    }));
  }, []);

  // Obter valores atuais do formulário
  const getValues = useCallback((): T => {
    const values = {} as T;
    for (const fieldName in formState.fields) {
      values[fieldName] = formState.fields[fieldName].value;
    }
    return values;
  }, [formState.fields]);

  // Obter apenas campos que foram modificados
  const getDirtyValues = useCallback((): Partial<T> => {
    const dirtyValues = {} as Partial<T>;
    for (const fieldName in formState.fields) {
      const field = formState.fields[fieldName];
      if (field.value !== initialValues[fieldName]) {
        dirtyValues[fieldName] = field.value;
      }
    }
    return dirtyValues;
  }, [formState.fields]); // Removido initialValues das dependências

  // Verificar se um campo específico tem erro
  const hasFieldError = useCallback((fieldName: keyof T): boolean => {
    return !formState.fields[fieldName]?.valid && formState.fields[fieldName]?.touched;
  }, [formState.fields]);

  // Obter erro de um campo específico
  const getFieldError = useCallback((fieldName: keyof T): string | undefined => {
    const field = formState.fields[fieldName];
    return field?.touched ? field.error : undefined;
  }, [formState.fields]);

  return {
    // Estado
    fields: formState.fields,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    isDirty: formState.isDirty,
    
    // Ações
    setFieldValue,
    setFieldTouched,
    validateAllFields,
    setFieldErrors,
    resetForm,
    setSubmitting,
    
    // Utilitários
    getValues,
    getDirtyValues,
    hasFieldError,
    getFieldError,
    
    // Helpers para inputs
    getFieldProps: (fieldName: keyof T) => ({
      value: formState.fields[fieldName]?.value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFieldValue(fieldName, e.target.value);
      },
      onBlur: () => setFieldTouched(fieldName),
      error: getFieldError(fieldName),
      hasError: hasFieldError(fieldName)
    })
  };
}

// Hook específico para validação de cliente
export function useClienteValidation(initialValues: any) {
  const { clienteValidationRules } = require('@/types/validation');
  return useFormValidation(initialValues, clienteValidationRules);
}

// Hook específico para validação de imóvel
export function useImovelValidation(initialValues: any) {
  const { imovelValidationRules } = require('@/types/validation');
  return useFormValidation(initialValues, imovelValidationRules);
}

// Hook específico para validação de cidade
export function useCidadeValidation(initialValues: any) {
  const { cidadeValidationRules } = require('@/types/validation');
  return useFormValidation(initialValues, cidadeValidationRules);
}