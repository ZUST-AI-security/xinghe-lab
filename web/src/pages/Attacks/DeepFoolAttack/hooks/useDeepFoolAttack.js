import {
  cancelAttackTask,
  getAttackTaskStatus,
  runDeepFoolAttack,
  searchImageNetClasses,
  submitDeepFoolAttack,
} from '../../../../api/attacks/deepfool';
import { useAttackRunner } from '../../shared/useAttackRunner';

const useDeepFoolAttack = () => useAttackRunner({
  attackName: 'DeepFool',
  algorithmKey: 'deepfool',
  runSync: runDeepFoolAttack,
  submitAsync: submitDeepFoolAttack,
  getTaskStatus: getAttackTaskStatus,
  cancelTask: cancelAttackTask,
  searchClassesApi: searchImageNetClasses,
  historyStorageKey: 'deepfool_attack_history',
});

export default useDeepFoolAttack;
