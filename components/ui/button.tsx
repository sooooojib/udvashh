import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-teal-600 text-white shadow-sm hover:bg-teal-700 dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)]",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
        outline:
          "border border-border/80 bg-background shadow-sm hover:bg-muted/80 hover:text-foreground dark:border-[#1F2C34] dark:bg-[#141E28] dark:hover:bg-[#1F2C34] dark:text-[#E8EDF0] dark:hover:text-white",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34] dark:hover:text-white",
        ghost:
          "hover:bg-muted/80 hover:text-foreground dark:hover:bg-[#1F2C34] dark:text-[#E8EDF0] dark:hover:text-white",
        link: "text-teal-600 underline-offset-4 hover:underline dark:text-[#25A8A2]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
