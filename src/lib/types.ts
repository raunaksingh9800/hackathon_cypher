// Represents a single skill in the blueprint
export interface Skill {
  id: string;          // e.g., 'react'
  name: string;        // e.g., 'React'
  level: number;       // 0-100 scale for progress
  category: 'frontend' | 'backend' | 'devops' | 'soft-skill';
  dependencies: string[]; // List of skill IDs required for this one
}

// Represents the user's entire profile
export interface WorkDNA {
  userId: string;
  skills: Skill[];
  // Behavioral data captured from self-assessment
  selfAssessment: string; 
  // Technical data (e.g., from Git commits, not implemented here)
  projectContributions: string[]; 
}