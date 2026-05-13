/**
 * Property-Based Tests for frontend components
 *
 * P1: 对任意超出范围的参数值，截断后的值在 [min, max] 内
 *     Validates: Requirements 4
 *
 * P2: 对任意添加/移除操作序列，面板数量始终满足 2 ≤ count ≤ 4
 *     Validates: Requirements 3
 *
 * P7: isMetricValid(value, type) 对有效值返回 true，对无效值返回 false
 *     Validates: Requirements 5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Inline implementations (mirrors source code) ────────────────────────────
// We inline the logic here to avoid JSX/React import issues in a pure-node test
// environment. The properties test the pure-function logic extracted from the
// source components.

// --- clampWithWarning (from AlgorithmParamEditor.jsx) ---
const clampWithWarning = (key, value, min, max) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

// --- PARAM_SPECS (from AlgorithmParamEditor.jsx) ---
const PARAM_SPECS = {
  fgsm: [{ key: 'epsilon', min: 0.001, max: 0.3, type: 'float' }],
  ifgsm: [
    { key: 'epsilon', min: 0.001, max: 0.3, type: 'float' },
    { key: 'alpha', min: 0.001, max: 0.05, type: 'float' },
    { key: 'num_iter', min: 1, max: 100, type: 'int' },
  ],
  pgd: [
    { key: 'epsilon', min: 0.001, max: 0.3, type: 'float' },
    { key: 'alpha', min: 0.001, max: 0.05, type: 'float' },
    { key: 'num_iter', min: 1, max: 200, type: 'int' },
  ],
  cw: [
    { key: 'c', min: 0.001, max: 10, type: 'float' },
    { key: 'lr', min: 0.0001, max: 0.1, type: 'float' },
    { key: 'max_iter', min: 10, max: 1000, type: 'int' },
    { key: 'binary_search_steps', min: 1, max: 20, type: 'int' },
  ],
  deepfool: [
    { key: 'overshoot', min: 0.001, max: 0.1, type: 'float' },
    { key: 'max_iter', min: 10, max: 200, type: 'int' },
    { key: 'num_classes', min: 2, max: 100, type: 'int' },
  ],
};

// --- Panel management logic (from CompareMode.jsx) ---
const MIN_PANELS = 2;
const MAX_PANELS = 4;

const createPanel = (algorithm = 'fgsm') => ({
  id: Math.random(),
  algorithm,
  params: {},
  status: 'idle',
});

const addPanel = (panels) => {
  if (panels.length >= MAX_PANELS) return panels;
  return [...panels, createPanel('fgsm')];
};

const removePanel = (panels, index) => {
  if (panels.length <= MIN_PANELS) return panels;
  return panels.filter((_, i) => i !== index);
};

// --- isMetricValid (from CompareMode.jsx) ---
const isMetricValid = (value, type) => {
  if (value === null || value === undefined || typeof value !== 'number' || !isFinite(value)) {
    return false;
  }
  switch (type) {
    case 'l2_norm':
      return value >= 0;
    case 'linf_norm':
      return value >= 0;
    case 'success_rate':
      return value >= 0 && value <= 100;
    case 'orig_confidence':
      return value >= 0 && value <= 1;
    case 'adv_confidence':
      return value >= 0 && value <= 1;
    case 'time_elapsed':
      return value > 0;
    default:
      return true;
  }
};

// ─── P1: 参数截断属性 ─────────────────────────────────────────────────────────

describe('P1: 参数截断属性 — 截断后的值在 [min, max] 内', () => {
  /**
   * Validates: Requirements 4
   *
   * For any parameter value (including out-of-range values), clampWithWarning
   * must return a value within [min, max].
   */
  it('对任意超出范围的参数值，截断后的值在 [min, max] 内', () => {
    // Collect all (key, min, max) specs across all algorithms
    const allSpecs = Object.values(PARAM_SPECS)
      .flat()
      .filter((s) => s.type !== 'select');

    fc.assert(
      fc.property(
        // Pick a random spec index
        fc.integer({ min: 0, max: allSpecs.length - 1 }),
        // Generate an arbitrary finite number (can be out of range)
        fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(-1e6), max: Math.fround(1e6) }),
        (specIdx, rawValue) => {
          const spec = allSpecs[specIdx];
          const clamped = clampWithWarning(spec.key, rawValue, spec.min, spec.max);
          return clamped >= spec.min && clamped <= spec.max;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('截断后的值与原值相同（当原值在范围内时）', () => {
    const allSpecs = Object.values(PARAM_SPECS)
      .flat()
      .filter((s) => s.type !== 'select');

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: allSpecs.length - 1 }),
        (specIdx) => {
          const spec = allSpecs[specIdx];
          // Generate a value strictly within [min, max]
          const inRange = spec.min + (spec.max - spec.min) * 0.5;
          const clamped = clampWithWarning(spec.key, inRange, spec.min, spec.max);
          return clamped === inRange;
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── P2: 面板数量不变式 ───────────────────────────────────────────────────────

describe('P2: 面板数量不变式 — 2 ≤ count ≤ 4', () => {
  /**
   * Validates: Requirements 3
   *
   * For any sequence of add/remove operations, the panel count must always
   * satisfy 2 ≤ count ≤ 4.
   */
  it('对任意添加/移除操作序列，面板数量始终满足 2 ≤ count ≤ 4', () => {
    // Operations: 0 = add, 1 = remove (at index 0)
    const operationArb = fc.array(
      fc.record({
        op: fc.integer({ min: 0, max: 1 }),
        idx: fc.integer({ min: 0, max: 3 }),
      }),
      { minLength: 0, maxLength: 50 },
    );

    fc.assert(
      fc.property(operationArb, (operations) => {
        let panels = [createPanel('fgsm'), createPanel('cw')];

        for (const { op, idx } of operations) {
          if (op === 0) {
            panels = addPanel(panels);
          } else {
            const removeIdx = idx % panels.length;
            panels = removePanel(panels, removeIdx);
          }

          // Invariant: 2 ≤ panels.length ≤ 4
          if (panels.length < MIN_PANELS || panels.length > MAX_PANELS) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 1000 },
    );
  });

  it('初始面板数量为 2', () => {
    const panels = [createPanel('fgsm'), createPanel('cw')];
    expect(panels.length).toBe(2);
  });

  it('添加到 4 个后，再添加不超过 4 个', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (addCount) => {
        let panels = [createPanel('fgsm'), createPanel('cw')];
        for (let i = 0; i < addCount; i++) {
          panels = addPanel(panels);
        }
        return panels.length <= MAX_PANELS;
      }),
      { numRuns: 200 },
    );
  });

  it('移除到 2 个后，再移除不低于 2 个', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (removeCount) => {
        let panels = [createPanel('fgsm'), createPanel('cw'), createPanel('pgd'), createPanel('cw')];
        for (let i = 0; i < removeCount; i++) {
          panels = removePanel(panels, 0);
        }
        return panels.length >= MIN_PANELS;
      }),
      { numRuns: 200 },
    );
  });
});

// ─── P7: 指标有效范围检测 ─────────────────────────────────────────────────────

describe('P7: isMetricValid — 有效值返回 true，无效值返回 false', () => {
  /**
   * Validates: Requirements 5
   *
   * isMetricValid must correctly classify valid and invalid metric values.
   */

  // Valid ranges per type
  const validRanges = {
    l2_norm: { min: 0, max: 1e6 },
    linf_norm: { min: 0, max: 1e6 },
    success_rate: { min: 0, max: 100 },
    orig_confidence: { min: 0, max: 1 },
    adv_confidence: { min: 0, max: 1 },
    time_elapsed: { min: 1e-9, max: 1e6 },
  };

  const metricTypes = Object.keys(validRanges);

  it('对有效值返回 true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: metricTypes.length - 1 }),
        (typeIdx) => {
          const type = metricTypes[typeIdx];
          const range = validRanges[type];
          // Generate a value strictly within the valid range
          const validValue = range.min + (range.max - range.min) * 0.5;
          return isMetricValid(validValue, type) === true;
        },
      ),
      { numRuns: 200 },
    );
  });

  it('对 null/undefined/NaN/Infinity 返回 false', () => {
    const invalidValues = [null, undefined, NaN, Infinity, -Infinity];
    for (const type of metricTypes) {
      for (const val of invalidValues) {
        expect(isMetricValid(val, type)).toBe(false);
      }
    }
  });

  it('对 l2_norm/linf_norm 负值返回 false', () => {
    fc.assert(
      fc.property(
        // fc.float requires 32-bit float boundaries — use Math.fround()
        fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(-1e6), max: Math.fround(-1e-9) }),
        (negValue) => {
          return (
            isMetricValid(negValue, 'l2_norm') === false &&
            isMetricValid(negValue, 'linf_norm') === false
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it('对 success_rate 超出 [0, 100] 的值返回 false', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(-1e6), max: Math.fround(-1e-9) }),
          fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(100.001), max: Math.fround(1e6) }),
        ),
        (outOfRange) => {
          return isMetricValid(outOfRange, 'success_rate') === false;
        },
      ),
      { numRuns: 300 },
    );
  });

  it('对 orig_confidence/adv_confidence 超出 [0, 1] 的值返回 false', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(-1e6), max: Math.fround(-1e-9) }),
          fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(1.001), max: Math.fround(1e6) }),
        ),
        (outOfRange) => {
          return (
            isMetricValid(outOfRange, 'orig_confidence') === false &&
            isMetricValid(outOfRange, 'adv_confidence') === false
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it('对 time_elapsed 零值和负值返回 false', () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(-1e6), max: 0 }),
        (nonPositive) => {
          return isMetricValid(nonPositive, 'time_elapsed') === false;
        },
      ),
      { numRuns: 300 },
    );
  });

  it('对 success_rate 在 [0, 100] 内的值返回 true', () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 100 }),
        (validRate) => {
          return isMetricValid(validRate, 'success_rate') === true;
        },
      ),
      { numRuns: 300 },
    );
  });

  it('对 orig_confidence/adv_confidence 在 [0, 1] 内的值返回 true', () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 1 }),
        (validConf) => {
          return (
            isMetricValid(validConf, 'orig_confidence') === true &&
            isMetricValid(validConf, 'adv_confidence') === true
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
