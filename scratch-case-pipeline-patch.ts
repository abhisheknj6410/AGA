import fs from 'fs';

let content = fs.readFileSync('frontend/src/components/pipeline/CasePipelineView.tsx', 'utf8');

if (!content.includes("import { CytoscapeCanvas }")) {
  content = content.replace("import {\n  Workflow,", "import { CytoscapeCanvas } from '../graph/CytoscapeCanvas';\nimport {\n  Workflow,");
}

const getGraphCode = `
  const getGraphForWhyAnswer = () => {
    if (!report || !selectedWhyAnswer) return null;
    let matchedBranch = report.branches.find(b => b.possibilities.some(p => p.id === selectedWhyAnswer.targetId));
    if (!matchedBranch) {
      matchedBranch = report.branches.find(b => b.interpretationId === selectedWhyAnswer.targetId);
    }
    if (!matchedBranch) {
      matchedBranch = report.branches.find(b => b.algorithmExecutions?.some(e => e.id === selectedWhyAnswer.targetId));
    }
    if (!matchedBranch && report.branches.length > 0) {
      matchedBranch = report.branches[0];
    }
    return matchedBranch?.graph || null;
  };

  const currentGraph = getGraphForWhyAnswer();
  
  const getHighlightedElements = () => {
    if (!selectedWhyAnswer || !currentGraph) return { nodes: [], edges: [] };
    
    // Check if targetId is an edge or node
    const exactNode = currentGraph.nodes.find(n => n.id === selectedWhyAnswer.targetId);
    const exactEdge = currentGraph.edges.find(e => e.id === selectedWhyAnswer.targetId);
    
    const highlightNodes = new Set<string>();
    const highlightEdges = new Set<string>();
    
    if (exactNode) highlightNodes.add(exactNode.id);
    if (exactEdge) highlightEdges.add(exactEdge.id);
    
    // Highlight edges supporting facts
    if (selectedWhyAnswer.supportingFacts.length > 0) {
      for (const e of currentGraph.edges) {
        if (e.evidenceRefs && e.evidenceRefs.some(ref => selectedWhyAnswer.supportingFacts.includes(ref))) {
          highlightEdges.add(e.id);
          highlightNodes.add(e.source);
          highlightNodes.add(e.target);
        }
      }
    }
    
    return {
      nodes: Array.from(highlightNodes),
      edges: Array.from(highlightEdges)
    };
  };
  
  const highlights = getHighlightedElements();
`;

if (!content.includes("getGraphForWhyAnswer")) {
  content = content.replace("export const CasePipelineView: React.FC<CasePipelineViewProps> = ({ caseId }) => {\n  const [activeSubTab, setActiveSubTab]", "export const CasePipelineView: React.FC<CasePipelineViewProps> = ({ caseId }) => {\n  const [activeSubTab, setActiveSubTab]");
  
  // Find where to insert
  content = content.replace("useEffect(() => {", getGraphCode + "\n  useEffect(() => {");
}

const whyInspectorReplacement = `
            {activeSubTab === 'WHY_INSPECTOR' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1400px] mx-auto h-[700px]">
                {/* Left list of questions */}
                <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col h-full overflow-hidden">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center justify-between">
                    <span>Why? Question Catalog</span>
                    <span className="font-mono text-[10px] text-zinc-400">{filteredWhyAnswers.length}</span>
                  </div>

                  {/* Filter chips */}
                  <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    {['ALL', 'POSSIBILITY_EXISTS', 'POSSIBILITY_ELIMINATED', 'ALGORITHM_EXECUTED', 'ALGORITHM_SKIPPED', 'EVIDENCE_INSUFFICIENT'].map(f => (
                      <button
                        key={f}
                        onClick={() => setWhyFilter(f)}
                        className={\`px-2 py-0.5 text-[10px] font-semibold rounded \${
                          whyFilter === f
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800'
                        }\`}
                      >
                        {f.replace('POSSIBILITY_', 'P_').replace('ALGORITHM_', 'A_').replace('EVIDENCE_', 'E_')}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {filteredWhyAnswers.map(ans => (
                      <button
                        key={\`\${ans.queryType}-\${ans.targetId}\`}
                        onClick={() => setSelectedWhyAnswer(ans)}
                        className={\`w-full text-left p-2.5 rounded-lg border text-xs transition-colors \${
                          selectedWhyAnswer?.queryType === ans.queryType && selectedWhyAnswer?.targetId === ans.targetId
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }\`}
                      >
                        <div className="font-bold text-[11px] truncate mb-0.5">{ans.question}</div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">{ans.queryType}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Middle answer detail */}
                <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col h-full overflow-y-auto space-y-4">
                  {selectedWhyAnswer ? (
                    <>
                      <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                          {selectedWhyAnswer.queryType}
                        </span>
                        <h2 className="text-sm font-bold mt-1 text-zinc-900 dark:text-zinc-100">
                          {selectedWhyAnswer.question}
                        </h2>
                      </div>

                      {/* Direct Answer */}
                      <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Direct Graph-Derived Answer:
                        </div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {selectedWhyAnswer.directAnswer}
                        </p>
                      </div>

                      {/* Structural Rationale */}
                      <div className="space-y-1 text-xs">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Structural Rationale:
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300">
                          {selectedWhyAnswer.structuralRationale}
                        </p>
                      </div>

                      {/* Algorithmic Basis */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">Algorithmic Basis:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {selectedWhyAnswer.algorithmicBasis}
                        </span>
                      </div>

                      {/* Supporting Facts & Provenance */}
                      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                        <div className="font-bold text-zinc-500 uppercase tracking-wider text-[11px]">
                          Grounding Evidence & Citations:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedWhyAnswer.supportingFacts.map((factId, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[11px]">
                              {factId}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="m-auto text-center text-xs text-zinc-500">
                      Select a question from the left catalog to inspect the deterministic graph answer.
                    </div>
                  )}
                </div>
                
                {/* Right Interactive Graph Highlighting */}
                <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
                   <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
                     <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Interactive Causal Graph</span>
                     {highlights.nodes.length > 0 && (
                       <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                         {highlights.nodes.length} Nodes Highlighted
                       </span>
                     )}
                   </div>
                   <div className="flex-1 relative bg-zinc-50 dark:bg-black/20">
                     {currentGraph ? (
                        <CytoscapeCanvas 
                          nodes={currentGraph.nodes} 
                          edges={currentGraph.edges} 
                          selectedElement={null} 
                          onSelectElement={() => {}} 
                          layoutType="dagre" 
                          theme="light" 
                          highlightNodeIds={highlights.nodes.length > 0 ? highlights.nodes : undefined}
                          highlightEdgeIds={highlights.edges.length > 0 ? highlights.edges : undefined}
                        />
                     ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
                           No graph data available for this branch.
                        </div>
                     )}
                   </div>
                </div>
              </div>
            )}`;

content = content.replace(/\{activeSubTab === 'WHY_INSPECTOR' && \([\s\S]*?\{activeSubTab === 'CONCLUSIONS'/g, whyInspectorReplacement + "\n\n            {activeSubTab === 'CONCLUSIONS'");

fs.writeFileSync('frontend/src/components/pipeline/CasePipelineView.tsx', content, 'utf8');
