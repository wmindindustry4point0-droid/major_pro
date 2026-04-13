// preFilter checks whether a candidate meets the hard minimum requirements for a job.
// It accepts either a CandidateProfile document OR a plain object with the same shape,
// which lets callers pass freshly AI-extracted skills instead of stale cached profile data.
//
// mustHaveThreshold: fraction of must-have skills the candidate must match (default 1.0 = 100%).
// Set to a lower value (e.g. 0.8) for roles where some flexibility is acceptable.
function preFilter(profile, job, { mustHaveThreshold = 1.0 } = {}) {
    const mustHave = job.mustHaveSkills || [];
    const minExp   = job.minExperience  || 0;

    if (mustHave.length === 0) return { pass: true };

    const candidateSkills = (profile.extractedSkills || []).map(s => s.toLowerCase().trim());

    const mustMatches = mustHave.filter(s => candidateSkills.includes(s.toLowerCase().trim()));
    const skillRatio  = mustMatches.length / mustHave.length;

    if (skillRatio < mustHaveThreshold) {
        const missing = mustHave.filter(s => !candidateSkills.includes(s.toLowerCase().trim()));
        return {
            pass: false,
            reason: `Missing ${missing.length} of ${mustHave.length} required skills: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`
        };
    }

    const candidateExp = profile.totalExperienceYears || 0;
    if (minExp > 0 && candidateExp < minExp * 0.7) {
        return {
            pass: false,
            reason: `Insufficient experience: ${candidateExp.toFixed(1)} years (minimum ${minExp} years required)`
        };
    }

    return { pass: true };
}

module.exports = preFilter;