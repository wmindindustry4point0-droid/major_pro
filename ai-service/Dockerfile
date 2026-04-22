FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

# Install CPU-only torch first
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK stopwords
RUN python -c "import nltk; nltk.download('stopwords')"

# Preload model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

EXPOSE 7860

CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "120", "--workers", "1", "--threads", "4", "app:app"]