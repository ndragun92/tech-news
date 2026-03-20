<script setup lang="ts">
const todayLabel = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());
</script>

<template>
  <main class="min-h-dvh px-4 py-4 sm:px-6 lg:px-8">
    <div
      class="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-400 flex-col gap-4 xl:h-[calc(100dvh-2rem)]"
    >
      <header
        class="relative overflow-hidden rounded-4xl border border-white/10 bg-slate-950/70 px-5 py-5 shadow-[0_20px_60px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:px-6"
      >
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.14),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_45%)]"
        />

        <div class="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-2">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-3 text-white transition hover:text-cyan-100"
            >
              <span
                class="inline-flex size-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
              >
                <Icon name="mdi:earth" class="size-6" />
              </span>
              <span>
                <span class="block text-[11px] uppercase tracking-[0.34em] text-cyan-200/70"
                  >News atlas</span
                >
                <span class="block text-2xl font-semibold tracking-tight">Tech dispatch board</span>
              </span>
            </NuxtLink>

            <p class="max-w-2xl text-sm leading-6 text-slate-300/75">
              A Nuxt 4 shell for watching fresh engineering stories move across publishers,
              countries, and confidence signals.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-200/80">
            <span
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"
            >
              <Icon name="mdi:radio-tower" class="size-4 text-emerald-300" />
              Live RSS aggregation
            </span>
            <a
              href="/api/news/tech"
              target="_blank"
              rel="noreferrer noopener"
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
            >
              <Icon name="mdi:api" class="size-4" />
              Open JSON feed
            </a>
            <span
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"
            >
              <Icon name="mdi:calendar-today" class="size-4 text-amber-200" />
              {{ todayLabel }}
            </span>
          </div>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 flex-col">
        <slot />
      </div>
    </div>
  </main>
</template>
