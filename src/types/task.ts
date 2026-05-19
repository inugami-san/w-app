export type TaskItem = {
  id: string;
  title: string;
  detail: string;
  due: string;
  done: boolean;
  isRoutine?: boolean;
  createdAt: string;
  updatedAt: string;
};
