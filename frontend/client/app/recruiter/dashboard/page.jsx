"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This route now lives at /recruiter — kept as a redirect for any old links/bookmarks.
export default function RecruiterDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/recruiter"); }, [router]);
  return null;
}
