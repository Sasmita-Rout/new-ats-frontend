import React from 'react';
import { getTagColor } from '../../utils/helpers';

interface SkillTagProps {
    tag: string;
    className?: string;
}

const SkillTag = React.memo(({ tag, className = '' }: SkillTagProps) => {
    const color = getTagColor(tag);
    const style = { '--tag-shadow-color': color.shadow } as React.CSSProperties;
    return (
        <span style={style} className={`skill-tag ${color.bg} ${color.text} ${color.border} ${className}`}>
            {tag}
        </span>
    );
});

SkillTag.displayName = 'SkillTag';

export default SkillTag;