# Use Python 3.11-slim base image for optimal performance
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy requirements.txt and install Python dependencies with --no-cache-dir flag
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire tool-vault-packager directory structure
COPY . .

# Expose FastAPI port 5000
EXPOSE 5000

# Configure CMD to run FastAPI with uvicorn
CMD ["uvicorn", "server:create_app", "--factory", "--host", "0.0.0.0", "--port", "5000"]