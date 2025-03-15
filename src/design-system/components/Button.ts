import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export const buttonStyles = {
    base: `
        display: inline-flex;
        align-items: center;
        gap: ${spacing.xs};
        padding: ${spacing.sm} ${spacing.md};
        border-radius: ${spacing.borderRadius};
        font-size: ${typography.sizeBase};
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
    `,
    
    primary: `
        background-color: ${colors.primary};
        color: ${colors.badgeText};
        
        &:hover {
            background-color: ${colors.primaryDark};
        }
    `,
    
    secondary: `
        background-color: ${colors.backgroundLight};
        color: ${colors.text};
        border-color: ${colors.border};
        
        &:hover {
            background-color: ${colors.backgroundHover};
        }
    `,
    
    warning: `
        background-color: ${colors.error};
        color: ${colors.badgeText};
        
        &:hover {
            opacity: 0.9;
        }
    `,
    
    disabled: `
        opacity: 0.5;
        cursor: not-allowed;
    `
}; 