import type { UseQueryResult } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, type TripPlan } from "@/lib/api";
import { routeName } from "@/lib/routes";

// The fastest route plus two alternatives, when the routing service finds them.
const EXPECTED_ROUTES = 3;

type Props = {
  hasTrip: boolean;
  plan: UseQueryResult<TripPlan>;
};

/** One line on where the plan stands: nothing yet, loading, failed, or what came back. */
export function PlanStatus({ hasTrip, plan }: Props) {
  if (!hasTrip) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose where you're going, when you leave and your load to compare
        routes.
      </p>
    );
  }
  if (plan.isError) {
    // Field errors are shown on the form itself.
    if (
      plan.error instanceof ApiError &&
      Object.keys(plan.error.fieldErrors).length > 0
    ) {
      return null;
    }
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{plan.error.message}</span>
          <Button variant="outline" size="sm" onClick={() => plan.refetch()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (plan.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Planning your trip…
      </p>
    );
  }
  const { routes, spacing_mi, recommendation } = plan.data;
  return (
    <div role="status" className="space-y-1 text-sm text-muted-foreground">
      {plan.isPlaceholderData && <p>Updating…</p>}
      {recommendation.route_id === null ? (
        <Alert variant="destructive">
          <AlertTitle>No route is safe to drive</AlertTitle>
          <AlertDescription>{recommendation.reason}</AlertDescription>
        </Alert>
      ) : (
        <p className="text-foreground">
          <strong>
            {routeName(routes, recommendation.route_id)} is recommended.
          </strong>{" "}
          {recommendation.reason}.
        </p>
      )}
      <p>Weather checked every {spacing_mi} mi along each route.</p>
      {routes.length < EXPECTED_ROUTES && (
        <p>
          Only {routes.length} route{routes.length === 1 ? "" : "s"} found
          between these places.
        </p>
      )}
    </div>
  );
}
