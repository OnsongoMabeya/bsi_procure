#!/bin/sh
set -e

MODEL="${LLM_OLLAMA_MODEL:-llama3.1}"

echo "[ollama] Starting Ollama server..."
ollama serve &
SERVE_PID=$!

# Wait for server to be ready
for i in 1 2 3 4 5 6 7 8 9 10; do
  if ollama list >/dev/null 2>&1; then
    echo "[ollama] Server ready."
    break
  fi
  echo "[ollama] Waiting for server... ($i/10)"
  sleep 2
done

echo "[ollama] Ensuring model '${MODEL}' is pulled (latest version)..."
ollama pull "${MODEL}"

echo "[ollama] Model ready. Waiting for serve process..."
wait "${SERVE_PID}"
