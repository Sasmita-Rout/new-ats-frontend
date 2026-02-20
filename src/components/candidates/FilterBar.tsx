import React, { useState, useRef, useEffect } from 'react';
import { Candidate } from '../../types/types';

const StatusFilterDropdown = ({ selectedStatuses, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const statuses: Candidate['status'][] = ['Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleStatusToggle = (status: Candidate['status']) => {
        const newSelection = selectedStatuses.includes(status)
            ? selectedStatuses.filter(s => s !== status)
            : [...selectedStatuses, status];
        onStatusChange(newSelection);
    };
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const getButtonText = () => {
        if (selectedStatuses.length === 0) return 'Any Status';
        if (selectedStatuses.length === statuses.length) return 'All Statuses';
        if (selectedStatuses.length === 1) return selectedStatuses[0];
        return `${selectedStatuses.length} Statuses`;
    };

    return (
        <div className="status-filter" ref={dropdownRef}>
            <button className="status-filter-button" onClick={() => setIsOpen(!isOpen)} aria-haspopup="true" aria-expanded={isOpen}>
                <span>{getButtonText()}</span>
                <span className="material-symbols-outlined">arrow_drop_down</span>
            </button>
            {isOpen && (
                <div className="status-filter-dropdown">
                    <div className="dropdown-actions">
                        <button onClick={() => onStatusChange(statuses)}>Select All</button>
                        <button onClick={() => onStatusChange([])}>Clear</button>
                    </div>
                    {statuses.map(status => (
                        <div key={status} className="checkbox-item" onClick={() => handleStatusToggle(status)}>
                             <input type="checkbox" id={`status-${status}`} checked={selectedStatuses.includes(status)} readOnly/>
                            <label htmlFor={`status-${status}`}>{status}</label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FilterBar = ({ filters, onFilterChange, onClear, context = 'main' }) => {
    const handleInputChange = (field: keyof typeof filters, value: any) => {
        onFilterChange(prev => ({ ...prev, [field]: value }));
    };
    const isMainContext = context === 'main';
    const isInlineContext = context === 'inline';

    if (isInlineContext) {
        return (
            <div className={`filter-bar context-${context}`}>
                <div className="filter-group">
                    <label>Name</label>
                    <div className="input-with-icon">
                        <span className="material-symbols-outlined">person</span>
                        <input type="text" value={filters.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="e.g. Jane Doe" />
                    </div>
                </div>
                <div className="filter-group">
                    <label>Skills</label>
                    <div className="input-with-icon">
                        <span className="material-symbols-outlined">code</span>
                        <input type="text" value={filters.skills} onChange={e => handleInputChange('skills', e.target.value)} placeholder="e.g. React, Python" />
                    </div>
                </div>
                <div className="filter-group">
                    <label>Experience (Years)</label>
                    <div className="salary-filter-group">
                        <div className="input-with-icon small">
                           <span className="material-symbols-outlined">work_history</span>
                           <input type="number" value={filters.expMin} onChange={e => handleInputChange('expMin', e.target.value)} placeholder="Min" />
                        </div>
                        <div className="input-with-icon small">
                           <span className="material-symbols-outlined">work_history</span>
                           <input type="number" value={filters.expMax} onChange={e => handleInputChange('expMax', e.target.value)} placeholder="Max" />
                        </div>
                    </div>
                </div>
                <div className="filter-group">
                    <label>Score</label>
                    <div className="input-with-icon">
                        <span className="material-symbols-outlined">percent</span>
                        <select value={filters.score} onChange={e => handleInputChange('score', e.target.value)}>
                            <option value="">Any</option>
                            <option value=">=90">Greater than 90</option>
                            <option value=">=80">Greater than 80</option>
                            <option value=">=70">Greater than 70</option>
                            <option value=">=60">Greater than 60</option>
                            <option value=">=50">Greater than 50</option>
                            <option value=">=40">Greater than 40</option>
                            <option value=">=30">Greater than 30</option>
                            <option value="<=50">Below 50</option>
                            <option value="<=40">Below 40</option>
                            <option value="<=30">Below 30</option>
                        </select>
                    </div>
                </div>
                <button onClick={onClear} className="clear-filters-btn">Clear All Filters</button>
            </div>
        );
    }

    return (
        <div className={`filter-bar context-${context}`}>
            {!isMainContext && (
                <div className="filter-group">
                    <label>Status</label>
                    <StatusFilterDropdown 
                        selectedStatuses={filters.status}
                        onStatusChange={(newStatuses) => handleInputChange('status', newStatuses)}
                    />
                </div>
            )}
            <div className="filter-group">
                <label>Skills</label>
                <div className="input-with-icon">
                    <span className="material-symbols-outlined">code</span>
                    <input type="text" value={filters.skills} onChange={e => handleInputChange('skills', e.target.value)} placeholder="e.g. React, Python" />
                </div>
            </div>
            {isMainContext && (
                <div className="filter-group">
                    <label>Name</label>
                    <div className="input-with-icon">
                        <span className="material-symbols-outlined">person</span>
                        <input type="text" value={filters.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="e.g. Jane Doe" />
                    </div>
                </div>
            )}
            {isMainContext && (
                <div className="filter-group">
                    <label>Email</label>
                    <div className="input-with-icon">
                        <span className="material-symbols-outlined">mail</span>
                        <input type="text" value={filters.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="e.g. jane@company.com" />
                    </div>
                </div>
            )}
            {!isMainContext && (
                <div className="filter-group">
                    <label>Tags</label>
                    <div className="input-with-icon">
                        <span className="material-symbols-outlined">sell</span>
                        <input type="text" value={filters.tags} onChange={e => handleInputChange('tags', e.target.value)} placeholder="e.g. priority, reviewed" />
                    </div>
                </div>
            )}
            <div className="filter-group">
                <label>Experience</label>
                <div className="input-with-icon">
                    <span className="material-symbols-outlined">work_history</span>
                    <input type="text" value={filters.experience} onChange={e => handleInputChange('experience', e.target.value)} placeholder="e.g. Google, Lead" />
                </div>
            </div>
            <div className="filter-group">
                <label>Location</label>
                 <div className="input-with-icon">
                    <span className="material-symbols-outlined">location_on</span>
                    <input type="text" value={filters.location} onChange={e => handleInputChange('location', e.target.value)} placeholder="e.g. New York, NY" />
                </div>
            </div>
            {!isMainContext && (
                <div className="filter-group">
                    <label>Role Category</label>
                     <div className="input-with-icon">
                        <span className="material-symbols-outlined">category</span>
                        <input type="text" value={filters.roleCategory} onChange={e => handleInputChange('roleCategory', e.target.value)} placeholder="e.g. Software Engineer" />
                    </div>
                </div>
            )}
            {!isMainContext && (
                <div className="filter-group">
                    <label>Education</label>
                     <div className="input-with-icon">
                        <span className="material-symbols-outlined">school</span>
                        <input type="text" value={filters.education} onChange={e => handleInputChange('education', e.target.value)} placeholder="e.g. Computer Science" />
                    </div>
                </div>
            )}
            {!isMainContext && (
                <div className="filter-group">
                    <label>Salary Expectation ($)</label>
                    <div className="salary-filter-group">
                        <div className="input-with-icon small">
                           <span className="material-symbols-outlined">attach_money</span>
                           <input type="number" value={filters.salaryMin} onChange={e => handleInputChange('salaryMin', e.target.value)} placeholder="Min" />
                        </div>
                        <div className="input-with-icon small">
                           <span className="material-symbols-outlined">attach_money</span>
                           <input type="number" value={filters.salaryMax} onChange={e => handleInputChange('salaryMax', e.target.value)} placeholder="Max" />
                        </div>
                    </div>
                </div>
            )}
            <button onClick={onClear} className="clear-filters-btn">Clear All Filters</button>
        </div>
    );
};

export default FilterBar;
