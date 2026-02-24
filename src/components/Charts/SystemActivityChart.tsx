import React, { useEffect, useRef } from 'react';

interface ActivityDataPoint {
    date: string;
    value1: number;
    value2: number;
    value3: number;
}

interface SystemActivityChartProps {
    data?: ActivityDataPoint[];
}

/**
 * System-Wide Activity Chart Component
 * Displays multiple activity lines over time using Canvas
 * Matches the mockup design with line chart visualization
 */
const SystemActivityChart: React.FC<SystemActivityChartProps> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Default mock data matching mockup
    const mockData: ActivityDataPoint[] = [
        { date: '2026-02-21', value1: 3.0, value2: 2.2, value3: 1.2 },
        { date: '2026-02-22', value1: 2.25, value2: 2.2, value3: 2.0 },
    ];

    const chartData = data || mockData;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size with device pixel ratio for clarity
        const rect = canvas.parentElement?.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = (rect?.width || 900) * dpr;
        canvas.height = 320 * dpr;
        ctx.scale(dpr, dpr);

        const width = canvas.width / dpr;
        const height = 320;
        const padding = { top: 30, right: 60, bottom: 50, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Get max value
        const allValues = chartData.flatMap(d => [d.value1, d.value2, d.value3]);
        const maxValue = Math.ceil(Math.max(...allValues) * 1.1);

        // Draw axes
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Draw Y-axis labels
        ctx.fillStyle = '#666666';
        ctx.font = '13px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const value = (maxValue / 4) * i;
            const y = height - padding.bottom - (chartHeight / 4) * i;
            ctx.fillText(value.toFixed(2), padding.left - 15, y);
        }

        // Draw X-axis labels
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666666';
        chartData.forEach((point, index) => {
            const x = padding.left + (chartWidth / (chartData.length - 1 || 1)) * index;
            ctx.fillText(point.date, x, height - padding.bottom + 25);
        });

        // Function to draw smooth line
        const drawSmoothLine = (key: 'value1' | 'value2' | 'value3', color: string, lineWidth: number = 2.5) => {
            const points = chartData.map((point, index) => {
                const x = padding.left + (chartWidth / (chartData.length - 1 || 1)) * index;
                const y = height - padding.bottom - (point[key] / maxValue) * chartHeight;
                return { x, y };
            });

            // Draw line
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();

            points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });

            ctx.stroke();

            // Draw circle points
            ctx.fillStyle = color;
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        // Draw all three lines
        drawSmoothLine('value1', '#1D4ED8', 3);     // Deep blue
        drawSmoothLine('value2', '#FBBF24', 2.5);   // Amber/yellow
        drawSmoothLine('value3', '#10B981', 2.5);   // Green

        // Draw legend
        const legendItems = [
            { label: 'Metric 1', color: '#1D4ED8' },
            { label: 'Metric 2', color: '#FBBF24' },
            { label: 'Metric 3', color: '#10B981' },
        ];

        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        legendItems.forEach((item, index) => {
            const legendX = width - padding.right - 140;
            const legendY = padding.top + 15 + index * 18;

            // Draw color line
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(legendX, legendY);
            ctx.lineTo(legendX + 20, legendY);
            ctx.stroke();

            // Draw label
            ctx.fillStyle = '#333333';
            ctx.font = '11px Arial';
            ctx.fillText(item.label, legendX + 30, legendY);
        });
    }, [chartData]);

    return (
        <div style={{ width: '100%', height: '320px' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

export default SystemActivityChart;
