// The only place that imports Leaflet. Kept thin: every value drawn is computed in @/lib.
import "leaflet/dist/leaflet.css";

import { divIcon, type DivIcon, type PathOptions } from "leaflet";
import { memo, useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { CheckpointDetails } from "@/components/trip-planner/checkpoint-details";
import type { Checkpoint, Corridor, RiskLevel, Route } from "@/lib/api";
import { corridorRadiusMeters } from "@/lib/corridor";
import { boundsOf, toLatLng, type LatLng } from "@/lib/map";
import { markerHtml } from "@/lib/map-markers";
import {
  RISK_LEVELS,
  markerSymbol,
  markerTitle,
  riskColorToken,
  type MarkerSymbol,
} from "@/lib/risk";
import { isDrivable } from "@/lib/routes";
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
// A route crossing No Travel conditions is drawn dashed: it must not be driven.
const NOT_DRIVABLE_DASH = "8 8";
const LOW_RISK_RADIUS = 5;
const SYMBOL_SIZE_PX = 26;
// The heatmap's own pane, under the routes (overlay pane, 400) and markers (600). `.corridor-pane`
// in index.css blurs it. Circles keep their level's exact colour: unlike an additive heatmap,
// overlapping low-risk shading can never add up to look riskier.
const CORRIDOR_PANE = "corridor";
const CORRIDOR_PANE_Z_INDEX = 350;
const CORRIDOR_OPACITY = 0.45;

type Props = {
  routes: Route[];
  selectedRouteId: number | null;
  onSelectRoute: (routeId: number) => void;
  corridor: Corridor | null;
  /** Hours from the corridor's start, 0 to 48. */
  corridorHour: number;
  spacingMi: number;
};

export const TripMap = memo(function TripMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  corridor,
  corridorHour,
  spacingMi,
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
        {corridor && (
          <Pane
            name={CORRIDOR_PANE}
            className="corridor-pane"
            style={{ zIndex: CORRIDOR_PANE_Z_INDEX }}
          >
            <CorridorShading
              corridor={corridor}
              hour={corridorHour}
              radiusM={corridorRadiusMeters(spacingMi)}
            />
          </Pane>
        )}
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

/** The heatmap: a circle of its level's colour around every checkpoint, for one hour. Moving the
 * slider only restyles circles whose level changed: each level's style is a single object. */
const CorridorShading = memo(function CorridorShading({
  corridor,
  hour,
  radiusM,
}: {
  corridor: Corridor;
  hour: number;
  radiusM: number;
}) {
  const styles = useMemo(
    () =>
      Object.fromEntries(
        RISK_LEVELS.map((level) => [
          level,
          {
            stroke: false,
            fillColor: themeColor(riskColorToken(level)),
            fillOpacity: CORRIDOR_OPACITY,
          },
        ]),
      ) as Record<RiskLevel, PathOptions>,
    [],
  );
  return corridor.points.map((point) => (
    <Circle
      key={`${point.coordinate.lat},${point.coordinate.lon}`}
      center={toLatLng(point.coordinate)}
      radius={radiusM}
      pathOptions={styles[point.levels[hour]]}
      interactive={false}
    />
  ));
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
        dashArray: isDrivable(route) ? undefined : NOT_DRIVABLE_DASH,
      }}
    />
  );
});

/** A plain dot where the risk is low; a symbol, like a road hazard sign, everywhere else. */
function CheckpointMarker({ checkpoint }: { checkpoint: Checkpoint }) {
  const { risk } = checkpoint;
  const symbol = markerSymbol(risk);
  const popup = (
    <Popup>
      <CheckpointDetails checkpoint={checkpoint} />
    </Popup>
  );
  if (symbol === null) {
    return (
      <CircleMarker
        center={toLatLng(checkpoint.coordinate)}
        radius={LOW_RISK_RADIUS}
        pathOptions={{
          color: themeColor("map-checkpoint"),
          fillColor: themeColor("risk-low"),
          fillOpacity: 1,
          weight: 2,
        }}
      >
        {popup}
      </CircleMarker>
    );
  }
  return (
    <Marker
      position={toLatLng(checkpoint.coordinate)}
      icon={symbolIcon(symbol, risk.level)}
      title={markerTitle(risk)}
    >
      {popup}
    </Marker>
  );
}

// At most 5 symbols × 6 levels: build each icon once and reuse it.
const icons = new Map<string, DivIcon>();

function symbolIcon(symbol: MarkerSymbol, level: RiskLevel): DivIcon {
  const key = `${symbol}:${level}`;
  let icon = icons.get(key);
  if (!icon) {
    icon = divIcon({
      html: markerHtml(symbol, level),
      // No class: drop Leaflet's default white box around custom icons.
      className: "",
      iconSize: [SYMBOL_SIZE_PX, SYMBOL_SIZE_PX],
      popupAnchor: [0, -SYMBOL_SIZE_PX / 2],
    });
    icons.set(key, icon);
  }
  return icon;
}
