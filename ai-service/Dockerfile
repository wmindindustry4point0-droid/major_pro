FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

# Install CPU-only torch first (keeps image lean — no CUDA)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK stopwords at build time so the container starts instantly
RUN python -c "import nltk; nltk.download('stopwords')"

# Pre-cache the sentence-transformer model weights at build time
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

EXPOSE 7860

# Timeout is set to 200s to give AssemblyAI polling (max 90s) + Groq scoring
# enough headroom without the worker being killed mid-request.
# Previously 120s was too tight — AssemblyAI polling alone could take up to 120s,
# leaving zero buffer for Groq and the response write.
# workers=1 + threads=4: single process avoids model memory duplication on low-RAM hosts.
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "200", "--workers", "1", "--threads", "4", "app:app"]