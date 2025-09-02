# Use the official code-server image as the base
FROM codercom/code-server:latest

# Set the working directory
WORKDIR /home/coder

# Install Node.js, pnpm, and Python (required for VS Code extension builds and testing)
USER root
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Switch back to coder user
USER coder

# Create workspace directory
RUN mkdir -p /home/coder/workspace

# Copy the VS Code extension files (pre-compiled)
COPY --chown=coder:coder . /home/coder/project/

# Extension should already be compiled and packaged by CI build step
# The .vsix file should be at the root of the build context (apps/vs-code directory)
WORKDIR /home/coder/project
RUN ls -la && if [ ! -f "extension.vsix" ]; then echo "Error: Extension not packaged - extension.vsix missing"; exit 1; fi

# Install the extension in code-server
RUN code-server --install-extension ./extension.vsix

# Install Python extension for code-server
RUN code-server --install-extension ms-python.python

# Copy workspace files to the workspace directory
RUN cp -r apps/vs-code/workspace/* /home/coder/workspace/ 2>/dev/null || true

# Create VS Code settings to use virtual environment Python
RUN mkdir -p /home/coder/workspace/.vscode && \
    echo '{\n  "python.defaultInterpreterPath": "/home/coder/workspace/tests/venv/bin/python"\n}' > /home/coder/workspace/.vscode/settings.json

# Create and activate virtual environment, then install Python test requirements
RUN cd /home/coder/workspace/tests && \
    python3 -m venv venv && \
    venv/bin/pip install -r requirements.txt

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