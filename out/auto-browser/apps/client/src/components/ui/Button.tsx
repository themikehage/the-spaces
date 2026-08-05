import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] rounded-md cursor-pointer";

    const variants = {
      primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-sm",
      secondary: "bg-surface hover:bg-surface-hover text-foreground border border-border",
      outline: "border border-border hover:bg-surface text-foreground",
      ghost: "hover:bg-surface text-muted-foreground hover:text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:brightness-110 shadow-sm",
    };

    const sizes = {
      sm: "h-7 px-2.5 text-xs gap-1.5",
      md: "h-9 px-3.5 text-sm gap-2",
      lg: "h-11 px-5 text-base gap-2.5",
      icon: "h-8 w-8 p-0 flex items-center justify-center text-sm",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
