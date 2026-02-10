// src/components/Alert.tsx

type AlertType = "error" | "success" | "warning" | "info";

interface AlertProps {
  type?: AlertType;
  children: React.ReactNode;
  className?: string;
}

const styleByType: Record<AlertType, { container: string; icon: JSX.Element }> = {
  error: {
    container: "bg-destructive/10 border-destructive/20 text-destructive",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  success: {
    container: "bg-accent/10 border-accent/20 text-accent-foreground",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  warning: {
    container: "bg-muted/20 border-muted/40 text-muted-foreground",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    container: "bg-secondary/10 border-secondary/20 text-secondary-foreground",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
};

export function Alert({ type = "error", children, className = "" }: AlertProps) {
  const current = styleByType[type];

  return (
    <div className={`${current.container} border-2 rounded-md p-4 flex items-start gap-3 ${className}`}>
      <div className="shrink-0 mt-0.5">{current.icon}</div>
      <div className="flex-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
