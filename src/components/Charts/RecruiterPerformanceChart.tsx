import React, { useEffect, useRef } from 'react';

interface RecruiterPerformance {
    recruiterName: string;
    recruiterEmail: string;
    metric1: number;
    metric2: number;
}

interface RecruiterPerformanceChartProps {
    data?: RecruiterPerformance[];
}

/**
 * Recruiter Performance Chart Component
 * Displays grouped bar chart for recruiter metrics using Canvas
 * Matches the mockup design with paired bars
 */
const RecruiterPerformanceChart: React.FC<RecruiterPerformanceChartProps> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Default mock data matching mockup
    const mockData: RecruiterPerformance[] = [
        {
            recruiterName: 'Kokila Uma',
            recruiterEmail: 'kokila.umasankar@accionlabs.com',
            metric1: 3.0,
            metric2: 4.0,
        },
        {
            recruiterName: 'Sandhiya G',
            recruiterEmail: 'sandhiya.g@accionlabs.com',
            metric1: 1.0,
            metric2: 1.2,
        },
    ];

    const chartData = data || mockData;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size with device pixel ratio
        const rect = canvas.parentElement?.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = (rect?.width || 900) * dpr;
        canvas.height = 320 * dpr;
        ctx.scale(dpr, dpr);

        const width = canvas.width / dpr;
        const height = 320;
        const padding = { top: 30, right: 60, bottom: 100, left: 60 };
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
        const allValues = chartData.flatMap(d => [d.metric1, d.metric2]);
        const maxValue = Math.ceil(Math.max(...allValues) * 1.15);

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
            ctx.fillText(value.toFixed(1), padding.left - 15, y);
        }

        // Draw bars with proper spacing
        const groupSpacing = chartWidth / chartData.length;
        const barWidth = groupSpacing * 0.35;
        const barGap = barWidth * 0.2;

        const color1 = '#4F46E5';  // Deep indigo
        const color2 = '#93C5FD';  // Light blue

        chartData.forEach((recruiter, groupIndex) => {
            const groupX = padding.left + groupSpacing * groupIndex + groupSpacing * 0.25;

            // First bar (metric1)
            const bar1X = groupX - barWidth - barGap / 2;
            const bar1Height = (recruiter.metric1 / maxValue) * chartHeight;
            const bar1Y = height - padding.bottom - bar1Height;

            ctx.fillStyle = color1;
            ctx.fillRect(bar1X, bar1Y, barWidth, bar1Height);

            // Value label on first bar
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(recruiter.metric1.toFixed(1), bar1X + barWidth / 2, bar1Y + 15);

            // Second bar (metric2)
            const bar2X = groupX + barGap / 2;
            const bar2Height = (recruiter.metric2 / maxValue) * chartHeight;
            const bar2Y = height - padding.bottom - bar2Height;

            ctx.fillStyle = color2;
            ctx.fillRect(bar2X, bar2Y, barWidth, bar2Height);

            // Value label on second bar
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(recruiter.metric2.toFixed(1), bar2X + barWidth / 2, bar2Y + 15);
        });

        // Draw X-axis labels (recruiter emails)
        ctx.fillStyle = '#333333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        chartData.forEach((recruiter, index) => {
            const groupX = padding.left + groupSpacing * index + groupSpacing * 0.25;
            ctx.save();
            ctx.translate(groupX, height - padding.bottom + 15);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(recruiter.recruiterEmail, 0, 0);
            ctx.restore();
        });

        // Draw legend
        const legendItems = [
            { label: 'Metric 1', color: color1 },
            { label: 'Metric 2', color: color2 },
        ];

        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        legendItems.forEach((item, index) => {
            const legendX = padding.left + 20;
            const legendY = padding.top + 15 + index * 18;

            // Draw color box
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX, legendY - 6, 14, 14);

            // Draw label
            ctx.fillStyle = '#333333';
            ctx.font = '11px Arial';
            ctx.fillText(item.label, legendX + 22, legendY);
        });
    }, [chartData]);

    return (
        <div style={{ width: '100%', height: '320px' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

export default RecruiterPerformanceChart;
