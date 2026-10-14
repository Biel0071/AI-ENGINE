export PATH=/usr/bin:/usr/local/bin:$PATH
node -e '
fetch("http://172.20.0.7:11434/api/generate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    model: "qwen2.5:3b",
    prompt: "Say: FENIX_OPERATIONAL",
    stream: false,
    options: { num_predict: 8 }
  })
})
.then(r => r.json())
.then(d => {
  console.log("OLLAMA_RESPONSE:", d.response);
  console.log("PROMPT_TOKENS:", d.prompt_eval_count);
  console.log("COMPLETION_TOKENS:", d.eval_count);
  console.log("TOTAL_DURATION_MS:", Math.round(d.total_duration / 1e6));
})
.catch(e => console.error("OLLAMA_ERROR:", e.message));
'
