import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';

export class GraphExporter {
  static toGraphML(graph: GraphPayload): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"',
      '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">',
      '  <key id="d_label" for="node" attr.name="label" attr.type="string"/>',
      '  <key id="d_category" for="node" attr.name="category" attr.type="string"/>',
      '  <key id="d_type" for="node" attr.name="type" attr.type="string"/>',
      '  <key id="d_rel_type" for="edge" attr.name="type" attr.type="string"/>',
      '  <key id="d_status" for="edge" attr.name="status" attr.type="string"/>',
      '  <key id="d_cost" for="edge" attr.name="cost" attr.type="double"/>',
      `  <graph id="${graph.metadata.caseId}" edgedefault="directed">`
    ];

    for (const node of graph.nodes) {
      lines.push(`    <node id="${this.escapeXml(node.id)}">`);
      lines.push(`      <data key="d_label">${this.escapeXml(node.label)}</data>`);
      lines.push(`      <data key="d_category">${this.escapeXml(node.category)}</data>`);
      lines.push(`      <data key="d_type">${this.escapeXml(node.type)}</data>`);
      lines.push('    </node>');
    }

    for (const edge of graph.edges) {
      lines.push(`    <edge id="${this.escapeXml(edge.id)}" source="${this.escapeXml(edge.source)}" target="${this.escapeXml(edge.target)}">`);
      lines.push(`      <data key="d_rel_type">${this.escapeXml(edge.type)}</data>`);
      lines.push(`      <data key="d_status">${this.escapeXml(edge.status)}</data>`);
      lines.push(`      <data key="d_cost">${edge.cost}</data>`);
      lines.push('    </edge>');
    }

    lines.push('  </graph>');
    lines.push('</graphml>');

    return lines.join('\n');
  }

  static toDot(graph: GraphPayload): string {
    const lines: string[] = [
      'digraph EvidenceGraph {',
      '  rankdir=TB;',
      '  graph [bgcolor="#0f172a", fontcolor="#f8fafc", fontname="Helvetica"];',
      '  node [fontname="Helvetica", fontsize=10, fontcolor="#ffffff", style="filled,rounded", shape=box];',
      '  edge [fontname="Helvetica", fontsize=8, fontcolor="#94a3b8", color="#64748b"];',
      ''
    ];

    for (const node of graph.nodes) {
      let fillColor = '#1e293b';
      let strokeColor = '#3b82f6';
      let shape = 'box';

      if (node.category === 'EVENT') {
        fillColor = '#2d1b08';
        strokeColor = '#f59e0b';
        shape = 'hexagon';
      } else if (node.category === 'EVIDENCE') {
        fillColor = '#06281e';
        strokeColor = '#10b981';
        shape = 'folder';
      }

      const safeLabel = `${node.label}\\n[${node.type}]`.replace(/"/g, '\\"');
      lines.push(`  "${node.id}" [label="${safeLabel}", shape=${shape}, fillcolor="${fillColor}", color="${strokeColor}"];`);
    }

    lines.push('');

    for (const edge of graph.edges) {
      let style = 'solid';
      let color = '#6366f1';
      if (edge.status === 'DERIVED') {
        style = 'dashed';
        color = '#a855f7';
      } else if (edge.status === 'HYPOTHESIZED') {
        style = 'dotted';
        color = '#f59e0b';
      } else if (edge.type === 'CONTRADICTS') {
        style = 'bold';
        color = '#ef4444';
      }

      const safeType = `${edge.type}\\n(c:${edge.cost})`.replace(/"/g, '\\"');
      lines.push(`  "${edge.source}" -> "${edge.target}" [label="${safeType}", style="${style}", color="${color}"];`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}
