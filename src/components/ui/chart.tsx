"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, value]) => value.color);
  if (!colorConfig.length) return null;

  const css = colorConfig
    .map(([key, value]) => `[data-chart="${id}"] { --color-${key}: ${value.color}; }`)
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId().replace(/:/g, "");
  const chartId = id ?? `chart-${uniqueId}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex h-[320px] w-full items-center justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[var(--muted-foreground)] [&_.recharts-cartesian-grid_line]:stroke-[rgba(106,161,160,0.12)] [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-[rgba(106,161,160,0.12)]",
          className
        )}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  className,
  hideLabel = false,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  formatter?: (value: unknown, name: unknown, item: TooltipPayloadItem, index: number, payload: TooltipPayloadItem[]) => React.ReactNode;
  labelFormatter?: (label: unknown, payload: TooltipPayloadItem[]) => React.ReactNode;
  className?: string;
  hideLabel?: boolean;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div className={cn("min-w-[180px] rounded-2xl border border-[var(--border)] bg-white/96 px-3 py-2 shadow-xl", className)}>
      {!hideLabel && (
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {labelFormatter ? labelFormatter(label, payload) : String(label ?? "")}
        </div>
      )}
      <div className="space-y-2">
        {payload.map((item: TooltipPayloadItem, index: number) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const entry = config[key] ?? config[String(item.name)] ?? {};
          const itemLabel = entry.label ?? item.name;
          const itemValue = formatter ? formatter(item.value, item.name, item, index, payload) : item.value;

          return (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color ?? entry.color ?? "var(--primary)" }}
                />
                <span className="text-[var(--muted-foreground)]">{itemLabel}</span>
              </div>
              <span className="font-medium text-[var(--foreground)]">{itemValue as React.ReactNode}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
