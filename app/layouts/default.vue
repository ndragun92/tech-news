<template>
  <main class="min-h-dvh px-4 py-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-384 space-y-4">
      <header class="news-surface relative overflow-hidden rounded-4xl px-5 py-4 sm:px-6">
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_22%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.12),transparent_20%),linear-gradient(180deg,rgba(10,17,30,0.94),rgba(7,12,22,0.86))]"
        />

        <div class="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-3 text-white transition hover:text-cyan-100"
          >
            <span
              class="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-cyan-100 shadow-sm"
            >
              <Icon name="mdi:newspaper-variant-multiple-outline" class="size-5" />
            </span>
            <span>
              <span
                class="block text-[9px] font-semibold uppercase tracking-[0.38em] text-cyan-200/60"
              >
                RSS aggregator
              </span>
              <span
                class="news-serif block text-[1.75rem] leading-none font-semibold tracking-[-0.03em] text-white"
              >
                JS Ecosystem News
              </span>
            </span>
          </NuxtLink>

          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300/76">
            <span
              class="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5"
            >
              <span class="relative flex size-2 shrink-0">
                <span
                  class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60"
                />
                <span class="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              <span class="text-emerald-100">Live feed</span>
            </span>
            <span
              class="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:inline-flex"
            >
              <Icon name="mdi:calendar-today" class="size-3.5 text-amber-200" />
              {{ todayLabel }}
            </span>
          </div>
        </div>
      </header>

      <slot />
    </div>
  </main>
</template>

<script setup lang="ts">
const todayLabel = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());
</script>
