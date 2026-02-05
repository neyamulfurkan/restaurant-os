'use client';

// src/components/shared/LanguageSelector.tsx

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/i18n/i18nContext';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSelector({ className }: { className?: string }) {
  const { language, setLanguage, supportedLanguages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = supportedLanguages[language];

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors duration-200 text-sm"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4 text-neutral-500" />
        <span className="font-medium">{currentLang.flag}</span>
        <span className="hidden sm:inline text-neutral-600 font-medium">{currentLang.nativeName}</span>
        <svg
          className={cn('w-3 h-3 text-neutral-400 transition-transform duration-200', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 z-50 max-h-72 overflow-y-auto">
          {Object.entries(supportedLanguages).map(([code, lang]) => (
            <button
              key={code}
              onClick={() => {
                setLanguage(code as typeof language);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors duration-150 text-left',
                language === code
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              )}
            >
              <span className="text-base">{lang.flag}</span>
              <div className="flex flex-col">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-neutral-400">{lang.name}</span>
              </div>
              {language === code && (
                <svg className="ml-auto w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}