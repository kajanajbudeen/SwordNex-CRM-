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
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value);
      } else if (allowCustom && search.trim()) {
        handleCustomSubmit();
      }
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-left flex items-center justify-between transition outline-none ${
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : isOpen
            ? 'border-cyan-500 ring-1 ring-cyan-500'
            : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
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
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    selectedOption.badgeColor || 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
              <span className="text-slate-100 font-normal truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-slate-500 text-xs truncate">({selectedOption.sublabel})</span>
              )}
            </div>
          ) : value ? (
            <span className="text-slate-100 font-normal truncate">{value}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-800 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-4.5 top-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full h-8 bg-slate-950/80 border border-slate-800 rounded-md pl-8 pr-7 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-500"
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

          <div ref={listRef} className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/40">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                <p>No matching options.</p>
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
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-3.5 py-2 text-xs flex items-center justify-between text-left transition ${
                      isSelected
                        ? 'bg-cyan-950/40 text-cyan-300 font-medium'
                        : isHighlighted
                        ? 'bg-slate-800/80 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {opt.avatar && (
                        <img
                          src={opt.avatar}
                          alt={opt.label}
                          className="w-4 h-4 rounded-full object-cover border border-slate-700 flex-shrink-0"
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
                      <div className="truncate">
                        <span className="text-slate-200">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[11px] text-slate-500 ml-1.5">({opt.sublabel})</span>
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

      {error && <p className="mt-1 text-xs text-rose-400 font-normal">{error}</p>}
    </div>
  );
};
