docker exec api-platform-api-1 node -e '
const { registry } = require("./dist/services/ai.service.js");
(async () => {
  try {
    const provider = await registry.resolve("chat", "ollama");
    console.log("Resolved provider:", provider.name);
    const res = await provider.chat({
      model: "qwen2.5:3b",
      messages: [{ role: "user", content: "Say: FENIX_QWEN_OPERATIONAL" }],
      options: { num_predict: 10 }
    });
    console.log("Chat response:", JSON.stringify(res));
  } catch(e) {
    console.error("Provider chat error:", e);
  }
})();
'
