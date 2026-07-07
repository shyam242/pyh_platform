// Keeps the public marketing site (pickyourhire.com/jobs) in sync with jobs
// managed in the portal. This is fire-and-forget: if the public site is
// unreachable or misconfigured, it logs the failure but never blocks or fails
// the admin's request in the portal itself.

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL; // e.g. https://www.pickyourhire.com
const SYNC_SECRET = process.env.PUBLIC_SITE_SYNC_SECRET;

const isConfigured = () => {
  if (!PUBLIC_SITE_URL || !SYNC_SECRET) {
    console.warn(
      "Public site sync skipped: set PUBLIC_SITE_URL and PUBLIC_SITE_SYNC_SECRET env vars to enable it."
    );
    return false;
  }
  return true;
};

// Splits a plain-text field (one item per line, or bullet/dash separated)
// into an array, since the public site stores these as text[] columns.
const toList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(/\r?\n|•|- /)
    .map((s) => s.trim())
    .filter(Boolean);
};

const mapJobToPublicSitePayload = (job) => ({
  external_id: job.id,
  title: job.job_title,
  department: job.department,
  location: job.location,
  jobType: job.job_type,
  salaryRange: job.salary_range,
  experience: job.experience_required,
  description: job.job_description,
  responsibilities: toList(job.responsibilities),
  qualifications: toList(job.qualifications),
  benefits: toList(job.benefits),
});

const postToPublicSite = async (body) => {
  const res = await fetch(`${PUBLIC_SITE_URL.replace(/\/$/, "")}/api/jobs/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sync-secret": SYNC_SECRET,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Public site responded ${res.status}: ${text}`);
  }
};

// Creates or updates the job's mirror on the public site.
export const upsertJobOnPublicSite = async (job) => {
  if (!isConfigured()) return;
  try {
    await postToPublicSite({ action: "upsert", job: mapJobToPublicSitePayload(job) });
    console.log(`✓ Synced job #${job.id} to public site`);
  } catch (err) {
    console.error(`Public site sync (upsert) failed for job #${job.id}:`, err.message);
  }
};

// Removes the job's mirror from the public site (used when a job is paused,
// closed, or deleted in the portal, since the public site has no such states
// — it should simply stop showing the listing).
export const removeJobFromPublicSite = async (jobId) => {
  if (!isConfigured()) return;
  try {
    await postToPublicSite({ action: "delete", job: { external_id: jobId } });
    console.log(`✓ Removed job #${jobId} from public site`);
  } catch (err) {
    console.error(`Public site sync (delete) failed for job #${jobId}:`, err.message);
  }
};
