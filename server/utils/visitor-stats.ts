import type { H3Event } from "h3";

export const VISITOR_COOKIE_NAME = "visitor_id";
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const uniqueVisitorIds = new Set<string>();

export const isValidVisitorId = (value: string | undefined) => {
  return Boolean(value && /^[a-zA-Z0-9_-]{12,80}$/.test(value));
};

const createVisitorId = () => {
  return crypto.randomUUID().replace(/-/g, "");
};

export const getOrCreateVisitorId = (event: H3Event) => {
  const existingId = getCookie(event, VISITOR_COOKIE_NAME);

  if (isValidVisitorId(existingId)) {
    return existingId as string;
  }

  const nextId = createVisitorId();

  setCookie(event, VISITOR_COOKIE_NAME, nextId, {
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  return nextId;
};

export const registerUniqueVisitor = (visitorId: string) => {
  uniqueVisitorIds.add(visitorId);
};

export const getVisitorStats = () => {
  return {
    uniqueVisits: uniqueVisitorIds.size,
  };
};
