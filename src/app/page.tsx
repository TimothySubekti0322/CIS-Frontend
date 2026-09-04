import { redirect } from "next/navigation";
import { HOME_HREF } from "@/lib/constants/routes";

/** The Overview is the default landing page, so "/" redirects there. */
export default function RootPage() {
  redirect(HOME_HREF);
}
