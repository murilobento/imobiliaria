import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContratoStatus from '../ContratoStatus';
import { CONTRATO_STATUS } from '../../../../../types/financeiro';

describe('ContratoStatus', () => {
  it('renders active status correctly', () => {
    render(<ContratoStatus status={CONTRATO_STATUS.ATIVO} />);
    
    const statusElement = screen.getByText('Ativo');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
  });

  it('renders finished status correctly', () => {
    render(<ContratoStatus status={CONTRATO_STATUS.ENCERRADO} />);
    
    const statusElement = screen.getByText('Encerrado');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-200');
  });

  it('renders suspended status correctly', () => {
    render(<ContratoStatus status={CONTRATO_STATUS.SUSPENSO} />);
    
    const statusElement = screen.getByText('Suspenso');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-200');
  });

  it('applies custom className', () => {
    render(<ContratoStatus status={CONTRATO_STATUS.ATIVO} className="custom-class" />);
    
    const statusElement = screen.getByText('Ativo');
    expect(statusElement).toHaveClass('custom-class');
  });

  it('has correct base classes', () => {
    render(<ContratoStatus status={CONTRATO_STATUS.ATIVO} />);
    
    const statusElement = screen.getByText('Ativo');
    expect(statusElement).toHaveClass(
      'inline-flex',
      'items-center',
      'px-2.5',
      'py-0.5',
      'rounded-full',
      'text-xs',
      'font-medium',
      'border'
    );
  });
});