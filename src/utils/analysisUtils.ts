import { Experience, JobDescription, JobRequirements } from '../types/types';

/**
 * Calculates the total years of experience from a candidate's work history.
 * It can parse date ranges (e.g., "2018-2022", "Jan 2020 - Present") and explicit durations ("5 years").
 * @param experience An array of experience objects.
 * @returns The total number of years of experience, rounded to one decimal place.
 */
export const calculateTotalExperience = (experience: Experience[]): number => {
    let totalMonths = 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const monthMap = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    experience.forEach(exp => {
        const duration = exp.duration || '';
        const lowerDuration = duration.toLowerCase();

        // Regex for date ranges, e.g., "Jan 2020 - Present", "2018 - 2022", "Mar 2021 - May 2023"
        const rangeRegex = /(?:(\w{3,})\s+)?(\d{4})\s*-\s*(?:(\w{3,})\s+)?(\d{4}|present|current)/i;
        const rangeMatch = duration.match(rangeRegex);

        if (rangeMatch) {
            const [, startMonthStr, startYearStr, endMonthStr, endYearStr] = rangeMatch;
            const startYear = parseInt(startYearStr, 10);
            
            let endYear, endMonth;
            if (['present', 'current'].includes(endYearStr.toLowerCase())) {
                endYear = currentYear;
                endMonth = currentMonth;
            } else {
                endYear = parseInt(endYearStr, 10);
                endMonth = endMonthStr ? monthMap[endMonthStr.slice(0, 3).toLowerCase()] : 11; // Default to end of year if no month
            }
            
            const startMonth = startMonthStr ? monthMap[startMonthStr.slice(0, 3).toLowerCase()] : 0; // Default to start of year

            const yearDiff = endYear - startYear;
            const monthDiff = endMonth - startMonth;

            totalMonths += yearDiff * 12 + monthDiff + 1; // Add 1 to be inclusive
            return; // Move to next experience item
        }

        // Regex for single year, e.g., "2021"
        const singleYearRegex = /^\s*(\d{4})\s*$/;
        if (singleYearRegex.test(duration)) {
            totalMonths += 12; // Assume one full year for a single year entry
            return;
        }

        // Regex for explicit duration, e.g., "5 years 3 months", "2 years"
        const yearsRegex = /(\d+)\s*year/i;
        const monthsRegex = /(\d+)\s*month/i;
        const yearMatch = lowerDuration.match(yearsRegex);
        const monthMatch = lowerDuration.match(monthsRegex);

        if (yearMatch || monthMatch) {
            if (yearMatch && yearMatch[1]) {
                totalMonths += parseInt(yearMatch[1], 10) * 12;
            }
            if (monthMatch && monthMatch[1]) {
                totalMonths += parseInt(monthMatch[1], 10);
            }
        }
    });
    
    if (totalMonths === 0) return 0;
    
    // Round to one decimal place
    return Math.round((totalMonths / 12) * 10) / 10;
};

/**
 * Parses job requirements like minimum experience and required degree from a job description text.
 * This is a pure-code implementation using regular expressions to avoid API calls.
 * @param job The job description object.
 * @returns An object with the parsed requirements.
 */
export const parseJobRequirementsFromText = (job: JobDescription): JobRequirements => {
    const fullText = [
        job.title,
        job.description,
        job.experience,
        (job.qualifications || []).join(' '),
        (job.preferredQualifications || []).join(' '),
        job.education,
    ].join('\n').toLowerCase();

    let minYearsExperience: number | null = null;
    let requiredDegree: string | null = null;

    // --- Parse Minimum Years of Experience ---
    const expPatterns = [
        /(\d+)\s*-\s*\d+\s*years of experience/i, // "3-5 years of experience" -> gets 3
        /(\d+)\+?\s*years? of experience/i, // "5+ years of experience" -> gets 5
        /minimum of (\d+)\s*years/i, // "minimum of 2 years" -> gets 2
        /at least (\d+)\s*years/i, // "at least 2 years" -> gets 2
    ];

    const foundExperiences: number[] = [];
    for (const pattern of expPatterns) {
        const matches = fullText.match(pattern);
        if (matches && matches[1]) {
            foundExperiences.push(parseInt(matches[1], 10));
        }
    }
    
    // Also check the structured 'experience' field
    if (job.experience) {
        const structuredExpMatch = job.experience.match(/(\d+)/);
        if (structuredExpMatch && structuredExpMatch[1]) {
            foundExperiences.push(parseInt(structuredExpMatch[1], 10));
        }
    }

    if (foundExperiences.length > 0) {
        minYearsExperience = Math.min(...foundExperiences);
    }

    // --- Parse Required Degree ---
    const degreePatterns = [
        { pattern: /phd/i, degree: "PhD" },
        { pattern: /master's|ms degree/i, degree: "Master's Degree" },
        { pattern: /bachelor's|bs degree/i, degree: "Bachelor's Degree" },
        { pattern: /associate's/i, degree: "Associate's Degree" },
    ];
    
    const combinedEducationText = `${fullText} ${job.education || ''}`.toLowerCase();

    for (const { pattern, degree } of degreePatterns) {
        if (pattern.test(combinedEducationText)) {
            requiredDegree = degree;
            break; 
        }
    }

    return { minYearsExperience, requiredDegree };
};