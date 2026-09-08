import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-3" aria-label="Loading conversations">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 p-2">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-4 py-6" aria-label="Loading messages">
      <Skeleton className="h-14 w-2/3 rounded-2xl" />
      <Skeleton className="ml-auto h-20 w-3/5 rounded-2xl" />
      <Skeleton className="h-14 w-1/2 rounded-2xl" />
    </div>
  );
}
