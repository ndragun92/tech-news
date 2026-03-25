import {
  getOrCreateVisitorId,
  getVisitorStats,
  registerUniqueVisitor,
} from "../../../utils/visitor-stats";

type VisitorStatsResponse = {
  uniqueVisits: number;
  updatedAt: string;
};

export default defineEventHandler((event): VisitorStatsResponse => {
  const now = Date.now();
  const visitorId = getOrCreateVisitorId(event);

  registerUniqueVisitor(visitorId);

  const stats = getVisitorStats();

  setHeader(event, "cache-control", "no-store, no-cache, must-revalidate, max-age=0");

  return {
    uniqueVisits: stats.uniqueVisits,
    updatedAt: new Date(now).toISOString(),
  };
});
