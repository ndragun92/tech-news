<template>
  <main class="min-h-dvh px-4 py-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-384 space-y-4">
      <header class="news-surface relative overflow-hidden rounded-4xl px-5 py-5 sm:px-6">
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_22%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.12),transparent_20%),linear-gradient(180deg,rgba(10,17,30,0.92),rgba(7,12,22,0.82))]"
        />

        <div class="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-3 text-white transition hover:text-cyan-100"
          >
            <span
              class="inline-flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-cyan-100 shadow-sm"
            >
              <Icon name="mdi:newspaper-variant-multiple-outline" class="size-5" />
            </span>
            <span>
              <span
                class="block text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-200/70"
              >
                Signal desk
              </span>
              <span
                class="news-serif block text-[2rem] leading-none font-semibold tracking-[-0.03em] text-white"
              >
                Global Tech News
              </span>
            </span>
          </NuxtLink>

          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300/76">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
            >
              <Icon name="mdi:radio-tower" class="size-3.5 text-emerald-300" />
              Live RSS aggregation
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
            >
              <Icon name="mdi:calendar-today" class="size-3.5 text-amber-200" />
              {{ todayLabel }}
            </span>
          </div>
        </div>

        <div class="relative z-10 mt-4 max-w-3xl text-[12px] leading-6 text-slate-300/78">
          A dark, compact reading surface for tracking updates across the configured sources with
          less noise and faster scanning.
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
