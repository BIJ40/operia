import { describe, it, expect, beforeEach } from 'vitest';
import { RtEngine } from '@/modules/interventions_rt/services/rtEngine';

const mockTree = {
  id: 'test-tree',
  univers: 'Plomberie',
  startNode: 'q1',
  nodes: {
    q1: {
      id: 'q1',
      question: 'Quel type de problème ?',
      type: 'single_choice' as const,
      branch: 'contexte',
      options: [
        { value: 'fuite', label: 'Fuite' },
        { value: 'bouchage', label: 'Bouchage' },
      ],
      next: {
        byAnswer: { fuite: 'q2', bouchage: 'q3' },
        default: 'q2',
      },
    },
    q2: {
      id: 'q2',
      question: 'La fuite est-elle visible ?',
      type: 'boolean' as const,
      branch: 'fuite',
      next: { default: 'q_end' },
    },
    q3: {
      id: 'q3',
      question: 'Avez-vous tenté un débouchage ?',
      type: 'boolean' as const,
      branch: 'bouchage',
      next: { default: 'q_end' },
    },
    q_end: {
      id: 'q_end',
      question: 'Récapitulatif',
      type: 'info' as const,
      branch: 'fin',
      isEnd: true,
      next: {},
    },
  },
};

describe('RtEngine', () => {
  let engine: RtEngine;

  beforeEach(() => {
    engine = new RtEngine(mockTree as any);
  });

  it('starts at the startNode', () => {
    const node = engine.getCurrentNode();
    expect(node?.id).toBe('q1');
  });

  it('returns correct initial state', () => {
    const state = engine.getState();
    expect(state.currentNodeId).toBe('q1');
    expect(state.history).toHaveLength(0);
    expect(state.breadcrumb).toContain('Plomberie');
  });

  it('navigates to byAnswer node', () => {
    engine.setAnswer('q1', 'fuite');
    const next = engine.goNext();
    expect(next?.id).toBe('q2');
    expect(next?.branch).toBe('fuite');
  });

  it('navigates to default when no byAnswer match', () => {
    engine.setAnswer('q1', 'unknown_value');
    const next = engine.goNext();
    expect(next?.id).toBe('q2'); // default
  });

  it('supports back navigation', () => {
    engine.setAnswer('q1', 'fuite');
    engine.goNext();
    expect(engine.canGoBack()).toBe(true);

    const prev = engine.goBack();
    expect(prev?.id).toBe('q1');
    expect(engine.canGoBack()).toBe(false);
  });

  it('detects end node', () => {
    expect(engine.isAtEnd()).toBe(false);
    engine.setAnswer('q1', 'fuite');
    engine.goNext(); // q2
    engine.setAnswer('q2', true);
    engine.goNext(); // q_end
    expect(engine.isAtEnd()).toBe(true);
  });

  it('formats boolean answers', () => {
    engine.setAnswer('q1', 'fuite');
    engine.goNext();
    engine.setAnswer('q2', true);
    
    const summary = engine.getAnswersSummary();
    const q2Answer = summary.find(s => s.nodeId === 'q2');
    expect(q2Answer?.answer).toBe('Oui');
  });

  it('formats single_choice answers', () => {
    engine.setAnswer('q1', 'fuite');
    
    const summary = engine.getAnswersSummary();
    const q1Answer = summary.find(s => s.nodeId === 'q1');
    expect(q1Answer?.answer).toBe('Fuite');
  });

  it('tracks branches visited', () => {
    engine.setAnswer('q1', 'bouchage');
    engine.goNext();
    
    const branches = engine.getBranchesVisited();
    expect(branches).toContain('contexte');
    expect(branches).toContain('bouchage');
  });

  it('resets to initial state', () => {
    engine.setAnswer('q1', 'fuite');
    engine.goNext();
    engine.reset();
    
    expect(engine.getCurrentNode()?.id).toBe('q1');
    expect(engine.getState().history).toHaveLength(0);
    expect(Object.keys(engine.getState().answers)).toHaveLength(0);
  });

  it('manages photos', () => {
    engine.addPhoto('q1', 'photo1.jpg');
    engine.addPhoto('q1', 'photo2.jpg');
    engine.addPhoto('q2', 'photo3.jpg');

    expect(engine.getPhotos('q1')).toHaveLength(2);
    expect(engine.getPhotos()).toHaveLength(3);
  });
});
