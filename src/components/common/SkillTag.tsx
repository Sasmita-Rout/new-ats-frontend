import React from 'react';
import { getTagColor } from '../../utils/helpers';

interface SkillTagProps {
    tag: string;
    className?: string;
    highlightTerms?: string[];
}

const SkillTag = React.memo(({ tag, className = '', highlightTerms }: SkillTagProps) => {
    const color = getTagColor(tag);
    const style = { '--tag-shadow-color': color.shadow } as React.CSSProperties;

    const renderContent = () => {
        if (!highlightTerms || highlightTerms.length === 0) return tag;
        const cleanTerms = highlightTerms
            .flatMap(t => t.split(','))
            .map(t => t.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
            .filter(t => t.length > 0);
            
        if (cleanTerms.length === 0) return tag;
        const regex = new RegExp(`(${cleanTerms.join('|')})`, 'gi');
        const parts = tag.split(regex);
        return (
            <>
                {parts.map((part, i) => 
                    regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
                )}
            </>
        );
    };

    return (
        <span style={style} className={`skill-tag ${color.bg} ${color.text} ${color.border} ${className}`}>
            {renderContent()}
        </span>
    );
});

SkillTag.displayName = 'SkillTag';

export default SkillTag;