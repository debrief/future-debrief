from typing import List, Union, Any, TypeVar, Callable, Type, cast


T = TypeVar("T")


def from_list(f: Callable[[Any], T], x: Any) -> List[T]:
    assert isinstance(x, list)
    return [f(y) for y in x]


def from_float(x: Any) -> float:
    assert isinstance(x, (float, int)) and not isinstance(x, bool)
    return float(x)


def from_str(x: Any) -> str:
    assert isinstance(x, str)
    return x


def from_union(fs, x):
    for f in fs:
        try:
            return f(x)
        except:
            pass
    assert False


def to_float(x: Any) -> float:
    assert isinstance(x, (int, float))
    return x


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


class SelectionState:
    """State representing the currently selected features in a Debrief editor"""

    selected_ids: List[Union[float, str]]
    """Array of selected feature IDs"""

    def __init__(self, selected_ids: List[Union[float, str]]) -> None:
        self.selected_ids = selected_ids

    @staticmethod
    def from_dict(obj: Any) -> 'SelectionState':
        assert isinstance(obj, dict)
        selected_ids = from_list(lambda x: from_union([from_float, from_str], x), obj.get("selectedIds"))
        return SelectionState(selected_ids)

    def to_dict(self) -> dict:
        result: dict = {}
        result["selectedIds"] = from_list(lambda x: from_union([to_float, from_str], x), self.selected_ids)
        return result


def selection_state_from_dict(s: Any) -> SelectionState:
    return SelectionState.from_dict(s)


def selection_state_to_dict(x: SelectionState) -> Any:
    return to_class(SelectionState, x)
