"""Tests for Nebius Token Factory inference integration and error handling."""

import os
from unittest.mock import MagicMock, patch
import pytest
import openai

from app.core.config import settings
from app.integrations.nebius_client import NebiusClient


def test_nebius_mock_verification():
    """Verify that Nebius client cleanly reports mock mode when no API key is present."""
    client = NebiusClient(api_key="", mock_mode=True)
    status = client.verify_connection()
    assert status["authenticated"] is False
    assert status["real_call_succeeded"] is False
    assert status["mode"] == "mock_nemotron"
    assert "mock" in status["message"].lower()


def test_nebius_mock_chat_completion():
    """Verify that mock mode generates structured Nemotron reasoning with telemetry."""
    client = NebiusClient(api_key="", mock_mode=True)
    messages = [
        {"role": "system", "content": "You are a test agent."},
        {"role": "user", "content": "Generate investigation plan for alert-101"},
    ]
    resp = client.chat_completion(messages)
    assert "content" in resp
    assert "metadata" in resp
    meta = resp["metadata"]
    assert meta["provider"] == "mock_nemotron"
    assert meta["real_call_succeeded"] is False
    assert meta["latency_ms"] > 0
    assert meta["tokens_total"] > 0


def test_nebius_auth_failure_handling():
    """Verify handling when Nebius API rejects authentication (invalid API key)."""
    client = NebiusClient(api_key="invalid_test_key_xyz", mock_mode=False)

    # Mock the internal client to simulate openai.AuthenticationError
    with patch.object(client._client.chat.completions, "create") as mock_create:
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.headers = {}
        mock_create.side_effect = openai.AuthenticationError(
            message="Invalid API Key provided",
            response=mock_response,
            body={"error": {"message": "Invalid API Key provided"}},
        )

        status = client.verify_connection()
        assert status["authenticated"] is False
        assert status["real_call_succeeded"] is False
        assert "Authentication failed" in status["error"]


def test_nebius_rate_limit_handling():
    """Verify handling when Nebius Token Factory returns 429 rate limit."""
    client = NebiusClient(api_key="valid_looking_key", mock_mode=False)

    with patch.object(client._client.chat.completions, "create") as mock_create:
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {}
        mock_create.side_effect = openai.RateLimitError(
            message="Token limit exceeded for organization",
            response=mock_response,
            body={"error": {"message": "Token limit exceeded"}},
        )

        status = client.verify_connection()
        assert status["real_call_succeeded"] is False
        assert "Rate limit exceeded" in status["error"]


def test_nebius_malformed_model_output_handling():
    """Verify agent/client handles non-JSON or garbled output gracefully."""
    client = NebiusClient(api_key="valid_looking_key", mock_mode=False)

    with patch.object(client._client.chat.completions, "create") as mock_create:
        mock_resp = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "I cannot provide JSON because I am an unstructured model."
        mock_resp.choices = [mock_choice]
        mock_resp.usage.prompt_tokens = 50
        mock_resp.usage.completion_tokens = 20
        mock_resp.usage.total_tokens = 70
        mock_create.return_value = mock_resp

        result = client.chat_completion([{"role": "user", "content": "Hi"}])
        assert result["content"] == "I cannot provide JSON because I am an unstructured model."
        assert result["metadata"]["real_call_succeeded"] is True


@pytest.mark.skipif(
    not settings.is_nebius_configured,
    reason="Real Nebius credentials (NEBIUS_API_KEY) not provided in environment.",
)
def test_real_nebius_live_inference():
    """Opt-in live inference test against Nebius Token Factory when real credentials exist."""
    client = NebiusClient(mock_mode=False)
    status = client.verify_connection()
    assert status["authenticated"] is True
    assert status["real_call_succeeded"] is True
    assert status["mode"] == "nebius"
    assert status["latency_ms"] > 0

    messages = [
        {"role": "system", "content": "You are a test harness. Output JSON."},
        {"role": "user", "content": "Output JSON with key 'connected' set to true."},
    ]
    resp = client.chat_completion(messages, max_tokens=100)
    assert resp["metadata"]["real_call_succeeded"] is True
    assert resp["metadata"]["provider"] == "nebius"
