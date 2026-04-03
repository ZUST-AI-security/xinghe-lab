import {
  cancelAttackTask,
  getAttackTaskStatus,
  runFGSMAttack,
  searchImageNetClasses,
  submitFGSMAttack,
} from '../../../../api/attacks/fgsm';
import { useAttackRunner } from '../../shared/useAttackRunner';

const useFGSMAttack = () => useAttackRunner({
  attackName: 'FGSM',
  runSync: runFGSMAttack,
  submitAsync: submitFGSMAttack,
  getTaskStatus: getAttackTaskStatus,
  cancelTask: cancelAttackTask,
  searchClassesApi: searchImageNetClasses,
  historyStorageKey: 'fgsm_attack_history',
});

export default useFGSMAttack;
