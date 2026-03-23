<template>
  <NuxtLayout>
    <Html lang="en" :data-route-path="route.path" />
    <NuxtAnnouncer />
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>

<script lang="ts" setup>
const nuxtApp = useNuxtApp();
const route = useRoute();

const siteName = "Global Tech News";
const siteDescription =
  "A global tech news atlas tracking fresh stories, trends, and regional signals across the world.";
const socialHandle = "@nemanjadragun";

const currentUrl = computed(() => {
  return `${nuxtApp.$app_origin}${route.path}`;
});

const pageTitle = computed(() => {
  if (route.path === "/") {
    return `${siteName} | News Atlas`;
  }

  return `${siteName} | ${route.path.replace(/^\//, "").replace(/[-/]+/g, " ")}`;
});

useSeoMeta({
  title: () => pageTitle.value,
  description: siteDescription,
  applicationName: siteName,
  author: "Nemanja Dragun",
  creator: "Nemanja Dragun",
  publisher: "Nemanja Dragun",
  robots: "index, follow",
  ogTitle: () => pageTitle.value,
  ogDescription: siteDescription,
  ogType: "website",
  ogSiteName: siteName,
  ogUrl: () => currentUrl.value,
  ogImage: `${nuxtApp.$app_origin}/favicon.png`,
  twitterCard: "summary_large_image",
  twitterTitle: () => pageTitle.value,
  twitterDescription: siteDescription,
  twitterImage: `${nuxtApp.$app_origin}/favicon.png`,
  twitterCreator: socialHandle,
  twitterSite: socialHandle,
});

useHead({
  link: [
    {
      rel: "canonical",
      href: currentUrl,
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      href: "/favicon.svg",
    },
    {
      rel: "icon",
      type: "image/png",
      href: "/favicon.png",
    },
    {
      rel: "shortcut icon",
      href: "/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      href: "/favicon.png",
    },
  ],
  meta: [
    {
      name: "language",
      content: "en",
    },
    {
      name: "theme-color",
      content: "#040816",
    },
  ],
});
</script>
