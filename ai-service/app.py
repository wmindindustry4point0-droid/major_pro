from flask import Flask, request, jsonify
from flask_cors import CORS
import os, re, string, io, hashlib, json, requests
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
CORS(app)

import nltk
from nltk.corpus import stopwords
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

print("Loading BERT model...")
nltk.download('stopwords', quiet=True)
stop_words = set(stopwords.words('english'))
model = SentenceTransformer('all-MiniLM-L6-v2')
print("BERT model ready.")

CACHE_DIR = '/tmp/emb_cache'
os.makedirs(CACHE_DIR, exist_ok=True)

def get_embedding(text: str):
    h = hashlib.sha256(text.encode()).hexdigest()
    cache_path = os.path.join(CACHE_DIR, f'{h}.json')
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f), h
    vec = model.encode([text])[0].tolist()
    try:
        with open(cache_path, 'w') as f:
            json.dump(vec, f)
    except Exception:
        pass
    return vec, h

TECH_SKILLS = [
    "python", "java", "javascript", "c++", "c#", "ruby", "go", "rust", "php", "typescript",
    "react", "angular", "vue", "next.js", "nuxt", "svelte", "node.js", "express", "django",
    "flask", "fastapi", "spring", "laravel", "rails",
    "tensorflow", "pytorch", "keras", "scikit-learn", "machine learning", "deep learning",
    "nlp", "bert", "llm", "generative ai", "langchain",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "firebase",
    "dynamodb", "oracle",
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "ci/cd", "terraform",
    "ansible", "linux", "bash", "nginx",
    "html", "css", "sass", "tailwind", "graphql", "rest", "grpc",
    "agile", "scrum", "jira", "figma",
    "data science", "pandas", "numpy", "spark", "hadoop", "tableau", "power bi"
]

WEIGHTS = {'semantic': 0.30, 'skills': 0.35, 'experience': 0.20, 'projects': 0.15}

def extract_text_from_pdf(url_or_path: str) -> str:
    import pdfplumber
    text = ""
    try:
        if url_or_path.startswith('http://') or url_or_path.startswith('https://'):
            r = requests.get(url_or_path, timeout=30)
            r.raise_for_status()
            src = io.BytesIO(r.content)
        else:
            src = url_or_path
        with pdfplumber.open(src) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
    except Exception as e:
        print(f"PDF extraction error: {e}")
    return text

def preprocess(text: str) -> str:
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    return " ".join(w for w in text.split() if w not in stop_words)

def cosine_sim(v1, v2) -> float:
    a = np.array(v1).reshape(1, -1)
    b = np.array(v2).reshape(1, -1)
    return float(cosine_similarity(a, b)[0][0])

def extract_skills(text: str) -> list:
    text_lower = text.lower()
    return sorted([s for s in TECH_SKILLS if re.search(r'\b' + re.escape(s) + r'\b', text_lower)])

def extract_name(lines: list) -> str:
    for line in lines[:12]:  # scan more lines to handle whitespace/headers
        line = line.strip()
        if not line:
            continue
        words = line.split()
        if (2 <= len(words) <= 5          # allow middle names
                and '@' not in line
                and not any(c.isdigit() for c in line)
                and ',' not in line
                and ':' not in line
                and len(line) <= 60
                and not any(kw in line.lower() for kw in ['resume', 'curriculum', 'vitae', 'cv', 'profile', 'summary'])):
            return line.title()           # normalize ALL-CAPS names
    return "Unknown"

def extract_email(text: str) -> str:
    m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    return m.group(0) if m else "Not Found"

def extract_phone(text: str) -> str:
    patterns = [
        r'(?<!\d)(?:\+91[\s\-]?)?[6-9]\d{9}(?!\d)',   # Indian numbers with word boundaries
        r'\+\d{1,3}[\s\-]?\d{3,5}[\s\-]?\d{4,6}',
        r'\(?\d{3}\)?[.\-\s]?\d{3}[.\-\s]?\d{4}',
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            return m.group(0).strip()
    return "Not Found"

# ── FIXED: Added 'achievements' and similar to stop project bleeding ──────────
SECTION_HEADERS = {
    'experience':   ['experience', 'work experience', 'employment', 'professional experience', 'work history'],
    'education':    ['education', 'academic', 'qualification', 'degree'],
    'projects':     ['project', 'projects', 'personal projects', 'portfolio'],
    'skills':       ['skills', 'technical skills', 'core competencies', 'technologies'],
    'achievements': ['achievement', 'achievements', 'accomplishment', 'accomplishments',
                     'awards', 'honors', 'honours', 'certifications', 'certification',
                     'extra', 'extracurricular', 'activities', 'volunteer', 'leadership'],
}

def detect_section(line: str):
    l = line.strip().lower()
    for section, keywords in SECTION_HEADERS.items():
        for kw in keywords:
            if (l == kw or l.startswith(kw + ':') or l.startswith(kw + ' ')) and len(l) < 40:
                return section
    return None

def parse_date(s: str):
    s = s.strip()
    months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
    m = re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*(\d{4})', s, re.I)
    if m: return int(m.group(2)), months[m.group(1).lower()[:3]]
    m = re.search(r'(\d{1,2})[/\-](\d{4})', s)
    if m: return int(m.group(2)), int(m.group(1))
    m = re.search(r'(\d{4})', s)
    if m: return int(m.group(1)), 6
    return None

def duration_months(start_str: str, end_str: str) -> int:
    from datetime import date
    s = parse_date(start_str)
    e = (date.today().year, date.today().month) if end_str.lower() in ('present','current','now','') else parse_date(end_str)
    if not s or not e: return 0
    return max(0, (e[0] - s[0]) * 12 + (e[1] - s[1]))

def extract_structured(text: str) -> dict:
    lines = [l.strip() for l in text.split('\n')]
    sections = {'experience': [], 'education': [], 'projects': [], 'skills': [], 'achievements': [], 'other': []}
    current = 'other'
    for line in lines:
        if not line: continue
        sec = detect_section(line)
        if sec: current = sec; continue
        sections[current].append(line)

    experience = parse_experience(sections['experience'])
    education  = parse_education(sections['education'])
    projects   = parse_projects(sections['projects'])
    total_months = sum(e.get('durationMonths', 0) for e in experience)
    return {
        'experience': experience,
        'education':  education,
        'projects':   projects,
        'totalExperienceYears': round(total_months / 12, 1)
    }

# ── parse_experience: returns camelCase keys ──────────────────────────────────
def parse_experience(lines: list) -> list:
    results = []
    date_pat = re.compile(
        r'(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}|\d{1,2}[/\-]\d{4}|\d{4})'
        r'\s*(?:–|-|to)\s*'
        r'(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}|\d{1,2}[/\-]\d{4}|\d{4}|present|current)',
        re.IGNORECASE
    )
    current_entry, desc_lines = None, []

    def flush():
        if current_entry:
            current_entry['description'] = ' '.join(desc_lines).strip()
            results.append(current_entry)

    for line in lines:
        m = date_pat.search(line)
        if m:
            flush(); desc_lines = []
            months = duration_months(m.group(1), m.group(2))
            title_part = line[:m.start()].strip().rstrip('–-|·').strip()
            current_entry = {
                'title':          title_part or 'Position',
                'company':        '',
                'startDate':      m.group(1),   # camelCase ✓
                'endDate':        m.group(2),   # camelCase ✓
                'durationMonths': months,        # camelCase ✓
            }
        elif current_entry and not current_entry.get('company') and line and len(line) < 80:
            if not any(c.isdigit() for c in line[:5]):
                current_entry['company'] = line
        else:
            desc_lines.append(line)
    flush()
    return results[:10]


# ── parse_education: returns camelCase keys ───────────────────────────────────
def parse_education(lines: list) -> list:
    year_pat  = re.compile(r'\b(19|20)\d{2}\b')
    degree_kw = [
        'b.tech', 'b.e.', 'btech', 'be ', 'm.tech', 'mtech',
        'bsc', 'msc', 'bachelor', 'master', 'phd', 'mba',
        'diploma', 'b.sc', 'm.sc', 'engineering', 'computer',
        'bachelor of', 'master of',
    ]
    inst_kw = ['institute', 'university', 'college', 'school', 'academy']

    def is_degree_line(l):
        ll = l.lower()
        return any(kw in ll for kw in degree_kw)

    def is_institution_line(l):
        ll = l.lower()
        if any(kw in ll for kw in inst_kw):
            return True
        if not any(c.isdigit() for c in l) and 2 <= len(l.split()) <= 10 and len(l) < 100:
            return True
        return False

    blocks = []
    current_block = []
    for line in lines:
        if not line.strip():
            if current_block:
                blocks.append(current_block)
                current_block = []
        else:
            current_block.append(line.strip())
    if current_block:
        blocks.append(current_block)

    if len(blocks) == 1 and len(blocks[0]) > 5:
        blocks = [[l] for l in blocks[0]]

    results = []
    for block in blocks:
        degree_line      = ''
        institution_line = ''
        year_val         = None
        grade            = ''

        for line in block:
            ll = line.lower()
            if any(p in ll for p in ['%', 'cgpa', 'gpa', 'percentage', 'grade']):
                grade = line
                ym = year_pat.search(line)
                if ym and not year_val:
                    year_val = int(ym.group(0))
                continue
            ym = year_pat.search(line)
            if ym and not year_val:
                year_val = int(ym.group(0))
            if is_degree_line(line) and not degree_line:
                degree_line = line
            elif is_institution_line(line) and not institution_line and line != degree_line:
                institution_line = line

        if degree_line or institution_line:
            results.append({
                'degree':      degree_line,
                'institution': institution_line,
                'year':        year_val,
                'grade':       grade,
            })

    seen, unique = set(), []
    for r in results:
        key = (r['degree'].lower()[:30], r['institution'].lower()[:30])
        if key not in seen:
            seen.add(key)
            unique.append(r)

    return unique[:5]


# ── parse_projects: returns camelCase keys + digit-start guard ────────────────
def parse_projects(lines: list) -> list:
    BULLET_RE = re.compile(r'^[\•\-\*\▪\◦\–\—]\s*')

    results    = []
    current    = None
    desc_lines = []

    def flush():
        if current:
            desc = ' '.join(desc_lines).strip()
            results.append({
                'name':        current['name'],
                'description': desc,
                'techStack':   extract_skills(desc + ' ' + current['name']),  # camelCase ✓
            })

    for line in lines:
        is_bullet = bool(BULLET_RE.match(line))
        clean     = BULLET_RE.sub('', line).strip()

        if (
            not is_bullet
            and clean
            and len(line) < 80
            and len(line.split()) <= 12
            and not clean[0].islower()    # not a sentence continuation
            and not clean[0].isdigit()    # FIXED: reject "300+ participants." etc.
        ):
            flush()
            desc_lines = []
            current    = {'name': clean}
        else:
            desc_lines.append(clean if is_bullet else line)

    flush()
    return results[:8]


def score_skills(candidate_skills, must_have, nice_to_have):
    # BUG 3 FIX: normalize all skill lists to lowercase before comparing
    # candidate_skills from extract_skills() are already lowercase,
    # but must_have/nice_to_have come from job.requiredSkills (mixed case)
    cand = set(s.lower().strip() for s in candidate_skills)
    must = set(s.lower().strip() for s in must_have)
    nice = set(s.lower().strip() for s in nice_to_have)
    must_matched = list(cand & must)
    nice_matched = list(cand & nice)
    must_missing = list(must - cand)
    must_score = len(must_matched) / max(len(must), 1)
    nice_score = len(nice_matched) / max(len(nice), 1) if nice else 1.0
    return {
        'score': must_score * 0.8 + nice_score * 0.2,
        'must_matched': must_matched,
        'nice_matched': nice_matched,
        'must_missing': must_missing
    }

def score_experience(candidate_years, min_exp, max_exp) -> float:
    if candidate_years >= min_exp and candidate_years <= max_exp: return 1.0
    if candidate_years < min_exp: return min(candidate_years / max(min_exp, 0.1), 0.85)
    return 0.9

def score_projects(projects, jd_embedding) -> float:
    if not projects or not jd_embedding: return 0.5
    text = ' '.join(
        p.get('description', '') + ' ' + ' '.join(p.get('techStack', []))
        for p in projects
    )
    if not text.strip(): return 0.5
    vec, _ = get_embedding(preprocess(text))
    return cosine_sim(vec, jd_embedding)

def build_insights(candidate_skills, must_have, must_matched, must_missing,
                   nice_missing, candidate_years, min_exp, semantic_score):
    strengths, weaknesses = [], []
    if must_matched:
        strengths.append(f"Matched {len(must_matched)}/{len(must_have)} required skills: {', '.join(must_matched[:5])}")
    for s in must_missing[:3]:
        weaknesses.append(f"Missing required skill: {s}")
    if len(must_missing) > 3:
        weaknesses.append(f"...and {len(must_missing)-3} more missing required skills")
    if min_exp > 0:
        if candidate_years >= min_exp:
            strengths.append(f"{candidate_years} years experience — meets {min_exp}yr minimum")
        else:
            weaknesses.append(f"Only {candidate_years} years experience; role requires {min_exp}+")
    if semantic_score >= 0.75:
        strengths.append("Resume content closely matches the job description")
    elif semantic_score < 0.5:
        weaknesses.append("Resume content not well aligned to job description — consider tailoring")
    if nice_missing:
        weaknesses.append(f"Nice-to-have skills not found: {', '.join(nice_missing[:4])}")
    return strengths, weaknesses


@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    resume_path      = data.get('resume_path', '')
    jd_text          = data.get('job_description', '')
    required_skills  = data.get('required_skills', [])
    provided_must    = data.get('must_have_skills', [])
    nice_to_have     = data.get('nice_to_have_skills', [])
    min_exp          = float(data.get('min_experience', 0))
    max_exp          = float(data.get('max_experience', 99))
    provided_jd_emb  = data.get('jd_embedding')
    provided_res_emb = data.get('resume_embedding')

    # BUG 4 FIX: if mustHaveSkills is empty (most jobs don't set it), fall back to
    # required_skills so scoring actually compares against what the job needs.
    # Only use provided_must when it has entries (i.e. recruiter explicitly set mustHave).
    must_have = provided_must if provided_must else required_skills

    if not resume_path or not jd_text:
        return jsonify({'error': 'Missing resume_path or job_description'}), 400

    raw_text = extract_text_from_pdf(resume_path)
    if not raw_text.strip():
        return jsonify({'error': 'No parseable text in resume'}), 400

    lines  = [l.strip() for l in raw_text.split('\n') if l.strip()]
    name   = extract_name(lines)
    email  = extract_email(raw_text)
    phone  = extract_phone(raw_text)
    skills = extract_skills(raw_text)
    structured = extract_structured(raw_text)
    candidate_years = structured['totalExperienceYears']

    clean_jd = preprocess(jd_text)
    jd_embedding, jd_hash = (
        (provided_jd_emb, None)
        if (provided_jd_emb and len(provided_jd_emb) > 0)
        else get_embedding(clean_jd)
    )

    clean_resume = preprocess(raw_text)
    resume_embedding, resume_hash = (
        (provided_res_emb, None)
        if (provided_res_emb and len(provided_res_emb) > 0)
        else get_embedding(clean_resume)
    )

    semantic_score = cosine_sim(resume_embedding, jd_embedding)
    skill_result   = score_skills(skills, must_have, nice_to_have)
    exp_score      = score_experience(candidate_years, min_exp, max_exp)
    proj_score     = score_projects(structured['projects'], jd_embedding)

    breakdown = {
        'semantic':   round(semantic_score, 4),
        'skills':     round(skill_result['score'], 4),
        'experience': round(exp_score, 4),
        'projects':   round(proj_score, 4)
    }
    final = round(sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS) * 100, 1)

    nice_missing = list(set(s.lower() for s in nice_to_have) - set(s.lower() for s in skills))
    strengths, weaknesses = build_insights(
        skills, must_have, skill_result['must_matched'], skill_result['must_missing'],
        nice_missing, candidate_years, min_exp, semantic_score
    )
    missing_str = ', '.join(skill_result['must_missing']) if skill_result['must_missing'] else 'None'

    return jsonify({
        'finalScore':      final,
        'scoreBreakdown':  breakdown,
        'skillsMatched':   skill_result['must_matched'] + skill_result['nice_matched'],
        'skillsMissing':   skill_result['must_missing'],
        'strengths':       strengths,
        'weaknesses':      weaknesses,
        'parsedData': {
            'name':                 name,
            'email':                email,
            'phone':                phone,
            'skills':               skills,
            'totalExperienceYears': candidate_years,
            'experience':           structured['experience'],
            'education':            structured['education'],
            'projects':             structured['projects'],
        },
        'jdEmbedding':          jd_embedding,
        'resumeEmbedding':      resume_embedding,
        'resumeEmbeddingHash':  resume_hash,
        'matchPercentage':      final,
        'feedback':             f"Score: {final}%. Missing required skills: {missing_str}.",
        'skills':               skills
    })


@app.route('/embed_jd', methods=['POST'])
def embed_jd():
    data = request.json
    jd_text = data.get('job_description', '')
    if not jd_text:
        return jsonify({'error': 'Missing job_description'}), 400
    embedding, h = get_embedding(preprocess(jd_text))
    return jsonify({'embedding': embedding, 'hash': h})


@app.route('/parse_resume', methods=['POST'])
def parse_resume():
    data = request.json
    resume_path = data.get('resume_path', '')
    if not resume_path:
        return jsonify({'error': 'Missing resume_path'}), 400

    raw_text = extract_text_from_pdf(resume_path)
    if not raw_text.strip():
        return jsonify({'error': 'No parseable text'}), 400

    lines      = [l.strip() for l in raw_text.split('\n') if l.strip()]
    name       = extract_name(lines)
    email      = extract_email(raw_text)
    phone      = extract_phone(raw_text)
    skills     = extract_skills(raw_text)
    structured = extract_structured(raw_text)
    embedding, emb_hash = get_embedding(preprocess(raw_text))

    return jsonify({
        'status':               'Success',
        'candidateName':        name,
        'email':                email,
        'phone':                phone,
        'extractedSkills':      skills,
        'totalExperienceYears': structured['totalExperienceYears'],
        'experience':           structured['experience'],   # already camelCase ✓
        'education':            structured['education'],    # already camelCase ✓
        'projects':             structured['projects'],     # already camelCase ✓
        'embeddingVector':      embedding,
        'embeddingHash':        emb_hash
    })


@app.route('/extract_resume', methods=['POST'])
def extract_resume():
    return parse_resume()


@app.route('/analyze_batch', methods=['POST'])
def analyze_batch():
    data         = request.json
    resumes      = data.get('resumes', [])
    jd_text      = data.get('job_description', '')
    must_have    = data.get('must_have_skills', data.get('required_skills', []))
    nice_to_have = data.get('nice_to_have_skills', [])
    min_exp      = float(data.get('min_experience', 0))
    max_exp      = float(data.get('max_experience', 99))

    if not resumes or not jd_text:
        return jsonify({'error': 'Missing resumes or job_description'}), 400

    jd_embedding, _ = get_embedding(preprocess(jd_text))

    def process_one_with_text(resume, raw_text):
        r_id       = resume.get('id')
        r_fileName = resume.get('fileName', '')
        res_emb    = resume.get('existingEmbedding')
        try:
            if not raw_text.strip():
                return {'id': r_id, 'fileName': r_fileName, 'status': 'Failed', 'error': 'No parseable text'}

            lines  = [l.strip() for l in raw_text.split('\n') if l.strip()]
            name   = extract_name(lines)
            email  = extract_email(raw_text)
            phone  = extract_phone(raw_text)
            skills = extract_skills(raw_text)
            structured = extract_structured(raw_text)
            candidate_years = structured['totalExperienceYears']

            resume_embedding = (
                res_emb if (res_emb and len(res_emb) > 0)
                else get_embedding(preprocess(raw_text))[0]
            )

            semantic  = cosine_sim(resume_embedding, jd_embedding)
            skill_res = score_skills(skills, must_have, nice_to_have)
            exp_s     = score_experience(candidate_years, min_exp, max_exp)
            proj_s    = score_projects(structured['projects'], jd_embedding)

            breakdown = {
                'semantic':   round(semantic, 4),
                'skills':     round(skill_res['score'], 4),
                'experience': round(exp_s, 4),
                'projects':   round(proj_s, 4)
            }
            final = round(sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS) * 100, 1)
            nice_missing = list(set(s.lower() for s in nice_to_have) - set(s.lower() for s in skills))
            strengths, weaknesses = build_insights(
                skills, must_have, skill_res['must_matched'], skill_res['must_missing'],
                nice_missing, candidate_years, min_exp, semantic
            )
            return {
                'id':                   r_id,
                'fileName':             r_fileName,
                'status':               'Success',
                'candidateName':        name,
                'email':                email,
                'phone':                phone,
                'extractedSkills':      skills,
                'matchScore':           final,
                'finalScore':           final,
                'scoreBreakdown':       breakdown,
                'skillsMatched':        skill_res['must_matched'] + skill_res['nice_matched'],
                'missingSkills':        skill_res['must_missing'],
                'skillsMissing':        skill_res['must_missing'],  # structured array for MatchScore.jsx
                'strengths':            strengths,
                'weaknesses':           weaknesses,
                'totalExperienceYears': candidate_years,
                'experience':           structured['experience'],
                'education':            structured['education'],
                'projects':             structured['projects'],
            }
        except Exception as e:
            return {'id': r_id, 'fileName': r_fileName, 'status': 'Failed', 'error': str(e)}

    # BUG 17 FIX: Python's GIL means ThreadPoolExecutor gives no speedup for
    # CPU-bound work like BERT encoding (model.encode). Threads just add context-
    # switching overhead. I/O-bound work (PDF download) is genuinely parallel, so
    # we use a small thread pool only for the PDF fetching step, then run BERT
    # inference sequentially. This avoids the GIL bottleneck while still
    # parallelising network I/O.
    def fetch_pdf_text(resume):
        text = extract_text_from_pdf(resume['path'])
        return (resume, text)

    with ThreadPoolExecutor(max_workers=min(8, len(resumes))) as io_executor:
        resume_texts = list(io_executor.map(fetch_pdf_text, resumes))

    results = [process_one_with_text(resume, text) for resume, text in resume_texts]

    successful = sorted(
        [r for r in results if r.get('status') == 'Success'],
        key=lambda x: x.get('finalScore', 0), reverse=True
    )
    for i, r in enumerate(successful):
        r['rank'] = i + 1
    failed = [r for r in results if r.get('status') != 'Success']

    return jsonify({'analyzed_candidates': successful + failed})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'all-MiniLM-L6-v2', 'version': '2.0'})


if __name__ == '__main__':
    app.run(port=5001, debug=True, use_reloader=False)