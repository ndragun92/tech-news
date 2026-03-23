export default defineCachedEventHandler(
  async (event) => {
    type CountryInferenceConfidence = "high" | "medium" | "low";
    type CountryInferenceMethod = "publisher" | "domain" | "feed-language" | "unknown";

    type CountryDetails = {
      country: string | null;
      confidence: CountryInferenceConfidence;
      method: CountryInferenceMethod;
      hint: string;
    };

    type FeedItem = {
      source: string;
      sourceHost: string;
      title: string;
      link: string;
      pubDate: string;
      description: string;
      country: string | null;
      countryDetails: CountryDetails;
    };

    type ScoredFeedItem = FeedItem & {
      score: number;
    };

    type FeedResponse = {
      source: string;
      sourceHost: string;
      response: string;
      origin: CountryDetails;
    };

    const query = getQuery(event);

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const filter = (query.filter as string | undefined)?.toLowerCase();

    const decodeXml = (value: string) =>
      value
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .trim();

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

    const KNOWN_PUBLISHER_COUNTRIES: Record<string, Omit<CountryDetails, "method">> = {
      "nuxt.com": {
        country: "France",
        confidence: "medium",
        hint: "Known publisher mapping for Nuxt.",
      },
      "blog.vuejs.org": {
        country: "United States",
        confidence: "low",
        hint: "Known publisher mapping for the Vue ecosystem site.",
      },
      "tailwindcss.com": {
        country: "United States",
        confidence: "high",
        hint: "Known publisher mapping for Tailwind Labs.",
      },
      // "nodejs.org": {
      //   country: "United States",
      //   confidence: "medium",
      //   hint: "Known publisher mapping for the Node.js foundation infrastructure.",
      // },
      "javascriptweekly.com": {
        country: "United Kingdom",
        confidence: "medium",
        hint: "Known publisher mapping for JavaScript Weekly.",
      },
      "css-tricks.com": {
        country: "United States",
        confidence: "high",
        hint: "Known publisher mapping for CSS-Tricks.",
      },
      "smashingmagazine.com": {
        country: "Germany",
        confidence: "high",
        hint: "Known publisher mapping for Smashing Magazine.",
      },
      "blog.risingstack.com": {
        country: "Hungary",
        confidence: "high",
        hint: "Known publisher mapping for RisingStack.",
      },
      "github.blog": {
        country: "United States",
        confidence: "high",
        hint: "Known publisher mapping for GitHub.",
      },
      "dev.to": {
        country: "United States",
        confidence: "high",
        hint: "Known publisher mapping for DEV Community.",
      },
      "medium.com": {
        country: "United States",
        confidence: "high",
        hint: "Known publisher mapping for Medium.",
      },
      "stackoverflow.com": {
        country: "United States",
        confidence: "high",
        hint: "Known publisher mapping for Stack Overflow.",
      },
    };

    const LOCALE_COUNTRY_MAP: Record<string, string> = {
      "en-us": "United States",
      "en-gb": "United Kingdom",
      "en-uk": "United Kingdom",
      "en-au": "Australia",
      "en-ca": "Canada",
      "en-nz": "New Zealand",
      "fr-fr": "France",
      "de-de": "Germany",
      "hu-hu": "Hungary",
    };

    const COUNTRY_CODE_TLD_MAP: Partial<Record<string, string>> = {
      au: "Australia",
      ca: "Canada",
      de: "Germany",
      fr: "France",
      hu: "Hungary",
      nz: "New Zealand",
      uk: "United Kingdom",
      us: "United States",
    };

    const getPublisherCountry = (sourceHost: string): CountryDetails | null => {
      const directMatch = KNOWN_PUBLISHER_COUNTRIES[sourceHost];

      if (directMatch) {
        return {
          ...directMatch,
          method: "publisher",
        };
      }

      const nestedMatch = Object.entries(KNOWN_PUBLISHER_COUNTRIES).find(
        ([host]) => sourceHost === host || sourceHost.endsWith(`.${host}`)
      );

      if (!nestedMatch) {
        return null;
      }

      const [, details] = nestedMatch;

      return {
        ...details,
        method: "publisher",
      };
    };

    const getLanguageCountry = (response: string): CountryDetails | null => {
      const feedLanguage = (
        getTagContent(response, "language") ||
        response.match(/xml:lang=["']([^"']+)["']/i)?.[1] ||
        response.match(/<dc:language>([^<]+)<\/dc:language>/i)?.[1] ||
        ""
      )
        .trim()
        .toLowerCase();

      if (!feedLanguage) {
        return null;
      }

      const normalizedLanguage = feedLanguage.replace(/_/g, "-");
      const matchedCountry =
        LOCALE_COUNTRY_MAP[normalizedLanguage] ||
        LOCALE_COUNTRY_MAP[normalizedLanguage.split(",")[0]?.trim() || ""];

      if (!matchedCountry) {
        return null;
      }

      return {
        country: matchedCountry,
        confidence: "low",
        method: "feed-language",
        hint: `Derived from feed language metadata: ${feedLanguage}.`,
      };
    };

    const getDomainCountry = (sourceHost: string): CountryDetails | null => {
      const segments = sourceHost.split(".");
      const lastSegment = segments.at(-1);
      const lastTwoSegments = segments.slice(-2).join(".");

      if (lastTwoSegments === "co.uk") {
        return {
          country: "United Kingdom",
          confidence: "medium",
          method: "domain",
          hint: `Derived from country-code domain: ${sourceHost}.`,
        };
      }

      if (!lastSegment) {
        return null;
      }

      const matchedCountry = COUNTRY_CODE_TLD_MAP[lastSegment];

      if (!matchedCountry) {
        return null;
      }

      return {
        country: matchedCountry,
        confidence: "medium",
        method: "domain",
        hint: `Derived from country-code domain: ${sourceHost}.`,
      };
    };

    const inferCountryDetails = (source: string, response: string): CountryDetails => {
      const sourceHost = getSourceHost(source);

      return (
        getPublisherCountry(sourceHost) ||
        getLanguageCountry(response) ||
        getDomainCountry(sourceHost) || {
          country: null,
          confidence: "low",
          method: "unknown",
          hint: `No reliable country signal was found for ${sourceHost}.`,
        }
      );
    };

    const parseItems = (response: string, source: string, origin: CountryDetails): FeedItem[] => {
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
          country: origin.country,
          countryDetails: origin,
        };
      });
    };

    const getPublishedAt = (pubDate: string) => {
      const timestamp = Date.parse(pubDate);
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    // 🔥 QUALITY SCORING
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

      HIGH_QUALITY_KEYWORDS.forEach((k) => {
        if (text.includes(k)) score += 2;
      });

      LOW_QUALITY_KEYWORDS.forEach((k) => {
        if (text.includes(k)) score -= 2;
      });

      // trusted sources boost
      if (item.source.includes("nuxt.com")) score += 5;
      if (item.source.includes("vuejs.org")) score += 5;
      if (item.source.includes("nodejs.org")) score += 5;
      if (item.source.includes("github.blog")) score += 4;
      if (item.source.includes("risingstack")) score += 4;

      // noisy platforms penalty
      if (item.source.includes("dev.to")) score -= 1;
      if (item.source.includes("medium.com")) score -= 1;

      return score;
    };

    // 🧹 DEDUPE
    const dedupe = (items: ScoredFeedItem[]) => {
      const seen = new Set();

      return items.filter((item) => {
        const key = item.title.toLowerCase().trim();

        if (seen.has(key)) return false;
        seen.add(key);

        return true;
      });
    };

    // 🧠 STACKOVERFLOW FILTER
    const isGoodStackOverflow = (item: Pick<ScoredFeedItem, "title">) => {
      const text = item.title.toLowerCase();

      if (text.includes("how to")) return false;
      if (text.includes("what is")) return false;

      return (
        text.includes("performance") ||
        text.includes("architecture") ||
        text.includes("optimization") ||
        text.includes("memory") ||
        text.includes("async")
      );
    };

    // 🔗 RSS SOURCES
    const rss = [
      "https://nuxt.com/blog/rss.xml",
      "https://blog.vuejs.org/feed.xml",
      "https://tailwindcss.com/blog/rss.xml",
      // "https://nodejs.org/en/feed/blog.xml",
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

    // 📡 FETCH
    const responses = await Promise.all(
      rss.map(async (url) => {
        try {
          const response = await $fetch<string>(url, {
            responseType: "text",
          });

          const origin = inferCountryDetails(url, response);

          return {
            source: url,
            sourceHost: getSourceHost(url),
            response,
            origin,
          };
        } catch {
          return null;
        }
      })
    );

    // 🧠 PROCESS PIPELINE
    let items: ScoredFeedItem[] = responses
      .filter(isFeedResponse)
      .flatMap(({ response, source, origin }) => parseItems(response, source, origin))
      .map((item) => ({
        ...item,
        score: scoreItem(item),
      }))
      .filter((item) => item.title && item.link);

    // source filter
    if (filter) {
      items = items.filter((item) => item.source.toLowerCase().includes(filter));
    }

    items = dedupe(items)
      .filter((item) => item.score >= 2)
      .filter((item) =>
        item.source.includes("stackoverflow.com") ? isGoodStackOverflow(item) : true
      )
      .sort((a, b) => getPublishedAt(b.pubDate) - getPublishedAt(a.pubDate) || b.score - a.score);

    // 📄 PAGINATION
    const total = items.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    const paginated = items.slice(start, end);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: paginated,
    };
  },
  {
    maxAge: 1000 * 60 * 60, // cache for 1 hour
    getKey: (event) => {
      const query = getQuery(event);
      return `tech-news:${query.page || 1}:${query.limit || 20}:${(query.filter as string | undefined)?.toLowerCase() || "all"}`;
    },
  }
);
