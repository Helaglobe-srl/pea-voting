import { Card } from "@/components/ui/card";
import { Skeleton } from "./ui/skeleton";

export function StatsCardsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CriteriaAndLegendLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4">
        <Skeleton className="h-6 w-48 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      <Card className="p-4">
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function VotingMatrixLoading() {
  return (
    <Card className="p-6">
      <Skeleton className="h-7 w-64 mb-6" />
      
      {/* mobile loading */}
      <div className="block lg:hidden">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-48 mb-3" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="p-2 bg-muted/50 rounded">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* desktop loading */}
      <div className="hidden lg:block">
        <div className="border rounded">
          <div className="bg-muted p-3 border-b">
            <div className="flex gap-4">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-32" />
              ))}
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 border-b flex gap-4 items-center">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-16" />
              ))}
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
