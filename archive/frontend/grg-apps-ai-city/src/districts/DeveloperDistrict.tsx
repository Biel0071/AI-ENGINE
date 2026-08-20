import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Folder, File, Play, Save, ChevronRight, ChevronDown, TerminalSquare, GitBranch, MessageSquare } from 'lucide-react';
import { client, bus } from '../App';

export const DeveloperDistrict = ({ onClose }: { onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal' | 'git' | 'chat'>('editor');
  const [fsTree, setFsTree] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    fetchDirectory('');
  }, []);

  const fetchDirectory = async (path: string) => {
    try {
      const res = await fetch(`http://209.50.241.215:4400/api/dev/fs?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setFsTree(data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch FS', e);
    }
  };

  const openFile = async (path: string) => {
    try {
      const res = await fetch(`http://209.50.241.215:4400/api/dev/fs/file?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentFile(path);
        setFileContent(data.content);
        setActiveTab('editor');
      }
    } catch (e) {
      console.error('Failed to read file', e);
    }
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      await fetch(`http://209.50.241.215:4400/api/dev/fs/file?path=${encodeURIComponent(currentFile)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent })
      });
      bus.emit('notification', { message: 'File saved successfully' });
    } catch (e) {
      console.error('Failed to save', e);
    }
  };

  const runCommand = async (command: string) => {
    const sessionId = `term-${Date.now()}`;
    setActiveTab('terminal');
    setTerminalOutput(prev => prev + `\n$ ${command}\n`);
    try {
      await fetch(`http://209.50.241.215:4400/api/dev/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, sessionId })
      });
    } catch (e) {
      console.error('Failed to execute command', e);
    }
  };

  useEffect(() => {
    const onTermOut = (evt: any) => {
      setTerminalOutput(prev => prev + evt.data);
      if (xtermRef.current) {
        xtermRef.current.write(evt.data);
      }
    };
    bus.on('dev:terminalOutput', onTermOut);
    return () => {
      // @ts-ignore - bus.off not typed
      if (bus.off) bus.off('dev:terminalOutput', onTermOut);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !xtermRef.current) {
      const term = new Terminal({ theme: { background: '#111827' } });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      xtermRef.current = term;
      term.write(terminalOutput.replace(/\n/g, '\r\n'));
    }
  }, [activeTab]);

  return (
    <div className="developer-district-ide">
      <div className="ide-header">
        <h2>Developer District</h2>
        <div className="ide-actions">
          <button onClick={saveFile}><Save size={16} /> Save</button>
          <button onClick={() => runCommand('npm run build')}><Play size={16} /> Build</button>
          <button onClick={onClose} className="danger">Close IDE</button>
        </div>
      </div>
      <div className="ide-layout">
        <aside className="ide-sidebar">
          <div className="sidebar-header">Project Explorer</div>
          <div className="file-tree">
            {currentPath && (
              <div className="tree-item" onClick={() => {
                const parts = currentPath.split('/');
                parts.pop();
                const parent = parts.join('/');
                setCurrentPath(parent);
                fetchDirectory(parent);
              }}>
                <Folder size={14} /> ..
              </div>
            )}
            {fsTree.map((item, i) => (
              <div key={i} className="tree-item" onClick={() => {
                if (item.isDirectory) {
                  setCurrentPath(item.path);
                  fetchDirectory(item.path);
                } else {
                  openFile(item.path);
                }
              }}>
                {item.isDirectory ? <Folder size={14} className="text-blue" /> : <File size={14} className="text-gray" />}
                <span className="tree-label">{item.name}</span>
              </div>
            ))}
          </div>
        </aside>
        <main className="ide-main">
          {activeTab === 'editor' && (
            <div className="editor-container">
              {currentFile ? (
                <Editor
                  height="100%"
                  theme="vs-dark"
                  path={currentFile}
                  value={fileContent}
                  onChange={(val) => setFileContent(val || '')}
                  options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
              ) : (
                <div className="empty-state">Select a file from the explorer</div>
              )}
            </div>
          )}
          {activeTab === 'terminal' && (
            <div className="terminal-container" ref={terminalRef}></div>
          )}
          {activeTab === 'git' && (
            <div className="git-container">
              <h3>Git Status</h3>
              <button onClick={() => runCommand('git status')}>Refresh Status</button>
            </div>
          )}
        </main>
        <aside className="ide-chat">
          <div className="sidebar-header">Context Chat</div>
          <div className="chat-messages">
            <div className="msg bot">Ready to assist with {currentFile || 'the project'}.</div>
          </div>
          <input type="text" placeholder="Ask FÊNIX..." className="chat-input" />
        </aside>
      </div>
      <div className="ide-bottom-bar">
        <div className={`bar-item ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
          <File size={14} /> Editor
        </div>
        <div className={`bar-item ${activeTab === 'terminal' ? 'active' : ''}`} onClick={() => setActiveTab('terminal')}>
          <TerminalSquare size={14} /> Terminal
        </div>
        <div className={`bar-item ${activeTab === 'git' ? 'active' : ''}`} onClick={() => setActiveTab('git')}>
          <GitBranch size={14} /> Source Control
        </div>
      </div>
    </div>
  );
};
