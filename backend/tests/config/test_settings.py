import pytest
from django.core.exceptions import ImproperlyConfigured

from config.settings import env_list, required_env

VARIABLE = "SPOTTER_TEST_VARIABLE"


def test_required_env_names_the_variable_when_it_is_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(VARIABLE, raising=False)

    with pytest.raises(ImproperlyConfigured, match=f"Set {VARIABLE} in the environment"):
        required_env(VARIABLE)


def test_required_env_treats_an_empty_value_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(VARIABLE, "")

    with pytest.raises(ImproperlyConfigured, match=f"Set {VARIABLE} in the environment"):
        required_env(VARIABLE)


def test_required_env_returns_the_value(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(VARIABLE, "secret")

    assert required_env(VARIABLE) == "secret"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("a.example,b.example", ["a.example", "b.example"]),
        (" a.example , b.example ", ["a.example", "b.example"]),
        ("a.example,,", ["a.example"]),
        ("", []),
    ],
    ids=["plain", "spaces", "empty-items", "empty"],
)
def test_env_list_splits_on_commas(
    monkeypatch: pytest.MonkeyPatch, raw: str, expected: list[str]
) -> None:
    monkeypatch.setenv(VARIABLE, raw)

    assert env_list(VARIABLE, "default.example") == expected


def test_env_list_uses_the_default_when_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(VARIABLE, raising=False)

    assert env_list(VARIABLE, "localhost,127.0.0.1") == ["localhost", "127.0.0.1"]
