export type TaskEnergy = 'tiny' | 'medium' | 'heavy';

export type TaskItem = {
  id: string;
  title: string;
  detail: string;
  due: string;
  done: boolean;
  isRoutine?: boolean;
  energy?: TaskEnergy;
  createdAt: string;
  updatedAt: string;
};
