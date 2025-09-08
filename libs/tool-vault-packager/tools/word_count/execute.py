"""Word counting tool for text analysis."""


def word_count(text: str) -> int:
    """
    Count the number of words in a given block of text.
    
    This function splits the input text by whitespace and returns the count
    of resulting words. Empty strings and strings containing only whitespace
    will return 0.
    
    Args:
        text (str): The input text block to count words from
        
    Returns:
        int: The number of words found in the text
        
    Examples:
        >>> word_count("Hello world")
        2
        >>> word_count("The quick brown fox")
        4
        >>> word_count("")
        0
    """
    if not text or not text.strip():
        return 0
    
    return len(text.strip().split())