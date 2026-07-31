import os

workers = [
  {"name": "Planner", "capability": "planning"},
  {"name": "Architect", "capability": "architecture"},
  {"name": "Backend", "capability": "backend"},
  {"name": "Frontend", "capability": "ui"},
  {"name": "Database", "capability": "crud"},
  {"name": "DevOps", "capability": "routing"},
  {"name": "QA", "capability": "audit"},
  {"name": "Security", "capability": "security"},
  {"name": "Documentation", "capability": "summaries"},
  {"name": "Deploy", "capability": "release"}
]

template = """const { WorkerBase } = require('../worker-base');

class {name}Worker extends WorkerBase {{
  constructor(options = {{}}) {{
    super({{
      ...options,
      name: '{name}',
      version: '1.0.0',
      capabilities: ['{capability}']
    }});
  }}

  async _performWork(job) {{
    if (this.router && this.router.isAvailable('{capability}')) {{
      const result = await this.router.execute('{capability}', {{
        prompt: `Execute job ${{job.id}} as {name}. Payload: ${{JSON.stringify(job.payload)}}`
      }});
      return {{ success: true, processedBy: this.name, output: result }};
    }}
    return {{ success: true, processedBy: this.name, simulatedLLM: true }};
  }}
}}

module.exports = {{ {name}Worker }};
"""

d = os.path.join("src", "missions", "workers")
os.makedirs(d, exist_ok=True)

for w in workers:
    with open(os.path.join(d, w["name"].lower() + "-worker.js"), "w") as f:
        f.write(template.format(name=w["name"], capability=w["capability"]))
    print(f"Created {w['name']}-worker.js")
