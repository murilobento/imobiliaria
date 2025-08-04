import React, { useState } from 'react';
import { Home, ChevronDown, ChevronUp } from 'lucide-react';
import { useClienteActiveContracts } from '@/hooks/useRentalStatus';
import ContratosAtivos from './ContratosAtivos';

interface ClienteContratosCellProps {
  clienteId: string;
  clienteNome: string;
}

export default function ClienteContratosCell({ clienteId, clienteNome }: ClienteContratosCellProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { contratos, loading } = useClienteActiveContracts(clienteId);

  if (loading) {
    return <span className="text-gray-400 text-xs">Carregando...</span>;
  }

  if (contratos.total_contratos === 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
        <Home className="w-3 h-3 mr-1" />
        Sem contratos
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
      >
        <Home className="w-3 h-3 mr-1" />
        {contratos.total_contratos} contrato{contratos.total_contratos > 1 ? 's' : ''}
        {showDetails ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </button>
      
      {showDetails && (
        <div className="mt-2">
          <ContratosAtivos 
            contratos={contratos} 
            showDetails={true}
            className="max-w-md"
          />
        </div>
      )}
    </div>
  );
}