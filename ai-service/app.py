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
# EAGER LOADING — Model and stopwords load at startup, not on
# first request. This eliminates the "slow first click" delay.
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

# -------------------------------------------------------------
# SKILL DICTIONARY (For Robust Metadata Extraction)
# -------------------------------------------------------------
TECH_SKILLS = [
    "python", "java", "javascript", "c++", "c#", "ruby", "go", "rust", "php", "typescript",
    "react", "angular", "vue", "node.js", "express", "django", "flask", "spring",
    "tensorflow", "pytorch", "keras", "scikit-learn", "machine learning", "deep learning", "nlp", "bert",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra",
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "ci/cd",
    "html", "css", "sass", "tailwind", "linux", "bash", "agile", "scrum", "jira"
]

def extract_text_from_pdf(pdf_path_or_url):
    """Uses pdfplumber to accurately extract text from complex resume layouts,
    supporting both local files and URLs (including pre-signed S3 URLs)."""
    import pdfplumber
    text = ""
    try:
        if pdf_path_or_url.startswith('http://') or pdf_path_or_url.startswith('https://'):
            response = requests.get(pdf_path_or_url, timeout=30)
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
        print(f"Error reading PDF with pdfplumber: {e}")
        return ""
    return text

def extract_metadata(text):
    """Extracts Name (approximate), Email, Phone, and Skills from raw text."""
    # 1. Email Extraction
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else "Not Found"

    # 2. Phone Extraction
    # FIX: Extended regex to support Indian phone formats in addition to US/international.
    # Handles: +91 XXXXX XXXXX, +91-XXXXX-XXXXX, 10-digit local, and standard 10-digit US.
    phone_patterns = [
        r'(?:\+91[\s\-]?)?[6-9]\d{9}',         # Indian mobile (with or without +91)
        r'\+\d{1,3}[\s\-]?\d{3,5}[\s\-]?\d{4,6}',  # International generic
        r'\(?\d{3}\)?[.\-\s]?\d{3}[.\-\s]?\d{4}',  # US/CA 10-digit
    ]
    phone = "Not Found"
    for pattern in phone_patterns:
        m = re.search(pattern, text)
        if m:
            phone = m.group(0).strip()
            break

    # 3. Candidate Name Approximation
    # FIX: More robust — skip lines that look like section headers (all-caps words),
    # addresses (contain digits or commas), or are too long.
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    name = "Candidate"
    if lines:
        for line in lines[:8]:  # check first 8 lines
            words = line.split()
            # A name: 2-4 words, no digits, no email, not all-caps (section header)
            if (2 <= len(words) <= 4
                    and '@' not in line
                    and not any(char.isdigit() for char in line)
                    and ',' not in line
                    and not line.isupper()
                    and len(line) <= 50):
                name = line
                break

    # 4. Skill Extraction via Dictionary Matching
    text_lower = text.lower()
    extracted_skills = []
    for skill in TECH_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            extracted_skills.append(skill)

    extracted_skills.sort()

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": extracted_skills
    }

def preprocess_text(text):
    """Cleans text for optimal embeddings: lowercase, no punctuation, no stopwords."""
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    words = text.split()
    cleaned_words = [w for w in words if w not in stop_words]
    return " ".join(cleaned_words)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Hugging Face Spaces and Render."""
    return jsonify({"status": "ok", "model": "all-MiniLM-L6-v2"})

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    r_path = data.get('resume_path', "")
    job_description = data.get('job_description', "")
    required_skills = data.get('required_skills', [])

    if not r_path or not job_description:
        return jsonify({"error": "Missing resume or job description."}), 400

    if not (r_path.startswith('http://') or r_path.startswith('https://')) and not os.path.exists(r_path):
        return jsonify({"error": "File not found"}), 400

    raw_text = extract_text_from_pdf(r_path)
    if not raw_text.strip():
        return jsonify({"error": "No parseable text"}), 400

    metadata = extract_metadata(raw_text)
    candidate_skills = set([s.lower() for s in metadata['skills']])

    missing_skills = []
    if required_skills:
        req_set = set([s.lower() for s in required_skills])
        missing_skills = list(req_set - candidate_skills)

    clean_resume = preprocess_text(raw_text)
    clean_jd = preprocess_text(job_description)

    resume_embedding = model.encode([clean_resume])
    jd_embedding = model.encode([clean_jd])
    similarity = cosine_similarity(resume_embedding, jd_embedding)[0][0]
    match_score = round(float(similarity) * 100, 1)

    return jsonify({
        "match_percentage": match_score,
        "feedback": f"Match score: {match_score}%. Missing skills: {', '.join(missing_skills) if missing_skills else 'None'}.",
        "skills": metadata['skills']
    })

@app.route('/extract_resume', methods=['POST'])
def extract_resume():
    """Extracts structured metadata from a resume without job description comparison."""
    data = request.json
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
    """Batch resume screening — returns ranked results."""
    data = request.json
    resumes = data.get('resumes', [])
    job_description = data.get('job_description', "")
    required_skills = data.get('required_skills', [])

    if not resumes or not job_description:
        return jsonify({"error": "Missing resumes batch or job description."}), 400

    clean_jd = preprocess_text(job_description)
    jd_embedding = model.encode([clean_jd])

    results = []

    for resume in resumes:
        r_id = resume.get('id')
        r_path = resume.get('path')
        r_fileName = resume.get('fileName')

        if not r_path or (
            not (r_path.startswith('http://') or r_path.startswith('https://'))
            and not os.path.exists(r_path)
        ):
            results.append({
                "id": r_id, "fileName": r_fileName,
                "status": "Failed", "error": "File not found"
            })
            continue

        raw_text = extract_text_from_pdf(r_path)
        if not raw_text.strip():
            results.append({
                "id": r_id, "fileName": r_fileName,
                "status": "Failed", "error": "No parseable text"
            })
            continue

        metadata = extract_metadata(raw_text)
        candidate_skills = set([s.lower() for s in metadata['skills']])

        missing_skills = []
        if required_skills:
            req_set = set([s.lower() for s in required_skills])
            missing_skills = list(req_set - candidate_skills)

        clean_resume = preprocess_text(raw_text)
        resume_embedding = model.encode([clean_resume])
        similarity = cosine_similarity(resume_embedding, jd_embedding)[0][0]
        match_score = round(float(similarity) * 100, 1)

        results.append({
            "id": r_id,
            "fileName": r_fileName,
            "status": "Success",
            "candidateName": metadata['name'],
            "email": metadata['email'],
            "phone": metadata['phone'],
            "extractedSkills": metadata['skills'],
            "missingSkills": missing_skills,
            "matchScore": match_score
        })

    successful_results = [r for r in results if r['status'] == 'Success']
    failed_results = [r for r in results if r['status'] == 'Failed']

    successful_results.sort(key=lambda x: x['matchScore'], reverse=True)
    for index, r in enumerate(successful_results):
        r['rank'] = index + 1

    return jsonify({"analyzed_candidates": successful_results + failed_results})

if __name__ == '__main__':
    # use_reloader=False prevents the model from loading twice in debug mode
    app.run(port=5001, debug=True, use_reloader=False)