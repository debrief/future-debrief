"""Word counting tool for text analysis."""

from debrief.types.tools import ShowTextCommand, DebriefCommand
from pydantic import BaseModel, Field


class WordCountParameters(BaseModel):
    """Parameters for the word_count tool."""

    text: str = Field(
        description="The input text block to count words from",
        min_length=0,
        examples=[
            "Hello world",
            "This is a longer text with multiple words to count",
            "",
            "Single",
        ],
    )


def word_count(params: WordCountParameters) -> DebriefCommand:
    """
    Count the number of words in a given block of text.

    This function splits the input text by whitespace and returns the count
    of resulting words as a ToolVault command object. Empty strings and strings
    containing only whitespace will return 0.

    Args:
        params: WordCountParameters object with text field

    Returns:
        DebriefCommand: ToolVault command object with word count result

    Examples:
        >>> params = WordCountParameters(text="Hello world")
        >>> result = word_count(params)
        >>> result["command"]
        'showText'
        >>> result["payload"]
        'Word count: 2'
    """
    # Extract text from Pydantic parameters
    text = params.text

    # Count words
    if not text or not text.strip():
        count = 0
    else:
        count = len(text.strip().split())

    # Return ToolVault command object
    return ShowTextCommand(payload=f"Word count: {count}")
