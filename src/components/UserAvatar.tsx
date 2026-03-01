import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "h-4 w-4 text-[6px]",
  sm: "h-5 w-5 text-[7px]",
  md: "h-8 w-8 text-xs",
  lg: "h-14 w-14 text-xl",
};

export function UserAvatar({ avatarUrl, fullName, size = "md", className }: UserAvatarProps) {
  const initials = fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={fullName || "Avatar"} className="h-full w-full object-cover" />
      ) : (
        <span className="font-bold text-primary-foreground leading-none">{initials}</span>
      )}
    </div>
  );
}
