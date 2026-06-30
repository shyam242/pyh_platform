// Deterministic "AI suitability" scoring engine.
// Scores a candidate (0-100) against the best-matching active job posting using
// weighted skill-overlap + experience-fit, so every score is explainable and
// reproducible (no randomness, no placeholder numbers).

const normalizeSkillList = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|/]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

const parseExperienceRange = (raw) => {
  // Accepts formats like "2-4 years", "3+ years", "5", "Fresher"
  if (!raw) return { min: 0, max: 99 };
  const str = String(raw).toLowerCase();
  if (str.includes("fresher")) return { min: 0, max: 1 };
  const range = str.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/);
  if (range) return { min: parseFloat(range[1]), max: parseFloat(range[3]) };
  const plus = str.match(/(\d+(\.\d+)?)\s*\+/);
  if (plus) return { min: parseFloat(plus[1]), max: parseFloat(plus[1]) + 5 };
  const single = str.match(/(\d+(\.\d+)?)/);
  if (single) {
    const v = parseFloat(single[1]);
    return { min: Math.max(0, v - 1), max: v + 1 };
  }
  return { min: 0, max: 99 };
};

const experienceFit = (candidateExp, jobRange) => {
  const exp = parseFloat(candidateExp) || 0;
  if (exp >= jobRange.min && exp <= jobRange.max) return 1;
  const distance = exp < jobRange.min ? jobRange.min - exp : exp - jobRange.max;
  // Lose 15% per year outside the band, floor at 0
  return Math.max(0, 1 - distance * 0.15);
};

const textRelevance = (candidateRole, job) => {
  if (!candidateRole) return 0;
  const role = candidateRole.toLowerCase();
  const title = (job.job_title || "").toLowerCase();
  const dept = (job.department || "").toLowerCase();
  if (!title) return 0;
  const roleWords = role.split(/\s+/).filter((w) => w.length > 2);
  const haystack = `${title} ${dept}`;
  const hits = roleWords.filter((w) => haystack.includes(w)).length;
  return roleWords.length ? hits / roleWords.length : 0;
};

/**
 * @param {object} candidate { skills, experience, job_role }
 * @param {array} jobs active job postings with job_title, department, qualifications, experience_required
 * @returns {{score:number,label:string,breakdown:object}}
 */
export const computeSuitabilityScore = (candidate, jobs) => {
  const candSkills = normalizeSkillList(candidate.skills || candidate.technical_skills);

  if (!jobs || jobs.length === 0 || candSkills.length === 0) {
    // Not enough signal to score — be honest instead of faking a number
    return { score: null, label: "Not Scored", breakdown: { reason: "Insufficient data: add skills or open matching jobs" } };
  }

  let best = null;
  for (const job of jobs) {
    const jobSkills = normalizeSkillList(job.qualifications) .concat(normalizeSkillList(job.job_description));
    const overlap = candSkills.filter((s) => jobSkills.some((js) => js.includes(s) || s.includes(js)));
    const skillScore = candSkills.length ? overlap.length / candSkills.length : 0;
    const expRange = parseExperienceRange(job.experience_required);
    const expScore = experienceFit(candidate.experience, expRange);
    const roleScore = textRelevance(candidate.job_role || candidate.role, job);

    const weighted = skillScore * 0.55 + expScore * 0.3 + roleScore * 0.15;
    if (!best || weighted > best.weighted) {
      best = { weighted, job, skillScore, expScore, roleScore, overlap };
    }
  }

  const score = Math.round(best.weighted * 100);
  let label = "Low Match";
  if (score >= 85) label = "Excellent Match";
  else if (score >= 70) label = "Very Good Match";
  else if (score >= 55) label = "Good Match";
  else if (score >= 40) label = "Average Match";

  return {
    score,
    label,
    breakdown: {
      matchedJob: best.job.job_title,
      skillOverlapPct: Math.round(best.skillScore * 100),
      matchedSkills: best.overlap,
      experienceFitPct: Math.round(best.expScore * 100),
      roleRelevancePct: Math.round(best.roleScore * 100),
    },
  };
};
