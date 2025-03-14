import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export const messageStyles = {
    base: `
        margin: ${spacing.sm} 0;
        padding: ${spacing.messagePadding};
        border-radius: ${spacing.borderRadius};
        word-wrap: break-word;
        position: relative;
        font-size: ${typography.sizeBase};
        line-height: ${typography.lineHeightBase};
    `,
    
    user: `
        background-color: ${colors.backgroundLight};
        margin-left: ${spacing.xl};
        border-left: 3px solid ${colors.primary};
    `,
    
    assistant: `
        background-color: ${colors.backgroundInactive};
        margin-right: ${spacing.xl};
        border-left: 3px solid ${colors.secondary};
    `,
    
    error: `
        background-color: ${colors.error};
        color: ${colors.badgeText};
        margin: ${spacing.sm} ${spacing.md};
    `,
    
    system: `
        background-color: ${colors.backgroundInactive};
        color: ${colors.text};
        padding: ${spacing.sm} ${spacing.md};
        margin: ${spacing.xs} 0;
        font-size: ${typography.sizeSm};
    `,
    
    timestamp: `
        position: absolute;
        top: ${spacing.xxs};
        right: ${spacing.sm};
        font-size: ${typography.sizeXs};
        opacity: 0.7;
    `
}; 