"use client";

import { useFormatter, useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { formatIsoDate, gregorianToJdn, jdnToGregorian, parseIsoDate, toEthiopian } from "@/lib/ethiopian-calendar";

/**
 * One event date, prepared on the server (times already in Stockholm time). Kept compact: the page
 * sends 13 months of these to the browser (task 10). Optional fields are left out when empty.
 */
export type CalendarEntry = {
  title: string;
  date: string; // first day, YYYY-MM-DD (Stockholm)
  endDate?: string; // last day, only for multi-day events
  time?: string; // "08:00–11:30"; absent for all-day
  status?: "cancelled" | "moved"; // absent when scheduled
  note?: string;
  location?: string; // absent when it is the default location
};

type MonthKey = `ethiopianMonths.m${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13}`;

const jdnOf = (iso: string) => gregorianToJdn(parseIsoDate(iso)!);
const isoOf = (jdn: number) => formatIsoDate(jdnToGregorian(jdn));
const monthOf = (iso: string) => iso.slice(0, 7);
const noonUtc = (iso: string) => new Date(`${iso}T12:00:00Z`);
/** Monday = 0 … Sunday = 6 (weeks start on Monday, as in Sweden). */
const weekdayIndex = (jdn: number) => jdn % 7;

/**
 * Month view of the church calendar (spec §5 EventCalendar): Gregorian and Ethiopian dates in every
 * day, keyboard navigable (arrows: day/week, Home/End: start/end of week, PageUp/PageDown: month),
 * the chosen day's services and events listed below. Cancelled dates are struck through.
 */
export function CalendarMonth({
  entries,
  defaultLocation,
  today,
  firstMonth,
  lastMonth,
}: {
  entries: CalendarEntry[];
  defaultLocation: string | null;
  today: string;
  firstMonth: string;
  lastMonth: string;
}) {
  const t = useTranslations("calendar");
  const te = useTranslations("events");
  const format = useFormatter();
  const [selected, setSelected] = useState(today);
  const [keyboard, setKeyboard] = useState(false);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const month = monthOf(selected);

  // Each entry on every day it covers (multi-day fasts).
  const byDay = useMemo(() => {
    const map = new Map<string, (CalendarEntry & { key: number })[]>();
    for (const [key, item] of entries.entries()) {
      const entry = { ...item, key };
      for (let d = jdnOf(entry.date); d <= jdnOf(entry.endDate ?? entry.date); d++) {
        const iso = isoOf(d);
        map.set(iso, [...(map.get(iso) ?? []), entry]);
      }
    }
    return map;
  }, [entries]);

  const first = jdnOf(`${month}-01`);
  const last = jdnOf(`${monthOf(isoOf(first + 31))}-01`) - 1;
  const firstDay = jdnOf(`${firstMonth}-01`);
  const lastDay = jdnOf(`${monthOf(isoOf(jdnOf(`${lastMonth}-01`) + 31))}-01`) - 1;
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(weekdayIndex(first)).fill(null);
  for (let d = first; d <= last; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  useEffect(() => {
    if (keyboard) cells.current.get(selected)?.focus();
  }, [selected, keyboard]);

  const select = (jdn: number, viaKeyboard = false) => {
    setKeyboard(viaKeyboard);
    setSelected(isoOf(Math.min(Math.max(jdn, firstDay), lastDay)));
  };
  const shiftMonth = (by: number) => {
    const g = parseIsoDate(selected)!;
    const target = new Date(Date.UTC(g.year, g.month - 1 + by, 1));
    const days = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(g.day, days));
    return jdnOf(target.toISOString().slice(0, 10));
  };
  const onKeyDown = (event: KeyboardEvent, jdn: number) => {
    const moves: Record<string, () => number> = {
      ArrowLeft: () => jdn - 1,
      ArrowRight: () => jdn + 1,
      ArrowUp: () => jdn - 7,
      ArrowDown: () => jdn + 7,
      Home: () => jdn - weekdayIndex(jdn),
      End: () => jdn + 6 - weekdayIndex(jdn),
      PageUp: () => shiftMonth(-1),
      PageDown: () => shiftMonth(1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    select(move(), true);
  };

  const ethiopianLabel = (jdn: number) => {
    const eth = toEthiopian(jdnToGregorian(jdn));
    return eth.day === 1 ? t("ethiopianDayMonth", { day: "1", month: t(`ethiopianMonths.m${eth.month}` as MonthKey) }) : String(eth.day);
  };
  const ethiopianFull = (jdn: number) => {
    const eth = toEthiopian(jdnToGregorian(jdn));
    return t("ethiopianDate", { day: String(eth.day), month: t(`ethiopianMonths.m${eth.month}` as MonthKey), year: String(eth.year) });
  };
  const fullDate = (iso: string) =>
    format.dateTime(noonUtc(iso), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const firstEth = toEthiopian(jdnToGregorian(first));
  const lastEth = toEthiopian(jdnToGregorian(last));
  const ethMonths = [firstEth, lastEth]
    .map((e) => t(`ethiopianMonths.m${e.month}` as MonthKey))
    .filter((name, i, all) => all.indexOf(name) === i)
    .join("–");
  const caption = `${format.dateTime(noonUtc(`${month}-15`), { month: "long", year: "numeric", timeZone: "UTC" })} · ${ethMonths} ${lastEth.year}`;
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    // 2026-10-19 is a Monday.
    format.dateTime(noonUtc(isoOf(jdnOf("2026-10-19") + i)), { weekday: "short", timeZone: "UTC" }),
  );
  const dayEntries = byDay.get(selected) ?? [];
  const navButton = "min-h-11 min-w-11 rounded border-2 border-primary px-3 font-medium text-primary hover:bg-white disabled:opacity-40";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className={navButton} onClick={() => select(shiftMonth(-1))} disabled={month <= firstMonth}>
          <span aria-hidden="true">‹ </span>
          {t("previousMonth")}
        </button>
        <button type="button" className={navButton} onClick={() => select(jdnOf(today))}>
          {t("today")}
        </button>
        <button type="button" className={navButton} onClick={() => select(shiftMonth(1))} disabled={month >= lastMonth}>
          {t("nextMonth")}
          <span aria-hidden="true"> ›</span>
        </button>
      </div>

      <table aria-labelledby="calendar-caption" className="w-full table-fixed border-collapse">
        <caption id="calendar-caption" className="mb-2 text-start font-serif text-h3 text-primary" aria-live="polite">
          {caption}
        </caption>
        <thead>
          <tr>
            {weekdayNames.map((name) => (
              <th key={name} scope="col" className="pb-1 text-sm font-semibold text-muted">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((days, w) => (
            <tr key={w}>
              {days.map((jdn, i) => {
                if (jdn === null) return <td key={i} className="border border-cream/0" />;
                const iso = isoOf(jdn);
                const items = byDay.get(iso) ?? [];
                const isSelected = iso === selected;
                return (
                  <td key={iso} className="border border-cream p-0 align-top">
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) cells.current.set(iso, el);
                        else cells.current.delete(iso);
                      }}
                      tabIndex={isSelected ? 0 : -1}
                      aria-pressed={isSelected}
                      aria-current={iso === today ? "date" : undefined}
                      aria-label={`${fullDate(iso)}, ${ethiopianFull(jdn)}: ${t("eventCount", { count: items.length })}`}
                      onClick={() => select(jdn)}
                      onKeyDown={(event) => onKeyDown(event, jdn)}
                      className={`flex h-full min-h-14 w-full flex-col items-start gap-0.5 p-1 text-start sm:min-h-24 sm:p-2 ${
                        isSelected ? "bg-primary text-cream" : "bg-white hover:bg-cream"
                      }`}
                    >
                      <span className={`font-semibold ${iso === today && !isSelected ? "rounded-full bg-gold px-1.5 text-ink" : ""}`}>
                        {jdnToGregorian(jdn).day}
                      </span>
                      <span className={`text-xs ${isSelected ? "text-cream" : "text-muted"}`}>{ethiopianLabel(jdn)}</span>
                      {items.length > 0 && (
                        <span className="mt-auto flex flex-wrap gap-1" aria-hidden="true">
                          {items.slice(0, 2).map((item) => (
                            <span
                              key={item.key}
                              className={`hidden max-w-full truncate rounded px-1 text-xs sm:block ${
                                isSelected ? "bg-cream text-primary" : "bg-cream text-ink"
                              } ${item.status === "cancelled" ? "line-through" : ""}`}
                            >
                              {item.title}
                            </span>
                          ))}
                          {items.slice(0, 3).map((item) => (
                            <span key={`dot-${item.key}`} className={`h-2 w-2 rounded-full sm:hidden ${isSelected ? "bg-cream" : "bg-primary"}`} />
                          ))}
                          {items.length > 2 && <span className="hidden text-xs sm:inline">+{items.length - 2}</span>}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <section aria-live="polite" aria-labelledby="calendar-day" className="mt-6 rounded bg-white p-5 shadow-sm">
        <h2 id="calendar-day" className="text-h3">
          {fullDate(selected)}
        </h2>
        <p className="text-muted">{ethiopianFull(jdnOf(selected))}</p>
        {dayEntries.length === 0 ? (
          <p className="mt-3">{t("noEvents")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {dayEntries.map((entry) => (
              <li key={entry.key} className="border-s-4 border-gold ps-3">
                <p className={`font-semibold ${entry.status === "cancelled" ? "line-through" : ""}`}>
                  {entry.time ? `${entry.time} · ` : ""}
                  {entry.title}
                </p>
                {entry.status && (
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-sm font-semibold ${
                      entry.status === "cancelled" ? "bg-error text-white" : "bg-primary text-cream"
                    }`}
                  >
                    {te(entry.status)}
                  </span>
                )}
                {(entry.location || defaultLocation) && (
                  <p>
                    <span className="font-semibold">{te("location")}:</span> {entry.location || defaultLocation}
                  </p>
                )}
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
