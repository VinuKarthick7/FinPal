import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setIsOpen(false);
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const modalContent = isOpen ? (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 99999,
        padding: '16px',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '320px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Globe style={{ width: '18px', height: '18px', color: '#2563eb' }} />
          </div>
          <span style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>
            Select Language
          </span>
        </div>

        {/* Languages */}
        <div style={{ padding: '8px' }}>
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '4px',
                backgroundColor: i18n.language === language.code ? '#eff6ff' : '#f9fafb',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '24px' }}>{language.flag}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '14px',
                  color: i18n.language === language.code ? '#1d4ed8' : '#111827',
                }}>
                  {language.native}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {language.name}
                </div>
              </div>
              {i18n.language === language.code && (
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check style={{ width: '14px', height: '14px', color: 'white', strokeWidth: 3 }} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 transition-all border border-gray-200 shadow-sm"
        title="Change language"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {currentLanguage.native}
        </span>
      </button>

      {typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
};

export default LanguageSwitcher;
