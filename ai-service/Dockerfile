FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

# Install CPU-only torch first (avoids pulling the massive CUDA build)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK stopwords so cold starts don't hit the network
RUN python -c "import nltk; nltk.download('stopwords')"

# Pre-download the sentence-transformer model into the image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY app.py .

EXPOSE 7860

CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "120", "--workers", "1", "app:app"]