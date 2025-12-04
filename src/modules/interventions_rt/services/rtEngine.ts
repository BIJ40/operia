// RT Question Tree Navigation Engine

import { QuestionTree, QuestionNode, RunnerState } from '../types';

export class RtEngine {
  private tree: QuestionTree;
  private state: RunnerState;

  constructor(tree: QuestionTree) {
    this.tree = tree;
    this.state = this.initState();
  }

  private initState(): RunnerState {
    const totalNodes = this.countReachableNodes();
    return {
      currentNodeId: this.tree.startNode,
      history: [],
      answers: {},
      photos: {},
      progress: { current: 1, total: totalNodes },
      breadcrumb: this.buildBreadcrumb(this.tree.startNode),
    };
  }

  private countReachableNodes(): number {
    // Simplified: count all nodes
    return Object.keys(this.tree.nodes).length;
  }

  private buildBreadcrumb(nodeId: string): string[] {
    const node = this.tree.nodes[nodeId];
    if (!node) return [this.tree.univers];
    
    const parts = [this.tree.univers];
    if (node.branch && node.branch !== 'contexte') {
      parts.push(this.formatBranchName(node.branch));
    }
    return parts;
  }

  private formatBranchName(branch: string): string {
    const names: Record<string, string> = {
      contexte: 'Contexte',
      fuite: 'Fuite d\'eau',
      bouchage: 'Bouchage',
      robinetterie: 'Robinetterie',
      chauffe_eau: 'Chauffe-eau',
      wc: 'WC / Sanitaires',
      autre: 'Autre',
      materiel: 'Matériel',
      fin: 'Récapitulatif',
    };
    return names[branch] || branch;
  }

  getCurrentNode(): QuestionNode | null {
    return this.tree.nodes[this.state.currentNodeId] || null;
  }

  getState(): RunnerState {
    return { ...this.state };
  }

  setState(newState: Partial<RunnerState>): void {
    this.state = { ...this.state, ...newState };
  }

  loadState(savedState: RunnerState): void {
    this.state = { ...savedState };
  }

  setAnswer(nodeId: string, value: any): void {
    this.state.answers[nodeId] = value;
  }

  getAnswer(nodeId: string): any {
    return this.state.answers[nodeId];
  }

  addPhoto(nodeId: string, url: string): void {
    if (!this.state.photos[nodeId]) {
      this.state.photos[nodeId] = [];
    }
    this.state.photos[nodeId].push(url);
  }

  getPhotos(nodeId?: string): string[] {
    if (nodeId) {
      return this.state.photos[nodeId] || [];
    }
    return Object.values(this.state.photos).flat();
  }

  goNext(): QuestionNode | null {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return null;

    const answer = this.state.answers[currentNode.id];
    let nextNodeId: string | null = null;

    // Check byAnswer first
    if (currentNode.next.byAnswer && answer !== undefined) {
      const answerKey = String(answer);
      nextNodeId = currentNode.next.byAnswer[answerKey] || null;
    }

    // Fallback to default
    if (!nextNodeId) {
      nextNodeId = currentNode.next.default || null;
    }

    if (!nextNodeId) {
      return null; // End of tree
    }

    // Save history for back navigation
    this.state.history.push(this.state.currentNodeId);
    this.state.currentNodeId = nextNodeId;
    this.state.progress.current = this.state.history.length + 1;
    this.state.breadcrumb = this.buildBreadcrumb(nextNodeId);

    return this.tree.nodes[nextNodeId] || null;
  }

  goBack(): QuestionNode | null {
    if (this.state.history.length === 0) return null;

    const previousNodeId = this.state.history.pop()!;
    this.state.currentNodeId = previousNodeId;
    this.state.progress.current = this.state.history.length + 1;
    this.state.breadcrumb = this.buildBreadcrumb(previousNodeId);

    return this.tree.nodes[previousNodeId] || null;
  }

  canGoBack(): boolean {
    return this.state.history.length > 0;
  }

  isAtEnd(): boolean {
    const currentNode = this.getCurrentNode();
    return currentNode?.isEnd === true;
  }

  getAnswersSummary(): Array<{ nodeId: string; question: string; answer: any; branch: string }> {
    return Object.entries(this.state.answers).map(([nodeId, answer]) => {
      const node = this.tree.nodes[nodeId];
      return {
        nodeId,
        question: node?.question || nodeId,
        answer: this.formatAnswer(node, answer),
        branch: node?.branch || 'unknown',
      };
    });
  }

  private formatAnswer(node: QuestionNode | undefined, value: any): string {
    if (!node) return String(value);

    if (node.type === 'boolean') {
      return value === true ? 'Oui' : 'Non';
    }

    if (node.type === 'single_choice' && node.options) {
      const option = node.options.find(o => o.value === value);
      return option?.label || String(value);
    }

    if (node.type === 'multi_choice' && Array.isArray(value) && node.options) {
      return value
        .map(v => node.options?.find(o => o.value === v)?.label || v)
        .join(', ');
    }

    return String(value);
  }

  reset(): void {
    this.state = this.initState();
  }

  getBranchesVisited(): string[] {
    const branches = new Set<string>();
    for (const nodeId of this.state.history) {
      const node = this.tree.nodes[nodeId];
      if (node?.branch) branches.add(node.branch);
    }
    const currentNode = this.getCurrentNode();
    if (currentNode?.branch) branches.add(currentNode.branch);
    return Array.from(branches);
  }
}

export default RtEngine;
