'use client';

import { useEffect, useState } from 'react';

interface FontProviderProps {
  children: React.ReactNode;
  fontClasses: string;
}

export default function FontProvider({ children, fontClasses }: FontProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // On server and before hydration, render without font classes to prevent mismatch
  if (!isMounted) {
    return <div className="font-sans bg-white text-gray-800">{children}</div>;
  }

  // After hydration, apply the font classes
  return <div className={fontClasses}>{children}</div>;
}