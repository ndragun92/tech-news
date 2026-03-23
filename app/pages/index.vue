<script setup lang="ts">
import sanitizeHtml from "sanitize-html";
import { mergeProps } from "vue";

type TechNewsItem = {
  source: string;
  sourceHost: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  score: number;
};

type TechNewsResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: TechNewsItem[];
};

type CountStat = {
  label: string;
  value: number;
  note: string;
};

type RankedLabel = {
  label: string;
  count: number;
};

const PAGE_SIZE = 12;
const MONITORED_SOURCES = [
  "nuxt.com",
  "blog.vuejs.org",
  "tailwindcss.com",
  "javascriptweekly.com",
  "css-tricks.com",
  "smashingmagazine.com",
  "blog.risingstack.com",
  "github.blog",
  "dev.to",
  "medium.com",
  "stackoverflow.com",
];
const CALENDAR_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const feedBottomRef = ref<HTMLElement | null>(null);
const loadedItems = ref<TechNewsItem[]>([]);
const currentPage = ref(0);
const totalPages = ref(0);
const totalItems = ref(0);
const seenNewsLinks = useLocalStorage<string[]>("tech-news-seen-links", []);
const activeFeedItem = ref<TechNewsItem | null>(null);
const isLoadingMore = ref(false);
const isRefreshing = ref(false);

const createEmptyResponse = (): TechNewsResponse => ({
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  data: [],
});

const {
  data: initialResponse,
  pending,
  error,
  refresh,
} = await useAsyncData<TechNewsResponse>(
  "tech-news-latest",
  () =>
    $fetch("/api/news/tech", {
      query: {
        page: 1,
        limit: PAGE_SIZE,
      },
    }),
  {
    default: createEmptyResponse,
  }
);

const getPublishedTimestamp = (value: string) => {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatAbsoluteDate = (value: string) => {
  const timestamp = getPublishedTimestamp(value);

  if (!timestamp) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
};

const formatRelativeDate = (value: string) => {
  const timestamp = getPublishedTimestamp(value);

  if (!timestamp) {
    return "Freshly added";
  }

  const diffInMinutes = Math.round((timestamp - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, "hour");
  }

  return rtf.format(Math.round(diffInHours / 24), "day");
};

const getCalendarDateKey = (value: string) => {
  const timestamp = getPublishedTimestamp(value);

  if (!timestamp) {
    return "";
  }

  return CALENDAR_DATE_FORMATTER.format(timestamp);
};

const isItemFromToday = (item: TechNewsItem) => {
  const itemDate = getCalendarDateKey(item.pubDate);

  return Boolean(itemDate) && itemDate === CALENDAR_DATE_FORMATTER.format(Date.now());
};

const getDescriptionText = (value: string) => {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const summarize = (value: string, maxLength = 180) => {
  const strippedValue = getDescriptionText(value);

  if (!strippedValue) {
    return "No summary was provided, but the original article is available.";
  }

  if (strippedValue.length <= maxLength) {
    return strippedValue;
  }

  return `${strippedValue.slice(0, Math.max(maxLength - 3, 0)).trimEnd()}...`;
};

const normalizeCompactHtmlSource = (value: string) => {
  return value
    .replace(/<\s*\/\s*(p|li|blockquote|pre|ul|ol|h[1-6])\s*>/gi, "<br />")
    .replace(/<\s*(p|li|blockquote|pre|ul|ol|h[1-6])(?:\s[^>]*)?>/gi, "")
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br /><br />");
};

const renderDescriptionHtml = (value: string) => {
  const sanitizedValue = sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noreferrer noopener",
      }),
    },
  }).trim();

  if (sanitizedValue) {
    return sanitizedValue;
  }

  const textFallback = getDescriptionText(value);

  return textFallback ? `<p>${sanitizeHtml(textFallback)}</p>` : "";
};

const renderPreviewHtml = (value: string) => {
  const sanitizedValue = sanitizeHtml(normalizeCompactHtmlSource(value), {
    allowedTags: ["br", "strong", "em", "b", "i", "a", "code"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noreferrer noopener",
      }),
    },
  })
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br /><br />")
    .trim();

  if (sanitizedValue) {
    return sanitizedValue;
  }

  const textFallback = summarize(value);

  return textFallback ? `<p>${sanitizeHtml(textFallback)}</p>` : "";
};

const formatSource = (value: string) => {
  return value.replace(/^www\./, "");
};

const descriptionContentClass =
  "mt-3 space-y-4 text-[13px] leading-6 text-slate-300/88 [&_a]:font-medium [&_a]:text-cyan-200 [&_a]:underline [&_a]:decoration-cyan-300/40 [&_a]:underline-offset-3 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-400/30 [&_blockquote]:bg-slate-900/70 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic [&_blockquote]:text-slate-200 [&_code]:rounded-md [&_code]:transparent [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12px] [&_em]:text-white [&_li]:marker:text-cyan-300/70 [&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:my-0 [&_pre]:overflow-x-auto [&_pre]:rounded-3xl [&_pre]:border [&_pre]:border-white/8 [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-[12px] [&_pre]:text-slate-100 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:pl-5";

const leadContentClass =
  "mt-3 overflow-hidden text-[13px] leading-6 text-slate-300/88 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6] [&_a]:font-medium [&_a]:text-cyan-200 [&_a]:underline [&_a]:decoration-cyan-300/35 [&_a]:underline-offset-3 [&_code]:rounded-md [&_code]:bg-transparent [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12px] [&_em]:text-white [&_strong]:font-semibold [&_strong]:text-white";

const cardPreviewContentClass =
  "overflow-hidden text-[12px] leading-5 text-slate-400/86 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] [&_a]:font-medium [&_a]:text-cyan-100 [&_a]:underline [&_a]:decoration-cyan-300/25 [&_a]:underline-offset-2 [&_code]:rounded-md [&_code]:bg-transparent [&_code]:px-1 [&_code]:py-0.5 [&_em]:text-slate-200 [&_strong]:font-semibold [&_strong]:text-slate-50";

const HtmlContent = defineComponent({
  name: "HtmlContent",
  props: {
    html: {
      type: String,
      required: true,
    },
    variant: {
      type: String as PropType<"detail" | "lead" | "preview">,
      default: "detail",
    },
  },
  setup(props, { attrs }) {
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          class:
            props.variant === "preview"
              ? cardPreviewContentClass
              : props.variant === "lead"
                ? leadContentClass
                : descriptionContentClass,
          innerHTML: props.html,
        })
      );
  },
});

const seenNewsLookup = computed(() => new Set(seenNewsLinks.value));

const isItemSeen = (item: TechNewsItem) => {
  return seenNewsLookup.value.has(item.link);
};

const getReadStateLabel = (item: TechNewsItem) => {
  return isItemSeen(item) ? "Opened" : "Unread";
};

const getReadStateIcon = (item: TechNewsItem) => {
  return isItemSeen(item) ? "mdi:eye-outline" : "mdi:bookmark-outline";
};

const getReadStateClass = (item: TechNewsItem) => {
  return isItemSeen(item)
    ? "border-white/8 bg-white/5 text-slate-400"
    : "border-amber-300/25 bg-amber-300/10 text-amber-100";
};

const getItemShellClass = (item: TechNewsItem) => {
  if (isItemFromToday(item)) {
    return "news-item-shell news-item-shell--today";
  }

  return isItemSeen(item)
    ? "news-item-shell news-item-shell--seen"
    : "news-item-shell news-item-shell--unread";
};

const getItemPanelClass = (item: TechNewsItem) => {
  if (isItemFromToday(item)) {
    return "news-item-panel--today";
  }

  return isItemSeen(item) ? "news-item-panel--seen" : "news-item-panel--unread";
};

const getItemTitleClass = (item: TechNewsItem) => {
  return isItemSeen(item) ? "text-slate-200" : "text-white";
};

const markItemAsSeen = (item: TechNewsItem) => {
  if (!item.link || seenNewsLookup.value.has(item.link)) {
    return;
  }

  seenNewsLinks.value = [...seenNewsLinks.value, item.link];
};

const handleOpenOriginalItem = (item: TechNewsItem) => {
  markItemAsSeen(item);
};

const openFeedItem = (item: TechNewsItem) => {
  markItemAsSeen(item);
  activeFeedItem.value = item;
};

const closeFeedItem = () => {
  activeFeedItem.value = null;
};

const syncResponse = (response: TechNewsResponse, mode: "replace" | "append" = "replace") => {
  loadedItems.value = mode === "append" ? [...loadedItems.value, ...response.data] : response.data;
  currentPage.value = response.page;
  totalPages.value = response.totalPages;
  totalItems.value = response.total;
};

watch(
  initialResponse,
  (response) => {
    if (!response) {
      return;
    }

    syncResponse(response, "replace");
  },
  { immediate: true }
);

const hasMore = computed(() => {
  return currentPage.value < totalPages.value;
});

const featuredStory = computed(() => {
  return loadedItems.value[0] ?? null;
});

const sideStories = computed(() => {
  return loadedItems.value.slice(1, 4);
});

const feedItems = computed(() => {
  return loadedItems.value.slice(4);
});

const todayCount = computed(() => {
  return loadedItems.value.filter((item) => isItemFromToday(item)).length;
});

const unseenCount = computed(() => {
  return loadedItems.value.filter((item) => !isItemSeen(item)).length;
});

const sourceCount = computed(() => {
  return new Set(loadedItems.value.map((item) => formatSource(item.sourceHost))).size;
});

const countByLabel = (values: Array<string | null | undefined>, fallbackLabel: string) => {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value?.trim() || fallbackLabel;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
};

const topSources = computed<RankedLabel[]>(() => {
  return countByLabel(
    loadedItems.value.map((item) => formatSource(item.sourceHost)),
    "Unknown source"
  ).slice(0, 6);
});

const countStats = computed<CountStat[]>(() => {
  return [
    {
      label: "Today",
      value: todayCount.value,
      note: "new stories today",
    },
    {
      label: "Unread",
      value: unseenCount.value,
      note: "stories not opened yet",
    },
    {
      label: "Sources",
      value: sourceCount.value,
      note: "publishers visible now",
    },
  ];
});

const leadSummary = computed(() => {
  if (!featuredStory.value) {
    return "The feed is empty right now. Refresh when the pipeline has fresh stories.";
  }

  return renderPreviewHtml(featuredStory.value.description);
});

const feedSummary = computed(() => {
  if (!totalItems.value) {
    return "A ranked feed for following updates across the selected sources.";
  }

  return `${totalItems.value} ranked stories across ${sourceCount.value} active sources. ${unseenCount.value} are still unread.`;
});

const activeFeedItemDescriptionHtml = computed(() => {
  if (!activeFeedItem.value) {
    return "";
  }

  return renderDescriptionHtml(activeFeedItem.value.description);
});

const getPreviewHtml = (item: TechNewsItem) => {
  return renderPreviewHtml(item.description);
};

const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) {
    return;
  }

  isLoadingMore.value = true;

  try {
    const response = await $fetch<TechNewsResponse>("/api/news/tech", {
      query: {
        page: currentPage.value + 1,
        limit: PAGE_SIZE,
      },
    });

    syncResponse(response, "append");
  } finally {
    isLoadingMore.value = false;
  }
};

const refreshNews = async () => {
  if (isRefreshing.value) {
    return;
  }

  isRefreshing.value = true;

  try {
    await refresh();
  } finally {
    isRefreshing.value = false;
  }
};

useIntersectionObserver(
  feedBottomRef,
  ([entry]) => {
    if (!entry?.isIntersecting) {
      return;
    }

    void loadMore();
  },
  {
    threshold: 0.2,
  }
);

useEventListener(document, "keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape" || !activeFeedItem.value) {
    return;
  }

  closeFeedItem();
});
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-[minmax(0,1.62fr)_20rem] xl:items-start">
    <div class="space-y-4">
      <header class="news-surface relative overflow-hidden rounded-4xl p-5 sm:p-6">
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_85%_18%,rgba(251,191,36,0.12),transparent_22%),linear-gradient(180deg,rgba(10,17,30,0.92),rgba(7,12,22,0.82))]"
        />

        <div class="relative z-10 space-y-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-3xl space-y-3">
              <p class="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-200/70">
                Source tracker
              </p>
              <div class="space-y-2">
                <h1
                  class="news-serif max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl"
                >
                  A focused dark feed for staying on top of the sources that matter.
                </h1>
                <p class="max-w-2xl text-[13px] text-slate-300/78">
                  Updates are ranked, cleaned, and laid out for scanning fast. No geography, no
                  filler, just the freshest stories from the tracked tech publications.
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300/76">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 font-medium text-slate-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                @click="refreshNews"
              >
                <Icon name="mdi:refresh" class="size-3.5" />
                <span>{{ isRefreshing ? "Refreshing" : "Refresh feed" }}</span>
              </button>
              <a
                href="/api/news/tech"
                target="_blank"
                rel="noreferrer noopener"
                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 font-medium text-slate-100 transition hover:border-amber-300/30 hover:text-white"
              >
                <Icon name="mdi:api" class="size-3.5" />
                Open JSON feed
              </a>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="stat in countStats"
              :key="stat.label"
              class="rounded-3xl border border-white/8 bg-white/4 p-4"
            >
              <p class="text-[10px] font-medium uppercase tracking-[0.26em] text-slate-400">
                {{ stat.label }}
              </p>
              <p class="mt-2 text-2xl font-semibold tracking-tight text-white">
                {{ stat.value }}
              </p>
              <p class="mt-1 text-[12px] leading-5 text-slate-400/85">{{ stat.note }}</p>
            </div>
          </div>
        </div>
      </header>

      <div v-if="error && !loadedItems.length" class="news-surface rounded-4xl p-5 sm:p-6">
        <div class="rounded-3xl border border-rose-400/25 bg-rose-400/10 p-4 text-rose-100">
          <p class="text-sm font-medium">The news feed failed to load.</p>
          <p class="mt-2 text-[13px] text-rose-100/80">
            Try refreshing and request the feed again.
          </p>
        </div>
      </div>

      <div
        v-else-if="pending && !loadedItems.length"
        class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]"
      >
        <div class="news-surface h-88 animate-pulse rounded-4xl" />
        <div class="grid gap-3">
          <div
            v-for="index in 4"
            :key="index"
            class="news-surface h-32 animate-pulse rounded-3xl"
          />
        </div>
      </div>

      <template v-else>
        <article
          v-if="featuredStory"
          class="news-surface relative overflow-hidden rounded-4xl p-5 sm:p-6"
          :class="getItemShellClass(featuredStory)"
        >
          <div
            class="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_64%)] lg:block"
          />

          <div
            class="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)] lg:items-start"
          >
            <div class="space-y-5">
              <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300/76">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 font-medium text-cyan-100"
                >
                  <Icon name="mdi:star-four-points-outline" class="size-3.5" />
                  Lead update
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5"
                >
                  <Icon name="mdi:newspaper-variant-outline" class="size-3.5" />
                  {{ formatSource(featuredStory.sourceHost) }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5"
                >
                  <Icon name="mdi:clock-outline" class="size-3.5" />
                  {{ formatRelativeDate(featuredStory.pubDate) }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5"
                  :class="getReadStateClass(featuredStory)"
                >
                  <Icon :name="getReadStateIcon(featuredStory)" class="size-3.5" />
                  {{ getReadStateLabel(featuredStory) }}
                </span>
                <span
                  v-if="isItemFromToday(featuredStory)"
                  class="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-emerald-100"
                >
                  <Icon name="mdi:calendar-today" class="size-3.5" />
                  Fresh today
                </span>
              </div>

              <div class="space-y-3">
                <h2
                  class="news-serif text-xl leading-tight font-semibold tracking-[-0.03em] text-white sm:text-2xl"
                >
                  {{ featuredStory.title }}
                </h2>
                <HtmlContent v-if="leadSummary" :html="leadSummary" variant="lead" />
              </div>

              <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5"
                >
                  <Icon name="mdi:star-outline" class="size-3.5" />
                  Signal {{ featuredStory.score }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5"
                >
                  <Icon name="mdi:calendar-range" class="size-3.5" />
                  {{ formatAbsoluteDate(featuredStory.pubDate) }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-full bg-cyan-300/90 px-4 py-2 text-[12px] font-semibold text-slate-950 transition hover:bg-cyan-200"
                  @click="openFeedItem(featuredStory)"
                >
                  <Icon name="mdi:text-box-search-outline" class="size-3.5" />
                  Read details
                </button>
                <a
                  :href="featuredStory.link"
                  target="_blank"
                  rel="noreferrer noopener"
                  class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/8"
                  @click="handleOpenOriginalItem(featuredStory)"
                >
                  <Icon name="mdi:open-in-new" class="size-3.5" />
                  Open original article
                </a>
              </div>
            </div>

            <div class="grid gap-3">
              <div
                v-for="item in sideStories"
                :key="item.link"
                class="rounded-3xl p-4 transition hover:border-cyan-300/20 hover:bg-cyan-300/6"
                :class="getItemShellClass(item)"
              >
                <div
                  class="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500"
                >
                  <span>{{ formatSource(item.sourceHost) }}</span>
                  <span class="tracking-normal normal-case">{{
                    formatRelativeDate(item.pubDate)
                  }}</span>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                    :class="getReadStateClass(item)"
                  >
                    <Icon :name="getReadStateIcon(item)" class="size-3.5" />
                    {{ getReadStateLabel(item) }}
                  </span>
                  <span
                    v-if="isItemFromToday(item)"
                    class="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-emerald-100"
                  >
                    <Icon name="mdi:calendar-today" class="size-3.5" />
                    Fresh today
                  </span>
                </div>
                <button type="button" class="mt-3 text-left" @click="openFeedItem(item)">
                  <span
                    class="news-serif text-lg leading-6 font-semibold transition hover:text-cyan-100"
                    :class="getItemTitleClass(item)"
                  >
                    {{ item.title }}
                  </span>
                </button>
                <p class="mt-2 text-[12px] leading-5 text-slate-400/84">
                  {{ summarize(item.description, 120) }}
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>{{ item.score }} pts</span>
                  <span class="h-1 w-1 rounded-full bg-slate-700" />
                  <span>{{ formatAbsoluteDate(item.pubDate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <section class="news-surface rounded-4xl p-5 sm:p-6">
          <div class="flex flex-wrap items-end justify-between gap-4 border-b border-white/8 pb-4">
            <div class="space-y-2">
              <p class="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                Main feed
              </p>
              <div>
                <h3 class="news-serif text-[1.7rem] font-semibold tracking-[-0.03em] text-white">
                  Latest ranked updates
                </h3>
                <p class="mt-1 max-w-2xl text-[12px] leading-5 text-slate-400/84">
                  {{ feedSummary }}
                </p>
                <p class="mt-2 text-[11px] leading-5 text-slate-500">
                  Green cards were published today. Amber status means unread. Slate status means
                  already opened.
                </p>
              </div>
            </div>

            <div
              class="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-slate-300/84"
            >
              Page {{ currentPage || 1 }} / {{ totalPages || 1 }}
            </div>
          </div>

          <div v-if="!feedItems.length" class="pt-5">
            <div
              class="rounded-3xl border border-dashed border-white/10 bg-slate-950/55 px-4 py-8 text-center text-[12px] text-slate-400"
            >
              More stories will appear here as the next page loads.
            </div>
          </div>

          <div v-else class="divide-y divide-white/8 pt-2 space-y-2">
            <article
              v-for="item in feedItems"
              :key="item.link"
              class="group grid gap-4 rounded-3xl px-4 py-5 transition lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-5"
              :class="getItemShellClass(item)"
            >
              <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                  >
                    <Icon name="mdi:newspaper-variant-outline" class="size-3.5" />
                    {{ formatSource(item.sourceHost) }}
                  </span>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                  >
                    <Icon name="mdi:clock-outline" class="size-3.5" />
                    {{ formatRelativeDate(item.pubDate) }}
                  </span>
                  <span
                    v-if="isItemFromToday(item)"
                    class="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-emerald-100"
                  >
                    <Icon name="mdi:calendar-today" class="size-3.5" />
                    Fresh today
                  </span>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                    :class="getReadStateClass(item)"
                  >
                    <Icon :name="getReadStateIcon(item)" class="size-3.5" />
                    {{ getReadStateLabel(item) }}
                  </span>
                </div>

                <button type="button" class="block text-left" @click="openFeedItem(item)">
                  <span
                    class="news-serif text-[1.35rem] leading-7 font-semibold tracking-[-0.02em] transition group-hover:text-cyan-100"
                    :class="getItemTitleClass(item)"
                  >
                    {{ item.title }}
                  </span>
                </button>

                <HtmlContent :html="getPreviewHtml(item)" variant="preview" />

                <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span>{{ formatAbsoluteDate(item.pubDate) }}</span>
                  <span class="h-1 w-1 rounded-full bg-slate-700" />
                  <span>{{ item.score }} points</span>
                </div>

                <div class="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-slate-100 transition hover:border-cyan-300/25 hover:text-cyan-100"
                    @click="openFeedItem(item)"
                  >
                    <Icon name="mdi:text-box-search-outline" class="size-3.5" />
                    Quick view
                  </button>
                  <a
                    :href="item.link"
                    target="_blank"
                    rel="noreferrer noopener"
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-slate-100 transition hover:border-cyan-300/25 hover:text-cyan-100"
                    @click="handleOpenOriginalItem(item)"
                  >
                    <Icon name="mdi:open-in-new" class="size-3.5" />
                    Open
                  </a>
                </div>
              </div>
            </article>

            <div v-if="isLoadingMore" class="py-5 text-center text-[12px] text-slate-500">
              Loading another page of stories...
            </div>

            <div v-else-if="hasMore" class="py-5 text-center text-[12px] text-slate-500">
              <p>Scroll down to continue loading the feed.</p>
              <button
                type="button"
                class="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-slate-100 transition hover:border-cyan-300/25 hover:text-cyan-100"
                @click="loadMore"
              >
                <Icon name="mdi:arrow-down-circle-outline" class="size-3.5" />
                Load next page
              </button>
            </div>

            <div v-if="hasMore" ref="feedBottomRef" class="h-px w-full" aria-hidden="true" />
          </div>
        </section>
      </template>
    </div>

    <aside class="space-y-2 xl:sticky xl:top-4">
      <section class="news-surface rounded-4xl p-5">
        <p class="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Feed notes
        </p>
        <h3 class="news-serif mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
          Built for checking updates fast
        </h3>
        <p class="mt-2 text-[12px] leading-5 text-slate-400/84">
          The feed keeps the strongest story on top, pushes supporting items beside it, and leaves
          the rest in a clean chronological scanline ranked by signal.
        </p>

        <div class="mt-4 grid gap-3">
          <div class="rounded-3xl border border-white/8 bg-white/4 p-4">
            <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Loaded
            </p>
            <p class="mt-2 text-2xl font-semibold tracking-tight text-white">
              {{ loadedItems.length }}
            </p>
            <p class="mt-1 text-[12px] leading-5 text-slate-400/84">stories currently rendered</p>
          </div>
          <div class="rounded-3xl border border-white/8 bg-white/4 p-4">
            <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Pipeline
            </p>
            <p class="mt-2 text-[12px] leading-5 text-slate-300/80">
              The endpoint merges all configured feeds, removes duplicates, scores the results, and
              paginates them for continuous reading.
            </p>
          </div>
        </div>
      </section>

      <section class="news-surface rounded-4xl p-5">
        <p class="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Sources now
        </p>
        <h3 class="news-serif mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
          Most active publishers
        </h3>

        <div class="mt-4 space-y-3">
          <div
            v-for="source in topSources"
            :key="source.label"
            class="flex items-center justify-between gap-3 rounded-3xl border border-white/8 bg-white/4 px-4 py-1.5"
          >
            <span class="text-[12px] font-medium text-slate-100">{{ source.label }}</span>
            <span class="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400">
              {{ source.count }}
            </span>
          </div>
        </div>
      </section>

      <section class="news-surface rounded-4xl p-5">
        <p class="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Tracked set
        </p>
        <h3 class="news-serif mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
          Monitored sources
        </h3>

        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="source in MONITORED_SOURCES"
            :key="source"
            class="inline-flex items-center rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-slate-300/84"
          >
            {{ source }}
          </span>
        </div>
      </section>
    </aside>
  </section>

  <Teleport to="body">
    <div
      v-if="activeFeedItem"
      class="fixed inset-0 z-120 flex items-end justify-center bg-slate-950/72 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      @click.self="closeFeedItem"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(7,12,22,0.98),rgba(3,8,18,0.96))] shadow-[0_28px_90px_rgba(2,6,23,0.48)]"
      >
        <div
          class="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6"
        >
          <div class="space-y-2">
            <p class="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Story details
            </p>
            <h3
              class="news-serif text-[1.8rem] leading-tight font-semibold tracking-[-0.03em] text-white sm:text-[2.1rem]"
            >
              {{ activeFeedItem.title }}
            </h3>
          </div>

          <button
            type="button"
            class="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/25 hover:text-cyan-100"
            @click="closeFeedItem"
          >
            <Icon name="mdi:close" class="size-4" />
          </button>
        </div>

        <div class="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5"
            >
              <Icon name="mdi:newspaper-variant-outline" class="size-3.5" />
              {{ formatSource(activeFeedItem.sourceHost) }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5"
            >
              <Icon name="mdi:calendar-range" class="size-3.5" />
              {{ formatAbsoluteDate(activeFeedItem.pubDate) }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5"
            >
              <Icon name="mdi:star-outline" class="size-3.5" />
              Signal {{ activeFeedItem.score }}
            </span>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Source
              </p>
              <p class="mt-2 text-[13px] font-medium text-white">
                {{ formatSource(activeFeedItem.sourceHost) }}
              </p>
            </div>
            <div
              class="rounded-3xl border p-4"
              :class="
                isItemFromToday(activeFeedItem)
                  ? 'border-emerald-300/18 bg-emerald-300/8 text-emerald-100/88'
                  : 'border-white/8 bg-white/4 text-slate-400'
              "
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-[0.22em]"
                :class="isItemFromToday(activeFeedItem) ? 'text-emerald-200/75' : 'text-slate-500'"
              >
                {{ isItemFromToday(activeFeedItem) ? "Published today" : "Published" }}
              </p>
              <p
                class="mt-2 text-[13px] font-medium"
                :class="isItemFromToday(activeFeedItem) ? 'text-emerald-50' : 'text-white'"
              >
                {{ formatRelativeDate(activeFeedItem.pubDate) }}
              </p>
            </div>
            <div class="rounded-3xl border p-4" :class="getReadStateClass(activeFeedItem)">
              <p class="text-[10px] font-semibold uppercase tracking-[0.22em]">Read state</p>
              <p class="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium">
                <Icon :name="getReadStateIcon(activeFeedItem)" class="size-3.5" />
                {{ getReadStateLabel(activeFeedItem) }}
              </p>
            </div>
            <div
              class="rounded-3xl border border-white/8 bg-white/4 p-4 sm:col-span-3 lg:col-span-1"
            >
              <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Feed signal
              </p>
              <p class="mt-2 text-[13px] font-medium text-white">
                {{ activeFeedItem.score }} points
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-4xl border border-white/8 bg-white/4 p-5">
            <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Summary
            </p>
            <HtmlContent
              v-if="activeFeedItemDescriptionHtml"
              :html="activeFeedItemDescriptionHtml"
              variant="detail"
            />
            <p v-else class="mt-4 text-[13px] leading-6 text-slate-300/84">
              No additional description is available for this item.
            </p>
          </div>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-5 py-4 sm:px-6"
        >
          <p class="text-[11px] text-slate-500">Press Escape or click outside to close.</p>

          <a
            :href="activeFeedItem.link"
            target="_blank"
            rel="noreferrer noopener"
            class="inline-flex items-center gap-2 rounded-full bg-cyan-300/90 px-4 py-2 text-[12px] font-semibold text-slate-950 transition hover:bg-cyan-200"
            @click="handleOpenOriginalItem(activeFeedItem)"
          >
            <Icon name="mdi:open-in-new" class="size-3.5" />
            Open original article
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>
