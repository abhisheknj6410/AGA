"use client";

import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem
} from '@heroui/react';
import { Plus } from 'lucide-react';
import { GraphNode } from '../../types/graph';

interface AddFactModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'ENTITY' | 'EVENT' | 'EVIDENCE' | 'EDGE';
  onAddNode: (node: Partial<GraphNode>) => Promise<void>;
  onAddEdge: (edge: { source: string; target: string; type: string }) => Promise<void>;
  existingNodes: GraphNode[];
}

export const AddFactModal: React.FC<AddFactModalProps> = ({
  isOpen,
  onClose,
  category,
  onAddNode,
  onAddEdge,
  existingNodes
}) => {
  const [label, setLabel] = useState('');
  const [subType, setSubType] = useState('PERSON');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [edgeType, setEdgeType] = useState('INVOLVED');
  const [timestamp, setTimestamp] = useState(new Date().toISOString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (category === 'EDGE') {
        if (!sourceId || !targetId) return;
        await onAddEdge({ source: sourceId, target: targetId, type: edgeType });
      } else {
        if (!label.trim()) return;
        await onAddNode({
          label,
          category,
          type: subType,
          time: category === 'EVENT' ? { start: timestamp, precision: 'SECOND' } : undefined
        });
      }
      setLabel('');
      onClose();
    } catch (e) {
      console.warn("Error adding fact", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="text-base font-bold">
              {category === 'EDGE' ? 'Connect Relationship' : `Add ${category} Node`}
            </ModalHeader>
            <ModalBody className="space-y-4">
              {category === 'EDGE' ? (
                <>
                  <Select
                    label="Source Node"
                    selectedKeys={sourceId ? [sourceId] : []}
                    onSelectionChange={(k) => setSourceId(Array.from(k)[0] as string)}
                    size="sm"
                    variant="bordered"
                  >
                    {existingNodes.map((n) => (
                      <SelectItem key={n.id}>{n.label} ({n.category})</SelectItem>
                    ))}
                  </Select>

                  <Input
                    label="Relationship Type / Predicate"
                    value={edgeType}
                    onValueChange={setEdgeType}
                    placeholder="e.g. CAUSED, LOCATED_AT, ACCESSED, COMMUNICATED"
                    size="sm"
                    variant="bordered"
                  />

                  <Select
                    label="Target Node"
                    selectedKeys={targetId ? [targetId] : []}
                    onSelectionChange={(k) => setTargetId(Array.from(k)[0] as string)}
                    size="sm"
                    variant="bordered"
                  >
                    {existingNodes.map((n) => (
                      <SelectItem key={n.id}>{n.label} ({n.category})</SelectItem>
                    ))}
                  </Select>
                </>
              ) : (
                <>
                  <Input
                    label="Label / Name"
                    value={label}
                    onValueChange={setLabel}
                    placeholder={
                      category === 'ENTITY' ? 'e.g. John Doe, Server Vault' :
                      category === 'EVENT' ? 'e.g. Unauthorized USB Insert' : 'e.g. Security Camera 04'
                    }
                    size="sm"
                    variant="bordered"
                  />

                  <Input
                    label="Type Specification"
                    value={subType}
                    onValueChange={setSubType}
                    placeholder="e.g. PERSON, LOCATION, ACTION, SENSOR"
                    size="sm"
                    variant="bordered"
                  />

                  {category === 'EVENT' && (
                    <Input
                      label="Event Timestamp (ISO 8601)"
                      value={timestamp}
                      onValueChange={setTimestamp}
                      size="sm"
                      variant="bordered"
                    />
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button size="sm" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                color="primary"
                className="bg-teal-600 text-white font-semibold"
                isLoading={loading}
                onPress={handleSubmit}
              >
                Add to Graph
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
