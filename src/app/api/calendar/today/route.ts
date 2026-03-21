import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

type CalendarEventType = "meeting" | "delivery" | "task" | "personal";

type CalendarEvent = {
  id: string;
  title: string;
  heure: string;
  startHour: number;
  type: CalendarEventType;
  color: string;
};

const GOOGLE_COLORS: Record<string, string> = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6bf26",
  "6": "#f4511e",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d50000",
};

function guessEventType(titleRaw: string): CalendarEventType {
  const title = titleRaw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (title.includes("livraison") || title.includes("reception")) return "delivery";
  if (title.includes("implantation") || title.includes("inventaire") || title.includes("mise en")) return "task";
  if (title.includes("dejeuner") || title.includes("pause") || title.includes("perso")) return "personal";
  return "meeting";
}

function formatHours(value: Date) {
  const hh = value.getHours();
  const mm = String(value.getMinutes()).padStart(2, "0");
  return `${hh}h${mm}`;
}

export async function GET(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.accessToken;

  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Google Calendar API error" }, { status: response.status });
  }

  const data = (await response.json()) as {
    items?: Array<{
      id?: string;
      summary?: string;
      colorId?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  const events: CalendarEvent[] = (data.items ?? [])
    .map((item) => {
      const startValue = item.start?.dateTime ?? item.start?.date;
      const endValue = item.end?.dateTime ?? item.end?.date;
      if (!startValue || !endValue) return null;

      const start = new Date(startValue);
      const end = new Date(endValue);
      const title = item.summary?.trim() || "Sans titre";

      return {
        id: item.id || `${title}-${start.toISOString()}`,
        title,
        heure: `${formatHours(start)} – ${formatHours(end)}`,
        startHour: start.getHours(),
        type: guessEventType(title),
        color: item.colorId ? GOOGLE_COLORS[item.colorId] ?? "#1d5fa0" : "#1d5fa0",
      } as CalendarEvent;
    })
    .filter((item): item is CalendarEvent => item !== null);

  return NextResponse.json(events);
}
