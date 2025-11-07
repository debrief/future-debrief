# Use Python 3.11-slim base image for optimal performance
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy entire directory structure
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Use pre-built .pyz artifact from CI
# If building locally, run: npm run build
RUN if [ ! -f "toolvault.pyz" ]; then \
        echo "Error: toolvault.pyz not found. Build it locally with: npm run build"; \
        exit 1; \
    fi

# Expose FastMCP port 5000
EXPOSE 5000

# Configure CMD to run pure FastMCP server
CMD ["python", "toolvault.pyz", "serve", "--host", "0.0.0.0", "--port", "5000"]
