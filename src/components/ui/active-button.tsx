import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActiveButtonProps extends ButtonProps {
  activeClass?: string;
  activeDuration?: number;
}

const ActiveButton = React.forwardRef<HTMLButtonElement, ActiveButtonProps>(
  ({ className, activeClass = "scale-95 brightness-90", activeDuration = 150, onClick, children, ...props }, ref) => {
    const [isActive, setIsActive] = React.useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsActive(true);
      setTimeout(() => setIsActive(false), activeDuration);
      onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        className={cn(
          "transition-all duration-150",
          isActive && activeClass,
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
ActiveButton.displayName = "ActiveButton";

export { ActiveButton };
