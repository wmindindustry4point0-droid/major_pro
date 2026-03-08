from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import os
import re
import string
import nltk
from nltk.corpus import stopwords
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Initialize app and NLTK
app = Flask(__name__)
CORS(app)

# Ensure NLTK stopwords are available
nltk.download('stopwords', quiet=True)
stop_words = set(stopwords.words('english'))

# Load the BERT Contextual Model lazily or at startup
# "all-MiniLM-L6-v2" is extremely fast and effective for semantic similarity
print("Loading BERT Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("BERT Model Loaded.")

# -------------------------------------------------------------
# SKILL DICTIONARY (For Robust Metadata Extraction)
# -------------------------------------------------------------
# Rather than relying purely on regex, we scan against these known entities
TECH_SKILLS = [
    "python", "java", "javascript", "c++", "c#", "ruby", "go", "rust", "php", "typescript",
    "react", "angular", "vue", "node.js", "express", "django", "flask", "spring",
    "tensorflow", "pytorch", "keras", "scikit-learn", "machine learning", "deep learning", "nlp", "bert",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra",
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "ci/cd",
    "html", "css", "sass", "tailwind", "linux", "bash", "agile", "scrum", "jira"
]

def extract_text_from_pdf(pdf_path):
    """Uses pdfplumber to accurately extract text from complex resume layouts"""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF with pdfplumber: {e}")
        return ""
    return text

def extract_metadata(text):
    """Extracts Name (approximate), Email, Phone, and Skills from raw text"""
    # 1. Email Extraction
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else "Not Found"

    # 2. Phone Extraction (handles various formats)
    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else "Not Found"

    # 3. Candidate Name Approximation (assuming top lines usually contain the name)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    name = "Candidate"
    if lines:
        # Avoid lines that look like emails or numbers
        for limit in range(min(5, len(lines))):
            potential_name = lines[limit]
            if len(potential_name.split()) <= 4 and '@' not in potential_name and not any(char.isdigit() for char in potential_name):
                name = potential_name
                break

    # 4. Skill Extraction via Dictionary Matching
    text_lower = text.lower()
    extracted_skills = []
    for skill in TECH_SKILLS:
        # Word boundary regex to ensure exact match (e.g., 'go' shouldn't match 'good')
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            extracted_skills.append(skill)
            
    # Sort length ascending to present nicer
    extracted_skills.sort()

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": extracted_skills
    }

def preprocess_text(text):
    """Cleans text for optimal embeddings reading: lowercase, no punctuation, no stopwords."""
    text = text.lower()
    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    # Remove stopwords
    words = text.split()
    cleaned_words = [w for w in words if w not in stop_words]
    return " ".join(cleaned_words)

@app.route('/analyze_batch', methods=['POST'])
def analyze_batch():
    """
    Receives a batch of resume file paths, the job description, and strictly required skills.
    Processes them via the Pipeline and returns rankings.
    """
    data = request.json
    resumes = data.get('resumes', []) # List of { id, path, fileName }
    job_description = data.get('job_description', "")
    required_skills = data.get('required_skills', []) # List of strings

    if not resumes or not job_description:
        return jsonify({"error": "Missing resumes batch or job description."}), 400

    # Clean the JD
    clean_jd = preprocess_text(job_description)
    # Generate JD Embedding (1 x 384 vector)
    jd_embedding = model.encode([clean_jd])

    results = []

    for resume in resumes:
        r_id = resume.get('id')
        r_path = resume.get('path')
        r_fileName = resume.get('fileName')

        if not os.path.exists(r_path):
            results.append({
                "id": r_id, "fileName": r_fileName, 
                "status": "Failed", "error": "File not found"
            })
            continue

        # Pipeline Step 1: Text Extraction
        raw_text = extract_text_from_pdf(r_path)
        if not raw_text.strip():
            results.append({
                "id": r_id, "fileName": r_fileName, 
                "status": "Failed", "error": "No parseable text"
            })
            continue

        # Pipeline Step 2: Metadata & Skill Extraction
        metadata = extract_metadata(raw_text)
        candidate_skills = set([s.lower() for s in metadata['skills']])
        
        # Skill Gap Analysis
        missing_skills = []
        if required_skills:
            req_set = set([s.lower() for s in required_skills])
            missing_skills = list(req_set - candidate_skills)

        # Pipeline Step 3: Text Preprocessing
        clean_resume = preprocess_text(raw_text)

        # Pipeline Step 4 & 5: BERT Embeddings & Cosine Similarity
        resume_embedding = model.encode([clean_resume])
        similarity = cosine_similarity(resume_embedding, jd_embedding)[0][0]
        
        # Convert similarity to a 0-100 percentage
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

    # Sort candidates by Match Score (Descending)
    successful_results = [r for r in results if r['status'] == 'Success']
    failed_results = [r for r in results if r['status'] == 'Failed']
    
    successful_results.sort(key=lambda x: x['matchScore'], reverse=True)

    # Assign dynamic rank
    for index, r in enumerate(successful_results):
        r['rank'] = index + 1

    final_response = successful_results + failed_results

    return jsonify({"analyzed_candidates": final_response})

if __name__ == '__main__':
    # Run heavily optimized on local for fast testing
    app.run(port=5001, debug=True, use_reloader=False)
