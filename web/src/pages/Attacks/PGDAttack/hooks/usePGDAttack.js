import {
  cancelAttackTask,
  getAttackTaskStatus,
  runPGDAttack,
  searchImageNetClasses,
  submitPGDAttack,
} from '../../../../api/attacks/pgd';
import { useAttackRunner } from '../../shared/useAttackRunner';

const usePGDAttack = () => useAttackRunner({
  attackName: 'PGD',
  algorithmKey: 'pgd',
  runSync: runPGDAttack,
  submitAsync: submitPGDAttack,
  getTaskStatus: getAttackTaskStatus,
  cancelTask: cancelAttackTask,
  searchClassesApi: searchImageNetClasses,
  historyStorageKey: 'pgd_attack_history',
});

export default usePGDAttack;
