"""
Custom setup for debrief-types package.
This handles copying generated types and schema files during build.
"""

import shutil
from pathlib import Path
from setuptools import setup
from setuptools.command.build_py import build_py


class CustomBuildPy(build_py):
    """Custom build command that copies generated types and schemas."""
    
    def run(self):
        # Copy schema files to source
        self.copy_schema_files()

        # Copy generated types to source
        self.copy_generated_types()

        # Run the standard build
        super().run()
    
    def copy_schema_files(self):
        """Copy JSON schema files to python-src/debrief/schemas/."""
        schema_dest = Path("python-src/debrief/schemas")
        schema_dest.mkdir(parents=True, exist_ok=True)
        
        # Copy from schemas/features/ directory
        features_dir = Path("schemas/features")
        if features_dir.exists():
            for schema_file in features_dir.glob("*.json"):
                shutil.copy2(schema_file, schema_dest)
                
        # Copy from schemas/states/ directory
        states_dir = Path("schemas/states")
        if states_dir.exists():
            for schema_file in states_dir.glob("*.json"):
                shutil.copy2(schema_file, schema_dest)
        
    
    def copy_generated_types(self):
        """Copy generated Python types from derived/python/ to python-src/debrief/types/."""
        derived_dir = Path("derived/python")
        dest_dir = Path("python-src/debrief/types")
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy all generated Python files
        if derived_dir.exists():
            for py_file in derived_dir.glob("*.py"):
                shutil.copy2(py_file, dest_dir)
        
        # Update the __init__.py file
        self.update_types_init()
    
    def update_types_init(self):
        """Update python-src/debrief/types/__init__.py with proper imports."""
        types_dir = Path("python-src/debrief/types")
        init_file = types_dir / "__init__.py"
        
        # Find all generated Python files
        py_files = [f.stem for f in types_dir.glob("*.py") if f.name != "__init__.py"]
        
        if py_files:
            imports = []
            all_exports = []
            
            # Generate imports based on file naming conventions
            for filename in py_files:
                if filename in ["track", "point", "annotation", "featurecollection"]:
                    # Maritime GeoJSON types
                    class_name = f"{filename.title()}Feature" if filename != "featurecollection" else "DebriefFeatureCollection"
                    imports.append(f"from .{filename} import {class_name}")
                    all_exports.append(class_name)
                else:
                    # Application state types (TimeState, ViewportState, etc.)
                    imports.append(f"from .{filename} import {filename}")
                    all_exports.append(filename)
            
            # Write updated __init__.py
            content = '"""\n'
            content += "Generated Python types for Debrief maritime GeoJSON features and application state.\n"
            content += "These types are generated from JSON schemas and provide type hints and validation.\n"
            content += '"""\n\n'
            content += "\n".join(imports)
            content += f"\n\n__all__ = {all_exports}\n"
            
            with open(init_file, 'w') as f:
                f.write(content)


if __name__ == "__main__":
    setup(
        cmdclass={
            'build_py': CustomBuildPy,
        }
    )
