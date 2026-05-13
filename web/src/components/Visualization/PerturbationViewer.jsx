/**
 * 星河智安 (XingHe ZhiAn) - 扰动可视化三视图组件
 *
 * 使用 Ant Design Tabs 实现三个视图：
 *   - 热力图（Heatmap）
 *   - 差值放大图（Amplified Difference）
 *   - 频域分析图（Frequency Domain）
 *
 * 切换 Tab 时直接切换图像，不重新请求后端。
 * 所有图像统一 width/height，与原图保持一致。
 *
 * 关联需求：Requirement 8
 */

import React, { useState } from 'react';
import { Tabs, Empty, Typography } from 'antd';
import {
  FireOutlined,
  DiffOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * PerturbationViewer
 *
 * @param {Object}  props
 * @param {string}  [props.heatmap]        - 热力图 base64 或 URL
 * @param {string}  [props.amplifiedDiff]  - 差值放大图 base64 或 URL
 * @param {string}  [props.fftDiff]        - 频域分析图 base64 或 URL
 * @param {number|string} [props.width]    - 图像宽度（默认 '100%'）
 * @param {number|string} [props.height]   - 图像高度（默认 300）
 */
const PerturbationViewer = ({
  heatmap,
  amplifiedDiff,
  fftDiff,
  width = '100%',
  height = 300,
}) => {
  const [activeKey, setActiveKey] = useState('heatmap');

  const imgStyle = {
    width,
    height,
    objectFit: 'contain',
    display: 'block',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fafafa',
  };

  const placeholderStyle = {
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #d9d9d9',
    borderRadius: 8,
    background: '#fafafa',
    color: '#bfbfbf',
  };

  const renderImage = (src, alt, description) => {
    if (!src) {
      return (
        <div style={placeholderStyle}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {description}
              </Text>
            }
          />
        </div>
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        style={imgStyle}
        draggable={false}
      />
    );
  };

  const items = [
    {
      key: 'heatmap',
      label: (
        <span>
          <FireOutlined style={{ marginRight: 4 }} />
          热力图
        </span>
      ),
      children: renderImage(
        heatmap,
        '扰动热力图',
        '暂无热力图，请先运行攻击算法',
      ),
    },
    {
      key: 'amplified',
      label: (
        <span>
          <DiffOutlined style={{ marginRight: 4 }} />
          差值放大图
        </span>
      ),
      children: renderImage(
        amplifiedDiff,
        '差值放大图',
        '暂无差值放大图，请先运行攻击算法',
      ),
    },
    {
      key: 'fft',
      label: (
        <span>
          <RadarChartOutlined style={{ marginRight: 4 }} />
          频域分析图
        </span>
      ),
      children: renderImage(
        fftDiff,
        '频域分析图',
        '暂无频域分析图，请先运行攻击算法',
      ),
    },
  ];

  return (
    <Tabs
      activeKey={activeKey}
      onChange={setActiveKey}
      items={items}
      size="small"
      style={{ width }}
      destroyInactiveTabPane={false}
    />
  );
};

export default PerturbationViewer;
