'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Skill } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// This is a simple auto-layout algorithm.
// For a real app, you'd use a library like dagre.
function getLayoutedElements(skills: Skill[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const spacing = { x: 200, y: 120 };

  const skillsById = new Map(skills.map(s => [s.id, s]));
  const levels: Record<string, number> = {};

  // Calculate level for each skill (0 = root)
  function getLevel(skillId: string): number {
    if (levels[skillId] !== undefined) return levels[skillId];

    const skill = skillsById.get(skillId);
    if (!skill || skill.dependencies.length === 0) {
      levels[skillId] = 0;
      return 0;
    }

    const maxDepLevel = Math.max(
      ...skill.dependencies.map(depId => getLevel(depId))
    );
    levels[skillId] = maxDepLevel + 1;
    return levels[skillId];
  }

  skills.forEach(skill => getLevel(skill.id));

  // Position nodes based on level
  const nodesByLevel: Record<number, string[]> = {};
  skills.forEach(skill => {
    const level = levels[skill.id];
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(skill.id);
  });

  Object.entries(nodesByLevel).forEach(([levelStr, skillIds]) => {
    const level = parseInt(levelStr, 10);
    skillIds.forEach((skillId, index) => {
      const skill = skillsById.get(skillId)!;
      nodes.push({
        id: skill.id,
        type: 'skillNode', // Custom node type
        position: {
          x: index * spacing.x - (skillIds.length - 1) * spacing.x / 2,
          y: level * spacing.y,
        },
        data: skill as unknown as Record<string, unknown>,
      });

      // Create edges
      skill.dependencies.forEach(depId => {
        edges.push({
          id: `${depId}-${skillId}`,
          source: depId,
          target: skillId,
          animated: skill.level < 100 && (skillsById.get(depId)?.level || 0) === 100,
          style: { strokeWidth: 2 },
        });
      });
    });
  });

  return { nodes, edges };
}

// --- Custom Node Component ---
// This renders the skill inside the node
const SkillNode = ({ data }: { data: Skill }) => {
  let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
  if (data.level === 100) badgeVariant = 'default';
  if (data.level < 30) badgeVariant = 'outline';

  return (
    <Card className="w-48 shadow-lg">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm">{data.name}</h3>
          <Badge variant={badgeVariant}>{data.category}</Badge>
        </div>
        <Progress value={data.level} className="h-2" />
        <span className="text-xs text-muted-foreground mt-1">{data.level}% Mastered</span>
      </CardContent>
    </Card>
  );
};

// Register custom node type
const nodeTypes = {
  skillNode: SkillNode,
};

// --- Main Tree Component ---
interface SkillTreeProps {
  skills: Skill[];
}

export function SkillTree({ skills }: SkillTreeProps) {
  const { nodes, edges } = useMemo(() => getLayoutedElements(skills), [skills]);

  return (
    <div className="w-full h-[500px] border rounded-lg bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}