function inferSidebarWidth(filePath = '', content = '') {
  if (/sidebar/i.test(filePath) && /w-(64|72|80|96)|width\s*:\s*(\d+px)/i.test(content)) {
    const explicit = content.match(/width\s*:\s*(\d+px)/i);
    if (explicit && explicit[1]) {
      return explicit[1];
    }
    return '280px';
  }
  return '280px';
}

function inferHeaderHeight(filePath = '', content = '') {
  if (/header|navbar|topbar/i.test(filePath) || /header/i.test(content)) {
    const explicit = content.match(/height\s*:\s*(\d+px)/i);
    return (explicit && explicit[1]) || '64px';
  }
  return '64px';
}

function inferChatLayout(content = '') {
  const hasChatSignals = /chat|message|bubble|conversation/i.test(content);
  if (!hasChatSignals) {
    return {
      columns: '320px 1fr',
      hasThreadPane: false,
      hasInputDock: false,
    };
  }

  return {
    columns: '320px 1fr',
    hasThreadPane: /thread|conversation|messages/i.test(content),
    hasInputDock: /textarea|input|composer|send/i.test(content),
  };
}

function inferContentContainer(content = '') {
  const explicit = content.match(/max-width\s*:\s*(\d+px)/i);
  return {
    maxWidth: (explicit && explicit[1]) || '1200px',
    centered: /mx-auto|margin\s*:\s*0\s+auto/i.test(content),
  };
}

function extractLayoutPatterns(files = []) {
  let sidebar = { width: '280px' };
  let header = { height: '64px' };
  let chat = { columns: '320px 1fr', hasThreadPane: false, hasInputDock: false };
  let content = { maxWidth: '1200px', centered: false };

  for (const file of files) {
    const filePath = String(file.path || '');
    const source = String(file.content || '');

    if (/sidebar/i.test(filePath)) {
      sidebar = { width: inferSidebarWidth(filePath, source) };
    }

    if (/header|navbar|topbar/i.test(filePath)) {
      header = { height: inferHeaderHeight(filePath, source) };
    }

    if (/chat|message|conversation/i.test(filePath) || /chat|message|conversation/i.test(source)) {
      chat = inferChatLayout(source);
    }

    if (/container|layout|page|screen|view/i.test(filePath)) {
      content = inferContentContainer(source);
    }
  }

  return {
    sidebar,
    chat,
    header,
    content,
  };
}

function extractDesignPatterns(layoutPatterns = {}) {
  return {
    chatLayout: {
      columns: (layoutPatterns.chat && layoutPatterns.chat.columns) || '320px 1fr',
      messageStackGap: '12px',
      inputDock: Boolean(layoutPatterns.chat && layoutPatterns.chat.hasInputDock),
    },
    sidebarLayout: {
      width: (layoutPatterns.sidebar && layoutPatterns.sidebar.width) || '280px',
      itemSpacing: '8px',
      itemRadius: '8px',
    },
    messageFlowUI: {
      outgoingAlignment: 'right',
      incomingAlignment: 'left',
      timestampStyle: 'muted-caption',
    },
  };
}

module.exports = {
  extractLayoutPatterns,
  extractDesignPatterns,
};
