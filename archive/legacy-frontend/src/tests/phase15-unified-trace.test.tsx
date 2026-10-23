// @vitest-environment jsdom
import React from 'react';
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CasePipelineView } from '../components/pipeline/CasePipelineView';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  fetchCasePipelineReport: vi.fn(),
  fetchPipelineBenchmark: vi.fn(),
  fetchWhyInspection: vi.fn()
}));

vi.mock('../components/graph/CytoscapeCanvas', () => ({
  CytoscapeCanvas: ({ highlightNodeIds, highlightEdgeIds }: any) => (
    <div data-testid="mock-canvas" data-nodes={JSON.stringify(highlightNodeIds)} data-edges={JSON.stringify(highlightEdgeIds)}>
      Mock Canvas
    </div>
  )
}));

describe('Phase 15: Unified Algorithm Evidence Trace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReport = {
    caseId: 'c1',
    branches: [
      {
        interpretationId: 'b1',
        interpretationName: 'Main Branch',
        branchStatus: 'ACTIVE',
        graph: {
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }]
        },
        possibilities: [{ id: 'p1', name: 'Path 1', status: 'VALID' }],
        algorithmExecutions: [
          {
            id: 'exec-mincut-1',
            algorithm: 'MIN_CUT',
            result: { summary: 'Computed minimum cut' },
            inputSubgraph: { nodes: ['n1', 'n2', 'n3'], edges: ['e1'] },
            inputEvidence: ['ev1'],
            role: 'CONTRIBUTING_ALGORITHM',
            structuralInterpretation: 'Finds the minimum set of edges',
            possibilityImpact: 'Identifies boundaries',
            resolutionImpact: 'Generates candidates',
            investigationImpact: 'Highlights vulnerabilities'
          }
        ]
      }
    ],
    whyInspectorCatalog: [
      {
        queryType: 'ALGORITHM_EXECUTED',
        targetId: 'exec-mincut-1',
        targetLabel: 'MIN_CUT',
        question: 'Why did MIN_CUT execute?',
        directAnswer: 'Algorithm produced result: Computed minimum cut',
        structuralRationale: 'Role: CONTRIBUTING_ALGORITHM. Interpretation: Finds the minimum set of edges. Possibility Impact: Identifies boundaries. Resolution: Generates candidates. Investigation: Highlights vulnerabilities.',
        supportingFacts: ['ev1'],
        provenanceReferences: [],
        algorithmicBasis: 'MIN_CUT',
        confidenceOrCoherence: 1.0,
        inputSubgraph: { nodes: ['n1', 'n2', 'n3'], edges: ['e1'] }
      }
    ],
    unifiedTrace: [],
    branchComparison: {
      distinguishingEvidenceTargets: [],
      resolutionCandidates: [],
      differingNodes: { branchAOnly: [], branchBOnly: [] },
      differingEdges: { branchAOnly: [], branchBOnly: [] }
    },
    commonConclusions: {
      universalNodes: [],
      universalEdges: [],
      universalFindings: [],
      universalActions: []
    },
    provenanceCoveragePercent: 100,
    hardInvariantVerified: true,
    methodologicalIntegrityNotice: 'Valid'
  };

class ErrorBoundary extends React.Component<any, any> {
  state = { error: null };
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    if (this.state.error) return <div data-testid="error-boundary">{String(this.state.error)}</div>;
    return this.props.children;
  }
}

  it('navigates through the Why Inspector to verify Phase 15 algorithm traces', async () => {
    vi.mocked(api.fetchCasePipelineReport).mockResolvedValue(mockReport as any);
    vi.mocked(api.fetchPipelineBenchmark).mockResolvedValue(mockReport as any);

    render(<ErrorBoundary><CasePipelineView caseId="c1" /></ErrorBoundary>);

    await waitFor(() => {
      expect(screen.queryByText(/Loading pipeline reasoning/i)).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/"Why\?" Inspector Console/i)).toBeInTheDocument();
    });

    const whyTab = screen.getByText(/"Why\?" Inspector Console/i).closest('button');
    fireEvent.click(whyTab!);

    // Verify tab changed
    await waitFor(() => {
      expect(screen.getByText(/Why\? Question Catalog/i)).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const questionButton = buttons.find(b => b.textContent?.includes('Why did MIN_CUT execute'));
    if (!questionButton) {
      console.log("All button texts:", buttons.map(b => b.textContent));
      throw new Error("Question button not found");
    }
    expect(questionButton).toBeInTheDocument();
    
    fireEvent.click(questionButton);

    await waitFor(() => {
      expect(screen.getByText(/Role: CONTRIBUTING_ALGORITHM/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Generates candidates/i)).toBeInTheDocument();

    const canvas = screen.getByTestId('mock-canvas');
    const highlightedNodes = JSON.parse(canvas.getAttribute('data-nodes') || '[]');
    const highlightedEdges = JSON.parse(canvas.getAttribute('data-edges') || '[]');

    expect(highlightedNodes).toContain('n1');
    expect(highlightedNodes).toContain('n2');
    expect(highlightedNodes).toContain('n3');
    expect(highlightedEdges).toContain('e1');
  });
});
