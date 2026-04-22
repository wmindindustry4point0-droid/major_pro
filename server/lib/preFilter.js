// preFilter checks whether a candidate meets hard minimum requirements for a job.
// v3: synonym-aware matching — "JS" matches "JavaScript", "k8s" matches "Kubernetes", etc.
//
// FIX #11: mustHaveThreshold default changed from 1.0 (100%) to 0.8 (80%).
// A threshold of 1.0 auto-rejects candidates missing even a single skill out of 10,
// which is too strict for real-world hiring. 0.8 allows up to 20% skill gap.

// How much experience slack to allow — candidate needs at least this fraction of minExp.
// e.g. 0.7 means a 3-year minimum will pass a 2.1-year candidate.
const EXPERIENCE_SLACK = 0.7;

// Canonical synonym map — add more pairs as needed
const SYNONYMS = {
  'js':           'javascript',
  'reactjs':      'react',
  'react.js':     'react',
  'vue.js':       'vue',
  'node':         'node.js',
  'nodejs':       'node.js',
  'postgres':     'postgresql',
  'k8s':          'kubernetes',
  'ml':           'machine learning',
  'ai':           'artificial intelligence',
  'dl':           'deep learning',
  'ts':           'typescript',
  'mongo':        'mongodb',
  'py':           'python',
  'gcp':          'google cloud',
  'aws':          'amazon web services',
  'tf':           'tensorflow',
  'springboot':   'spring boot',
  'spring-boot':  'spring boot',
  'nextjs':       'next.js',
  'nuxtjs':       'nuxt',
  'sveltejs':     'svelte',
  'scss':         'sass',
  'ci/cd':        'cicd',
  'cicd':         'ci/cd',
};

function normalize(skill) {
  const s = skill.toLowerCase().trim();
  return SYNONYMS[s] || s;
}

function preFilter(profile, job, { mustHaveThreshold = 0.8 } = {}) {
  const mustHave = job.mustHaveSkills || [];
  const minExp   = job.minExperience  || 0;

  if (mustHave.length === 0) return { pass: true };

  // Normalize candidate skills through synonym map
  const candidateSkills = (profile.extractedSkills || []).map(normalize);

  // Normalize job's must-have skills too so both sides are canonical
  const mustMatches = mustHave.filter(s => candidateSkills.includes(normalize(s)));
  const skillRatio  = mustMatches.length / mustHave.length;

  if (skillRatio < mustHaveThreshold) {
    const missing = mustHave.filter(s => !candidateSkills.includes(normalize(s)));
    return {
      pass: false,
      reason: `Missing ${missing.length} of ${mustHave.length} required skills: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`
    };
  }

  const candidateExp = profile.totalExperienceYears || 0;
  // EXPERIENCE_SLACK: candidate needs at least (minExp * EXPERIENCE_SLACK) years
  if (minExp > 0 && candidateExp < minExp * EXPERIENCE_SLACK) {
    return {
      pass: false,
      reason: `Insufficient experience: ${candidateExp.toFixed(1)} years (minimum ${minExp} years required)`
    };
  }

  return { pass: true };
}

module.exports = preFilter;