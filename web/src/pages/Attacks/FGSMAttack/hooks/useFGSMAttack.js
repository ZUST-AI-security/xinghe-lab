import {
  cancelAttackTask,
  getAttackTaskStatus,
  runFGSMAttack,
  searchImageNetClasses,
  submitFGSMAttack,
  pauseAttackTask,
  resumeAttackTask,
} from '../../../../api/attacks/fgsm';
import { useAttackRunner } from '../../shared/useAttackRunner';

const useFGSMAttack = () => useAttackRunner({
  attackName: 'FGSM',
  algorithmKey: 'fgsm',
  runSync: runFGSMAttack,
  submitAsync: submitFGSMAttack,
  getTaskStatus: getAttackTaskStatus,
  cancelTask: cancelAttackTask,
  pauseTask: pauseAttackTask,
  resumeTask: resumeAttackTask,
  searchClassesApi: searchImageNetClasses,
  historyStorageKey: 'fgsm_attack_history',
});

export default useFGSMAttack;
