import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  avatar?: string;
  badge?: string;
  badgeColor?: string;
}

interface SearchableSelectProps {
  id?: string;
  options: SelectOption[];
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  required?: boolean;
  error?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  allowCustom = false,
  required = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleCustomSubmit = () => {
    if (search.trim()) {
      onChange(search.trim());
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-900/90 border rounded-lg px-3 py-2 text-xs text-left flex items-center justify-between transition outline-none ${
          error
            ? 'border-rose-500/80 focus:border-rose-500'
            : isOpen
            ? 'border-cyan-400 shadow-glow-cyan'
            : 'border-slate-800 hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center space-x-2 truncate">
          {selectedOption ? (
            <div className="flex items-center space-x-2 truncate">
              {selectedOption.avatar && (
                <img
                  src={selectedOption.avatar}
                  alt={selectedOption.label}
                  className="w-4 h-4 rounded-full object-cover border border-slate-700 flex-shrink-0"
                />
              )}
              {selectedOption.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                    selectedOption.badgeColor || 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
              <span className="text-slate-100 font-medium truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-slate-500 text-[11px] truncate">({selectedOption.sublabel})</span>
              )}
            </div>
          ) : value ? (
            <span className="text-slate-100 font-medium truncate">{value}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden glass-panel">
          <div className="p-2 border-b border-slate-800 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-4 top-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0].value);
                  } else if (allowCustom) {
                    handleCustomSubmit();
                  }
                }
              }}
              placeholder="Search options..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/40">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                <p>No matching options found.</p>
                {allowCustom && search.trim() && (
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="mt-2 px-2.5 py-1 text-xs bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded border border-cyan-500/30"
                  >
                    Use "{search.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left hover:bg-slate-800/80 transition ${
                      isSelected ? 'bg-cyan-950/30 text-cyan-300 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {opt.avatar && (
                        <img
                          src={opt.avatar}
                          alt={opt.label}
                          className="w-5 h-5 rounded-full object-cover border border-slate-700 flex-shrink-0"
                        />
                      )}
                      {opt.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            opt.badgeColor || 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <div>
                        <div className="font-medium text-slate-100">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-400">{opt.sublabel}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
