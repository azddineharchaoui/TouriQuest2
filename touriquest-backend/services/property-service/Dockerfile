FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY ../../pyproject.toml ../../poetry.lock ./
RUN pip install poetry
RUN poetry config virtualenvs.create false
RUN poetry install --only=main --no-dev

COPY ../../shared/ ./shared/
COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]