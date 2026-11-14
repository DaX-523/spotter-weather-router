import { Slider } from "@/components/ui/slider";
import { CORRIDOR_HOURS, forecastHourLabel, sliderHour } from "@/lib/corridor";

type Props = {
  /** The corridor's hour 0, from the plan. */
  startAt: string;
  /** The origin's: the slider's hours are labelled in its local time. */
  timeZone: string;
  hour: number;
  onChange: (hour: number) => void;
};

/** Picks the hour, from now to 48 hours ahead, that the corridor's shading shows. */
export function ForecastSlider({ startAt, timeZone, hour, onChange }: Props) {
  return (
    <div className="space-y-2 rounded-lg border bg-background/95 p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span id="forecast-hour-label" className="font-medium">
          Forecast hour
        </span>
        <span>{forecastHourLabel(startAt, hour, timeZone)}</span>
      </div>
      <Slider
        aria-labelledby="forecast-hour-label"
        min={0}
        max={CORRIDOR_HOURS}
        step={1}
        value={[hour]}
        onValueChange={(value) => onChange(sliderHour(value))}
        className="py-2"
      />
      <p className="text-xs text-muted-foreground">
        Shading shows the forecast risk along every route at this hour. Symbols
        show the weather when the truck gets there.
      </p>
    </div>
  );
}
