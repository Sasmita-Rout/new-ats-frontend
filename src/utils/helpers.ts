export const exportToCSV = (data: Record<string, any>[], filename: string) => {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvHeader = headers.join(',');

    const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) {
            return '';
        }
        const stringValue = String(value);
        if (/[",\n\r]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };
    
    const csvRows = data.map(row => 
        headers.map(header => escapeCSV(row[header])).join(',')
    );

    const csvString = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const tagColorClasses = [
    { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200', shadow: 'rgba(125, 211, 252, 0.4)' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', shadow: 'rgba(110, 231, 183, 0.4)' },
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', shadow: 'rgba(252, 211, 77, 0.4)' },
    { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', shadow: 'rgba(196, 181, 253, 0.4)' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', shadow: 'rgba(249, 168, 212, 0.4)' },
    { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', shadow: 'rgba(254, 178, 178, 0.4)' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', shadow: 'rgba(165, 180, 252, 0.4)' },
];

export const getTagColor = (tag: string) => {
    // Simple hash function to get a consistent color for a given tag string
    const hashCode = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hashCode % tagColorClasses.length;
    return tagColorClasses[index];
};

export const getInitials = (name: string = '') => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export const getLinkIcon = (url: string = '') => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('linkedin.com')) return 'group';
    if (lowerUrl.includes('github.com')) return 'code';
    if (lowerUrl.includes('behance.net')) return 'palette';
    if (lowerUrl.includes('dribbble.com')) return 'sports_basketball';
    return 'link';
};

export const formatTimeAgo = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};