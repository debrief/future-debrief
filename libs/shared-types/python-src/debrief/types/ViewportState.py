from typing import List, Any, TypeVar, Callable, Type, cast


T = TypeVar("T")


def from_list(f: Callable[[Any], T], x: Any) -> List[T]:
    assert isinstance(x, list)
    return [f(y) for y in x]


def from_float(x: Any) -> float:
    assert isinstance(x, (float, int)) and not isinstance(x, bool)
    return float(x)


def to_float(x: Any) -> float:
    assert isinstance(x, (int, float))
    return x


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


class ViewportState:
    """State representing the current map viewport bounds in a Debrief editor"""

    bounds: List[float]
    """Map bounds as [west, south, east, north] in decimal degrees"""

    def __init__(self, bounds: List[float]) -> None:
        self.bounds = bounds

    @staticmethod
    def from_dict(obj: Any) -> 'ViewportState':
        assert isinstance(obj, dict)
        bounds = from_list(from_float, obj.get("bounds"))
        return ViewportState(bounds)

    def to_dict(self) -> dict:
        result: dict = {}
        result["bounds"] = from_list(to_float, self.bounds)
        return result


def viewport_state_from_dict(s: Any) -> ViewportState:
    return ViewportState.from_dict(s)


def viewport_state_to_dict(x: ViewportState) -> Any:
    return to_class(ViewportState, x)
