# Use the official code-server image as the base
FROM codercom/code-server:latest

# Set the working directory
WORKDIR /home/coder

# Install Node.js and npm (required for VS Code extension builds)
USER root
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Switch back to coder user
USER coder

# Create workspace directory
RUN mkdir -p /home/coder/workspace

# Copy the entire project context (will be filtered by .dockerignore)
COPY --chown=coder:coder . /home/coder/project/

# Build the VS Code extension
WORKDIR /home/coder/project
RUN npm install && npm run compile

# Install vsce for packaging the extension (as root, then switch back)
USER root
RUN npm install -g @vscode/vsce
USER coder

# Package the extension as .vsix
RUN vsce package --out extension.vsix

# Install the extension in code-server
RUN code-server --install-extension ./extension.vsix

# Copy workspace files to the workspace directory
RUN cp -r workspace/* /home/coder/workspace/

# Create a simple README for the workspace
RUN echo "# Debrief Extension Preview\n\nThis is a preview environment for the Debrief VS Code extension.\n\n## Sample Files\n\n- \`*.rep\` files: Debrief replay files\n- \`*.plot.json\` files: Plot data visualization files\n\n## Usage\n\n1. Open any .plot.json file to see the custom Plot JSON editor\n2. Use Ctrl+Shift+P to access the 'Hello World' command\n3. Check the 'Hello World' view in the Explorer panel\n\nThis environment includes sample data files for testing the extension features." > /home/coder/workspace/README.md

# Set workspace as the default directory
WORKDIR /home/coder/workspace

# Expose the code-server port
EXPOSE 8080

# Start code-server with no password authentication
# (PASSWORD and SUDO_PASSWORD are not set to avoid security warnings)

# Start code-server with the workspace
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none", "--disable-telemetry", "/home/coder/workspace"]