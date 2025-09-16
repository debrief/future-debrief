"""Tool discovery system for ToolVault packager."""

import importlib.util
import inspect
import json
import subprocess
from typing import Dict, Any, List, Callable, get_type_hints, Optional, Union
from pathlib import Path


class ToolDiscoveryError(Exception):
    """Raised when tool discovery encounters an error."""
    pass


class ToolMetadata:
    """Metadata for a discovered tool."""

    def __init__(
        self,
        name: str,
        function: Callable,
        description: str,
        parameters: Dict[str, Any],
        return_type: str,
        module_path: str,
        tool_dir: str,
        sample_inputs: Optional[List[Dict[str, Any]]] = None,
        source_code: Optional[str] = None,
        git_history: Optional[List[Dict[str, Any]]] = None,
        module=None
    ):
        self.name = name
        self.function = function
        self.description = description
        self.parameters = parameters
        self.return_type = return_type
        self.module_path = module_path
        self.tool_dir = tool_dir
        self.sample_inputs = sample_inputs or []
        self.source_code = source_code
        self.git_history = git_history or []
        self.module = module  # Store module reference for Pydantic detection


def extract_function_docstring(func: Callable) -> str:
    """Extract and clean the docstring from a function."""
    doc = inspect.getdoc(func)
    if not doc:
        return f"Tool function: {func.__name__}"
    return doc.strip()


def extract_first_sentence(text: str) -> str:
    """Extract the first sentence from a text description."""
    if not text:
        return text
    
    # Find the first sentence ending with a period, exclamation, or question mark
    import re
    
    # Look for sentence endings followed by whitespace or end of string
    sentence_endings = r'[.!?](?:\s+|$)'
    match = re.search(sentence_endings, text)
    
    if match:
        # Return everything up to and including the sentence ending punctuation
        return text[:match.end()].rstrip()
    
    # If no sentence ending found, return the entire text (fallback)
    return text


def extract_type_annotations(func: Callable) -> Dict[str, str]:
    """Extract type annotations from a function."""
    try:
        type_hints = get_type_hints(func)
        annotations = {}
        
        # Get parameter types
        sig = inspect.signature(func)
        for param_name, _ in sig.parameters.items():
            if param_name in type_hints:
                annotations[param_name] = str(type_hints[param_name])
            else:
                raise ToolDiscoveryError(
                    f"Missing type annotation for parameter '{param_name}' in function '{func.__name__}'"
                )
        
        # Get return type
        if 'return' in type_hints:
            annotations['return'] = str(type_hints['return'])
        else:
            raise ToolDiscoveryError(
                f"Missing return type annotation for function '{func.__name__}'"
            )
            
        return annotations
    except Exception as e:
        raise ToolDiscoveryError(f"Failed to extract type annotations from '{func.__name__}': {e}")


def detect_pydantic_parameter_model(func: Callable, module=None) -> Optional[type]:
    """
    Detect if a function uses a Pydantic parameter model.

    Looks for classes defined in the same module that inherit from BaseModel
    and have names ending in 'Parameters'. Also checks if the function's
    type annotations reference a Pydantic model.

    Args:
        func: The function to analyze

    Returns:
        The Pydantic parameter model class if found, None otherwise
    """
    try:
        # Get the module where the function is defined
        if module is None:
            module = inspect.getmodule(func)

        if not module:
            return None

        # Get type hints to see if any parameter uses a Pydantic model
        try:
            type_hints = get_type_hints(func)
        except Exception:
            type_hints = {}

        # Look for classes in the module that could be parameter models
        pydantic_models = []
        for name, obj in inspect.getmembers(module, inspect.isclass):
            # Check if it's a Pydantic BaseModel
            if hasattr(obj, '__bases__'):
                for base in obj.__mro__:  # Method resolution order includes all base classes
                    if base.__name__ == 'BaseModel' and hasattr(base, 'model_json_schema'):
                        # Found a Pydantic BaseModel, check if it's a parameter model
                        if name.endswith('Parameters'):
                            pydantic_models.append(obj)
                            break

        # If we found Pydantic parameter models, check if they're used in function annotations
        for model in pydantic_models:
            for param_name, param_type in type_hints.items():
                if param_name == 'return':
                    continue

                # Check if the parameter type annotation references our Pydantic model
                # Handle Union types like Union[WordCountParameters, str] (for backward compatibility)
                if hasattr(param_type, '__origin__') and param_type.__origin__ is Union:
                    # Check if any of the Union types is our Pydantic model
                    for union_type in param_type.__args__:
                        if union_type is model or (hasattr(union_type, '__name__') and hasattr(model, '__name__') and union_type.__name__ == model.__name__):
                            return model
                elif param_type is model or (hasattr(param_type, '__name__') and hasattr(model, '__name__') and param_type.__name__ == model.__name__):
                    return model

        # If no direct annotation match, return the first parameter model if any
        return pydantic_models[0] if pydantic_models else None

    except Exception:
        return None


def extract_pydantic_parameters(pydantic_model: type) -> Dict[str, Any]:
    """
    Extract parameter schema from a Pydantic model.

    Args:
        pydantic_model: The Pydantic BaseModel class

    Returns:
        Dictionary containing the parameter schema
    """
    try:
        # Generate JSON Schema from Pydantic model
        schema = pydantic_model.model_json_schema()

        # Extract properties (parameters) from the schema
        parameters = schema.get('properties', {})

        # Add required field information to each parameter
        required_fields = schema.get('required', [])
        for param_name, param_schema in parameters.items():
            param_schema['required'] = param_name in required_fields

        return parameters
    except Exception as e:
        raise ToolDiscoveryError(f"Failed to extract Pydantic parameter schema: {e}")


# Legacy type conversion function removed - all tools now use Pydantic parameter models


def load_sample_inputs(inputs_dir: Path) -> List[Dict[str, Any]]:
    """Load sample input JSON files from a tool's inputs directory."""
    sample_inputs = []
    
    if not inputs_dir.exists():
        return sample_inputs
    
    for json_file in inputs_dir.glob("*.json"):
        try:
            with open(json_file, 'r') as f:
                sample_data = json.load(f)
                sample_inputs.append({
                    "name": json_file.stem,
                    "file": json_file.name,
                    "data": sample_data
                })
        except Exception as e:
            print(f"Warning: Failed to load sample input {json_file}: {e}")
    
    return sample_inputs


def get_pretty_printed_source(func: Callable, file_path: Path) -> str:
    """Extract and format the source code for a function."""
    try:
        # Get the source code of the function
        source = inspect.getsource(func)
        return source.strip()
    except Exception as e:
        # Fallback: read the entire file if we can't get function source
        try:
            return file_path.read_text(encoding='utf-8')
        except Exception:
            return f"# Error extracting source code: {e}"


def get_git_history(file_path: Path, max_commits: int = 10) -> List[Dict[str, Any]]:
    """Get git commit history for a specific file."""
    try:
        # Get the git log for the specific file
        cmd = [
            'git', 'log', 
            f'--max-count={max_commits}',
            '--pretty=format:%H|%an|%ae|%ad|%s', 
            '--date=iso',
            '--follow',  # Follow file renames
            str(file_path)
        ]
        
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            cwd=file_path.parent,
            timeout=10
        )
        
        if result.returncode != 0:
            return []
        
        commits = []
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
                
            try:
                parts = line.split('|', 4)
                if len(parts) == 5:
                    commit_hash, author_name, author_email, date, message = parts
                    commits.append({
                        "hash": commit_hash,
                        "author": {
                            "name": author_name,
                            "email": author_email
                        },
                        "date": date,
                        "message": message
                    })
            except ValueError:
                continue
        
        return commits
        
    except Exception as e:
        print(f"Warning: Failed to get git history for {file_path}: {e}")
        return []


def discover_tools_from_zip(zip_path: str) -> List[ToolMetadata]:
    """Discover tools from within a .pyz zipfile."""
    import zipfile
    import tempfile
    import os
    
    tools = []
    
    with zipfile.ZipFile(zip_path, 'r') as zf:
        # Find all tool directories (directories containing execute.py)
        tool_dirs = set()
        for file_info in zf.namelist():
            if file_info.startswith('tools/') and file_info.endswith('/execute.py'):
                # Extract tool directory name
                parts = file_info.split('/')
                if len(parts) >= 3:  # tools/toolname/execute.py
                    tool_dir = parts[1]
                    tool_dirs.add(tool_dir)
        
        # Process each tool directory
        for tool_name in tool_dirs:
            execute_path = f'tools/{tool_name}/execute.py'
            
            if execute_path not in zf.namelist():
                continue
                
            # Extract and load the execute.py module
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.py', delete=False) as temp_file:
                try:
                    # Extract and write the module content
                    module_content = zf.read(execute_path).decode('utf-8')
                    temp_file.write(module_content)
                    temp_file.flush()
                    
                    # Load the module
                    module_name = f"{tool_name}_execute"
                    spec = importlib.util.spec_from_file_location(module_name, temp_file.name)
                    if spec is None or spec.loader is None:
                        continue
                        
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Find public functions
                    public_functions = [
                        (name, obj) for name, obj in inspect.getmembers(module, inspect.isfunction)
                        if not name.startswith("_") and obj.__module__ == module_name
                    ]
                    
                    if len(public_functions) != 1:
                        continue
                    
                    func_name, func = public_functions[0]
                    
                    # Extract metadata
                    description = extract_first_sentence(extract_function_docstring(func))
                    type_annotations = extract_type_annotations(func)
                    
                    # Build parameters schema from Pydantic model
                    pydantic_model = detect_pydantic_parameter_model(func, module)
                    if pydantic_model:
                        # Use Pydantic model for parameter schema generation
                        parameters = extract_pydantic_parameters(pydantic_model)
                    else:
                        # No Pydantic model found - tool needs to be migrated
                        print(f"Warning: Tool '{func_name}' does not have a Pydantic parameter model. Skipping.")
                        continue
                    
                    # Load sample inputs from zip
                    sample_inputs = []
                    inputs_prefix = f'tools/{tool_name}/inputs/'
                    for file_info in zf.namelist():
                        if file_info.startswith(inputs_prefix) and file_info.endswith('.json'):
                            try:
                                json_content = zf.read(file_info).decode('utf-8')
                                sample_data = json.loads(json_content)
                                file_name = file_info.split('/')[-1]
                                sample_inputs.append({
                                    "name": file_name.replace('.json', ''),
                                    "file": file_name,
                                    "data": sample_data
                                })
                            except Exception:
                                pass  # Skip invalid JSON files
                    
                    # Get return type
                    return_type = type_annotations.get('return', 'object')
                    
                    tools.append(ToolMetadata(
                        name=func_name,
                        function=func,
                        description=description,
                        parameters=parameters,
                        return_type=return_type,
                        module_path=execute_path,
                        tool_dir=f'tools/{tool_name}',
                        sample_inputs=sample_inputs,
                        source_code=module_content,  # Use the extracted module content
                        git_history=[],  # Not available in zip files
                        module=module  # Store module reference for Pydantic detection
                    ))
                    
                finally:
                    # Clean up temp file
                    os.unlink(temp_file.name)
    
    return tools


def discover_tools(tools_path: str) -> List[ToolMetadata]:
    """
    Discover tools in the specified directory using the new folder structure.
    
    Each tool should be in its own folder containing:
    - execute.py: The tool implementation with exactly one public function
    - inputs/: Directory with sample JSON input files
    
    Args:
        tools_path: Path to the tools directory or "__bundled__" for .pyz files
        
    Returns:
        List of ToolMetadata objects for discovered tools
        
    Raises:
        ToolDiscoveryError: If discovery fails or validation errors occur
    """
    # Handle special case for bundled tools in .pyz files
    if tools_path == "__bundled__":
        # We're running from a .pyz file - get the path to the current .pyz
        import sys
        pyz_path = sys.argv[0]  # This will be the .pyz file path
        return discover_tools_from_zip(pyz_path)
    
    tools = []
    tools_dir = Path(tools_path)
    
    if not tools_dir.exists():
        raise ToolDiscoveryError(f"Tools directory does not exist: {tools_path}")
    
    # Find all subdirectories that contain execute.py
    for tool_dir in tools_dir.iterdir():
        if not tool_dir.is_dir() or tool_dir.name.startswith("__"):
            continue
        
        execute_file = tool_dir / "execute.py"
        if not execute_file.exists():
            continue
        
        tool_name = tool_dir.name
        
        # Load the execute.py module
        module_name = f"{tool_name}_execute"
        spec = importlib.util.spec_from_file_location(module_name, execute_file)
        if spec is None or spec.loader is None:
            continue
            
        try:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        except Exception as e:
            raise ToolDiscoveryError(f"Failed to load tool '{tool_name}': {e}")
        
        # Find public functions in the module
        public_functions = [
            (name, obj) for name, obj in inspect.getmembers(module, inspect.isfunction)
            if not name.startswith("_") and obj.__module__ == module_name
        ]
        
        if len(public_functions) == 0:
            raise ToolDiscoveryError(f"Tool '{tool_name}' has no public functions in execute.py")
        elif len(public_functions) > 1:
            func_names = [name for name, _ in public_functions]
            raise ToolDiscoveryError(
                f"Tool '{tool_name}' has multiple public functions: {func_names}. "
                f"Each tool module must have exactly one public function."
            )
        
        func_name, func = public_functions[0]
        
        # Extract metadata
        description = extract_first_sentence(extract_function_docstring(func))
        type_annotations = extract_type_annotations(func)
        
        # Build parameters schema from Pydantic model
        pydantic_model = detect_pydantic_parameter_model(func, module)
        if pydantic_model:
            # Use Pydantic model for parameter schema generation
            parameters = extract_pydantic_parameters(pydantic_model)
        else:
            # No Pydantic model found - skip this tool (for demo purposes)
            print(f"Skipping tool '{func_name}' - no Pydantic parameter model found")
            continue
        
        # Get return type
        return_type = type_annotations.get('return', 'object')
        
        # Load sample inputs
        inputs_dir = tool_dir / "inputs"
        sample_inputs = load_sample_inputs(inputs_dir)
        
        # Get pretty-printed source code
        source_code = get_pretty_printed_source(func, execute_file)
        
        # Get git history for this tool's execute.py
        git_history = get_git_history(execute_file)
        
        tools.append(ToolMetadata(
            name=func_name,
            function=func,
            description=description,
            parameters=parameters,
            return_type=return_type,
            module_path=str(execute_file),
            tool_dir=str(tool_dir),
            sample_inputs=sample_inputs,
            source_code=source_code,
            git_history=git_history,
            module=module
        ))
    
    if not tools:
        raise ToolDiscoveryError(f"No valid tools found in: {tools_path}")
    
    return tools


def generate_tool_schema(tool: ToolMetadata) -> Dict[str, Any]:
    """
    Generate a Tool schema object conforming to shared-types Tool.schema.json.

    Uses the tool's specific return type to create a more precise output schema.
    First checks if the tool has a BaseTool-style get_output_schema method,
    otherwise falls back to analyzing the return type annotation.

    Args:
        tool: Tool metadata object

    Returns:
        Dictionary representing a Tool schema
    """
    # All tools return ToolVault command objects
    output_schema = {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "enum": ["addFeatures", "updateFeatures", "deleteFeatures", "setFeatureCollection",
                        "showText", "showData", "showImage", "logMessage", "composite"],
                "description": "The ToolVault command type"
            },
            "payload": {
                "description": "The command-specific payload data"
            }
        },
        "required": ["command", "payload"],
        "additionalProperties": False
    }

    # For more specific return types like Union[ShowTextResult, SetFeatureCollectionResult],
    # we could parse the Union and create more specific schemas, but for now we'll use the generic approach

    return {
        "name": tool.name,
        "description": tool.description,
        "inputSchema": {
            "type": "object",
            "properties": tool.parameters,
            "required": list(tool.parameters.keys()),
            "additionalProperties": False
        },
        "outputSchema": output_schema
    }


def generate_tool_list_response(tools: List[ToolMetadata]) -> Dict[str, Any]:
    """
    Generate a ToolListResponse conforming to shared-types ToolListResponse.schema.json.

    Args:
        tools: List of discovered tool metadata

    Returns:
        Dictionary representing a ToolListResponse
    """
    tools_list = []

    for tool in tools:
        tool_schema = generate_tool_schema(tool)

        # Get tool directory name from tool_dir path
        tool_dir_name = Path(tool.tool_dir).name

        # Add SPA navigation URL as extension
        tool_schema["tool_url"] = f"/api/tools/{tool_dir_name}/tool.json"

        tools_list.append(tool_schema)

    return {
        "tools": tools_list,
        "version": "1.0.0",
        "description": "ToolVault packaged tools"
    }


def generate_index_json(tools: List[ToolMetadata]) -> Dict[str, Any]:
    """
    Generate index.json from discovered tools using new schema format.
    Maintains backward compatibility while conforming to shared-types schemas.

    Args:
        tools: List of discovered tool metadata

    Returns:
        Dictionary representing the index.json structure
    """
    return generate_tool_list_response(tools)