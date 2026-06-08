import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading(): JSX.Element {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`agenda-${i}`} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
