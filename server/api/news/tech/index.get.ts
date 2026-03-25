export default defineCachedEventHandler(
  async (event) => {
    type FeedItem = {
      source: string;
      sourceHost: string;
      title: string;
      link: string;
      pubDate: string;
      description: string;
    };

    type ScoredFeedItem = FeedItem & {
      score: number;
    };

    type FeedResponse = {
      source: string;
      sourceHost: string;
      response: string;
    };

    const query = getQuery(event);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const filter = (query.filter as string | undefined)?.toLowerCase();

    const decodeXml = (value: string) => {
      return value
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .trim();
    };

    const getTagContent = (source: string, tagName: string) => {
      const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const match = source.match(
        new RegExp(`<${escapedTagName}[^>]*>([\\s\\S]*?)</${escapedTagName}>`, "i")
      );

      return decodeXml(match?.[1] || "");
    };

    const getDate = (itemContent: string) => {
      return (
        getTagContent(itemContent, "pubDate") ||
        getTagContent(itemContent, "published") ||
        getTagContent(itemContent, "updated")
      );
    };

    const getSourceHost = (sourceUrl: string) => {
      try {
        return new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        return "unknown";
      }
    };

    const parseItems = (response: string, source: string): FeedItem[] => {
      const isAtom = response.includes("<entry>");
      const sourceHost = getSourceHost(source);

      const regex = isAtom
        ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
        : /<item\b[^>]*>([\s\S]*?)<\/item>/gi;

      return Array.from(response.matchAll(regex)).map(([, item]) => {
        const content = item || "";

        return {
          source,
          sourceHost,
          title: getTagContent(content, "title"),
          link: getTagContent(content, "link") || content.match(/href="([^"]+)"/)?.[1] || "",
          pubDate: getDate(content),
          description:
            getTagContent(content, "description") ||
            getTagContent(content, "summary") ||
            getTagContent(content, "content"),
        };
      });
    };

    const getPublishedAt = (pubDate: string) => {
      const timestamp = Date.parse(pubDate);
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    const HIGH_QUALITY_KEYWORDS = [
      "architecture",
      "performance",
      "scaling",
      "advanced",
      "deep dive",
      "internals",
      "optimization",
      "production",
      "patterns",
    ];

    const LOW_QUALITY_KEYWORDS = [
      "beginner",
      "introduction",
      "what is",
      "basics",
      "simple guide",
      "for beginners",
    ];

    const scoreItem = (item: Pick<FeedItem, "title" | "description" | "source">) => {
      const text = `${item.title} ${item.description}`.toLowerCase();

      let score = 0;

      HIGH_QUALITY_KEYWORDS.forEach((keyword) => {
        if (text.includes(keyword)) {
          score += 2;
        }
      });

      LOW_QUALITY_KEYWORDS.forEach((keyword) => {
        if (text.includes(keyword)) {
          score -= 2;
        }
      });

      if (item.source.includes("nuxt.com")) score += 5;
      if (item.source.includes("vuejs.org")) score += 5;
      if (item.source.includes("nodejs.org")) score += 5;
      if (item.source.includes("github.blog")) score += 4;
      if (item.source.includes("risingstack")) score += 4;

      if (item.source.includes("dev.to")) score -= 1;
      if (item.source.includes("medium.com")) score -= 1;

      return score;
    };

    const dedupe = (items: ScoredFeedItem[]) => {
      const seen = new Set<string>();

      return items.filter((item) => {
        const key = item.title.toLowerCase().trim();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
    };

    const isGoodStackOverflow = (item: Pick<ScoredFeedItem, "title">) => {
      const text = item.title.toLowerCase();

      if (text.includes("how to") || text.includes("what is")) {
        return false;
      }

      return (
        text.includes("performance") ||
        text.includes("architecture") ||
        text.includes("optimization") ||
        text.includes("memory") ||
        text.includes("async")
      );
    };

    const rss = [
      "https://nuxt.com/blog/rss.xml",
      "https://blog.vuejs.org/feed.xml",
      "https://tailwindcss.com/blog/rss.xml",
      "https://javascriptweekly.com/rss",
      "https://css-tricks.com/feed",
      "https://www.smashingmagazine.com/feed",
      "https://blog.risingstack.com/rss/",
      "https://github.blog/feed",
      "https://dev.to/feed/tag/vue",
      "https://dev.to/feed/tag/node",
      "https://dev.to/feed/tag/nuxt",
      "https://dev.to/feed/tag/typescript",
      "https://dev.to/feed/tag/adonisjs",
      "https://medium.com/feed/tag/javascript",
      "https://medium.com/feed/tag/vuejs",
      "https://medium.com/feed/tag/nuxtjs",
      "https://medium.com/feed/tag/nodejs",
      "https://medium.com/feed/tag/typescript",
      "https://stackoverflow.com/feeds/tag/javascript",
      "https://stackoverflow.com/feeds/tag/vue.js",
      "https://stackoverflow.com/feeds/tag/nuxt.js",
      "https://stackoverflow.com/feeds/tag/node.js",
      "https://stackoverflow.com/feeds/tag/typescript",
    ];

    const isFeedResponse = (value: FeedResponse | null): value is FeedResponse => Boolean(value);

    const responses = await Promise.all(
      rss.map(async (url) => {
        try {
          const response = await $fetch<string>(url, {
            responseType: "text",
          });

          return {
            source: url,
            sourceHost: getSourceHost(url),
            response,
          };
        } catch {
          return null;
        }
      })
    );

    let items: ScoredFeedItem[] = responses
      .filter(isFeedResponse)
      .flatMap(({ response, source }) => parseItems(response, source))
      .map((item) => ({
        ...item,
        score: scoreItem(item),
      }))
      .filter((item) => item.title && item.link);

    if (filter) {
      items = items.filter((item) => item.source.toLowerCase().includes(filter));
    }

    items = dedupe(items)
      .filter((item) => item.score >= 2)
      .filter((item) =>
        item.source.includes("stackoverflow.com") ? isGoodStackOverflow(item) : true
      )
      .sort((a, b) => getPublishedAt(b.pubDate) - getPublishedAt(a.pubDate) || b.score - a.score);

    const total = items.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = items.slice(start, end);

    const todayDateKey = new Date().toISOString().slice(0, 10);
    const todayTotal = items.filter((item) => {
      const ts = getPublishedAt(item.pubDate);
      return ts ? new Date(ts).toISOString().slice(0, 10) === todayDateKey : false;
    }).length;

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      todayTotal,
      data: paginated,
    };
  },
  {
    maxAge: 1000 * 60 * 60,
    getKey: (event) => {
      const query = getQuery(event);
      return `tech-news:${query.page || 1}:${query.limit || 20}:${(query.filter as string | undefined)?.toLowerCase() || "all"}`;
    },
  }
);
