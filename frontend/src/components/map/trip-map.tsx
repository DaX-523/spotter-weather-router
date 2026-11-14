// The only place that imports Leaflet. Kept thin: every value drawn is computed in @/lib.
import "leaflet/dist/leaflet.css";

import {
  canvas,
  divIcon,
  type DivIcon,
  type LeafletMouseEvent,
  type PathOptions,
} from "leaflet";
import { memo, useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import { CheckpointDetails } from "@/components/trip-planner/checkpoint-details";
import type {
  Checkpoint,
  Coordinate,
  Corridor,
  RiskLevel,
  Route,
} from "@/lib/api";
import { corridorRadiusMeters, hazardsAt } from "@/lib/corridor";
import {
  boundsOf,
  fitPadding,
  toLatLng,
  type Endpoints,
  type LatLng,
} from "@/lib/map";
import {
  checkpointMarkerHtml,
  corridorHazardMarkerHtml,
  endpointMarkerHtml,
  truckPositionMarkerHtml,
  type Endpoint,
} from "@/lib/map-markers";
import {
  RISK_LEVELS,
  markerSymbol,
  markerTitle,
  riskColorToken,
} from "@/lib/risk";
import { isDrivable, routeTooltip } from "@/lib/routes";
import { themeColor } from "@/lib/theme";

// The contiguous US, before there is a trip to show.
const US_CENTER: LatLng = [39.5, -98.35];
const US_ZOOM = 4;
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// OpenStreetMap's tile usage policy requires this attribution.
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// Route lines are a few pixels wide; a click this close to one still picks it.
const ROUTE_HIT_TOLERANCE_PX = 12;
const ROUTE_WEIGHT = { selected: 6, alternative: 4, hovered: 7 };
// A route crossing No Travel conditions is drawn dashed: it must not be driven.
const NOT_DRIVABLE_DASH = "8 8";
// Marker sizes: the hit area of a low-risk dot is bigger than the dot (see .checkpoint-dot).
const DOT_SIZE_PX = 22;
const SYMBOL_SIZE_PX = 26;
const ORIGIN_SIZE_PX = 32;
const DESTINATION_SIZE: LatLng = [30, 40];
// Endpoints sit above every checkpoint marker; the truck's ring sits under them.
const ENDPOINT_Z_OFFSET = 1_000;
const TRUCK_SIZE_PX = 44;
const TRUCK_Z_OFFSET = -1_000;
// The callouts naming what makes the shading risky float this far above their spot, under the
// route's own markers.
const HAZARD_SIZE_PX = 24;
const HAZARD_LIFT_PX = 10;
const HAZARD_Z_OFFSET = -500;
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
  endpoints: Endpoints | null;
  corridor: Corridor | null;
  /** Hours from the corridor's start, 0 to 48. */
  corridorHour: number;
  spacingMi: number;
  /** Where the truck is at the slider's hour, while it is on the road. */
  truckAt: Coordinate | null;
};

export const TripMap = memo(function TripMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  endpoints,
  corridor,
  corridorHour,
  spacingMi,
  truckAt,
}: Props) {
  const bounds = useMemo(() => boundsOf(routes), [routes]);
  const renderer = useMemo(
    () => canvas({ tolerance: ROUTE_HIT_TOLERANCE_PX }),
    [],
  );
  const selected = routes.find((route) => route.id === selectedRouteId);
  const alternatives = routes.filter((route) => route !== selected);
  const checkpoints = selected?.checkpoints ?? [];

  return (
    <section aria-label="Map" className="relative h-full min-h-[60svh]">
      <MapContainer
        center={US_CENTER}
        zoom={US_ZOOM}
        preferCanvas
        renderer={renderer}
        className="absolute inset-0"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FollowContainerSize />
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
        {corridor && (
          <CorridorHazards corridor={corridor} hour={corridorHour} />
        )}
        {/* Alternatives first, so the selected route is drawn on top of them. */}
        {alternatives.map((route) => (
          <RouteLine
            key={route.id}
            route={route}
            tooltip={routeTooltip(routes, route)}
            onSelect={onSelectRoute}
          />
        ))}
        {selected && (
          <RouteLine
            key={selected.id}
            route={selected}
            selected
            onSelect={onSelectRoute}
          />
        )}
        {/* Markers live in Leaflet's marker pane, always above every route line. */}
        {truckAt && (
          <Marker
            position={toLatLng(truckAt)}
            icon={cachedIcon(truckPositionMarkerHtml(), [
              TRUCK_SIZE_PX,
              TRUCK_SIZE_PX,
            ])}
            interactive={false}
            zIndexOffset={TRUCK_Z_OFFSET}
          />
        )}
        {checkpoints.slice(1, -1).map((checkpoint) => (
          <CheckpointMarker
            key={checkpoint.mile_marker_mi}
            checkpoint={checkpoint}
          />
        ))}
        {endpoints && checkpoints.length > 0 && (
          <>
            <EndpointMarker
              endpoint="origin"
              name={endpoints.origin.name}
              checkpoint={checkpoints[0]}
            />
            <EndpointMarker
              endpoint="destination"
              name={endpoints.destination.name}
              checkpoint={checkpoints[checkpoints.length - 1]}
            />
          </>
        )}
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

/** Says what the shading means: at every spot that isn't low risk at the hour, a callout with
 * the hazard's symbol, and its reasons when hovered. */
const CorridorHazards = memo(function CorridorHazards({
  corridor,
  hour,
}: {
  corridor: Corridor;
  hour: number;
}) {
  const hazards = useMemo(() => hazardsAt(corridor, hour), [corridor, hour]);
  return hazards.map((hazard) => (
    <Marker
      // A marker's title is set once, so a new reason gets a new marker.
      key={`${hazard.coordinate.lat},${hazard.coordinate.lon},${hazard.title}`}
      position={toLatLng(hazard.coordinate)}
      icon={cachedIcon(
        corridorHazardMarkerHtml(hazard.kind, hazard.level),
        [HAZARD_SIZE_PX, HAZARD_SIZE_PX],
        [HAZARD_SIZE_PX / 2, HAZARD_SIZE_PX + HAZARD_LIFT_PX],
      )}
      title={hazard.title}
      // The forecast panel lists the same reasons for keyboards and screen readers.
      keyboard={false}
      zIndexOffset={HAZARD_Z_OFFSET}
    />
  ));
});

/** Keeps the map filling its box as the trip panel slides open or shut. It keeps its centre, so
 * the routes glide along with the panel instead of jumping when it stops. */
function FollowContainerSize() {
  const map = useMap();
  useEffect(() => {
    // Called on every frame of the panel's slide.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Re-frames the map when a new plan arrives, not when the driver picks another route. */
function FitBounds({ bounds }: { bounds: [LatLng, LatLng] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, fitPadding(map.getSize().y));
  }, [map, bounds]);
  return null;
}

/** A route line. An alternative thickens on hover and says how to pick it. */
const RouteLine = memo(function RouteLine({
  route,
  selected = false,
  tooltip,
  onSelect,
}: {
  route: Route;
  selected?: boolean;
  tooltip?: string;
  onSelect: (routeId: number) => void;
}) {
  const positions = useMemo(
    () => route.polyline.map(toLatLng),
    [route.polyline],
  );
  const weight = selected ? ROUTE_WEIGHT.selected : ROUTE_WEIGHT.alternative;
  const eventHandlers = useMemo(
    () => ({
      click: () => onSelect(route.id),
      mouseover: (event: LeafletMouseEvent) =>
        event.target.setStyle({ weight: ROUTE_WEIGHT.hovered }),
      mouseout: (event: LeafletMouseEvent) => event.target.setStyle({ weight }),
    }),
    [onSelect, route.id, weight],
  );
  return (
    <Polyline
      positions={positions}
      eventHandlers={eventHandlers}
      pathOptions={{
        color: themeColor(selected ? "map-route" : "map-route-alternative"),
        weight,
        dashArray: isDrivable(route) ? undefined : NOT_DRIVABLE_DASH,
      }}
    >
      {tooltip && <Tooltip sticky>{tooltip}</Tooltip>}
    </Polyline>
  );
});

/** A plain dot where the risk is low; a symbol, like a road hazard sign, everywhere else. */
function CheckpointMarker({ checkpoint }: { checkpoint: Checkpoint }) {
  const { risk } = checkpoint;
  const symbol = markerSymbol(risk);
  const size = symbol === null ? DOT_SIZE_PX : SYMBOL_SIZE_PX;
  return (
    <Marker
      position={toLatLng(checkpoint.coordinate)}
      icon={cachedIcon(checkpointMarkerHtml(symbol, risk.level), [size, size])}
      title={markerTitle(risk)}
    >
      <Popup>
        <CheckpointDetails checkpoint={checkpoint} />
      </Popup>
    </Marker>
  );
}

/** The trip's start (a truck) and end (a flag pin), above everything, like map apps mark them. */
function EndpointMarker({
  endpoint,
  name,
  checkpoint,
}: {
  endpoint: Endpoint;
  name: string;
  checkpoint: Checkpoint;
}) {
  const label = endpoint === "origin" ? "Origin" : "Destination";
  const isOrigin = endpoint === "origin";
  const size: LatLng = isOrigin
    ? [ORIGIN_SIZE_PX, ORIGIN_SIZE_PX]
    : DESTINATION_SIZE;
  return (
    <Marker
      position={toLatLng(checkpoint.coordinate)}
      icon={cachedIcon(
        endpointMarkerHtml(endpoint, checkpoint.risk.level),
        size,
        // A pin points at its place with its tip; the truck disc sits centred on it.
        isOrigin ? undefined : [size[0] / 2, size[1]],
      )}
      title={`${label}: ${name}`}
      zIndexOffset={ENDPOINT_Z_OFFSET}
    >
      <Popup>
        <CheckpointDetails
          checkpoint={checkpoint}
          title={`${label} · ${name}`}
        />
      </Popup>
    </Marker>
  );
}

// Few distinct markers (symbols × levels, plus the endpoints): build each icon once.
const icons = new Map<string, DivIcon>();

function cachedIcon(html: string, size: LatLng, anchor?: LatLng): DivIcon {
  const key = `${html}|${size}|${anchor}`;
  let icon = icons.get(key);
  if (!icon) {
    icon = divIcon({
      html,
      // No class: drop Leaflet's default white box around custom icons.
      className: "",
      iconSize: size,
      iconAnchor: anchor,
      popupAnchor: anchor ? [0, -size[1]] : [0, -size[1] / 2],
    });
    icons.set(key, icon);
  }
  return icon;
}
