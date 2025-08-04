'use client';

import React from 'react';
import { ContratoStatus as ContratoStatusType, CONTRATO_STATUS_LABELS } from '../../../../types/financeiro';

interface ContratoStatusProps {
  status: ContratoStatusType;
  className?: string;
}

export default function ContratoStatus({ status, className = '' }: ContratoStatusProps) {
  const getStatusColor = (status: ContratoStatusType) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'encerrado':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspenso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )} ${className}`}
    >
      {CONTRATO_STATUS_LABELS[status]}
    </span>
  );
}