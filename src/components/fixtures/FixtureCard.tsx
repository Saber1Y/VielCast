import Link from "next/link";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { teamCode } from "@/lib/teams";

type Fixture = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  startDate: string;
  competition: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  roomCount?: number;
};

function StatusBadge({
  status,
  minute,
  startDate,
}: {
  status: string;
  minute?: string;
  startDate: string;
}) {
  if (status === "live") {
    return (
      <span className="status-pill border border-white/10 text-zinc-300">
        <span className="bg-red-500 animate-pulse rounded-full" />
        {minute ?? "Live"}
      </span>
    );
  }

  if (status === "finished") {
    return (
      <span className="status-pill border border-white/10 text-zinc-500">
        <span className="bg-zinc-500 rounded-full" />
        Final
      </span>
    );
  }

  return (
    <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-1">
      <CountdownTimer targetDate={startDate} />
    </span>
  );
}

export function FixtureCard({
  fixture,
  variant = "default",
}: {
  fixture: Fixture;
  variant?: "hero" | "default";
}) {
  const homeCode = teamCode(fixture.homeTeam);
  const awayCode = teamCode(fixture.awayTeam);

  const isLive = fixture.status === "live";
  const isFinished = fixture.status === "finished";
  const isUpcoming = fixture.status === "upcoming" || fixture.status === "scheduled";

  const showScore = isLive || isFinished;

  if (variant === "hero") {
    return (
      <Link href={`/fixtures/${fixture.id}`}>
        <div className="glass-card group p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              {fixture.competition}
            </span>
            {isLive && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                football-data.org
              </span>
            )}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-xl font-bold">
                {homeCode ? (
                  <img
                    src={`https://flagcdn.com/${homeCode.toLowerCase()}.svg`}
                    alt={fixture.homeTeam}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  fixture.homeTeam.charAt(0)
                )}
              </div>
              <span className="text-xs text-zinc-400">{fixture.homeTeam}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              {showScore ? (
                <span className="text-3xl font-bold tracking-tight">
                  {fixture.homeScore} - {fixture.awayScore}
                </span>
              ) : (
                <span className="text-sm text-zinc-500">vs</span>
              )}
              <StatusBadge
                status={fixture.status}
                minute={fixture.minute}
                startDate={fixture.startDate}
              />
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-xl font-bold">
                {awayCode ? (
                  <img
                    src={`https://flagcdn.com/${awayCode.toLowerCase()}.svg`}
                    alt={fixture.awayTeam}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  fixture.awayTeam.charAt(0)
                )}
              </div>
              <span className="text-xs text-zinc-400">{fixture.awayTeam}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              {fixture.roomCount ?? 0} prediction rooms
            </span>
            <span className="text-cyan-accent opacity-0 transition-opacity group-hover:opacity-100">
              {isUpcoming ? "Start a room →" : isLive ? "View match →" : "View receipts →"}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <div className="glass-card group flex items-center gap-4 p-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold shrink-0">
            {homeCode ? (
              <img
                src={`https://flagcdn.com/${homeCode.toLowerCase()}.svg`}
                alt={fixture.homeTeam}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              fixture.homeTeam.charAt(0)
            )}
          </div>
          <span className="truncate text-sm text-zinc-200">{fixture.homeTeam}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          {showScore ? (
            <span className="font-mono text-sm font-bold">
              {fixture.homeScore} - {fixture.awayScore}
            </span>
          ) : (
            <span className="text-xs text-zinc-500">vs</span>
          )}
          <StatusBadge
            status={fixture.status}
            minute={fixture.minute}
            startDate={fixture.startDate}
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <span className="truncate text-sm text-zinc-200">{fixture.awayTeam}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold shrink-0">
            {awayCode ? (
              <img
                src={`https://flagcdn.com/${awayCode.toLowerCase()}.svg`}
                alt={fixture.awayTeam}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              fixture.awayTeam.charAt(0)
            )}
          </div>
        </div>

        <div className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ${
          isUpcoming
            ? "bg-green-accent/10 text-green-accent"
            : isLive
              ? "bg-red-500/10 text-red-400"
              : "bg-zinc-500/10 text-zinc-500"
        }`}>
          {isUpcoming ? "Create Room" : isLive ? "View Match" : "Receipts"}
        </div>
      </div>
    </Link>
  );
}
