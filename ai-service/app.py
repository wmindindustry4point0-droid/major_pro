from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import string
import requests
import io

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------
# EAGER LOADING — loads at startup so first request is fast
# ---------------------------------------------------------------
import nltk
from nltk.corpus import stopwords
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

print("Loading BERT Model at startup...")
nltk.download('stopwords', quiet=True)
stop_words = set(stopwords.words('english'))
model = SentenceTransformer('all-MiniLM-L6-v2')
print("BERT Model Loaded. Server is ready.")

# ---------------------------------------------------------------
# EXPERIENCE LEVEL MAPPING
# Maps job's experienceLevel string → expected years range
# ---------------------------------------------------------------
EXPERIENCE_LEVEL_MAP = {
    "entry level":   (0, 2),
    "fresher":       (0, 1),
    "junior":        (1, 3),
    "mid level":     (3, 6),
    "intermediate":  (3, 6),
    "senior":        (6, 12),
    "senior level":  (6, 12),
    "lead":          (8, 15),
    "principal":     (10, 20),
    "manager":       (5, 15),
}

# ---------------------------------------------------------------
# EXPANDED SKILL DICTIONARY
# ---------------------------------------------------------------
TECH_SKILLS = [
    # Languages
    "python", "java", "javascript", "c++", "c#", "ruby", "go", "rust", "php", "typescript",
    "kotlin", "swift", "scala", "r", "matlab", "perl", "dart", "elixir", "haskell",
    # Frontend
    "react", "angular", "vue", "next.js", "nuxt.js", "svelte", "redux", "graphql",
    "html", "css", "sass", "tailwind", "bootstrap", "jquery", "webpack", "vite",
    "figma", "adobe xd",
    # Backend
    "node.js", "express", "django", "flask", "fastapi", "spring", "laravel", "rails",
    "asp.net", "dot net", ".net", "mern stack", "mean stack", "rest api", "microservices",
    # Databases
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra",
    "sqlite", "oracle", "firebase", "dynamodb", "prisma", "mongoose",
    # Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "ci/cd",
    "terraform", "ansible", "nginx", "linux", "bash", "github actions",
    # AI/ML
    "tensorflow", "pytorch", "keras", "scikit-learn", "machine learning", "deep learning",
    "nlp", "bert", "pandas", "numpy", "opencv", "hugging face",
    # Mobile
    "android", "ios", "react native", "flutter", "xamarin",
    # Tools & Concepts
    "agile", "scrum", "jira", "figma", "postman", "swagger", "oops", "oop",
    "data structures", "algorithms", "system design", "microservices",
    # Soft skills
    "communication", "leadership", "teamwork", "problem solving", "critical thinking",
    "time management", "collaboration", "adaptability",
]

# ---------------------------------------------------------------
# PROJECT SECTION DETECTION KEYWORDS
# ---------------------------------------------------------------
PROJECT_SECTION_KEYWORDS = [
    "projects", "personal projects", "academic projects", "project experience",
    "key projects", "notable projects", "portfolio"
]

NEXT_SECTION_KEYWORDS = [
    "experience", "education", "skills", "certifications", "achievements",
    "awards", "publications", "references", "hobbies", "interests",
    "summary", "objective", "languages"
]

# ---------------------------------------------------------------
# PDF TEXT EXTRACTION
# ---------------------------------------------------------------
def extract_text_from_pdf(pdf_path_or_url):
    import pdfplumber
    text = ""
    try:
        if pdf_path_or_url.startswith('http://') or pdf_path_or_url.startswith('https://'):
            response = requests.get(pdf_path_or_url)
            response.raise_for_status()
            pdf_file = io.BytesIO(response.content)
        else:
            pdf_file = pdf_path_or_url

        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""
    return text

# ---------------------------------------------------------------
# SKILL EXTRACTION — from any block of text
# ---------------------------------------------------------------
def extract_skills_from_text(text):
    text_lower = text.lower()
    found = []
    for skill in TECH_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return list(set(found))

# ---------------------------------------------------------------
# PROJECT SECTION EXTRACTION
# Isolates the "Projects" block from resume text
# ---------------------------------------------------------------
def extract_projects_section(text):
    lines = text.split('\n')
    project_start = -1
    project_end = len(lines)

    for i, line in enumerate(lines):
        line_lower = line.strip().lower()
        if project_start == -1:
            for kw in PROJECT_SECTION_KEYWORDS:
                if re.match(r'^' + re.escape(kw) + r'[\s:]*$', line_lower):
                    project_start = i
                    break
        elif project_start != -1:
            for kw in NEXT_SECTION_KEYWORDS:
                if re.match(r'^' + re.escape(kw) + r'[\s:]*$', line_lower):
                    project_end = i
                    break
            if project_end != len(lines):
                break

    if project_start == -1:
        return ""

    return "\n".join(lines[project_start:project_end])

# ---------------------------------------------------------------
# EXPERIENCE EXTRACTION
# Extracts total years of experience from resume text
# ---------------------------------------------------------------
def extract_years_of_experience(text):
    text_lower = text.lower()

    # Strategy 1: Explicit mention like "3 years of experience"
    patterns = [
        r'(\d+\.?\d*)\s*\+?\s*years?\s*of\s*(professional\s*)?(experience|exp)',
        r'(\d+\.?\d*)\s*\+?\s*yrs?\s*of\s*(professional\s*)?(experience|exp)',
        r'experience\s*[:\-]?\s*(\d+\.?\d*)\s*\+?\s*years?',
    ]
    for p in patterns:
        match = re.search(p, text_lower)
        if match:
            try:
                return float(match.group(1))
            except:
                pass

    # Strategy 2: Parse date ranges like "Jan 2021 - Mar 2023" or "2020 - 2022"
    year_range_pattern = r'(20\d{2}|19\d{2})\s*[-–—to]+\s*(20\d{2}|19\d{2}|present|current|now)'
    ranges = re.findall(year_range_pattern, text_lower)

    import datetime
    current_year = datetime.datetime.now().year
    total_years = 0.0

    for start_str, end_str in ranges:
        try:
            start_year = int(start_str)
            end_year = current_year if end_str in ['present', 'current', 'now'] else int(end_str)
            if 1990 <= start_year <= current_year and start_year <= end_year:
                total_years += (end_year - start_year)
        except:
            pass

    total_years = min(total_years, 40)
    return total_years if total_years > 0 else None

# ---------------------------------------------------------------
# EXPERIENCE SCORE
# Compares extracted years vs job's experienceLevel string
# ---------------------------------------------------------------
def calculate_experience_score(resume_text, experience_level):
    if not experience_level:
        return 0.5  # Neutral if no requirement given

    level_key = experience_level.lower().strip()
    year_range = EXPERIENCE_LEVEL_MAP.get(level_key)

    if not year_range:
        for key, val in EXPERIENCE_LEVEL_MAP.items():
            if key in level_key or level_key in key:
                year_range = val
                break

    if not year_range:
        return 0.5  # Unknown level → neutral

    min_exp, max_exp = year_range
    candidate_years = extract_years_of_experience(resume_text)

    if candidate_years is None:
        candidate_years = 0.0  # Assume fresher if nothing found

    if min_exp <= candidate_years <= max_exp:
        return 1.0
    elif candidate_years < min_exp:
        gap = min_exp - candidate_years
        return max(0.0, 1.0 - (gap * 0.25))  # -25% per missing year
    else:
        overshoot = candidate_years - max_exp
        return max(0.7, 1.0 - (overshoot * 0.05))  # slight penalty for overqualified

# ---------------------------------------------------------------
# SKILLS SCORE
# ---------------------------------------------------------------
def calculate_skills_score(required_skills, candidate_skills):
    if not required_skills:
        return 0.5

    req_set = set([s.lower().strip() for s in required_skills])
    cand_set = set([s.lower().strip() for s in candidate_skills])

    matched = req_set & cand_set

    # Partial matching: "mern stack" ↔ "react" / "mongodb"
    partial_matched = set()
    for req in req_set - matched:
        for cand in cand_set:
            if req in cand or cand in req:
                partial_matched.add(req)
                break

    total_matched = len(matched) + (len(partial_matched) * 0.5)
    return min(1.0, total_matched / len(req_set))

# ---------------------------------------------------------------
# PROJECTS SCORE
# ---------------------------------------------------------------
def calculate_projects_score(resume_text, required_skills):
    projects_text = extract_projects_section(resume_text)

    if not projects_text.strip():
        return 0.0  # No projects section → 0 as agreed

    project_skills = extract_skills_from_text(projects_text)

    if not required_skills:
        return 0.8 if project_skills else 0.2

    return calculate_skills_score(required_skills, project_skills)

# ---------------------------------------------------------------
# SEMANTIC SCORE (BERT cosine similarity)
# ---------------------------------------------------------------
def calculate_semantic_score(resume_text, job_description):
    def preprocess(text):
        text = text.lower()
        text = text.translate(str.maketrans('', '', string.punctuation))
        words = text.split()
        return " ".join([w for w in words if w not in stop_words])

    clean_resume = preprocess(resume_text)
    clean_jd = preprocess(job_description)

    resume_emb = model.encode([clean_resume])
    jd_emb = model.encode([clean_jd])
    similarity = cosine_similarity(resume_emb, jd_emb)[0][0]
    return float(similarity)

# ---------------------------------------------------------------
# MASTER MATCH SCORE — combines all 4 components
# ---------------------------------------------------------------
def calculate_match_score(resume_text, job_description, required_skills, experience_level):
    semantic_score   = calculate_semantic_score(resume_text, job_description)
    skills_score     = calculate_skills_score(required_skills, extract_skills_from_text(resume_text))
    experience_score = calculate_experience_score(resume_text, experience_level)
    projects_score   = calculate_projects_score(resume_text, required_skills)

    W_SEMANTIC   = 0.40
    W_SKILLS     = 0.25
    W_EXPERIENCE = 0.20
    W_PROJECTS   = 0.15

    weighted_score = (
        semantic_score   * W_SEMANTIC +
        skills_score     * W_SKILLS +
        experience_score * W_EXPERIENCE +
        projects_score   * W_PROJECTS
    )

    match_percentage = round(weighted_score * 100, 1)

    breakdown = {
        "semantic":   round(semantic_score * 100, 1),
        "skills":     round(skills_score * 100, 1),
        "experience": round(experience_score * 100, 1),
        "projects":   round(projects_score * 100, 1),
    }

    return match_percentage, breakdown

# ---------------------------------------------------------------
# METADATA EXTRACTION
# ---------------------------------------------------------------
def extract_metadata(text):
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else "Not Found"

    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else "Not Found"

    lines = [line.strip() for line in text.split('\n') if line.strip()]
    name = "Candidate"
    for line in lines[:5]:
        if len(line.split()) <= 4 and '@' not in line and not any(c.isdigit() for c in line):
            name = line
            break

    extracted_skills = extract_skills_from_text(text)
    extracted_skills.sort()

    return {"name": name, "email": email, "phone": phone, "skills": extracted_skills}

# ---------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    r_path           = data.get('resume_path', "")
    job_description  = data.get('job_description', "")
    required_skills  = data.get('required_skills', [])
    experience_level = data.get('experience_level', "")   # ← new field from backend

    if not r_path or not job_description:
        return jsonify({"error": "Missing resume or job description."}), 400

    if not (r_path.startswith('http://') or r_path.startswith('https://')) and not os.path.exists(r_path):
        return jsonify({"error": "File not found"}), 400

    raw_text = extract_text_from_pdf(r_path)
    if not raw_text.strip():
        return jsonify({"error": "No parseable text"}), 400

    metadata         = extract_metadata(raw_text)
    candidate_skills = extract_skills_from_text(raw_text)

    missing_skills = []
    if required_skills:
        req_set  = set([s.lower() for s in required_skills])
        cand_set = set([s.lower() for s in candidate_skills])
        missing_skills = list(req_set - cand_set)

    match_percentage, breakdown = calculate_match_score(
        raw_text, job_description, required_skills, experience_level
    )

    return jsonify({
        "match_percentage": match_percentage,
        "feedback": f"Match score: {match_percentage}%. Missing skills: {', '.join(missing_skills) if missing_skills else 'None'}.",
        "skills": metadata['skills'],
        "score_breakdown": breakdown
    })


@app.route('/extract_resume', methods=['POST'])
def extract_resume():
    data   = request.json
    r_path = data.get('resume_path', "")

    if not r_path:
        return jsonify({"error": "Missing resume path."}), 400

    if not (r_path.startswith('http://') or r_path.startswith('https://')) and not os.path.exists(r_path):
        return jsonify({"error": "File not found"}), 400

    raw_text = extract_text_from_pdf(r_path)
    if not raw_text.strip():
        return jsonify({"error": "No parseable text"}), 400

    metadata = extract_metadata(raw_text)

    return jsonify({
        "status": "Success",
        "candidateName": metadata['name'],
        "email": metadata['email'],
        "phone": metadata['phone'],
        "extractedSkills": metadata['skills']
    })


@app.route('/analyze_batch', methods=['POST'])
def analyze_batch():
    data             = request.json
    resumes          = data.get('resumes', [])
    job_description  = data.get('job_description', "")
    required_skills  = data.get('required_skills', [])
    experience_level = data.get('experience_level', "")   # ← new field

    if not resumes or not job_description:
        return jsonify({"error": "Missing resumes batch or job description."}), 400

    results = []

    for resume in resumes:
        r_id       = resume.get('id')
        r_path     = resume.get('path')
        r_fileName = resume.get('fileName')

        if not (r_path.startswith('http://') or r_path.startswith('https://')) and not os.path.exists(r_path):
            results.append({"id": r_id, "fileName": r_fileName, "status": "Failed", "error": "File not found"})
            continue

        raw_text = extract_text_from_pdf(r_path)
        if not raw_text.strip():
            results.append({"id": r_id, "fileName": r_fileName, "status": "Failed", "error": "No parseable text"})
            continue

        metadata         = extract_metadata(raw_text)
        candidate_skills = extract_skills_from_text(raw_text)

        missing_skills = []
        if required_skills:
            req_set  = set([s.lower() for s in required_skills])
            cand_set = set([s.lower() for s in candidate_skills])
            missing_skills = list(req_set - cand_set)

        match_percentage, breakdown = calculate_match_score(
            raw_text, job_description, required_skills, experience_level
        )

        results.append({
            "id": r_id,
            "fileName": r_fileName,
            "status": "Success",
            "candidateName": metadata['name'],
            "email": metadata['email'],
            "phone": metadata['phone'],
            "extractedSkills": metadata['skills'],
            "missingSkills": missing_skills,
            "matchScore": match_percentage,
            "score_breakdown": breakdown
        })

    successful_results = sorted(
        [r for r in results if r['status'] == 'Success'],
        key=lambda x: x['matchScore'], reverse=True
    )
    failed_results = [r for r in results if r['status'] == 'Failed']

    for i, r in enumerate(successful_results):
        r['rank'] = i + 1

    return jsonify({"analyzed_candidates": successful_results + failed_results})


if __name__ == '__main__':
    app.run(port=5001, debug=True, use_reloader=False)