import re

with open('grg/public/unified-app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Pattern matches: $('someId').innerHTML =
# Replace with: if ($('someId')) $('someId').innerHTML =
code = re.sub(r"\$\('([^']+)'\)\.innerHTML\s*=", r"if ($('\1')) $('\1').innerHTML =", code)

with open('grg/public/unified-app.js', 'w', encoding='utf-8') as f:
    f.write(code)
