import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://tankaria.dev/",
    title: "Harshal Tankaria",
    description: "Personal site and blog of Harshal Tankaria — engineering, technology, and ideas.",
    author: "Harshal Tankaria",
    profile: "https://tankaria.dev",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/New_York",
    dir: "ltr",
  },
  posts: {
    perPage: 5,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github",   url: "https://github.com/HTankaria" },
    { name: "linkedin", url: "https://www.linkedin.com/in/harshaltankaria/" },
    { name: "mail",     url: "mailto:harshalt90@gmail.com" },
  ],
  shareLinks: [
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "linkedin", url: "https://www.linkedin.com/sharing/share-offsite/?url=" },
    { name: "mail",     url: "mailto:?subject=Check%20this%20out&body=" },
  ],
});