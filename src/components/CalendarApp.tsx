"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  buildMonthGrid,
  formatFullDate,
  formatMonth,
  sameDay,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/date";
import type { MemoryEntry } from "@/lib/memories";
import DayDetail from "./DayDetail";
import FlipDate from "./FlipDate";

type EntriesMap = Record<string, MemoryEntry>;

export default function CalendarApp() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date>(today);
  const [imageDirection, setImageDirection] = useState<"left" | "right">(
    "left",
  );
  const [flipDirection, setFlipDirection] = useState<"up" | "down">("up");
  const [entries, setEntries] = useState<EntriesMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const cells = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/memories", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "加载失败");
      }
      const data: { entries: EntriesMap } = await res.json();
      setEntries(data.entries || {});
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  const selectedKey = toDateKey(selected);
  const selectedEntry = entries[selectedKey] || null;

  const selectedRef = useRef<Date>(selected);

  const handleSelectDate = useCallback(
    (d: Date) => {
      const nextDate = new Date(d);
      if (sameDay(selectedRef.current, nextDate)) return;
      const prev = selectedRef.current;
      const prevTime = new Date(
        prev.getFullYear(),
        prev.getMonth(),
        prev.getDate(),
      ).getTime();
      const nextTime = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate(),
      ).getTime();
      selectedRef.current = nextDate;
      const forward = nextTime > prevTime;
      setImageDirection(forward ? "left" : "right");
      setFlipDirection(forward ? "up" : "down");
      setSelected(nextDate);
    },
    [],
  );

  const onEntryChanged = (entry: MemoryEntry | null, date: string) => {
    setEntries((prev) => {
      const next = { ...prev };
      if (entry) next[date] = entry;
      else delete next[date];
      return next;
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-10 pt-4 sm:gap-6 sm:px-6 sm:pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Souvenir
          </h1>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
            每一天，一张图片，一段故事
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:text-sm"
        >
          退出
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        <section className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-5 lg:flex-1">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <button
              onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))}
              aria-label="上一月"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              ‹
            </button>
            <h2 className="text-base font-semibold sm:text-lg">
              {formatMonth(monthAnchor)}
            </h2>
            <button
              onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))}
              aria-label="下一月"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500 sm:text-sm">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map((d) => {
              const key = toDateKey(d);
              const inMonth = d.getMonth() === monthAnchor.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selected);
              const entry = entries[key];
              return (
                <button
                  key={key}
                  onClick={() => handleSelectDate(d)}
                  className={[
                    "group relative aspect-square overflow-hidden rounded-lg border text-left transition",
                    inMonth
                      ? "border-neutral-200 dark:border-neutral-800"
                      : "border-transparent opacity-40",
                    isSelected
                      ? "ring-2 ring-orange-500 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900"
                      : "hover:border-neutral-300 dark:hover:border-neutral-700",
                  ].join(" ")}
                >
                  {entry?.imageUrl ? (
                    <DayImage
                      src={entry.imageUrl}
                      loaded={!!loadedImages[key]}
                      onLoaded={() =>
                        setLoadedImages((prev) =>
                          prev[key] ? prev : { ...prev, [key]: true },
                        )
                      }
                    />
                  ) : null}
                  <span
                    className={[
                      "absolute left-1 top-1 z-10 text-[11px] font-semibold leading-none sm:left-1.5 sm:top-1.5 sm:text-sm",
                      entry?.imageUrl
                        ? loadedImages[key]
                          ? "text-white drop-shadow"
                          : "text-neutral-700 dark:text-neutral-200"
                        : isToday
                          ? "text-orange-500"
                          : "text-neutral-700 dark:text-neutral-200",
                    ].join(" ")}
                  >
                    {d.getDate()}
                  </span>
                  {isToday && !isSelected ? (
                    <span className="absolute bottom-1 right-1 z-10 h-1.5 w-1.5 rounded-full bg-orange-500 sm:h-2 sm:w-2" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {loading ? (
            <p className="mt-4 text-center text-xs text-neutral-500">
              正在加载回忆…
            </p>
          ) : loadError ? (
            <p className="mt-4 text-center text-xs text-red-500">
              {loadError}{" "}
              <button
                onClick={loadEntries}
                className="underline"
                type="button"
              >
                重试
              </button>
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-5 lg:w-[380px] lg:flex-shrink-0">
          <h3 className="text-sm font-medium text-neutral-500">
            <FlipDate
              text={formatFullDate(selected)}
              direction={flipDirection}
              className="tabular-nums"
            />
          </h3>
          <DayDetail
            date={selectedKey}
            entry={selectedEntry}
            onChange={onEntryChanged}
            imageDirection={imageDirection}
          />
        </section>
      </div>
    </div>
  );
}

function DayImage({
  src,
  loaded,
  onLoaded,
}: {
  src: string;
  loaded: boolean;
  onLoaded: () => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (loaded) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      onLoaded();
    }
  }, [loaded, onLoaded, src]);

  return (
    <>
      {!loaded ? (
        <div
          className="skeleton-shimmer absolute inset-0"
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        className={[
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
        loading="lazy"
        onLoad={onLoaded}
        onError={onLoaded}
      />
      {loaded ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      ) : null}
    </>
  );
}
