import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  containerClassName?: string;
  iconClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      leftIcon = <Lock className="w-4 h-4 text-slate-500" />,
      className = '',
      containerClassName = '',
      iconClassName = '',
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className={`relative flex items-center w-full ${containerClassName}`}>
        {leftIcon && (
          <div className="absolute left-3 pointer-events-none flex items-center justify-center text-slate-500 z-10">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          className={`w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg ${
            leftIcon ? 'pl-9' : 'pl-3'
          } pr-10 py-2 text-xs text-slate-100 outline-none transition ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible((prev) => !prev);
          }}
          className={`absolute right-2.5 p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 rounded transition ${iconClassName}`}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          title={isVisible ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
