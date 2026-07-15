"use client";
import FakeExperienceCheck from "@/components/FakeExperienceCheck";

export default function AdminFakeExperienceCheckPage() {
  return <FakeExperienceCheck apiPrefix="/api/admin" backHref="/admin" />;
}
