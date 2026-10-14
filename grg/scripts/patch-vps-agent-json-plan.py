from pathlib import Path
from datetime import datetime, timezone

path = Path('/opt/fenix-os/grg/src/agents/agent-execution-runtime.js')
source = path.read_text()
original = source
replacements = [
    ("'Return JSON only with operations, tests, validationPassed and commit.'", "'Return JSON only with operations, tests, validationPassed and commit. Every file modification requires at least one executable test command.'"),
    ("    let plan; try { plan = JSON.parse(model.text); } catch { throw new Error('agent provider did not return the required JSON tool plan'); }", "    const rawPlan = String(model.text || '').trim();\n    const fenced = rawPlan.match(/^```(?:json)?\\s*\\n([\\s\\S]*?)\\n```$/i);\n    let plan; try { plan = JSON.parse(fenced ? fenced[1] : rawPlan); } catch { throw new Error('agent provider did not return the required JSON tool plan'); }"),
    ("    if (!plan || typeof plan !== 'object' || Array.isArray(plan) || (!Array.isArray(plan.operations) && !Array.isArray(plan.tests)) || !(plan.operations?.length || plan.tests?.length)) throw new Error('agent provider returned an empty execution plan');", "    if (!plan || typeof plan !== 'object' || Array.isArray(plan) || (!Array.isArray(plan.operations) && !Array.isArray(plan.tests)) || !(plan.operations?.length || plan.tests?.length)) throw new Error('agent provider returned an empty execution plan');\n    if (plan.operations?.length && !plan.tests?.length) throw new Error('agent provider returned file changes without validation tests');"),
]
for old, new in replacements:
    if source.count(old) != 1:
        raise RuntimeError(f'anchor changed: {old[:40]}')
    source = source.replace(old, new)
stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
backup = path.with_name(f'{path.name}.bak-json-plan-{stamp}')
backup.write_text(original)
path.write_text(source)
print('Agent plan parser patched; backup:', backup.name)
