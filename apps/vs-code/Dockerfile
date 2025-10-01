ARG GITHUB_SHA=main
ARG PR_NUMBER=local
ARG STATUS_WEBHOOK=""

FROM python:3.11-slim AS shared-types-builder
ARG STATUS_WEBHOOK
ARG PR_NUMBER

ENV STATUS_WEBHOOK=${STATUS_WEBHOOK}
ENV PR_NUMBER=${PR_NUMBER}

WORKDIR /tmp/repo

RUN apt-get update && apt-get install -y make curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY libs/shared-types/ ./libs/shared-types/

WORKDIR /tmp/repo/libs/shared-types

RUN if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: shared-types build starting" "${STATUS_WEBHOOK}" || true; fi && \
    pip install --no-cache-dir -r requirements.txt && \
    python -m build --wheel --outdir /tmp/wheels && \
    if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: shared-types wheel ready" "${STATUS_WEBHOOK}" || true; fi

# Build Tool Vault package
FROM node:20-slim AS tool-vault-builder
ARG STATUS_WEBHOOK
ARG PR_NUMBER

ENV STATUS_WEBHOOK=${STATUS_WEBHOOK}
ENV PR_NUMBER=${PR_NUMBER}

WORKDIR /tmp/repo

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv curl && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy shared-types wheel from previous stage
COPY --from=shared-types-builder /tmp/wheels/ /tmp/wheels/

# Install shared-types wheel for Tool Vault packager
RUN pip3 install --break-system-packages /tmp/wheels/*.whl

# Copy Tool Vault packager source
COPY libs/tool-vault-packager/ ./libs/tool-vault-packager/

WORKDIR /tmp/repo/libs/tool-vault-packager

# Install npm dependencies and build Tool Vault package
RUN if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: Tool Vault build starting" "${STATUS_WEBHOOK}" || true; fi && \
    npm install && \
    cd spa && npm install && cd .. && \
    npm run build && \
    if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: Tool Vault package ready" "${STATUS_WEBHOOK}" || true; fi

# Use the official code-server image as the base
FROM codercom/code-server:latest
ARG GITHUB_SHA
ARG PR_NUMBER
ARG STATUS_WEBHOOK

LABEL org.opencontainers.image.revision="${GITHUB_SHA}" \
      org.opencontainers.image.version="pr-preview"

ENV GITHUB_SHA=${GITHUB_SHA} \
    PR_NUMBER=${PR_NUMBER} \
    STATUS_WEBHOOK=${STATUS_WEBHOOK}

# Set the working directory
WORKDIR /home/coder

# Install Python (required for workspace testing and Tool Vault runtime)
USER root
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Switch back to coder user
USER coder

# Create workspace and project directories
RUN mkdir -p /home/coder/workspace /home/coder/project

# Copy the VS Code extension files (including pre-built VSIX)
COPY --chown=coder:coder . /home/coder/project/

# Copy the shared-types wheel produced in the builder stage
COPY --chown=coder:coder --from=shared-types-builder /tmp/wheels/ /home/coder/project/python/

# Install shared-types and Tool Vault dependencies system-wide for the .pyz runtime
USER root
RUN pip3 install --break-system-packages \
    /home/coder/project/python/*.whl \
    'fastapi>=0.104.0' \
    'uvicorn>=0.24.0'
USER coder

# Copy Tool Vault package from builder stage
# Tool Vault serves MCP-compatible endpoints on port 60124 for maritime analysis tools
RUN mkdir -p /home/coder/tool-vault
COPY --chown=coder:coder --from=tool-vault-builder /tmp/repo/libs/tool-vault-packager/dist/toolvault.pyz /home/coder/tool-vault/toolvault.pyz
RUN chmod +x /home/coder/tool-vault/toolvault.pyz

# Set Tool Vault configuration for VS Code extension
ENV DEBRIEF_TOOL_VAULT_PATH=/home/coder/tool-vault/toolvault.pyz

# Switch to project directory for extension installation
WORKDIR /home/coder/project

# Verify the pre-built VSIX exists
RUN if [ ! -f "vs-code-0.0.1.vsix" ]; then echo "Error: Pre-built vs-code-0.0.1.vsix missing"; exit 1; fi

# Install the extension in code-server
RUN if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: installing Debrief VSIX" "${STATUS_WEBHOOK}" || true; fi && \
    code-server --install-extension ./vs-code-0.0.1.vsix && \
    if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: Debrief VSIX installed" "${STATUS_WEBHOOK}" || true; fi

# Install Python extension for code-server
RUN if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: installing Python extension" "${STATUS_WEBHOOK}" || true; fi && \
    code-server --install-extension ms-python.python && \
    if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: Python extension installed" "${STATUS_WEBHOOK}" || true; fi

# Copy workspace files to the workspace directory
RUN cp -r workspace/* /home/coder/workspace/ 2>/dev/null || true

# Create VS Code settings to use virtual environment Python
RUN mkdir -p /home/coder/workspace/.vscode && \
    echo '{\n  "python.defaultInterpreterPath": "/home/coder/workspace/tests/venv/bin/python"\n}' > /home/coder/workspace/.vscode/settings.json

# Create and activate virtual environment, then install Python test requirements
RUN if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: creating workspace venv" "${STATUS_WEBHOOK}" || true; fi && \
    cd /home/coder/workspace/tests && \
    python3 -m venv venv && \
    venv/bin/pip install -r requirements.txt && \
    if ls /home/coder/project/python/*.whl 1> /dev/null 2>&1; then \
        venv/bin/pip install /home/coder/project/python/*.whl; \
    else \
        echo "Error: debrief-types wheel not found. Verify shared-types build step." >&2 && \
        exit 1; \
    fi && \
    if [ -n "${STATUS_WEBHOOK}" ]; then curl -s -d "PR ${PR_NUMBER}: workspace venv ready" "${STATUS_WEBHOOK}" || true; fi

# Create a simple README for the workspace
RUN echo "# Debrief Extension Preview\n\nThis is a preview environment for the Debrief VS Code extension.\n\n## Sample Files\n\n- \`*.rep\` files: Debrief replay files\n- \`*.plot.json\` files: Plot data visualization files\n\n## Usage\n\n1. Open any .plot.json file to see the custom Plot JSON editor\n2. Use Ctrl+Shift+P to access the 'Hello World' command\n3. Check the 'Hello World' view in the Explorer panel\n\n## Python Scripts\n\nPython scripts can be run directly with F5 or using the Run button in VS Code. The environment is pre-configured to use the virtual environment automatically.\n\nAlternatively, you can run scripts manually:\n\n\`\`\`bash\ncd tests\n./venv/bin/python move_point_north_simple.py\n\`\`\`\n\nThis environment includes sample data files for testing the extension features." > /home/coder/workspace/README.md

# Set workspace as the default directory
WORKDIR /home/coder/workspace

# Expose ports:
# - 8080: code-server web interface
# - 60123: WebSocket bridge for Python-to-VS Code integration
# - 60124: Tool Vault MCP-compatible REST endpoints
EXPOSE 8080 60123 60124

# Start code-server with no password authentication
# (PASSWORD and SUDO_PASSWORD are not set to avoid security warnings)

# Start code-server with the workspace
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none", "--disable-telemetry", "/home/coder/workspace"]
