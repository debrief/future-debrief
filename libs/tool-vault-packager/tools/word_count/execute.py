"""Word counting tool for text analysis."""

from typing import Dict, Any


def word_count(text: str) -> Dict[str, Any]:
    """
    Count the number of words in a given block of text.

    This function splits the input text by whitespace and returns the count
    of resulting words as a ToolVault command object. Empty strings and strings
    containing only whitespace will return 0.

    Args:
        text (str): The input text block to count words from

    Returns:
        Dict[str, Any]: ToolVault command object with word count result

    Examples:
        >>> result = word_count("Hello world")
        >>> result["command"]
        'showText'
        >>> result["payload"]
        'Word count: 2'
    """
    if not text or not text.strip():
        count = 0
    else:
        count = len(text.strip().split())

    return {
        "command": "showText",
        "payload": f"Word count: {count}"
    }