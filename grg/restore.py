import json
import re

transcript_path = r'C:\Users\Dell\.gemini\antigravity\brain\c7fa05bd-004b-46bd-90ee-e1051a5bc837\.system_generated\logs\transcript_full.jsonl'

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get('step_index') == 31 and entry.get('type') == 'GENERIC':
                content = entry.get('content', '')
                if 'File Path: ile:///c:/projetos/ai-engine-core/ai-engine/grg/public/runtime-cockpit.js' in content:
                    # extract lines starting with numbers
                    lines = content.split('\n')
                    output = []
                    for l in lines:
                        match = re.match(r'^\d+: (.*)$', l)
                        if match:
                            output.append(match.group(1))
                    
                    with open(r'c:\projetos\ai-engine-core\ai-engine\grg\public\runtime-cockpit.js', 'w', encoding='utf-8') as out:
                        out.write('\n'.join(output))
                    print('Restored runtime-cockpit.js ({} lines)'.format(len(output)))
                    
        except Exception as e:
            pass

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get('step_index') == 29 and entry.get('type') == 'GENERIC':
                content = entry.get('content', '')
                if 'File Path: ile:///c:/projetos/ai-engine-core/ai-engine/grg/public/index.html' in content:
                    # extract lines starting with numbers
                    lines = content.split('\n')
                    output = []
                    for l in lines:
                        match = re.match(r'^\d+: (.*)$', l)
                        if match:
                            output.append(match.group(1))
                    
                    with open(r'c:\projetos\ai-engine-core\ai-engine\grg\public\index.html', 'w', encoding='utf-8') as out:
                        out.write('\n'.join(output))
                    print('Restored index.html ({} lines)'.format(len(output)))
                    
        except Exception as e:
            pass
