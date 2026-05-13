/**
 * ExportButtons — 对比结果导出功能组件
 *
 * 提供「导出图片」和「导出 PDF 报告」两个按钮。
 * 按钮仅在至少一个面板完成时可用。
 *
 * 关联需求：Requirement 6
 */

import React, { useState } from 'react';
import { Button, Space, message } from 'antd';
import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * 将 base64 图像字符串转换为 HTMLImageElement（用于 jsPDF addImage）
 * @param {string} src - base64 或 URL 字符串
 * @returns {Promise<HTMLImageElement>}
 */
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * 将图像绘制到 canvas 并返回 dataURL
 * @param {string} src
 * @param {number} maxWidth
 * @returns {Promise<string>} dataURL
 */
const imageToDataURL = async (src, maxWidth = 400) => {
  try {
    const img = await loadImage(src);
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

/**
 * ExportButtons 组件
 *
 * @param {object} props
 * @param {React.RefObject} props.exportRef - 指向要截图的 DOM 节点的 ref
 * @param {Array} props.completedPanels - 已完成的面板数组
 * @param {object} props.algorithmConfig - 算法配置映射（{ key: { label } }）
 */
const ExportButtons = ({ exportRef, completedPanels = [], algorithmConfig = {} }) => {
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const hasCompleted = completedPanels.length > 0;

  // ── 导出图片 ──────────────────────────────────────────────────────────────

  const handleExportPng = async () => {
    if (!exportRef?.current) {
      message.error('找不到结果区域，无法导出');
      return;
    }
    setExportingPng(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
      });
      const timestamp = Date.now();
      const filename = `compare_result_${timestamp}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success(`图片已导出：${filename}`);
    } catch (err) {
      console.error('导出图片失败', err);
      message.error('导出图片失败，请重试');
    } finally {
      setExportingPng(false);
    }
  };

  // ── 导出 PDF ──────────────────────────────────────────────────────────────

  const handleExportPdf = async () => {
    if (completedPanels.length === 0) {
      message.warning('暂无已完成的面板，无法导出 PDF');
      return;
    }
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // ── 封面信息 ──────────────────────────────────────────────────────────

      // 平台名称
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('XingHe AI Security Platform', margin, y);
      y += 8;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Xinghe Zhian AI Attack Visualization Platform', margin, y);
      y += 6;

      // 导出时间
      const exportTime = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Export Time: ${exportTime}`, margin, y);
      y += 4;

      // 分隔线
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;

      pdf.setTextColor(0);

      // ── 各面板内容 ────────────────────────────────────────────────────────

      for (let i = 0; i < completedPanels.length; i++) {
        const panel = completedPanels[i];
        const result = panel.result;
        const algoLabel = algorithmConfig[panel.algorithm]?.label || panel.algorithm;

        // 检查是否需要换页
        if (y > pageHeight - 60) {
          pdf.addPage();
          y = margin;
        }

        // 面板标题
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Panel ${i + 1}: ${algoLabel}`, margin, y);
        y += 7;

        // 参数配置
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80);
        const paramsStr = Object.entries(panel.params || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join('  |  ');
        const paramLines = pdf.splitTextToSize(`Params: ${paramsStr}`, contentWidth);
        pdf.text(paramLines, margin, y);
        y += paramLines.length * 4 + 2;
        pdf.setTextColor(0);

        // 指标数据
        if (result) {
          const meta = result.metadata || {};
          const successRateRaw = meta.success_rate;
          const successRate =
            typeof successRateRaw === 'number' ? (successRateRaw * 100).toFixed(1) + '%' : '-';

          const metrics = [
            ['L2 Norm', meta.l2_norm != null ? meta.l2_norm.toFixed(4) : '-'],
            ['Linf Norm', meta.linf_norm != null ? meta.linf_norm.toFixed(4) : '-'],
            ['Success Rate', successRate],
            [
              'Orig Confidence',
              meta.original_top1_confidence != null
                ? meta.original_top1_confidence.toFixed(4)
                : '-',
            ],
            [
              'Adv Confidence',
              meta.adversarial_top1_confidence != null
                ? meta.adversarial_top1_confidence.toFixed(4)
                : '-',
            ],
            ['Time Elapsed', result.time_elapsed != null ? result.time_elapsed.toFixed(2) + ' s' : '-'],
          ];

          pdf.setFontSize(9);
          const colW = contentWidth / 3;
          metrics.forEach(([label, val], idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const mx = margin + col * colW;
            const my = y + row * 5;
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${label}:`, mx, my);
            pdf.setFont('helvetica', 'normal');
            pdf.text(val, mx + colW * 0.5, my);
          });
          y += Math.ceil(metrics.length / 3) * 5 + 4;
        }

        // 图像区域（原始图、对抗图、热力图）
        if (result) {
          const imgSources = [
            { src: result.original_image, label: 'Original' },
            { src: result.adversarial_image, label: 'Adversarial' },
            { src: result.heatmap, label: 'Heatmap' },
          ].filter((item) => item.src);

          if (imgSources.length > 0) {
            // 检查是否需要换页
            if (y > pageHeight - 70) {
              pdf.addPage();
              y = margin;
            }

            const imgWidth = Math.min(contentWidth / imgSources.length - 4, 55);
            const imgHeight = imgWidth; // 正方形显示

            for (let j = 0; j < imgSources.length; j++) {
              const { src, label } = imgSources[j];
              const imgX = margin + j * (imgWidth + 4);

              try {
                const dataURL = await imageToDataURL(src, imgWidth * 4);
                if (dataURL) {
                  pdf.addImage(dataURL, 'PNG', imgX, y, imgWidth, imgHeight);
                  pdf.setFontSize(8);
                  pdf.setTextColor(100);
                  pdf.text(label, imgX + imgWidth / 2, y + imgHeight + 4, { align: 'center' });
                  pdf.setTextColor(0);
                }
              } catch {
                // 图像加载失败时跳过
              }
            }
            y += imgHeight + 10;
          }
        }

        // 面板间分隔线
        if (i < completedPanels.length - 1) {
          if (y > pageHeight - 30) {
            pdf.addPage();
            y = margin;
          } else {
            pdf.setDrawColor(220);
            pdf.line(margin, y, pageWidth - margin, y);
            y += 8;
          }
        }
      }

      // 保存 PDF
      const timestamp = Date.now();
      pdf.save(`compare_report_${timestamp}.pdf`);
      message.success('PDF 报告已导出');
    } catch (err) {
      console.error('导出 PDF 失败', err);
      message.error('导出 PDF 失败，请重试');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Space>
      <Button
        icon={<DownloadOutlined />}
        onClick={handleExportPng}
        loading={exportingPng}
        disabled={!hasCompleted}
      >
        导出图片
      </Button>
      <Button
        icon={<FilePdfOutlined />}
        onClick={handleExportPdf}
        loading={exportingPdf}
        disabled={!hasCompleted}
      >
        导出 PDF 报告
      </Button>
    </Space>
  );
};

export default ExportButtons;
