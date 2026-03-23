<template>
  <div class="relative">
    <main class="min-h-dvh px-3 py-3 sm:px-5 lg:px-6">
      <div
        class="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-400 flex-col gap-3 xl:h-[calc(100dvh-1.5rem)]"
      >
        <header
          class="relative overflow-hidden rounded-4xl border border-white/10 bg-slate-950/70 px-4 py-4 shadow-[0_20px_60px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:px-5"
        >
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.14),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_45%)]"
          />

          <div class="relative z-10">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <NuxtLink
                  to="/"
                  class="inline-flex items-center gap-2.5 text-white transition hover:text-cyan-100"
                >
                  <span
                    class="inline-flex size-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                  >
                    <Icon name="mdi:earth" class="size-5" />
                  </span>
                  <span>
                    <span class="block text-[11px] uppercase tracking-[0.34em] text-cyan-200/70"
                      >News atlas</span
                    >
                    <span class="block text-xl font-semibold tracking-tight sm:text-2xl"
                      >Global Tech News</span
                    >
                  </span>
                </NuxtLink>
                <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-200/80">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5"
                  >
                    <Icon name="mdi:radio-tower" class="size-3.5 text-emerald-300" />
                    Live RSS aggregation
                  </span>
                  <a
                    href="/api/news/tech"
                    target="_blank"
                    rel="noreferrer noopener"
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                  >
                    <Icon name="mdi:api" class="size-3.5" />
                    Open JSON feed
                  </a>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5"
                  >
                    <Icon name="mdi:calendar-today" class="size-3.5 text-amber-200" />
                    {{ todayLabel }}
                  </span>
                </div>
              </div>

              <div class="text-sm text-slate-300/75">
                <p>
                  A global news atlas, charting the latest tech stories and trends across the world.
                  From Silicon Valley breakthroughs to emerging innovations in Asia, our dispatch
                  board offers a unique perspective on the global tech ecosystem.
                </p>
                <p>
                  News are fetched from following sources: nuxt.com, blog.vuejs.org,
                  tailwindcss.com, javascriptweekly.com, css-tricks.com, smashingmagazine.com,
                  blog.risingstack.com, github.blog, dev.to, medium.com and stackoverflow.com
                </p>
              </div>
            </div>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 flex-col">
          <slot />
        </div>
      </div>
    </main>

    <div
      class="pointer-events-none fixed w-full inset-x-3 bottom-1.5 z-40 flex justify-center sm:inset-x-auto left-6 right-6"
    >
      <div
        class="floating-credit pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-slate-100"
      >
        <span class="text-rose-200/95">Made with ❤️ by</span>
        <a
          href="https://nemanjadragun.com"
          target="_blank"
          rel="noreferrer noopener"
          class="floating-credit__name normal-case"
        >
          Nemanja Dragun
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const todayLabel = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());
</script>
