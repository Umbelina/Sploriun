// src/components/Button.tsx
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary";
    loading?: boolean;
    fullWidth?: boolean;
  }
>;

export function Button({
  children,
  variant = "primary",
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "px-6 py-3 rounded-md transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm";

  const variantStyles = {
    primary: `
      bg-primary text-primary-foreground hover:opacity-90
      active:opacity-95 
      disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60
      disabled:cursor-not-allowed
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-transparent text-secondary-foreground border border-secondary-foreground
      hover:bg-secondary-foreground hover:text-white
      active:opacity-95
      disabled:text-muted-foreground disabled:border-muted-foreground disabled:cursor-not-allowed disabled:opacity-60
    `,
  };

  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}