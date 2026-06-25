import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#1a73e8] dark:bg-[#8ab4f8] text-white dark:text-[#202124] hover:bg-[#1765cc] dark:hover:bg-[#aecbfa] shadow-sm',
        destructive: 'bg-[#c5221f] dark:bg-[#2d1e1f] text-white dark:text-[#f28b82] hover:bg-[#a11c1a] dark:hover:bg-[#3c2a2b]',
        outline: 'border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1e1e1e] text-[#202124] dark:text-[#f1f3f4] hover:bg-[#f8f9fa] dark:hover:bg-[#2d2d2d]',
        secondary: 'bg-[#f1f3f4] dark:bg-[#303134] text-[#202124] dark:text-[#f1f3f4] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]',
        ghost: 'text-[#5f6368] dark:text-[#bdc1c6] hover:text-[#202124] dark:hover:text-[#f1f3f4] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]',
        link: 'text-[#1a73e8] dark:text-[#8ab4f8] underline-offset-4 hover:underline',
        success: 'bg-[#0d7d4d] dark:bg-[#1a2e22] text-white dark:text-[#81c995] hover:bg-[#0a6b41] dark:hover:bg-[#243d2c]',
      },
      size: {
        default: 'h-9 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        xl: 'h-11 px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
