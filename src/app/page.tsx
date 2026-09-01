import { redirect } from "next/navigation";
import { HOME_HREF } from "@/lib/constants/routes";

/** US66 puts the Overview first, so it is also where "/" lands. */
export default function RootPage() {
  redirect(HOME_HREF);
}
