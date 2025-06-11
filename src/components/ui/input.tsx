import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      fullWidth = false,
      helperText,
      leftIcon,
      rightIcon,
      className = '',
      containerClassName = '',
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    // Use a stable ID with client-side enhancement to avoid hydration issues
    const [generatedId] = React.useState('input');
    const inputId = id || generatedId;
    
    // Generate a unique ID on the client side after hydration
    React.useEffect(() => {
      // Only run this if no ID was provided and we're on the client
      if (!id && typeof document !== 'undefined') {
        const uniqueId = `input-${Math.random().toString(36).substring(2, 11)}`;
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
          inputElement.id = uniqueId;
          
          // Update any associated labels or aria attributes
          if (label) {
            const labelElement = document.querySelector(`label[for="${inputId}"]`);
            if (labelElement) {
              labelElement.setAttribute('for', uniqueId);
            }
          }
          
          if (error) {
            const errorElement = document.getElementById(`${inputId}-error`);
            if (errorElement) {
              errorElement.id = `${uniqueId}-error`;
              inputElement.setAttribute('aria-describedby', `${uniqueId}-error`);
            }
          } else if (helperText) {
            const helperElement = document.getElementById(`${inputId}-helper`);
            if (helperElement) {
              helperElement.id = `${uniqueId}-helper`;
              inputElement.setAttribute('aria-describedby', `${uniqueId}-helper`);
            }
          }
        }
      }
    }, [id, inputId, label, error, helperText]);
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`
              block rounded-md border ${error ? 'border-red-500' : 'border-gray-300'} 
              shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
              ${leftIcon ? 'pl-10' : 'pl-3'} 
              ${rightIcon ? 'pr-10' : 'pr-3'} 
              py-2 w-full ${className}
            `}
            disabled={disabled}
            required={required}
            {...(error ? {'aria-invalid': 'true'} : {})}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-600" id={`${inputId}-error`}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500" id={`${inputId}-helper`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 