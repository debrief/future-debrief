"""Setup configuration for ToolVault packager."""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
readme_path = Path(__file__).parent / "README.md"
long_description = readme_path.read_text() if readme_path.exists() else ""

# Read requirements
requirements_path = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_path.exists():
    requirements = requirements_path.read_text().strip().split('\n')
    requirements = [req.strip() for req in requirements if req.strip() and not req.startswith('#')]

setup(
    name="toolvault-packager",
    version="0.1.0",
    description="ToolVault Multi-Runtime Packager - MCP-compatible tool discovery and packaging system",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Future Debrief Team",
    author_email="team@future-debrief.com",
    url="https://github.com/debrief/future-debrief-parent",
    packages=find_packages(),
    include_package_data=True,
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "mypy>=1.0.0",
            "flake8>=6.0.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "toolvault=cli:main",
            "toolvault-package=packager:main",
        ],
    },
    python_requires=">=3.9",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
    ],
    keywords="tools, packaging, mcp, model-context-protocol, ai, deployment",
    project_urls={
        "Bug Reports": "https://github.com/debrief/future-debrief-parent/issues",
        "Source": "https://github.com/debrief/future-debrief-parent",
    },
)