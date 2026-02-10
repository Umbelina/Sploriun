import React, { forwardRef, InputHTMLAttributes, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', placeholder = '', value = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm mb-2 font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {/* Icon */}
          {icon && (
            <div
              className="absolute left-icon-figma top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-[#666666]"
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={`w-full max-w-full box-border rounded-[16px] border-2 bg-white transition-all duration-200 input-py-figma input-pr-figma pl-[56px]
              ${error ? 'border-destructive' : isFocused ? 'border-[#1e3a8a] ring-4 ring-[#1e3a8a10]' : 'border-[#e5e5e5]'}
              ${!error && !isFocused ? 'hover:border-[#b3b3b3]' : ''}
              ${props.disabled ? 'bg-[#f5f5f5]' : ''}
              placeholder:text-[#999999]
              ${className}
            `}
            placeholder={placeholder}
            value={value}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-destructive flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
