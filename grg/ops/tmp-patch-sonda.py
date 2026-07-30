import re
p = "/opt/grg-fenix/source/grg/src/ai-runtime/aiplatform-provider.js"
s = open(p).read()
m = re.search(r"^(\s*)const res = await request\(this\.baseUrl, '/v1/text', this\.#apiKey, \{ prompt: 'ok'", s, re.M)
assert m, "ancora nao encontrada"
ins = (m.group(1) + 'console.log("[SONDA-KEY] hash=" + require("node:crypto")'
       '.createHash("sha256").update(this.#apiKey).digest("hex").slice(0,16)'
       ' + " len=" + this.#apiKey.length + " url=" + this.baseUrl + " model=" + this.model);\n')
s = s[:m.start()] + ins + s[m.start():]
open(p, "w").write(s)
print("instrumentado")
