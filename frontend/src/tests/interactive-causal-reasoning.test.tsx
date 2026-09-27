// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CasePipelineView } from '../components/pipeline/CasePipelineView';
import * as api from '../api/client';
import React from 'react';

vi.mock('../api/client', () => ({
  fetchCasePipelineReport: vi.fn(),
  fetchPipelineBenchmark: vi.fn(),
  fetchWhyInspection: vi.fn()
}));

// Mock CytoscapeCanvas so we can inspect its props easily
vi.mock('../components/graph/CytoscapeCanvas', () => ({
  CytoscapeCanvas: (props: any) => (
    <div data-testid="mock-cytoscape">
      <span data-testid="highlight-nodes">{JSON.stringify(props.highlightNodeIds)}</span>
      <span data-testid="highlight-edges">{JSON.stringify(props.highlightEdgeIds)}</span>
    </div>
  )
}));

describe('Interactive Causal Reasoning & Why Inspector', () => {
  const mockReport = {
    caseId: 'c1',
    timestamp: new Date().toISOString(),
    rawEvidenceCount: 7,
    reconstruction: {
      caseId: 'c1',
      totalFactsProcessed: 7,
      totalEntitiesExtracted: 3,
      totalEventsIdentified: 2,
      totalRelationshipsInferred: 4,
      validation: {
        totalEvaluated: 7,
        rejectedFactIds: [],
        rejectionReasons: {},
        passRate: 1
      },
      graphs: []
    },
    branches: [
      {
        interpretationId: 'branch-a',
        interpretationName: 'Branch A',
        description: 'Valid branch',
        coherenceScore: 1,
        branchStatus: 'SURVIVING',
        graph: {
          nodes: [
            { id: 'suspect', label: 'Suspect' },
            { id: 'ev1', label: 'Event 1' }
          ],
          edges: [
            { id: 'e1', source: 'suspect', target: 'ev1', evidenceRefs: ['fact-1'] }
          ]
        },
        possibilities: [],
        adaptiveReport: { decisions: [] },
        resolution: {},
        epistemicReport: {},
        decisions: {}
      },
      {
        interpretationId: 'branch-eliminated',
        interpretationName: 'Eliminated Branch',
        description: 'Time traveler branch',
        coherenceScore: 0,
        branchStatus: 'ELIMINATED_BY_GRAPH_ALGORITHM',
        eliminationReason: 'Target is temporally UNREACHABLE: All topological paths violate temporal sequence (cause occurs after effect).',
        eliminationExecutionId: 'exec-1',
        algorithmExecutions: [
          {
            id: 'exec-1',
            algorithm: 'TEMPORAL_REACHABILITY',
            evidenceRefs: ['f5', 'f6']
          }
        ],
        graph: {
          nodes: [
            { id: 'suspect', label: 'Suspect' },
            { id: 'ev2', label: 'Event 2 (09:00)' },
            { id: 'ev3', label: 'Event 3 (08:00)' },
            { id: 'target', label: 'Target' }
          ],
          edges: [
            { id: 'e2', source: 'suspect', target: 'ev2', evidenceRefs: ['f4'] },
            { id: 'e3', source: 'ev2', target: 'ev3', evidenceRefs: ['f5'] },
            { id: 'e4', source: 'ev3', target: 'target', evidenceRefs: ['f6'] }
          ]
        },
        possibilities: [],
        adaptiveReport: { decisions: [] },
        resolution: {},
        epistemicReport: {},
        decisions: {}
      }
    ],
    commonConclusions: {
      universalFindings: [],
      universalNodes: [],
      universalEdges: [],
      universalEvents: [],
      universalActions: [],
      universalEvidenceRefs: []
    },
    unifiedTrace: [],
    whyInspectorCatalog: [
      {
        queryType: 'POSSIBILITY_ELIMINATED',
        targetId: 'branch-eliminated',
        targetLabel: 'Eliminated Branch',
        question: 'Why was branch Eliminated Branch eliminated?',
        directAnswer: 'Branch was mathematically eliminated by Temporal Reachability Algorithm.',
        structuralRationale: 'Algorithm execution proved zero time-respecting paths exist from source to target. causal path requires 09:00 event to occur after 08:00 event.',
        supportingFacts: ['f5', 'f6'],
        provenanceReferences: ['f5', 'f6'],
        algorithmicBasis: 'TEMPORAL_REACHABILITY',
        confidenceOrCoherence: 1.0
      }
    ],
    provenanceCoveragePercent: 100,
    hardInvariantVerified: true,
    methodologicalIntegrityNotice: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates Evidence -> Temporal Reachability -> Branch elimination -> Why Inspector -> Graph highlighting', async () => {
    (api.fetchCasePipelineReport as any).mockResolvedValue(mockReport);

    render(<CasePipelineView caseId="c1" />);

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText(/Case Reasoning Trace/i)).toBeInTheDocument();
    });

    // Go to WHY_INSPECTOR tab
    const whyTab = screen.getByText(/"Why\?" Inspector Console/i);
    fireEvent.click(whyTab);

    // The question should be visible in two places (list and detail)
    const questions = screen.getAllByText(/Why was branch Eliminated Branch eliminated\?/i);
    expect(questions.length).toBeGreaterThan(0);

    // Verify deterministic answers
    expect(screen.getByText(/TEMPORAL_REACHABILITY/i)).toBeInTheDocument();
    expect(screen.getByText(/causal path requires 09:00 event to occur after 08:00 event/i)).toBeInTheDocument();

    // Verify Graph highlighting
    const highlightEdges = screen.getByTestId('highlight-edges');
    const highlightNodes = screen.getByTestId('highlight-nodes');
    
    // The test mock data links 'f5' and 'f6' to edges e3 and e4
    // e3 has source ev2 and target ev3
    // e4 has source ev3 and target target
    const highlightEdgesJson = JSON.parse(highlightEdges.textContent || '[]');
    expect(highlightEdgesJson).toContain('e3');
    expect(highlightEdgesJson).toContain('e4');

    const highlightNodesJson = JSON.parse(highlightNodes.textContent || '[]');
    expect(highlightNodesJson).toContain('ev2');
    expect(highlightNodesJson).toContain('ev3');
    expect(highlightNodesJson).toContain('target');
  });
});
