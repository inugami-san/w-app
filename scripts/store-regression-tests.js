const assert = require('node:assert/strict');

function taskRewardKey(taskId, dateKey) {
  return `${dateKey}:${taskId}`;
}

function awardTaskCompletion(state, taskId, dateKey) {
  const rewardKey = taskRewardKey(taskId, dateKey);
  if (!taskId || !dateKey || state.rewardedTaskIds.includes(rewardKey)) return state;

  return {
    ...state,
    glowBalance: state.glowBalance + 1,
    rewardedTaskIds: [...state.rewardedTaskIds, rewardKey],
  };
}

function resetDailyTasks(state, today) {
  if (state.lastDailyReset === today) return state;

  return {
    ...state,
    tasks: state.tasks
      .filter((task) => task.isRoutine)
      .map((task) => ({
        ...task,
        done: false,
        due: 'Today',
      })),
    lastDailyReset: today,
    completionCooldownUntil: 0,
  };
}

const firstRewardState = awardTaskCompletion(
  { glowBalance: 0, rewardedTaskIds: [] },
  'routine-water',
  '2026-05-27'
);
const duplicateRewardState = awardTaskCompletion(firstRewardState, 'routine-water', '2026-05-27');
const nextDayRewardState = awardTaskCompletion(duplicateRewardState, 'routine-water', '2026-05-28');

assert.equal(firstRewardState.glowBalance, 1, 'first completion should earn Energy');
assert.equal(duplicateRewardState.glowBalance, 1, 'same task on same day should not earn twice');
assert.equal(nextDayRewardState.glowBalance, 2, 'same routine task should earn again on a new day');
assert.deepEqual(nextDayRewardState.rewardedTaskIds, [
  '2026-05-27:routine-water',
  '2026-05-28:routine-water',
]);

const resetState = resetDailyTasks(
  {
    tasks: [
      { id: 'routine-water', title: 'Drink water', done: true, due: 'Tonight', isRoutine: true },
      { id: 'one-off', title: 'Mail form', done: true, due: 'Today', isRoutine: false },
    ],
    lastDailyReset: '2026-05-27',
    completionCooldownUntil: 123,
  },
  '2026-05-28'
);

assert.deepEqual(
  resetState.tasks.map((task) => ({ id: task.id, done: task.done, due: task.due })),
  [{ id: 'routine-water', done: false, due: 'Today' }],
  'daily reset should carry only routines into the new day'
);
assert.equal(resetState.completionCooldownUntil, 0, 'daily reset should clear completion cooldown');

console.log('Store regression tests passed.');
