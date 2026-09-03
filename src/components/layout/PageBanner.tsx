"use client";

import { usePathname } from "next/navigation";

/**
 * Full-bleed illustrated banner at the very top of each page.
 *
 * Matched by route prefix so detail pages (`/claims/:id`, `/policies/:id`, …)
 * inherit their section's banner. The image is `w-full` with intrinsic aspect
 * ratio, wrapped in `overflow-hidden`, so it fills the content column edge to
 * edge and can never push the page into horizontal scroll.
 */
const BANNERS: { prefix: string; src: string; alt: string }[] = [
  { prefix: "/overview", src: "/banners/overview.svg", alt: "Overview" },
  {
    prefix: "/claims",
    src: "/banners/claim_repository_bank.svg",
    alt: "Claim Repository Bank",
  },
  {
    prefix: "/predicted",
    src: "/banners/claim_repository_bank.svg",
    alt: "Claim Repository Bank",
  },
  {
    prefix: "/policies",
    src: "/banners/climate_policy_and_project_bank.svg",
    alt: "Climate Policy and Project Bank",
  },
  { prefix: "/alerts", src: "/banners/alert.svg", alt: "Alert Page" },
  {
    prefix: "/admin",
    src: "/banners/admin_settings.svg",
    alt: "Admin Settings",
  },
  {
    prefix: "/coordinated-network",
    src: "/banners/coordinated_network_detector.svg",
    alt: "Coordinated-Network Detector",
  },
];

export function PageBanner() {
  const pathname = usePathname();
  const banner = BANNERS.find(
    (b) => pathname === b.prefix || pathname.startsWith(`${b.prefix}/`),
  );

  if (!banner) return null;

  return (
    <div className="w-full overflow-hidden border-b border-pale-sky">
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative SVG banner */}
      <img src={banner.src} alt={banner.alt} className="block w-full" />
    </div>
  );
}
