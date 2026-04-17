# Build stage for React Vite Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage for FastAPI Backend
FROM python:3.11-slim-bookworm
WORKDIR /app

# Install system dependencies needed for compiling python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    libffi-dev \
    libssl-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies from requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Ensure uvicorn is installed to run the FastAPI app
RUN pip install --no-cache-dir uvicorn

# Copy FastAPI backend code
COPY api/ ./api/

# Copy built frontend assets from the frontend-builder stage
COPY --from=frontend-builder /app/dist ./dist

# Expose the Railway port
EXPOSE $PORT

# Command to run both the API and serve static files
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
