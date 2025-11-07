# Use Python 3.11-slim base image for optimal performance
FROM python:3.11-slim

# Install Node.js for local builds (will be skipped in CI if .pyz exists)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy entire directory structure
COPY . .

# Install Python dependencies (wheel staged by CI at shared-types/dist/python/)
RUN pip install --no-cache-dir -r requirements.txt

# Build script that handles both CI (.pyz exists) and local (build from source) scenarios
RUN if [ -f "toolvault.pyz" ]; then \
        echo "Using pre-built .pyz artifact from CI"; \
    else \
        echo "Building from source for local development"; \
        npm run build:spa && \
        python packager.py tools --output toolvault.pyz; \
    fi

# Expose FastMCP port 5000
EXPOSE 5000

# Configure CMD to run pure FastMCP server (trial branch)
CMD ["python", "toolvault.pyz", "serve-fastmcp", "--host", "0.0.0.0", "--port", "5000"]