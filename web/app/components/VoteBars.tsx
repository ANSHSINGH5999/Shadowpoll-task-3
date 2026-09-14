type VoteBarsProps = {
  yesVotes: number;
  noVotes: number;
};

function Bar({
  label,
  value,
  max,
  colorVar,
}: {
  label: string;
  value: number;
  max: number;
  colorVar: string;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 shrink-0 text-sm text-[var(--muted)]">{label}</div>
      <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%`, background: `var(${colorVar})` }}
        />
      </div>
      <div className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

export function VoteBars({ yesVotes, noVotes }: VoteBarsProps) {
  const max = Math.max(yesVotes, noVotes, 1);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--series-yes)" }}
          />
          Yes
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--series-no)" }}
          />
          No
        </span>
      </div>
      <Bar label="Yes" value={yesVotes} max={max} colorVar="--series-yes" />
      <Bar label="No" value={noVotes} max={max} colorVar="--series-no" />
    </div>
  );
}
