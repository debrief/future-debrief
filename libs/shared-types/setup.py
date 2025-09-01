#!/usr/bin/env python3
"""
Setup script for debrief-shared-types Python package
"""

from setuptools import setup, find_packages
import os

# Read README for long description
current_dir = os.path.dirname(os.path.abspath(__file__))
readme_path = os.path.join(current_dir, 'README.md')

try:
    with open(readme_path, 'r', encoding='utf-8') as f:
        long_description = f.read()
except FileNotFoundError:
    long_description = "Shared types for Debrief ecosystem with constrained GeoJSON FeatureCollections"

# Read requirements
requirements = []
requirements_path = os.path.join(current_dir, 'requirements.txt')
if os.path.exists(requirements_path):
    with open(requirements_path, 'r', encoding='utf-8') as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="debrief-shared-types",
    version="1.0.0",
    author="Debrief Team",
    author_email="support@debrief.org",
    description="Shared types for Debrief ecosystem with constrained GeoJSON FeatureCollections",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/debrief/future-debrief",
    project_urls={
        "Bug Tracker": "https://github.com/debrief/future-debrief/issues",
        "Documentation": "https://github.com/debrief/future-debrief/tree/main/libs/shared-types",
        "Source Code": "https://github.com/debrief/future-debrief/tree/main/libs/shared-types",
    },
    packages=find_packages(where="."),
    package_dir={"": "."},
    package_data={
        "": [
            "schema/*.json",
            "derived/python/*.py",
            "validators/python/*.py",
        ],
    },
    include_package_data=True,
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: GIS",
        "Topic :: Scientific/Engineering :: Visualization",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-cov",
            "black",
            "flake8",
            "mypy",
        ],
    },
    keywords=[
        "geojson",
        "maritime",
        "debrief", 
        "shared-types",
        "validation",
        "json-schema"
    ],
    zip_safe=False,
)