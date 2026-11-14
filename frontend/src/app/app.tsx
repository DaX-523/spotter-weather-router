import { TripPlanner } from "@/components/trip-planner/trip-planner";
import { UsOnlyBadge } from "@/components/us-only-badge";

export function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Spotter Weather Router</h1>
        <UsOnlyBadge />
      </header>
      <TripPlanner />
    </div>
  );
}
