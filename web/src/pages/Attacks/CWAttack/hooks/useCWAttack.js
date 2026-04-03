import {
  cancelAttackTask,
  getAttackTaskStatus,
  runCWAttack,
  searchImageNetClasses,
  submitCWAttack,
} from '../../../../api/attacks/cw';
import { useAttackRunner } from '../../shared/useAttackRunner';

const useCWAttack = () => useAttackRunner({
  attackName: 'C&W',
  runSync: runCWAttack,
  submitAsync: submitCWAttack,
  getTaskStatus: getAttackTaskStatus,
  cancelTask: cancelAttackTask,
  searchClassesApi: searchImageNetClasses,
  historyStorageKey: 'cw_attack_history',
});

export default useCWAttack;
