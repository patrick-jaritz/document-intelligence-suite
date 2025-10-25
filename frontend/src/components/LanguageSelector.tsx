import React, { useState } from 'react';
import { getSupportedLanguages } from '../lib/tesseractOCR';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({ selectedLanguage, onLanguageChange, disabled = false }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const supportedLanguages = getSupportedLanguages();

  const languageOptions = [
    { code: 'eng', name: 'English', flag: '🇺🇸' },
    { code: 'deu', name: 'German', flag: '🇩🇪' },
    { code: 'fra', name: 'French', flag: '🇫🇷' },
    { code: 'spa', name: 'Spanish', flag: '🇪🇸' },
    { code: 'ita', name: 'Italian', flag: '🇮🇹' },
    { code: 'por', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'rus', name: 'Russian', flag: '🇷🇺' },
    { code: 'chi_sim', name: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'chi_tra', name: 'Chinese (Traditional)', flag: '🇹🇼' },
    { code: 'jpn', name: 'Japanese', flag: '🇯🇵' },
    { code: 'kor', name: 'Korean', flag: '🇰🇷' },
    { code: 'ara', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hin', name: 'Hindi', flag: '🇮🇳' },
  ];

  // Multi-language combinations
  const multiLanguageOptions = [
    { code: 'eng+deu', name: 'English + German', flag: '🇺🇸🇩🇪' },
    { code: 'eng+fra', name: 'English + French', flag: '🇺🇸🇫🇷' },
    { code: 'eng+spa', name: 'English + Spanish', flag: '🇺🇸🇪🇸' },
    { code: 'eng+deu+fra+spa', name: 'Multi-European', flag: '🌍' },
    { code: 'chi_sim+chi_tra', name: 'Chinese (Both)', flag: '🇨🇳🇹🇼' },
  ];

  const allOptions = [...languageOptions, ...multiLanguageOptions];

  const selectedOption = allOptions.find(option => option.code === selectedLanguage) || languageOptions[0];

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        OCR Language
      </label>
      
      <div className="relative">
        <button
          type="button"
          className={`
            relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer
            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
          `}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="flex items-center">
            <span className="text-lg mr-2">{selectedOption.flag}</span>
            <span className="block truncate">{selectedOption.name}</span>
          </span>
          <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
            {/* Single Languages */}
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
              Single Languages
            </div>
            {languageOptions.map((option) => (
              <button
                key={option.code}
                className={`
                  w-full text-left px-3 py-2 text-sm flex items-center hover:bg-blue-50
                  ${selectedLanguage === option.code ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                `}
                onClick={() => {
                  onLanguageChange(option.code);
                  setIsOpen(false);
                }}
              >
                <span className="text-lg mr-3">{option.flag}</span>
                <span>{option.name}</span>
                {selectedLanguage === option.code && (
                  <svg className="ml-auto h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}

            {/* Multi-Language Combinations */}
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b mt-2">
              Multi-Language
            </div>
            {multiLanguageOptions.map((option) => (
              <button
                key={option.code}
                className={`
                  w-full text-left px-3 py-2 text-sm flex items-center hover:bg-blue-50
                  ${selectedLanguage === option.code ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                `}
                onClick={() => {
                  onLanguageChange(option.code);
                  setIsOpen(false);
                }}
              >
                <span className="text-lg mr-3">{option.flag}</span>
                <span>{option.name}</span>
                {selectedLanguage === option.code && (
                  <svg className="ml-auto h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Language Info */}
      <div className="mt-2 text-xs text-gray-500">
        {selectedLanguage.includes('+') ? (
          <p>🌍 Multi-language mode: Better for documents with mixed languages</p>
        ) : (
          <p>🎯 Single language mode: Optimized for documents in one language</p>
        )}
      </div>
    </div>
  );
}

export default LanguageSelector;
