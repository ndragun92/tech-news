<script setup lang="ts">
import { countries } from "~/utils/countries.utils";

type CountryInferenceConfidence = "high" | "medium" | "low";
type CountryInferenceMethod = "publisher" | "domain" | "feed-language" | "unknown";

type CountryDetails = {
  country: string | null;
  confidence: CountryInferenceConfidence;
  method: CountryInferenceMethod;
  hint: string;
};

type TechNewsItem = {
  source: string;
  sourceHost: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  country: string | null;
  countryDetails: CountryDetails;
  score: number;
};

type TechNewsResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: TechNewsItem[];
};

type CountrySelection = {
  id: string;
  name: string;
};

type WorldMapCountryName = (typeof countries)[number];

type CountryGroup = {
  country: WorldMapCountryName;
  count: number;
  lead: TechNewsItem;
  items: TechNewsItem[];
  averageScore: number;
};

const PAGE_SIZE = 12;
const WORLD_COUNTRY_SET = new Set<string>(countries);

const feedRef = ref<HTMLElement | null>(null);
const feedBottomRef = ref<HTMLElement | null>(null);
const loadedItems = ref<TechNewsItem[]>([]);
const currentPage = ref(0);
const totalPages = ref(0);
const totalItems = ref(0);
const activeFeedItem = ref<TechNewsItem | null>(null);
const isLoadingMore = ref(false);
const isRefreshing = ref(false);
const spotlightIndex = ref(0);
const selectedCountry = ref<WorldMapCountryName | null>(null);
const hasManualCountrySelection = ref(false);

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

const isWorldMapCountryName = (value: string | null | undefined): value is WorldMapCountryName => {
  return Boolean(value && WORLD_COUNTRY_SET.has(value));
};

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

const getDescriptionText = (value: string) => {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const summarize = (value: string) => {
  const strippedValue = getDescriptionText(value);

  if (!strippedValue) {
    return "Summary unavailable, but the original article is ready to open.";
  }

  if (strippedValue.length <= 180) {
    return strippedValue;
  }

  return `${strippedValue.slice(0, 177).trimEnd()}...`;
};

const formatSource = (value: string) => {
  return value.replace(/^www\./, "");
};

const getCountryLabel = (item: TechNewsItem) => {
  return item.country ?? "Country unresolved";
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

const geoTaggedItems = computed(() => {
  return loadedItems.value.filter((item) => isWorldMapCountryName(item.country));
});

const countryGroups = computed<CountryGroup[]>(() => {
  const grouped = new Map<WorldMapCountryName, TechNewsItem[]>();

  for (const item of geoTaggedItems.value) {
    const country = item.country;

    if (!isWorldMapCountryName(country)) {
      continue;
    }

    const existingItems = grouped.get(country) ?? [];
    existingItems.push(item);
    grouped.set(country, existingItems);
  }

  return Array.from(grouped.entries())
    .map(([country, items]) => ({
      country,
      count: items.length,
      lead: items[0] as TechNewsItem,
      items,
      averageScore: Math.round(items.reduce((total, item) => total + item.score, 0) / items.length),
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        getPublishedTimestamp(right.lead.pubDate) - getPublishedTimestamp(left.lead.pubDate)
    );
});

const spotlightGroup = computed(() => {
  if (hasManualCountrySelection.value && selectedCountry.value) {
    return countryGroups.value.find((group) => group.country === selectedCountry.value) ?? null;
  }

  return countryGroups.value[spotlightIndex.value] ?? null;
});

const spotlightStory = computed(() => {
  return spotlightGroup.value?.lead ?? loadedItems.value[0] ?? null;
});

const activeMapCountries = computed<WorldMapCountryName[]>(() => {
  return countryGroups.value.map((group) => group.country);
});

const visibleItems = computed(() => {
  return loadedItems.value;
});

const visibleItemsTitle = computed(() => {
  if (hasManualCountrySelection.value && selectedCountry.value) {
    return "All dispatches";
  }

  return "All dispatches";
});

const visibleItemsHint = computed(() => {
  if (hasManualCountrySelection.value && selectedCountry.value) {
    return `Feed stays global while the spotlight is locked to ${selectedCountry.value}.`;
  }

  return "Infinite feed sourced from the tech RSS pipeline, with country origin shown on each card.";
});

const hasMore = computed(() => {
  return currentPage.value < totalPages.value;
});

const { y: feedScrollTop } = useScroll(feedRef);

const mappedCountryCount = computed(() => countryGroups.value.length);
const unmappedItemCount = computed(() => {
  return loadedItems.value.filter((item) => !isWorldMapCountryName(item.country)).length;
});

const setCountrySpotlight = (country: WorldMapCountryName) => {
  const groupIndex = countryGroups.value.findIndex((group) => group.country === country);

  if (groupIndex === -1) {
    return;
  }

  spotlightIndex.value = groupIndex;
  selectedCountry.value = country;
  hasManualCountrySelection.value = true;
};

const clearCountrySpotlight = () => {
  selectedCountry.value = null;
  hasManualCountrySelection.value = false;
};

const handleMapSelect = (country: CountrySelection) => {
  if (!isWorldMapCountryName(country.name)) {
    return;
  }

  setCountrySpotlight(country.name);
};

const previewItem = (item: TechNewsItem) => {
  if (hasManualCountrySelection.value || !isWorldMapCountryName(item.country)) {
    return;
  }

  const groupIndex = countryGroups.value.findIndex((group) => group.country === item.country);

  if (groupIndex !== -1) {
    spotlightIndex.value = groupIndex;
  }
};

const openItemCountry = (item: TechNewsItem) => {
  if (!isWorldMapCountryName(item.country)) {
    return;
  }

  setCountrySpotlight(item.country);
};

const openFeedItem = (item: TechNewsItem) => {
  activeFeedItem.value = item;
};

const closeFeedItem = () => {
  activeFeedItem.value = null;
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

    if (feedScrollTop.value <= 16) {
      return;
    }

    void loadMore();
  },
  {
    root: feedRef,
    threshold: 0.35,
  }
);

useIntervalFn(() => {
  if (hasManualCountrySelection.value || countryGroups.value.length < 2) {
    return;
  }

  spotlightIndex.value = (spotlightIndex.value + 1) % countryGroups.value.length;
}, 5_200); // Set to just over 5 seconds to allow for the fade animation to complete before switching to the next country

useEventListener(document, "keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape" || !activeFeedItem.value) {
    return;
  }

  closeFeedItem();
});

watch(
  countryGroups,
  (groups) => {
    if (groups.length === 0) {
      spotlightIndex.value = 0;
      clearCountrySpotlight();
      return;
    }

    if (spotlightIndex.value >= groups.length) {
      spotlightIndex.value = 0;
    }

    if (selectedCountry.value && !groups.some((group) => group.country === selectedCountry.value)) {
      clearCountrySpotlight();
    }
  },
  { immediate: true }
);
</script>

<template>
  <section
    class="grid min-h-0 flex-1 gap-3 xl:h-full xl:grid-cols-[minmax(0,1.45fr)_23rem] xl:grid-rows-[minmax(0,1fr)]"
  >
    <div
      class="relative order-2 flex min-h-120 flex-col overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(150deg,rgba(10,16,24,0.96),rgba(11,18,30,0.88))] shadow-[0_30px_90px_rgba(3,8,20,0.45)] xl:order-1 xl:min-h-0 xl:h-full"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_75%_18%,rgba(251,191,36,0.16),transparent_24%),radial-gradient(circle_at_50%_110%,rgba(14,165,233,0.14),transparent_38%)]"
      />

      <div
        class="relative z-20 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5"
      >
        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-[0.32em] text-cyan-200/70">
            Global signal map
          </p>
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Latest tech news, routed through geography
            </h1>
            <p class="mt-1.5 max-w-2xl text-[13px] leading-5 text-slate-300/80">
              The feed rotates through countries inferred from each publisher, then lets you lock
              the map and feed to a specific territory.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 text-[11px] text-slate-200/80">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
            @click="refreshNews"
          >
            <Icon name="mdi:refresh" class="size-3.5" />
            <span>{{ isRefreshing ? "Refreshing" : "Refresh feed" }}</span>
          </button>

          <button
            v-if="hasManualCountrySelection"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-amber-100 transition hover:border-amber-200/50 hover:bg-amber-300/15"
            @click="clearCountrySpotlight"
          >
            <Icon name="mdi:crosshairs-gps" class="size-3.5" />
            <span>Release spotlight lock</span>
          </button>
        </div>
      </div>

      <div class="relative z-10 min-h-104 flex-1 pt-2 xl:min-h-0">
        <UiWorldMap
          :country-names="activeMapCountries"
          :blink="activeMapCountries.length > 0"
          @select="handleMapSelect"
        />
      </div>

      <div class="pointer-events-none absolute inset-x-0 top-38 z-30 px-4 sm:px-5">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
          <div
            class="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/65 p-4 shadow-[0_15px_45px_rgba(2,6,23,0.42)] backdrop-blur-md"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-200/70">
                  Now orbiting
                </p>
                <p class="mt-1.5 text-base font-semibold text-white">
                  {{ spotlightGroup?.country ?? "Loading live dispatches" }}
                </p>
              </div>

              <div
                v-if="spotlightGroup"
                class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80"
              >
                {{ spotlightGroup.count }} stories
              </div>
            </div>

            <div v-if="spotlightStory" class="mt-4 space-y-3">
              <a
                :href="spotlightStory.link"
                target="_blank"
                rel="noreferrer noopener"
                class="block text-lg font-medium leading-tight text-white transition hover:text-cyan-200"
              >
                {{ spotlightStory.title }}
              </a>

              <p class="text-[13px] leading-5 text-slate-300/80">
                {{ summarize(spotlightStory.description) }}
              </p>

              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-300/70">
                <span class="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1">
                  <Icon name="mdi:radio-tower" class="size-3.5" />
                  {{ formatSource(spotlightStory.sourceHost) }}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1">
                  <Icon name="mdi:clock-outline" class="size-3.5" />
                  {{ formatRelativeDate(spotlightStory.pubDate) }}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1">
                  <Icon name="mdi:star-four-points-outline" class="size-3.5" />
                  Signal {{ spotlightStory.score }}
                </span>
              </div>
            </div>

            <div
              v-else
              class="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-[13px] text-slate-300/70"
            >
              News is being collected. As soon as the first source resolves, the spotlight card will
              update.
            </div>
          </div>

          <div class="pointer-events-none hidden items-start justify-end gap-3 pt-2 lg:flex">
            <div
              v-for="group in countryGroups.slice(0, 3)"
              :key="group.country"
              class="pointer-events-auto w-48 rounded-[1.35rem] border border-white/10 bg-slate-950/55 p-3.5 shadow-[0_12px_34px_rgba(2,6,23,0.32)] backdrop-blur-md"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[13px] font-semibold text-white">{{ group.country }}</p>
                <span class="rounded-full bg-cyan-300/10 px-2 py-1 text-[11px] text-cyan-100">
                  {{ group.count }}
                </span>
              </div>
              <p class="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                Avg signal {{ group.averageScore }}
              </p>
              <p class="mt-2.5 text-[13px] leading-5 text-slate-300/80">
                {{ summarize(group.lead.description) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-5 sm:pb-5">
        <div
          class="grid gap-2.5 rounded-3xl border border-white/10 bg-slate-950/60 p-3.5 backdrop-blur-md sm:grid-cols-3"
        >
          <div class="rounded-2xl border border-white/8 bg-white/5 p-3.5">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-400">Loaded</p>
            <p class="mt-2 text-xl font-semibold text-white">{{ loadedItems.length }}</p>
            <p class="mt-1 text-[13px] text-slate-300/70">stories rendered locally</p>
          </div>

          <div class="rounded-2xl border border-white/8 bg-white/5 p-3.5">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-400">Mapped</p>
            <p class="mt-2 text-xl font-semibold text-white">{{ mappedCountryCount }}</p>
            <p class="mt-1 text-[13px] text-slate-300/70">countries currently lighting the globe</p>
          </div>

          <div class="rounded-2xl border border-white/8 bg-white/5 p-3.5">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-400">Unmapped</p>
            <p class="mt-2 text-xl font-semibold text-white">{{ unmappedItemCount }}</p>
            <p class="mt-1 text-[13px] text-slate-300/70">
              stories without a reliable country signal
            </p>
          </div>
        </div>
      </div>
    </div>

    <aside
      class="order-1 flex min-h-96 min-w-0 flex-col overflow-hidden rounded-4xl border border-white/10 bg-slate-950/80 shadow-[0_20px_60px_rgba(2,6,23,0.3)] backdrop-blur-md xl:order-2 xl:min-h-0 xl:h-full"
    >
      <div class="border-b border-white/10 px-3.5 py-3.5 sm:px-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-amber-200/70">
              {{ visibleItemsTitle }}
            </p>
            <h2 class="mt-1.5 text-lg font-semibold text-white">
              {{ totalItems }} total stories in the feed
            </h2>
            <p class="mt-1 text-[13px] text-slate-300/70">{{ visibleItemsHint }}</p>
          </div>

          <div
            class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200/80 whitespace-nowrap"
          >
            Page {{ currentPage || 1 }} / {{ totalPages || 1 }}
          </div>
        </div>
      </div>

      <div v-if="error && !loadedItems.length" class="p-3.5 sm:p-4">
        <div
          class="rounded-3xl border border-rose-300/25 bg-rose-300/10 p-4 text-[13px] text-rose-50"
        >
          <p class="font-medium">The news feed failed to load.</p>
          <p class="mt-2 text-rose-100/80">
            Try the refresh action and re-run the initial request.
          </p>
        </div>
      </div>

      <div v-else-if="pending && !loadedItems.length" class="grid gap-3 p-3.5 sm:p-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-32 animate-pulse rounded-[1.35rem] border border-white/8 bg-white/4"
        />
      </div>

      <div v-else ref="feedRef" class="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5 sm:px-4">
        <div class="space-y-2.5">
          <article
            v-for="item in visibleItems"
            :key="item.link"
            class="group cursor-pointer rounded-[1.35rem] border border-white/8 bg-white/3 p-3.5 transition hover:border-cyan-300/30 hover:bg-cyan-300/5"
            tabindex="0"
            role="button"
            @mouseenter="previewItem(item)"
            @click="openFeedItem(item)"
            @keydown.enter.prevent="openFeedItem(item)"
            @keydown.space.prevent="openFeedItem(item)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-2.5">
                <div
                  class="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400"
                >
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] tracking-[0.18em] text-slate-300/75"
                  >
                    <Icon name="mdi:newspaper-variant-outline" class="size-3.5" />
                    {{ formatSource(item.sourceHost) }}
                  </span>
                  <span>{{ formatRelativeDate(item.pubDate) }}</span>
                </div>

                <a
                  :href="item.link"
                  target="_blank"
                  rel="noreferrer noopener"
                  class="block text-[15px] font-medium leading-5.5 text-white transition group-hover:text-cyan-100"
                  @click.stop
                >
                  {{ item.title }}
                </a>

                <p class="text-[13px] leading-5 text-slate-300/75">
                  {{ summarize(item.description) }}
                </p>
              </div>

              <div class="flex shrink-0 flex-col items-end gap-2">
                <span class="rounded-full bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">
                  {{ item.score }} pts
                </span>
                <button
                  v-if="item.country"
                  type="button"
                  class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-right text-xs text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-100"
                  @click.stop="openItemCountry(item)"
                >
                  {{ item.country }}
                </button>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400">
              <span>{{ formatAbsoluteDate(item.pubDate) }}</span>
              <span class="h-1 w-1 rounded-full bg-slate-600" />
              <span>{{ item.countryDetails.method }}</span>
              <span class="h-1 w-1 rounded-full bg-slate-600" />
              <span>{{ item.countryDetails.confidence }} confidence</span>
            </div>

            <div
              class="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-2 text-[11px] text-slate-400"
            >
              <span>Open full dispatch</span>
              <span class="inline-flex items-center gap-1 text-cyan-100/80">
                <Icon name="mdi:arrow-top-right" class="size-3.5" />
                Details
              </span>
            </div>
          </article>

          <div
            v-if="!visibleItems.length"
            class="rounded-[1.35rem] border border-dashed border-white/10 px-4 py-8 text-center text-[13px] text-slate-300/70"
          >
            No stories match the current map selection yet.
          </div>

          <div
            v-if="isLoadingMore"
            class="rounded-[1.35rem] border border-white/8 bg-white/3 px-4 py-4 text-center text-[13px] text-slate-300/75"
          >
            Loading another page of stories...
          </div>

          <div
            v-else-if="hasMore"
            class="rounded-[1.35rem] border border-dashed border-white/10 px-4 py-4 text-center text-[13px] text-slate-400"
          >
            <p>Scroll to continue loading more stories.</p>
            <button
              type="button"
              class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              @click="loadMore"
            >
              <Icon name="mdi:arrow-down-circle-outline" class="size-3.5" />
              Load next page
            </button>
          </div>

          <div v-if="hasMore" ref="feedBottomRef" class="h-px w-full" aria-hidden="true" />
        </div>
      </div>
    </aside>
  </section>

  <Teleport to="body">
    <div
      v-if="activeFeedItem"
      class="fixed inset-0 z-120 flex items-end justify-center bg-slate-950/72 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      @click.self="closeFeedItem"
    >
      <div
        class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(7,14,24,0.98),rgba(6,11,19,0.96))] shadow-[0_30px_90px_rgba(2,6,23,0.6)]"
      >
        <div
          class="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5"
        >
          <div class="space-y-2">
            <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-200/70">
              Feed details
            </p>
            <h3 class="text-lg font-semibold leading-tight text-white sm:text-xl">
              {{ activeFeedItem.title }}
            </h3>
          </div>

          <button
            type="button"
            class="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100"
            @click="closeFeedItem"
          >
            <Icon name="mdi:close" class="size-4" />
          </button>
        </div>

        <div class="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300/80">
            <span
              class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
            >
              <Icon name="mdi:radio-tower" class="size-3.5" />
              {{ formatSource(activeFeedItem.sourceHost) }}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
            >
              <Icon name="mdi:earth" class="size-3.5" />
              {{ getCountryLabel(activeFeedItem) }}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
            >
              <Icon name="mdi:star-four-points-outline" class="size-3.5" />
              Signal {{ activeFeedItem.score }}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
            >
              <Icon name="mdi:clock-outline" class="size-3.5" />
              {{ formatAbsoluteDate(activeFeedItem.pubDate) }}
            </span>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/8 bg-white/4 p-3">
              <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">Method</p>
              <p class="mt-2 text-[13px] font-medium text-white">
                {{ activeFeedItem.countryDetails.method }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/8 bg-white/4 p-3">
              <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">Confidence</p>
              <p class="mt-2 text-[13px] font-medium text-white">
                {{ activeFeedItem.countryDetails.confidence }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/8 bg-white/4 p-3">
              <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">Publisher</p>
              <p class="mt-2 text-[13px] font-medium text-white">
                {{ activeFeedItem.source }}
              </p>
            </div>
          </div>

          <div class="mt-4 rounded-3xl border border-white/8 bg-white/3 p-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">Dispatch</p>
            <p class="mt-3 text-[14px] leading-6 text-slate-200/85">
              {{
                getDescriptionText(activeFeedItem.description) ||
                "No additional description is available for this item."
              }}
            </p>
          </div>

          <div class="mt-4 rounded-3xl border border-white/8 bg-white/3 p-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">Country hint</p>
            <p class="mt-3 text-[13px] leading-5 text-slate-300/80">
              {{
                activeFeedItem.countryDetails.hint ||
                "No country hint was supplied for this dispatch."
              }}
            </p>
          </div>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:px-5"
        >
          <p class="text-[11px] text-slate-400">Press Escape or click outside to close.</p>

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-if="activeFeedItem.country"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100"
              @click="openItemCountry(activeFeedItem)"
            >
              <Icon name="mdi:crosshairs-gps" class="size-3.5" />
              Spotlight {{ activeFeedItem.country }}
            </button>
            <a
              :href="activeFeedItem.link"
              target="_blank"
              rel="noreferrer noopener"
              class="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-medium text-cyan-50 transition hover:border-cyan-300/45 hover:bg-cyan-300/15"
            >
              <Icon name="mdi:open-in-new" class="size-3.5" />
              Open original article
            </a>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
