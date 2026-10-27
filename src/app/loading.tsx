import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div 
      className="flex min-h-[100dvh] w-full bg-[#FAFCF9] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
    </div>
  );
}
