'use client';

import React from 'react';
import { User } from 'lucide-react';

interface UserInfoProps {
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      name?: string;
      role?: string;
    };
  };
  showRole?: boolean;
  className?: string;
}

export default function UserInfo({ user, showRole = false, className = '' }: UserInfoProps) {
  if (!user) {
    return (
      <span className={`text-gray-400 text-sm ${className}`}>
        Não informado
      </span>
    );
  }

  const displayName = user.user_metadata?.name || user.email.split('@')[0];
  const role = user.user_metadata?.role;
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'real-estate-agent':
        return 'Corretor';
      default:
        return role;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
        <User className="w-3 h-3 text-blue-600" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {displayName}
        </span>
        {showRole && role && (
          <span className="text-xs text-gray-500">
            {getRoleLabel(role)}
          </span>
        )}
      </div>
    </div>
  );
}