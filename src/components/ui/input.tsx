import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-full border border-[#dadce0] bg-[#f8f9fa] px-4 py-2 text-sm text-[#202124] placeholder:text-[#9aa0a6] transition-colors focus:border-[#1a73e8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a73e8] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
