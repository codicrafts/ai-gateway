import type { Metadata } from "next";
import AboutPageClient from "@/components/about/AboutPageClient";
import { buildPageMetadata } from "@/config/site";

export const metadata: Metadata = buildPageMetadata({
  title: "About MeshRouter",
  description:
    "Learn what MeshRouter is building, how the platform approaches unified AI model access, and why teams use it for delivery and operations.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutPageClient />;
}
