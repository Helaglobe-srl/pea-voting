import { cn } from "@/lib/utils";

interface PEALogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function PEALogo({ className, size = "md", showText = true }: PEALogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl"
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* triangle logo inspired by the patient engagement award logo */}
      <div className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size]
      )}>
        <div className="absolute inset-0 bg-accent rounded-sm transform rotate-45" />
        <div className="relative z-10 w-2/3 h-2/3 bg-primary rounded-sm" />
      </div>
      
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={cn(
            "font-bold text-primary",
            textSizeClasses[size]
          )}>
            PEA
          </span>
          {size !== "sm" && (
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Award
            </span>
          )}
        </div>
      )}
    </div>
  );
}