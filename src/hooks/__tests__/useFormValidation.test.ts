import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { useFormValidation } from '../useFormValidation';
import { ValidationRule } from '@/types/validation';

// Mock validation utility
vi.mock('@/lib/utils/validation', () => ({
  validateField: vi.fn((fieldName: string, value: any, rule: ValidationRule) => {
    const errors = [];
    if (rule.required && (!value || value === '')) {
      errors.push({ field: fieldName, message: 'Field is required', code: 'REQUIRED' });
    }
    if (rule.minLength && value && value.length < rule.minLength) {
      errors.push({ field: fieldName, message: `Minimum length is ${rule.minLength}`, code: 'MIN_LENGTH' });
    }
    if (rule.type === 'email' && value && !value.includes('@')) {
      errors.push({ field: fieldName, message: 'Invalid email format', code: 'INVALID_EMAIL' });
    }
    return errors;
  }),
  sanitizeInput: vi.fn((input) => typeof input === 'string' ? input.trim() : input)
}));

describe('useFormValidation Hook', () => {
  const initialValues = {
    name: '',
    email: '',
    age: 0
  };

  const validationRules = {
    name: { required: true, minLength: 2 },
    email: { required: true, type: 'email' as const },
    age: { required: true, type: 'number' as const, min: 18 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct initial state', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    expect(result.current.fields.name.value).toBe('');
    expect(result.current.fields.name.valid).toBe(true);
    expect(result.current.fields.name.touched).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('should update field value and validate on change', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('name', 'John');
    });

    expect(result.current.fields.name.value).toBe('John');
    expect(result.current.fields.name.touched).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it('should validate field and show errors', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('name', ''); // Required field
    });

    expect(result.current.fields.name.valid).toBe(false);
    expect(result.current.fields.name.error).toBe('Field is required');
    expect(result.current.isValid).toBe(false);
  });

  it('should validate email format', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('email', 'invalid-email');
    });

    expect(result.current.fields.email.valid).toBe(false);
    expect(result.current.fields.email.error).toBe('Invalid email format');
  });

  it('should validate minimum length', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('name', 'A'); // Less than minLength: 2
    });

    expect(result.current.fields.name.valid).toBe(false);
    expect(result.current.fields.name.error).toBe('Minimum length is 2');
  });

  it('should mark field as touched without validation', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules, { validateOnBlur: false })
    );

    act(() => {
      result.current.setFieldTouched('name', false);
    });

    expect(result.current.fields.name.touched).toBe(true);
    expect(result.current.fields.name.valid).toBe(true); // No validation on blur
  });

  it('should validate all fields', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    // Set some invalid values
    act(() => {
      result.current.setFieldValue('name', '', false); // Don't validate on change
      result.current.setFieldValue('email', 'invalid', false);
    });

    act(() => {
      result.current.validateAllFields();
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.fields.name.valid).toBe(false);
    expect(result.current.fields.email.valid).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('should set field errors from external source', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    const serverErrors = {
      name: ['Name already exists'],
      email: ['Email is invalid', 'Email already taken']
    };

    act(() => {
      result.current.setFieldErrors(serverErrors);
    });

    expect(result.current.fields.name.error).toBe('Name already exists');
    expect(result.current.fields.email.error).toBe('Email is invalid'); // First error only
    expect(result.current.fields.name.valid).toBe(false);
    expect(result.current.fields.email.valid).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('should reset form to initial values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    // Make some changes
    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldValue('email', 'john@email.com');
      result.current.setSubmitting(true);
    });

    // Reset form
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.fields.name.value).toBe('');
    expect(result.current.fields.email.value).toBe('');
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isValid).toBe(true);
  });

  it('should reset form with new values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    const newValues = { name: 'Jane', email: 'jane@email.com', age: 25 };

    act(() => {
      result.current.resetForm(newValues);
    });

    expect(result.current.fields.name.value).toBe('');
    expect(result.current.fields.email.value).toBe('');
    expect(result.current.fields.age.value).toBe(0);
  });

  it('should get current form values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldValue('email', 'john@email.com');
    });

    const values = result.current.getValues();
    expect(values.name).toBe('John');
    expect(values.email).toBe('john@email.com');
  });

  it('should get only dirty values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('name', 'John'); // Changed
      result.current.setFieldValue('age', 0); // Same as initial
    });

    const dirtyValues = result.current.getDirtyValues();
    expect(dirtyValues.name).toBe('John');
    expect(dirtyValues.age).toBeUndefined(); // Not dirty
  });

  it('should check if field has error', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('name', ''); // Invalid and touched
    });

    expect(result.current.hasFieldError('name')).toBe(true);
    expect(result.current.hasFieldError('email')).toBe(false); // Not touched
  });

  it('should get field error message', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldValue('name', ''); // Invalid
    });

    expect(result.current.getFieldError('name')).toBe('Field is required');
    expect(result.current.getFieldError('email')).toBeUndefined();
  });

  it('should provide field props helper', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    const nameProps = result.current.getFieldProps('name');

    expect(nameProps.value).toBe('');
    expect(typeof nameProps.onChange).toBe('function');
    expect(typeof nameProps.onBlur).toBe('function');
    expect(nameProps.hasError).toBe(false);
  });

  it('should handle field props onChange', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    const nameProps = result.current.getFieldProps('name');

    act(() => {
      nameProps.onChange({ target: { value: 'John' } } as any);
    });

    expect(result.current.fields.name.value).toBe('John');
  });

  it('should handle field props onBlur', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    const nameProps = result.current.getFieldProps('name');

    act(() => {
      nameProps.onBlur();
    });

    expect(result.current.fields.name.touched).toBe(true);
  });

  it('should disable validation on change when configured', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules, { validateOnChange: false })
    );

    act(() => {
      result.current.setFieldValue('name', ''); // Should not validate
    });

    expect(result.current.fields.name.valid).toBe(true); // No validation
    expect(result.current.isValid).toBe(true);
  });

  it('should sanitize input when configured', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules, { sanitizeOnChange: true })
    );

    act(() => {
      result.current.setFieldValue('name', '  John  '); // Should be trimmed
    });

    expect(result.current.fields.name.value).toBe('John');
  });

  it('should set submitting state', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setSubmitting(true);
    });

    expect(result.current.isSubmitting).toBe(true);

    act(() => {
      result.current.setSubmitting(false);
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});