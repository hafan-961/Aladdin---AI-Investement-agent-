import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1c2b42] dark:text-[#8ab4f8]',
        secondary: 'bg-[#f1f3f4] text-[#5f6368] dark:bg-[#303134] dark:text-[#bdc1c6]',
        destructive: 'bg-[#fce8e6] text-[#c5221f] dark:bg-[#2d1e1f] dark:text-[#f28b82]',
        success: 'bg-[#e6f4ea] text-[#0d7d4d] dark:bg-[#1a2e22] dark:text-[#81c995]',
        warning: 'bg-[#fef7e0] text-[#e37400] dark:bg-[#2d2a1e] dark:text-[#fdd663]',
        outline: 'border border-[#dadce0] text-[#5f6368] dark:border-[#3c4043] dark:text-[#bdc1c6]',
        invest: 'bg-[#e6f4ea] text-[#0d7d4d] dark:bg-[#1a2e22] dark:text-[#81c995] text-sm font-bold px-3 py-1',
        pass: 'bg-[#fce8e6] text-[#c5221f] dark:bg-[#2d1e1f] dark:text-[#f28b82] text-sm font-bold px-3 py-1',
        wait: 'bg-[#fef7e0] text-[#e37400] dark:bg-[#2d2a1e] dark:text-[#fdd663] text-sm font-bold px-3 py-1',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
