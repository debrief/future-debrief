from datetime import datetime
from typing import Any, TypeVar, Type, cast
import dateutil.parser


T = TypeVar("T")


def from_datetime(x: Any) -> datetime:
    return dateutil.parser.parse(x)


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


class TimeState:
    """State representing the current time position in a Debrief editor"""

    current: datetime
    """Current time position as ISO 8601 date-time string"""

    def __init__(self, current: datetime) -> None:
        self.current = current

    @staticmethod
    def from_dict(obj: Any) -> 'TimeState':
        assert isinstance(obj, dict)
        current = from_datetime(obj.get("current"))
        return TimeState(current)

    def to_dict(self) -> dict:
        result: dict = {}
        result["current"] = self.current.isoformat()
        return result


def time_state_from_dict(s: Any) -> TimeState:
    return TimeState.from_dict(s)


def time_state_to_dict(x: TimeState) -> Any:
    return to_class(TimeState, x)
