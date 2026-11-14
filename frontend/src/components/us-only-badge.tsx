/** Says up front what the app covers: US roads and weather, in US units and local US time. */
export function UsOnlyBadge() {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs shadow-sm">
      <UsFlag />
      <span className="font-semibold">US routes only</span>
      <span className="hidden text-muted-foreground sm:inline">
        mi · °F · lb · local time
      </span>
    </p>
  );
}

// Seven red stripes on white and a blue canton: recognisable at this size without the stars.
const STRIPES = 13;
const STRIPE_HEIGHT = 10 / STRIPES;

function UsFlag() {
  return (
    <svg
      viewBox="0 0 19 10"
      aria-hidden="true"
      className="h-3 w-[23px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-border"
    >
      <rect width="19" height="10" className="fill-us-flag-white" />
      {Array.from({ length: 7 }, (_, index) => (
        <rect
          key={index}
          y={index * 2 * STRIPE_HEIGHT}
          width="19"
          height={STRIPE_HEIGHT}
          className="fill-us-flag-red"
        />
      ))}
      <rect
        width="7.6"
        height={7 * STRIPE_HEIGHT}
        className="fill-us-flag-blue"
      />
    </svg>
  );
}
