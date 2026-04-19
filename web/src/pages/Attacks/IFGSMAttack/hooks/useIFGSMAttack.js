import {
  cancelAttackTask,
  getAttackTaskStatus,
  runIFGSMAttack,
  searchImageNetClasses,
  submitIFGSMAttack,
} from '../../../../api/attacks/ifgsm';
import { useAttackRunner } from '../../shared/useAttackRunner';

const useIFGSMAttack = () => useAttackRunner({
  attackName: 'I-FGSM',
  runSync: runIFGSMAttack,
  submitAsync: submitIFGSMAttack,
  getTaskStatus: getAttackTaskStatus,
  cancelTask: cancelAttackTask,
  searchClassesApi: searchImageNetClasses,
  historyStorageKey: 'ifgsm_attack_history',
});

export default useIFGSMAttack;
