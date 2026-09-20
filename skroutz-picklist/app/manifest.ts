import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skroutz Picklist",
    short_name: "Picklist",
    description: "Τοπική λίστα συλλογής παραγγελιών από PDF του Skroutz.",
    start_url: "/checklist",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4f5ef",
    theme_color: "#10201d",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
