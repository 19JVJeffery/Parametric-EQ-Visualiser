import React, { useState, useRef, useEffect } from 'react';
import { Download, Plus, Trash2, RotateCcw } from 'lucide-react';

interface Band {
  id: number;
  freq: number;
  gain: number;
  q: number;
  type: string;
}

type ParametricPresetKey = 'flat' | 'vshape' | 'brightbass' | 'warmvocal';
type GraphicBandCountKey = '10band' | '15band' | '31band';
type GraphicCurvePresetKey = 'flat' | 'bassboost' | 'trebleboost' | 'smiley';

const EQGraphGenerator: React.FC = () => {
  const [eqType, setEqType] = useState<'parametric' | 'graphic'>('parametric');
  const [bands, setBands] = useState<Band[]>([
    { id: 1, freq: 100, gain: 3, q: 1.0, type: 'peak' },
    { id: 2, freq: 400, gain: -2, q: 1.4, type: 'peak' },
    { id: 3, freq: 1000, gain: 1, q: 0.7, type: 'peak' },
    { id: 4, freq: 3000, gain: -1, q: 1.0, type: 'peak' },
    { id: 5, freq: 8000, gain: 4, q: 0.7, type: 'peak' },
    { id: 6, freq: 15000, gain: 2, q: 1.2, type: 'peak' },
  ]);

  const parametricPresets: Record<ParametricPresetKey, Band[]> = {
    flat: [
      { id: 1, freq: 100, gain: 0, q: 1.0, type: 'peak' },
      { id: 2, freq: 400, gain: 0, q: 1.4, type: 'peak' },
      { id: 3, freq: 1000, gain: 0, q: 0.7, type: 'peak' },
      { id: 4, freq: 3000, gain: 0, q: 1.0, type: 'peak' },
      { id: 5, freq: 8000, gain: 0, q: 0.7, type: 'peak' },
      { id: 6, freq: 15000, gain: 0, q: 1.2, type: 'peak' },
    ],
    vshape: [
      { id: 1, freq: 60, gain: 4, q: 0.7, type: 'lowshelf' },
      { id: 2, freq: 250, gain: -3, q: 1.0, type: 'peak' },
      { id: 3, freq: 1000, gain: -4, q: 0.9, type: 'peak' },
      { id: 4, freq: 3000, gain: -3, q: 1.0, type: 'peak' },
      { id: 5, freq: 8000, gain: 3, q: 0.7, type: 'highshelf' },
    ],
    brightbass: [
      { id: 1, freq: 80, gain: 5, q: 1.0, type: 'lowshelf' },
      { id: 2, freq: 200, gain: 2, q: 1.2, type: 'peak' },
      { id: 3, freq: 800, gain: -2, q: 1.4, type: 'peak' },
      { id: 4, freq: 3000, gain: 1, q: 1.0, type: 'peak' },
      { id: 5, freq: 10000, gain: 4, q: 0.7, type: 'highshelf' },
    ],
    warmvocal: [
      { id: 1, freq: 100, gain: -2, q: 0.7, type: 'highpass' },
      { id: 2, freq: 250, gain: 2, q: 1.0, type: 'peak' },
      { id: 3, freq: 1000, gain: -1, q: 2.0, type: 'peak' },
      { id: 4, freq: 5000, gain: 3, q: 1.5, type: 'peak' },
      { id: 5, freq: 12000, gain: -1, q: 0.7, type: 'highshelf' },
    ],
  };

  const graphicEQPresets: Record<GraphicBandCountKey, number[]> = {
    '10band': [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
    '15band': [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000],
    '31band': [
      20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250,
      1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
    ],
  };

  const graphicCurvePresets: Record<GraphicCurvePresetKey, (length: number) => number[]> = {
    flat: (length) => Array(length).fill(0),
    bassboost: (length) => {
      const gains: number[] = [];
      for (let i = 0; i < length; i++) {
        const ratio = i / (length - 1);
        gains.push(6 * Math.exp(-ratio * 4));
      }
      return gains;
    },
    trebleboost: (length) => {
      const gains: number[] = [];
      for (let i = 0; i < length; i++) {
        const ratio = i / (length - 1);
        gains.push(6 * (1 - Math.exp(-ratio * 4)));
      }
      return gains;
    },
    smiley: (length) => {
      const gains: number[] = [];
      for (let i = 0; i < length; i++) {
        const ratio = i / (length - 1);
        const parabola = -4 * Math.pow(ratio - 0.5, 2) + 1;
        gains.push(4 - parabola * 8);
      }
      return gains;
    },
  };

  const [graphicBandCount, setGraphicBandCount] = useState<GraphicBandCountKey>('10band');
  const [graphicBands, setGraphicBands] = useState<number[]>(graphicEQPresets['10band']);
  const [graphicGains, setGraphicGains] = useState<number[]>(Array(10).fill(0));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'svg'>('png');

  // Formatting options
  const [showGrid, setShowGrid] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [lineThickness, setLineThickness] = useState(3);
  const [lineColor, setLineColor] = useState('#00ff88');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [gridColor, setGridColor] = useState('#333333');

  const filterTypes = ['peak', 'lowshelf', 'highshelf', 'lowpass', 'highpass'];

  useEffect(() => {
    drawGraph();
  }, [bands, eqType, graphicGains, graphicBands, showGrid, showTitle, lineThickness, lineColor, backgroundColor, gridColor]);

  const handleGraphicBandChange = (newBandCount: GraphicBandCountKey) => {
    setGraphicBandCount(newBandCount);
    const newBands = graphicEQPresets[newBandCount];
    setGraphicBands(newBands);
    setGraphicGains(Array(newBands.length).fill(0));
  };

  const loadParametricPreset = (presetName: ParametricPresetKey) => {
    const preset = parametricPresets[presetName];
    setBands(preset.map((b, idx) => ({ ...b, id: Date.now() + idx })));
  };

  const loadGraphicPreset = (presetName: GraphicCurvePresetKey) => {
    const gains = graphicCurvePresets[presetName](graphicBands.length);
    setGraphicGains(gains);
  };

  const calculateFrequencyResponse = (freq: number): number => {
    let totalGain = 0;

    if (eqType === 'parametric') {
      bands.forEach((band) => {
        const omega = (2 * Math.PI * freq) / 48000;
        const omegaC = (2 * Math.PI * band.freq) / 48000;
        const A = Math.pow(10, band.gain / 40);
        const q = band.q;

        let gain = 0;

        if (band.type === 'peak') {
          const alpha = Math.sin(omegaC) / (2 * q);
          const cos_w0 = Math.cos(omegaC);
          const cos_w = Math.cos(omega);

          const b0 = 1 + alpha * A;
          const b1 = -2 * cos_w0;
          const b2 = 1 - alpha * A;
          const a0 = 1 + alpha / A;
          const a1 = -2 * cos_w0;
          const a2 = 1 - alpha / A;

          const numerator =
            Math.pow(b0 + b1 * cos_w + b2 * Math.cos(2 * omega), 2) +
            Math.pow(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega), 2);
          const denominator =
            Math.pow(a0 + a1 * cos_w + a2 * Math.cos(2 * omega), 2) +
            Math.pow(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega), 2);

          gain = 10 * Math.log10(numerator / denominator);
        } else if (band.type === 'lowshelf') {
          const S = Math.max(0.1, Math.min(q, 1.0));
          const alpha = (Math.sin(omegaC) / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
          const cos_w0 = Math.cos(omegaC);
          const cos_w = Math.cos(omega);
          const sqrt_A = Math.sqrt(A);

          const b0 = A * ((A + 1) - (A - 1) * cos_w0 + 2 * sqrt_A * alpha);
          const b1 = 2 * A * ((A - 1) - (A + 1) * cos_w0);
          const b2 = A * ((A + 1) - (A - 1) * cos_w0 - 2 * sqrt_A * alpha);
          const a0 = (A + 1) + (A - 1) * cos_w0 + 2 * sqrt_A * alpha;
          const a1 = -2 * ((A - 1) + (A + 1) * cos_w0);
          const a2 = (A + 1) + (A - 1) * cos_w0 - 2 * sqrt_A * alpha;

          const numerator =
            Math.pow(b0 + b1 * cos_w + b2 * Math.cos(2 * omega), 2) +
            Math.pow(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega), 2);
          const denominator =
            Math.pow(a0 + a1 * cos_w + a2 * Math.cos(2 * omega), 2) +
            Math.pow(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega), 2);

          if (denominator > 0 && numerator > 0) {
            gain = 10 * Math.log10(numerator / denominator);
          }
        } else if (band.type === 'highshelf') {
          const S = Math.max(0.1, Math.min(q, 1.0));
          const alpha = (Math.sin(omegaC) / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
          const cos_w0 = Math.cos(omegaC);
          const cos_w = Math.cos(omega);
          const sqrt_A = Math.sqrt(A);

          const b0 = A * ((A + 1) + (A - 1) * cos_w0 + 2 * sqrt_A * alpha);
          const b1 = -2 * A * ((A - 1) + (A + 1) * cos_w0);
          const b2 = A * ((A + 1) + (A - 1) * cos_w0 - 2 * sqrt_A * alpha);
          const a0 = (A + 1) - (A - 1) * cos_w0 + 2 * sqrt_A * alpha;
          const a1 = 2 * ((A - 1) - (A + 1) * cos_w0);
          const a2 = (A + 1) - (A - 1) * cos_w0 - 2 * sqrt_A * alpha;

          const numerator =
            Math.pow(b0 + b1 * cos_w + b2 * Math.cos(2 * omega), 2) +
            Math.pow(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega), 2);
          const denominator =
            Math.pow(a0 + a1 * cos_w + a2 * Math.cos(2 * omega), 2) +
            Math.pow(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega), 2);

          if (denominator > 0 && numerator > 0) {
            gain = 10 * Math.log10(numerator / denominator);
          }
        } else if (band.type === 'lowpass') {
          const alpha = Math.sin(omegaC) / (2 * q);
          const cos_w0 = Math.cos(omegaC);
          const cos_w = Math.cos(omega);

          const b0 = (1 - cos_w0) / 2;
          const b1 = 1 - cos_w0;
          const b2 = (1 - cos_w0) / 2;
          const a0 = 1 + alpha;
          const a1 = -2 * cos_w0;
          const a2 = 1 - alpha;

          const numerator =
            Math.pow(b0 + b1 * cos_w + b2 * Math.cos(2 * omega), 2) +
            Math.pow(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega), 2);
          const denominator =
            Math.pow(a0 + a1 * cos_w + a2 * Math.cos(2 * omega), 2) +
            Math.pow(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega), 2);

          gain = 10 * Math.log10(numerator / denominator);
        } else if (band.type === 'highpass') {
          const alpha = Math.sin(omegaC) / (2 * q);
          const cos_w0 = Math.cos(omegaC);
          const cos_w = Math.cos(omega);

          const b0 = (1 + cos_w0) / 2;
          const b1 = -(1 + cos_w0);
          const b2 = (1 + cos_w0) / 2;
          const a0 = 1 + alpha;
          const a1 = -2 * cos_w0;
          const a2 = 1 - alpha;

          const numerator =
            Math.pow(b0 + b1 * cos_w + b2 * Math.cos(2 * omega), 2) +
            Math.pow(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega), 2);
          const denominator =
            Math.pow(a0 + a1 * cos_w + a2 * Math.cos(2 * omega), 2) +
            Math.pow(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega), 2);

          gain = 10 * Math.log10(numerator / denominator);
        }

        totalGain += gain;
      });
    } else {
      graphicBands.forEach((bandFreq, idx) => {
        const gain = graphicGains[idx];
        if (gain === 0) return;

        const q = 4.3;
        const omega = (2 * Math.PI * freq) / 48000;
        const omegaC = (2 * Math.PI * bandFreq) / 48000;
        const A = Math.pow(10, gain / 40);

        const alpha = Math.sin(omegaC) / (2 * q);
        const cos_w0 = Math.cos(omegaC);
        const cos_w = Math.cos(omega);

        const b0 = 1 + alpha * A;
        const b1 = -2 * cos_w0;
        const b2 = 1 - alpha * A;
        const a0 = 1 + alpha / A;
        const a1 = -2 * cos_w0;
        const a2 = 1 - alpha / A;

        const numerator =
          Math.pow(b0 + b1 * cos_w + b2 * Math.cos(2 * omega), 2) +
          Math.pow(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega), 2);
        const denominator =
          Math.pow(a0 + a1 * cos_w + a2 * Math.cos(2 * omega), 2) +
          Math.pow(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega), 2);

        totalGain += 10 * Math.log10(numerator / denominator);
      });
    }

    return totalGain;
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (showGrid) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;

      for (let db = -24; db <= 24; db += 6) {
        const y = padding + graphHeight / 2 - (db / 24) * (graphHeight / 2);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillStyle = '#999';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(db + ' dB', padding - 10, y + 4);
      }

      const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      freqs.forEach((freq) => {
        const x =
          padding +
          ((Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) *
            graphWidth;
        ctx.strokeStyle = gridColor;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();

        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const label = freq >= 1000 ? freq / 1000 + 'k' : freq;
        ctx.fillText(String(label), x, height - padding + 20);
      });
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padding, padding, graphWidth, graphHeight);
    ctx.clip();

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineThickness;
    ctx.beginPath();

    let firstPoint = true;
    for (let i = 0; i <= graphWidth; i++) {
      const logFreq =
        Math.log10(20) + (i / graphWidth) * (Math.log10(20000) - Math.log10(20));
      const freq = Math.pow(10, logFreq);
      const gain = calculateFrequencyResponse(freq);

      const clampedGain = Math.max(-24, Math.min(24, gain));

      const x = padding + i;
      const y = padding + graphHeight / 2 - (clampedGain / 24) * (graphHeight / 2);

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (Hz)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Gain (dB)', 0, 0);
    ctx.restore();

    if (showTitle) {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(
        eqType === 'parametric' ? 'Parametric EQ' : 'Graphic EQ',
        width / 2,
        30
      );
    }
  };

  const addBand = () => {
    const newBand: Band = {
      id: Date.now(),
      freq: 1000,
      gain: 0,
      q: 1.0,
      type: 'peak',
    };
    setBands([...bands, newBand]);
  };

  const removeBand = (id: number) => {
    setBands(bands.filter((b) => b.id !== id));
  };

  const updateBand = (id: number, field: keyof Band, value: string) => {
    setBands(
      bands.map((b) =>
        b.id === id ? { ...b, [field]: field === 'type' ? value : parseFloat(value) || value } : b
      )
    );
  };

  const updateGraphicGain = (idx: number, value: string) => {
    const newGains = [...graphicGains];
    newGains[idx] = parseFloat(value) || 0;
    setGraphicGains(newGains);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (exportFormat === 'svg') {
      const svgContent = generateSVG();
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eq-curve.svg';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eq-curve.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      }, `image/${exportFormat}`);
    }
  };

  const generateSVG = (): string => {
    const width = 1000;
    const height = 600;
    const padding = 60;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
    svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
    svg += `<defs><clipPath id="graphClip"><rect x="${padding}" y="${padding}" width="${graphWidth}" height="${graphHeight}"/></clipPath></defs>`;

    if (showGrid) {
      for (let db = -24; db <= 24; db += 6) {
        const y = padding + graphHeight / 2 - (db / 24) * (graphHeight / 2);
        svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`;
        svg += `<text x="${padding - 10}" y="${y + 4}" fill="#999" font-size="12" text-anchor="end">${db} dB</text>`;
      }

      const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      freqs.forEach((freq) => {
        const x =
          padding +
          ((Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) *
            graphWidth;
        svg += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}" stroke="${gridColor}" stroke-width="1"/>`;
        const label = freq >= 1000 ? freq / 1000 + 'k' : freq;
        svg += `<text x="${x}" y="${height - padding + 20}" fill="#999" font-size="11" text-anchor="middle">${label}</text>`;
      });
    }

    let pathData = '';
    for (let i = 0; i <= graphWidth; i++) {
      const logFreq =
        Math.log10(20) + (i / graphWidth) * (Math.log10(20000) - Math.log10(20));
      const freq = Math.pow(10, logFreq);
      const gain = calculateFrequencyResponse(freq);
      const clampedGain = Math.max(-24, Math.min(24, gain));
      const x = padding + i;
      const y = padding + graphHeight / 2 - (clampedGain / 24) * (graphHeight / 2);
      pathData += (i === 0 ? 'M' : 'L') + x + ',' + y;
    }
    svg += `<path d="${pathData}" stroke="${lineColor}" stroke-width="${lineThickness}" fill="none" clip-path="url(#graphClip)"/>`;

    svg += `<text x="${width / 2}" y="${height - 10}" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Frequency (Hz)</text>`;
    svg += `<text x="15" y="${height / 2}" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" transform="rotate(-90 15 ${height / 2})">Gain (dB)</text>`;

    if (showTitle) {
      svg += `<text x="${width / 2}" y="30" fill="#fff" font-size="18" font-weight="bold" text-anchor="middle">${eqType === 'parametric' ? 'Parametric EQ' : 'Graphic EQ'}</text>`;
    }

    svg += '</svg>';
    return svg;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111', color: '#eee', fontFamily: 'sans-serif', padding: '24px' }}>
      <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#00ff88' }}>
        Parametric EQ Visualiser
      </h1>

      {/* EQ Type Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
        {(['parametric', 'graphic'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setEqType(type)}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              backgroundColor: eqType === type ? '#00ff88' : '#333',
              color: eqType === type ? '#111' : '#eee',
              transition: 'background-color 0.2s',
            }}
          >
            {type === 'parametric' ? 'Parametric EQ' : 'Graphic EQ'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Canvas */}
        <div style={{ flex: '1 1 600px', maxWidth: '900px' }}>
          <canvas
            ref={canvasRef}
            width={880}
            height={500}
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #333', display: 'block' }}
          />

          {/* Export Controls */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpeg' | 'svg')}
              style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#222', color: '#eee', border: '1px solid #444' }}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="svg">SVG</option>
            </select>
            <button
              onClick={exportImage}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                backgroundColor: '#00ff88', color: '#111', fontWeight: 'bold', cursor: 'pointer',
              }}
            >
              <Download size={16} /> Export
            </button>
          </div>

          {/* Formatting Options */}
          <div style={{ marginTop: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '16px', border: '1px solid #333' }}>
            <h3 style={{ margin: '0 0 12px', color: '#00ff88' }}>Display Options</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                Show Grid
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} />
                Show Title
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Line Width:
                <input
                  type="range" min={1} max={8} value={lineThickness}
                  onChange={(e) => setLineThickness(parseInt(e.target.value))}
                  style={{ width: '80px' }}
                />
                {lineThickness}px
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Line Color:
                <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Background:
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Grid Color:
                <input type="color" value={gridColor} onChange={(e) => setGridColor(e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div style={{ flex: '0 0 320px', minWidth: '280px' }}>
          {eqType === 'parametric' ? (
            <div>
              {/* Parametric Presets */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 12px', color: '#00ff88' }}>Presets</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(['flat', 'vshape', 'brightbass', 'warmvocal'] as ParametricPresetKey[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => loadParametricPreset(p)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: '1px solid #555',
                        backgroundColor: '#2a2a2a', color: '#eee', cursor: 'pointer', fontSize: '12px',
                      }}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bands */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '16px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#00ff88' }}>Bands ({bands.length})</h3>
                  <button
                    onClick={addBand}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '6px', border: 'none',
                      backgroundColor: '#00ff88', color: '#111', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
                    }}
                  >
                    <Plus size={14} /> Add Band
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '460px', overflowY: 'auto' }}>
                  {bands.map((band, idx) => (
                    <div key={band.id} style={{ backgroundColor: '#222', borderRadius: '6px', padding: '10px', border: '1px solid #444' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#aaa' }}>Band {idx + 1}</span>
                        <button
                          onClick={() => removeBand(band.id)}
                          style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#aaa' }}>Type</span>
                          <select
                            value={band.type}
                            onChange={(e) => updateBand(band.id, 'type', e.target.value)}
                            style={{ padding: '4px', borderRadius: '4px', backgroundColor: '#333', color: '#eee', border: '1px solid #555' }}
                          >
                            {filterTypes.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#aaa' }}>Freq (Hz)</span>
                          <input
                            type="number" value={band.freq} min={20} max={20000}
                            onChange={(e) => updateBand(band.id, 'freq', e.target.value)}
                            style={{ padding: '4px', borderRadius: '4px', backgroundColor: '#333', color: '#eee', border: '1px solid #555', width: '100%' }}
                          />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#aaa' }}>Gain (dB): {band.gain}</span>
                          <input
                            type="range" min={-24} max={24} step={0.5} value={band.gain}
                            onChange={(e) => updateBand(band.id, 'gain', e.target.value)}
                          />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#aaa' }}>Q: {band.q}</span>
                          <input
                            type="range" min={0.1} max={10} step={0.1} value={band.q}
                            onChange={(e) => updateBand(band.id, 'q', e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Graphic EQ band count */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 12px', color: '#00ff88' }}>Band Configuration</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(['10band', '15band', '31band'] as GraphicBandCountKey[]).map((bc) => (
                    <button
                      key={bc}
                      onClick={() => handleGraphicBandChange(bc)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        backgroundColor: graphicBandCount === bc ? '#00ff88' : '#333',
                        color: graphicBandCount === bc ? '#111' : '#eee',
                        fontWeight: 'bold', fontSize: '12px',
                      }}
                    >
                      {bc.replace('band', ' Band')}
                    </button>
                  ))}
                </div>

                <h3 style={{ margin: '0 0 8px', color: '#00ff88' }}>Curve Presets</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(['flat', 'bassboost', 'trebleboost', 'smiley'] as GraphicCurvePresetKey[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => loadGraphicPreset(p)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: '1px solid #555',
                        backgroundColor: '#2a2a2a', color: '#eee', cursor: 'pointer', fontSize: '12px',
                      }}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setGraphicGains(Array(graphicBands.length).fill(0))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px',
                    padding: '6px 12px', borderRadius: '6px', border: '1px solid #555',
                    backgroundColor: '#2a2a2a', color: '#eee', cursor: 'pointer', fontSize: '12px',
                  }}
                >
                  <RotateCcw size={12} /> Reset All
                </button>
              </div>

              {/* Graphic EQ sliders */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '16px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 12px', color: '#00ff88' }}>Band Gains</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxHeight: '400px', overflowY: 'auto' }}>
                  {graphicBands.map((bandFreq, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '48px' }}>
                      <span style={{ fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
                        {graphicGains[idx] > 0 ? '+' : ''}{graphicGains[idx]?.toFixed(1)}
                      </span>
                      <input
                        type="range" min={-12} max={12} step={0.5}
                        value={graphicGains[idx] || 0}
                        onChange={(e) => updateGraphicGain(idx, e.target.value)}
                        style={{ writingMode: 'vertical-lr', height: '100px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
                        {bandFreq >= 1000 ? bandFreq / 1000 + 'k' : bandFreq}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EQGraphGenerator;
