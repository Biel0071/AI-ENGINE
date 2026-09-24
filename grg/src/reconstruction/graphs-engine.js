'use strict';
/**
 * FÊNIX OS V11 — PAGE GRAPH & BEHAVIOR GRAPH ENGINE
 * 
 * PAGE GRAPH:
 *   Hierarchical map of screens:
 *   Dashboard -> Projects -> Project Detail -> (Files, Preview, Settings)
 *   Nodes: URL, TITLE, SCREENSHOT, COMPONENTS, ACTIONS, APIs, NEXT_SCREENS
 * 
 * BEHAVIOR GRAPH:
 *   State Transition & Action Graph:
 *   Interactions: CLICK, TYPE, SELECT, HOVER, SCROLL, SUBMIT, OPEN, CLOSE, NAVIGATE, BACK, FORWARD
 *   Relates: ACTION -> ELEMENT -> RESULT -> NEW SCREEN / STATE / API
 */

const fs = require('fs');
const path = require('path');

const INTERACTION_TYPES = Object.freeze([
  'CLICK', 'TYPE', 'SELECT', 'HOVER', 'SCROLL',
  'SUBMIT', 'OPEN', 'CLOSE', 'NAVIGATE', 'BACK', 'FORWARD'
]);

class PageGraph {
  constructor(options = {}) {
    this.systemId = options.systemId || 'system:fenix';
    this.pages = new Map();
    this.edges = [];
  }

  addPage(pageData = {}) {
    const id = pageData.id || `page:${pageData.route || pageData.url || Date.now()}`.replace(/[^a-zA-Z0-9:_-]/g, '_');
    const node = {
      id,
      systemId: this.systemId,
      url: pageData.url || pageData.route || '/',
      title: pageData.title || 'Untitled Screen',
      screenshot: pageData.screenshot || null,
      components: Array.isArray(pageData.components) ? pageData.components : [],
      actions: Array.isArray(pageData.actions) ? pageData.actions : [],
      apis: Array.isArray(pageData.apis) ? pageData.apis : [],
      nextScreens: Array.isArray(pageData.nextScreens) ? pageData.nextScreens : [],
      metadata: pageData.metadata || {},
      updatedAt: new Date().toISOString()
    };
    this.pages.set(id, node);
    return node;
  }

  addNavigationEdge(fromPageId, toPageId, actionTrigger = {}) {
    const fromNode = this.pages.get(fromPageId);
    if (fromNode && !fromNode.nextScreens.includes(toPageId)) {
      fromNode.nextScreens.push(toPageId);
    }

    const edge = {
      from: fromPageId,
      to: toPageId,
      trigger: actionTrigger.action || 'NAVIGATE',
      elementSelector: actionTrigger.selector || null,
      label: actionTrigger.label || 'navigates to',
      timestamp: new Date().toISOString()
    };
    this.edges.push(edge);
    return edge;
  }

  getPage(id) {
    return this.pages.get(id) || null;
  }

  getAllPages() {
    return Array.from(this.pages.values());
  }

  getHierarchyTree(rootPageId) {
    const root = rootPageId ? this.pages.get(rootPageId) : this.pages.values().next().value;
    if (!root) return null;

    const visited = new Set();

    const buildNode = (page) => {
      if (!page || visited.has(page.id)) return { id: page ? page.id : 'unknown', loop: true };
      visited.add(page.id);

      const children = (page.nextScreens || []).map(nid => {
        const nextNode = this.pages.get(nid);
        return nextNode ? buildNode(nextNode) : { id: nid, title: nid, children: [] };
      });

      return {
        id: page.id,
        title: page.title,
        url: page.url,
        componentsCount: page.components.length,
        actionsCount: page.actions.length,
        apisCount: page.apis.length,
        children
      };
    };

    return buildNode(root);
  }

  toJSON() {
    return {
      systemId: this.systemId,
      totalPages: this.pages.size,
      totalEdges: this.edges.length,
      pages: Array.from(this.pages.values()),
      edges: this.edges
    };
  }
}

class BehaviorGraph {
  constructor(options = {}) {
    this.systemId = options.systemId || 'system:fenix';
    this.transitions = [];
    this.actionNodes = new Map();
  }

  recordTransition(params = {}) {
    const {
      action = 'CLICK',
      elementSelector = null,
      elementCategory = 'BUTTON',
      elementText = '',
      fromScreen = null,
      toScreen = null,
      resultType = 'NAVIGATE', // NAVIGATE | MODAL_OPEN | API_CALL | STATE_CHANGE | VALIDATION_ERROR
      apiCalled = null,
      expectedPayload = null,
      stateChanges = {}
    } = params;

    const transitionId = `trans:${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const transition = {
      id: transitionId,
      systemId: this.systemId,
      action: action.toUpperCase(),
      element: {
        selector: elementSelector,
        category: elementCategory,
        text: elementText
      },
      fromScreen,
      toScreen,
      resultType,
      apiCalled,
      expectedPayload,
      stateChanges,
      timestamp: new Date().toISOString()
    };

    this.transitions.push(transition);
    return transition;
  }

  getJourneys() {
    const journeys = [];
    const screenChains = new Map();

    for (const t of this.transitions) {
      if (!screenChains.has(t.fromScreen)) {
        screenChains.set(t.fromScreen, []);
      }
      screenChains.get(t.fromScreen).push(t);
    }

    screenChains.forEach((transList, startScreen) => {
      journeys.push({
        startScreen,
        steps: transList.map(step => ({
          action: step.action,
          target: step.element.selector || step.element.text || step.element.category,
          result: step.resultType,
          nextScreen: step.toScreen,
          api: step.apiCalled
        }))
      });
    });

    return journeys;
  }

  toJSON() {
    return {
      systemId: this.systemId,
      totalTransitions: this.transitions.length,
      transitions: this.transitions,
      journeys: this.getJourneys()
    };
  }
}

module.exports = {
  PageGraph,
  BehaviorGraph,
  INTERACTION_TYPES
};
