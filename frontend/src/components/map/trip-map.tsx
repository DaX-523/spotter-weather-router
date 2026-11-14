// The only place that imports Leaflet. Kept thin: every value drawn is computed in @/lib/map.
import "leaflet/dist/leaflet.css";

import { memo, useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { CheckpointDetails } from "@/components/trip-planner/checkpoint-details";
import type { Checkpoint, Route } from "@/lib/api";
import { boundsOf, toLatLng, type LatLng } from "@/lib/map";
import { themeColor } from "@/lib/theme";

// The contiguous US, before there is a trip to show.
const US_CENTER: LatLng = [39.5, -98.35];
const US_ZOOM = 4;
const FIT_PADDING: LatLng = [32, 32];
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// OpenStreetMap's tile usage policy requires this attribution.
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ROUTE_WEIGHT = { selected: 6, alternative: 4 };
const CHECKPOINT_RADIUS = 6;

type Props = {
  routes: Route[];
  selectedRouteId: number | null;
  onSelectRoute: (routeId: number) => void;
};

export const TripMap = memo(function TripMap({
  routes,
  selectedRouteId,
  onSelectRoute,
}: Props) {
  const bounds = useMemo(() => boundsOf(routes), [routes]);
  const selected = routes.find((route) => route.id === selectedRouteId);
  const alternatives = routes.filter((route) => route !== selected);

  return (
    <section aria-label="Map" className="relative h-full min-h-[60svh]">
      <MapContainer
        center={US_CENTER}
        zoom={US_ZOOM}
        preferCanvas
        className="absolute inset-0"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitBounds bounds={bounds} />
        {/* Alternatives first, so the selected route is drawn on top of them. */}
        {alternatives.map((route) => (
          <RouteLine key={route.id} route={route} onSelect={onSelectRoute} />
        ))}
        {selected && (
          <RouteLine
            key={selected.id}
            route={selected}
            selected
            onSelect={onSelectRoute}
          />
        )}
        {selected?.checkpoints.map((checkpoint) => (
          <CheckpointMarker
            key={checkpoint.mile_marker_mi}
            checkpoint={checkpoint}
          />
        ))}
      </MapContainer>
    </section>
  );
});

/** Re-frames the map when a new plan arrives, not when the driver picks another route. */
function FitBounds({ bounds }: { bounds: [LatLng, LatLng] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: FIT_PADDING });
  }, [map, bounds]);
  return null;
}

const RouteLine = memo(function RouteLine({
  route,
  selected = false,
  onSelect,
}: {
  route: Route;
  selected?: boolean;
  onSelect: (routeId: number) => void;
}) {
  const positions = useMemo(
    () => route.polyline.map(toLatLng),
    [route.polyline],
  );
  const eventHandlers = useMemo(
    () => ({ click: () => onSelect(route.id) }),
    [onSelect, route.id],
  );
  return (
    <Polyline
      positions={positions}
      eventHandlers={eventHandlers}
      pathOptions={{
        color: themeColor(selected ? "map-route" : "map-route-alternative"),
        weight: selected ? ROUTE_WEIGHT.selected : ROUTE_WEIGHT.alternative,
      }}
    />
  );
});

function CheckpointMarker({ checkpoint }: { checkpoint: Checkpoint }) {
  return (
    <CircleMarker
      center={toLatLng(checkpoint.coordinate)}
      radius={CHECKPOINT_RADIUS}
      pathOptions={{
        color: themeColor("map-route"),
        fillColor: themeColor("map-checkpoint"),
        fillOpacity: 1,
        weight: 2,
      }}
    >
      <Popup>
        <CheckpointDetails checkpoint={checkpoint} />
      </Popup>
    </CircleMarker>
  );
}
