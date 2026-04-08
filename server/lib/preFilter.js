function preFilter(profile, job) {
    const mustHave = job.mustHaveSkills || [];
    const minExp   = job.minExperience  || 0;

    if (mustHave.length === 0) return { pass: true };

    const candidateSkills = (profile.extractedSkills || []).map(s => s.toLowerCase().trim());

    const mustMatches = mustHave.filter(s => candidateSkills.includes(s.toLowerCase().trim()));
    const skillRatio  = mustMatches.length / mustHave.length;

    if (skillRatio < 0.5) {
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
