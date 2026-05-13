"""
Property-Based Tests for backend task scheduling and sensitivity analysis.

P3: evaluate_complexity 对任意合法输入返回有效优先级，FGSM 始终为 HIGH，C&W/DeepFool 始终为 LOW
    Validates: Requirements 11

P4: apply_param_limits 对已限制参数再次调用结果不变（幂等性）
    Validates: Requirements 12

P5: get_queue_status 返回的所有数值 ≥ 0
    Validates: Requirements 13

P6: submit_scan 提交的任务数等于 steps，且 1 ≤ steps ≤ 20
    Validates: Requirements 9
"""

import sys
import os
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# Make the backend app importable without a running database/redis
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# All supported algorithm names
ALL_ALGORITHMS = ["fgsm", "ifgsm", "pgd", "cw", "deepfool"]
FGSM_ALGORITHMS = ["fgsm"]
LOW_ALGORITHMS = ["cw", "deepfool"]
DEFAULT_ALGORITHMS = ["ifgsm", "pgd"]

algorithm_st = st.sampled_from(ALL_ALGORITHMS)
fgsm_st = st.just("fgsm")
low_algo_st = st.sampled_from(LOW_ALGORITHMS)
default_algo_st = st.sampled_from(DEFAULT_ALGORITHMS)

# Generic params dict (values don't affect priority in current implementation)
params_st = st.fixed_dictionaries({
    "epsilon": st.floats(min_value=0.001, max_value=0.3, allow_nan=False, allow_infinity=False),
    "num_iter": st.integers(min_value=1, max_value=200),
})

# CW params
cw_params_st = st.fixed_dictionaries({
    "c": st.floats(min_value=0.001, max_value=10.0, allow_nan=False, allow_infinity=False),
    "lr": st.floats(min_value=0.0001, max_value=0.1, allow_nan=False, allow_infinity=False),
    "max_iter": st.integers(min_value=10, max_value=1000),
    "binary_search_steps": st.integers(min_value=1, max_value=20),
})

# DeepFool params
deepfool_params_st = st.fixed_dictionaries({
    "overshoot": st.floats(min_value=0.001, max_value=0.1, allow_nan=False, allow_infinity=False),
    "max_iter": st.integers(min_value=10, max_value=200),
    "num_classes": st.integers(min_value=2, max_value=100),
})

# Queue depth and threshold
queue_depth_st = st.integers(min_value=0, max_value=100)
threshold_st = st.integers(min_value=1, max_value=20)

# Steps for sensitivity scan
steps_st = st.integers(min_value=1, max_value=20)

# Param range
param_range_st = st.tuples(
    st.floats(min_value=0.001, max_value=0.1, allow_nan=False, allow_infinity=False),
    st.floats(min_value=0.101, max_value=0.3, allow_nan=False, allow_infinity=False),
)


# ===========================================================================
# P3: evaluate_complexity 属性
# ===========================================================================

class TestEvaluateComplexity:
    """
    P3: evaluate_complexity 对任意合法输入返回有效优先级，
        FGSM 始终为 HIGH，C&W/DeepFool 始终为 LOW。

    Validates: Requirements 11
    """

    @given(algorithm=algorithm_st, params=params_st)
    @settings(max_examples=200)
    def test_returns_valid_priority(self, algorithm, params):
        """对任意合法 (algorithm, params)，返回值必须是 HIGH | DEFAULT | LOW 之一。"""
        from app.core.task_scheduler import evaluate_complexity, TaskPriority

        result = evaluate_complexity(algorithm, params)
        assert result in (TaskPriority.HIGH, TaskPriority.DEFAULT, TaskPriority.LOW), (
            f"evaluate_complexity({algorithm!r}, ...) returned unexpected value: {result!r}"
        )

    @given(params=params_st)
    @settings(max_examples=100)
    def test_fgsm_always_high(self, params):
        """FGSM 始终返回 HIGH 优先级。"""
        from app.core.task_scheduler import evaluate_complexity, TaskPriority

        result = evaluate_complexity("fgsm", params)
        assert result == TaskPriority.HIGH, (
            f"FGSM should always be HIGH, got {result!r}"
        )

    @given(algorithm=low_algo_st, params=params_st)
    @settings(max_examples=200)
    def test_cw_deepfool_always_low(self, algorithm, params):
        """C&W 和 DeepFool 始终返回 LOW 优先级。"""
        from app.core.task_scheduler import evaluate_complexity, TaskPriority

        result = evaluate_complexity(algorithm, params)
        assert result == TaskPriority.LOW, (
            f"{algorithm!r} should always be LOW, got {result!r}"
        )

    @given(algorithm=default_algo_st, params=params_st)
    @settings(max_examples=200)
    def test_ifgsm_pgd_always_default(self, algorithm, params):
        """I-FGSM 和 PGD 始终返回 DEFAULT 优先级。"""
        from app.core.task_scheduler import evaluate_complexity, TaskPriority

        result = evaluate_complexity(algorithm, params)
        assert result == TaskPriority.DEFAULT, (
            f"{algorithm!r} should always be DEFAULT, got {result!r}"
        )

    @given(algorithm=algorithm_st, params=params_st)
    @settings(max_examples=200)
    def test_case_insensitive(self, algorithm, params):
        """算法名称大小写不影响结果。"""
        from app.core.task_scheduler import evaluate_complexity

        result_lower = evaluate_complexity(algorithm.lower(), params)
        result_upper = evaluate_complexity(algorithm.upper(), params)
        assert result_lower == result_upper, (
            f"Case sensitivity issue: lower={result_lower!r}, upper={result_upper!r}"
        )


# ===========================================================================
# P4: apply_param_limits 幂等性
# ===========================================================================

class TestApplyParamLimitsIdempotency:
    """
    P4: apply_param_limits 对已限制参数再次调用结果不变（幂等性）。

    Validates: Requirements 12
    """

    @given(
        params=cw_params_st,
        queue_depth=st.integers(min_value=6, max_value=100),
        threshold=st.integers(min_value=1, max_value=5),
    )
    @settings(max_examples=300)
    def test_cw_idempotent(self, params, queue_depth, threshold):
        """对 C&W 参数，apply_param_limits 调用两次结果相同（幂等）。"""
        from app.core.task_scheduler import apply_param_limits

        # First application
        limited1, _, _ = apply_param_limits("cw", params, queue_depth, threshold)
        # Second application on already-limited params
        limited2, _, _ = apply_param_limits("cw", limited1, queue_depth, threshold)

        assert limited1 == limited2, (
            f"apply_param_limits is not idempotent for CW: "
            f"first={limited1!r}, second={limited2!r}"
        )

    @given(
        params=deepfool_params_st,
        queue_depth=st.integers(min_value=6, max_value=100),
        threshold=st.integers(min_value=1, max_value=5),
    )
    @settings(max_examples=300)
    def test_deepfool_idempotent(self, params, queue_depth, threshold):
        """对 DeepFool 参数，apply_param_limits 调用两次结果相同（幂等）。"""
        from app.core.task_scheduler import apply_param_limits

        limited1, _, _ = apply_param_limits("deepfool", params, queue_depth, threshold)
        limited2, _, _ = apply_param_limits("deepfool", limited1, queue_depth, threshold)

        assert limited1 == limited2, (
            f"apply_param_limits is not idempotent for DeepFool: "
            f"first={limited1!r}, second={limited2!r}"
        )

    @given(
        algorithm=algorithm_st,
        params=params_st,
        queue_depth=queue_depth_st,
        threshold=threshold_st,
    )
    @settings(max_examples=300)
    def test_all_algorithms_idempotent(self, algorithm, params, queue_depth, threshold):
        """对任意算法，apply_param_limits 调用两次结果相同（幂等）。"""
        from app.core.task_scheduler import apply_param_limits

        limited1, _, _ = apply_param_limits(algorithm, params, queue_depth, threshold)
        limited2, _, _ = apply_param_limits(algorithm, limited1, queue_depth, threshold)

        assert limited1 == limited2, (
            f"apply_param_limits is not idempotent for {algorithm!r}: "
            f"first={limited1!r}, second={limited2!r}"
        )

    @given(
        params=cw_params_st,
        queue_depth=queue_depth_st,
        threshold=threshold_st,
    )
    @settings(max_examples=200)
    def test_no_limit_when_below_threshold(self, params, queue_depth, threshold):
        """当 queue_depth <= threshold 时，参数不被修改，param_limited 为 False。"""
        from app.core.task_scheduler import apply_param_limits

        assume(queue_depth <= threshold)

        limited, param_limited, reason = apply_param_limits("cw", params, queue_depth, threshold)

        assert param_limited is False
        assert reason == ""
        assert limited == params


# ===========================================================================
# P5: get_queue_status 非负性
# ===========================================================================

class TestGetQueueStatusNonNegative:
    """
    P5: get_queue_status 返回的所有数值 ≥ 0。

    Validates: Requirements 13
    """

    @given(
        high_depth=st.integers(min_value=0, max_value=50),
        default_depth=st.integers(min_value=0, max_value=50),
        low_depth=st.integers(min_value=0, max_value=50),
        high_avg=st.floats(min_value=0.0, max_value=600.0, allow_nan=False, allow_infinity=False),
        default_avg=st.floats(min_value=0.0, max_value=600.0, allow_nan=False, allow_infinity=False),
        low_avg=st.floats(min_value=0.0, max_value=600.0, allow_nan=False, allow_infinity=False),
    )
    @settings(max_examples=300)
    def test_all_values_non_negative(
        self,
        high_depth,
        default_depth,
        low_depth,
        high_avg,
        default_avg,
        low_avg,
    ):
        """
        get_queue_status 返回的所有 pending 和 estimated_wait_seconds 值必须 ≥ 0。

        We mock Redis and DB calls to inject controlled queue depths and avg times.
        """
        from app.core.queue_monitor import get_queue_status

        depth_map = {"high": high_depth, "default": default_depth, "low": low_depth}
        avg_map = {"high": high_avg, "default": default_avg, "low": low_avg}

        mock_db = MagicMock()

        with patch("app.core.queue_monitor.get_queue_depth", side_effect=lambda q: depth_map[q]), \
             patch("app.core.queue_monitor.get_avg_execution_time", side_effect=lambda q, db: avg_map[q]):
            status = get_queue_status(mock_db)

        for queue_name in ("high", "default", "low"):
            assert queue_name in status, f"Queue '{queue_name}' missing from status"
            q = status[queue_name]
            assert q["pending"] >= 0, (
                f"pending for '{queue_name}' is negative: {q['pending']}"
            )
            assert q["estimated_wait_seconds"] >= 0, (
                f"estimated_wait_seconds for '{queue_name}' is negative: {q['estimated_wait_seconds']}"
            )

    def test_default_values_non_negative(self):
        """
        当 Redis 和 DB 均不可用时（返回默认值），get_queue_status 仍返回非负值。
        """
        from app.core.queue_monitor import get_queue_status, DEFAULT_AVG_TIMES

        mock_db = MagicMock()

        # Simulate Redis failure (returns 0) and DB failure (returns default avg times)
        with patch("app.core.queue_monitor.get_queue_depth", return_value=0), \
             patch("app.core.queue_monitor.get_avg_execution_time",
                   side_effect=lambda q, db: DEFAULT_AVG_TIMES.get(q, 120.0)):
            status = get_queue_status(mock_db)

        for queue_name in ("high", "default", "low"):
            q = status[queue_name]
            assert q["pending"] >= 0
            assert q["estimated_wait_seconds"] >= 0

    @given(
        depths=st.lists(
            st.integers(min_value=0, max_value=100),
            min_size=3,
            max_size=3,
        )
    )
    @settings(max_examples=200)
    def test_estimated_wait_equals_depth_times_avg(self, depths):
        """estimated_wait_seconds = pending × avg_time（数学关系验证）。"""
        from app.core.queue_monitor import get_queue_status, DEFAULT_AVG_TIMES

        queue_names = ["high", "default", "low"]
        depth_map = dict(zip(queue_names, depths))
        mock_db = MagicMock()

        with patch("app.core.queue_monitor.get_queue_depth", side_effect=lambda q: depth_map[q]), \
             patch("app.core.queue_monitor.get_avg_execution_time",
                   side_effect=lambda q, db: DEFAULT_AVG_TIMES[q]):
            status = get_queue_status(mock_db)

        for q_name in queue_names:
            expected_wait = depth_map[q_name] * DEFAULT_AVG_TIMES[q_name]
            actual_wait = status[q_name]["estimated_wait_seconds"]
            assert abs(actual_wait - expected_wait) < 1e-9, (
                f"Queue '{q_name}': expected {expected_wait}, got {actual_wait}"
            )


# ===========================================================================
# P6: submit_scan 步数约束
# ===========================================================================

class TestSubmitScanStepsConstraint:
    """
    P6: submit_scan 提交的任务数等于 steps，且 1 ≤ steps ≤ 20。

    Validates: Requirements 9

    We test this by:
    1. Verifying _validate_inputs raises ValidationError for invalid steps.
    2. Verifying np.linspace produces exactly `steps` values for valid inputs.
    3. Verifying the full submit_scan flow (with mocked Celery/Redis) submits
       exactly `steps` tasks.
    """

    @given(steps=steps_st, param_range=param_range_st)
    @settings(max_examples=300)
    def test_linspace_produces_exactly_steps_values(self, steps, param_range):
        """
        np.linspace(param_min, param_max, steps) 产生恰好 steps 个值。
        这是 submit_scan 内部采样逻辑的核心属性。
        """
        param_min, param_max = param_range
        values = np.linspace(param_min, param_max, steps)
        assert len(values) == steps, (
            f"np.linspace produced {len(values)} values, expected {steps}"
        )

    @given(steps=steps_st)
    @settings(max_examples=200, deadline=None)
    def test_validate_inputs_accepts_valid_steps(self, steps):
        """_validate_inputs 对 1 ≤ steps ≤ 20 的合法步数不抛出异常。"""
        from app.services.sensitivity_service import SensitivityService

        # Should not raise
        SensitivityService._validate_inputs(steps, 0.001, 0.3)

    @given(steps=st.one_of(
        st.integers(max_value=0),
        st.integers(min_value=21),
    ))
    @settings(max_examples=200)
    def test_validate_inputs_rejects_invalid_steps(self, steps):
        """_validate_inputs 对超出 [1, 20] 范围的步数抛出 ValidationError。"""
        from app.services.sensitivity_service import SensitivityService
        from app.core.exceptions import ValidationError

        with pytest.raises(ValidationError):
            SensitivityService._validate_inputs(steps, 0.001, 0.3)

    @given(
        param_min=st.floats(min_value=0.001, max_value=0.5, allow_nan=False, allow_infinity=False),
    )
    @settings(max_examples=200)
    def test_validate_inputs_rejects_invalid_range(self, param_min):
        """_validate_inputs 对 param_min >= param_max 抛出 ValidationError。"""
        from app.services.sensitivity_service import SensitivityService
        from app.core.exceptions import ValidationError

        # param_max == param_min (equal) should fail
        with pytest.raises(ValidationError):
            SensitivityService._validate_inputs(5, param_min, param_min)

        # param_max < param_min should fail
        with pytest.raises(ValidationError):
            SensitivityService._validate_inputs(5, param_min, param_min - 0.001)

    @given(steps=steps_st, param_range=param_range_st)
    @settings(max_examples=100, deadline=None)
    def test_submit_scan_submits_exactly_steps_tasks(self, steps, param_range):
        """
        submit_scan 提交的 AttackTask 数量恰好等于 steps。

        We mock run_attack.apply_async and Redis to avoid live infrastructure.
        """
        from app.services.sensitivity_service import SensitivityService
        from app.core.task_scheduler import TaskPriority

        param_min, param_max = param_range
        submitted_tasks = []

        mock_task = MagicMock()
        mock_task.id = "mock-task-id"

        mock_db = MagicMock()

        with patch("app.workers.attack_task.run_attack") as mock_run_attack, \
             patch("app.core.task_scheduler.evaluate_complexity",
                   return_value=TaskPriority.HIGH), \
             patch("app.core.task_scheduler.get_queue_name", return_value="high"), \
             patch.object(SensitivityService, "_save_scan_to_redis", return_value=None):

            mock_run_attack.apply_async.return_value = mock_task

            service = SensitivityService()
            result = service.submit_scan(
                algorithm="fgsm",
                image_b64="data:image/png;base64,abc",
                model_id="resnet100_imagenet",
                scan_param="epsilon",
                param_min=param_min,
                param_max=param_max,
                steps=steps,
                base_params={"epsilon": 0.03},
                user_id=1,
                db=mock_db,
            )

        assert len(result["task_ids"]) == steps, (
            f"Expected {steps} task IDs, got {len(result['task_ids'])}"
        )
        assert len(result["param_values"]) == steps, (
            f"Expected {steps} param values, got {len(result['param_values'])}"
        )
        assert mock_run_attack.apply_async.call_count == steps, (
            f"Expected {steps} apply_async calls, got {mock_run_attack.apply_async.call_count}"
        )
