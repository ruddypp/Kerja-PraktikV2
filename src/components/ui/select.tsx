import React, { forwardRef } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  fullWidth?: boolean;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  containerClassName?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      fullWidth = false,
      helperText,
      size = 'md',
      className = '',
      containerClassName = '',
      disabled,
      required,
      id,
      placeholder,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 11)}`;
    
    const sizeClasses = {
      sm: 'py-1 text-sm',
      md: 'py-2 text-base',
      lg: 'py-3 text-lg',
    };
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <select
          ref={ref}
          id={selectId}
          className={`
            block w-full rounded-md border ${error ? 'border-red-500' : 'border-gray-300'} 
            shadow-sm focus:border-blue-500 focus:ring-blue-500
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
            ${sizeClasses[size]}
            px-3 ${className}
          `}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value} 
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <p className="mt-1 text-sm text-red-600" id={`${selectId}-error`}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500" id={`${selectId}-helper`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select'; 