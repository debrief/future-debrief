ARG GITHUB_SHA=main
ARG PR_NUMBER=local

FROM python:3.11-slim AS shared-types-builder
WORKDIR /tmp/repo

RUN apt-get update && apt-get install -y make && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY libs/shared-types/ ./libs/shared-types/

WORKDIR /tmp/repo/libs/shared-types

RUN pip install --no-cache-dir -r requirements.txt && \
    python copy_python_models.py && \
    python -m build --wheel --outdir /tmp/wheels

# Use the official code-server image as the base
FROM codercom/code-server:latest
ARG GITHUB_SHA
ARG PR_NUMBER

LABEL org.opencontainers.image.revision="${GITHUB_SHA}" \
      org.opencontainers.image.version="pr-preview"

ENV GITHUB_SHA=${GITHUB_SHA} \
    PR_NUMBER=${PR_NUMBER}

# Set the working directory
WORKDIR /home/coder

# Install Python (required for workspace testing)
USER root
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Switch back to coder user
USER coder

# Create workspace and project directories
RUN mkdir -p /home/coder/workspace /home/coder/project

# Copy the VS Code extension files (including pre-built VSIX)
COPY --chown=coder:coder . /home/coder/project/

# Copy the shared-types wheel produced in the builder stage
COPY --chown=coder:coder --from=shared-types-builder /tmp/wheels/ /home/coder/project/python/

# Switch to project directory for extension installation
WORKDIR /home/coder/project

# Verify the pre-built VSIX exists
RUN if [ ! -f "vs-code-0.0.1.vsix" ]; then echo "Error: Pre-built vs-code-0.0.1.vsix missing"; exit 1; fi

# Install the extension in code-server
RUN code-server --install-extension ./vs-code-0.0.1.vsix

# Install Python extension for code-server
RUN code-server --install-extension ms-python.python

# Copy workspace files to the workspace directory
RUN cp -r workspace/* /home/coder/workspace/ 2>/dev/null || true

# Create VS Code settings to use virtual environment Python
RUN mkdir -p /home/coder/workspace/.vscode && \
    echo '{\n  "python.defaultInterpreterPath": "/home/coder/workspace/tests/venv/bin/python"\n}' > /home/coder/workspace/.vscode/settings.json

# Create and activate virtual environment, then install Python test requirements
RUN cd /home/coder/workspace/tests && \
    python3 -m venv venv && \
    venv/bin/pip install -r requirements.txt && \
    if ls /home/coder/project/python/*.whl 1> /dev/null 2>&1; then \
        venv/bin/pip install /home/coder/project/python/*.whl; \
    else \
        echo "Error: debrief-types wheel not found. Verify shared-types build step." >&2 && \
        exit 1; \
    fi

# Create a simple README for the workspace
RUN echo "# Debrief Extension Preview\n\nThis is a preview environment for the Debrief VS Code extension.\n\n## Sample Files\n\n- \`*.rep\` files: Debrief replay files\n- \`*.plot.json\` files: Plot data visualization files\n\n## Usage\n\n1. Open any .plot.json file to see the custom Plot JSON editor\n2. Use Ctrl+Shift+P to access the 'Hello World' command\n3. Check the 'Hello World' view in the Explorer panel\n\n## Python Scripts\n\nPython scripts can be run directly with F5 or using the Run button in VS Code. The environment is pre-configured to use the virtual environment automatically.\n\nAlternatively, you can run scripts manually:\n\n\`\`\`bash\ncd tests\n./venv/bin/python move_point_north_simple.py\n\`\`\`\n\nThis environment includes sample data files for testing the extension features." > /home/coder/workspace/README.md

# Set workspace as the default directory
WORKDIR /home/coder/workspace

# Expose the code-server port
EXPOSE 8080

# Start code-server with no password authentication
# (PASSWORD and SUDO_PASSWORD are not set to avoid security warnings)

# Start code-server with the workspace
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none", "--disable-telemetry", "/home/coder/workspace"]
