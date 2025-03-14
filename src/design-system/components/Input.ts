import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export const inputStyles = {
    base: `
        padding: ${spacing.inputPadding};
        background-color: ${colors.background};
        color: ${colors.text};
        border: 1px solid ${colors.border};
        border-radius: ${spacing.borderRadius};
        font-size: ${typography.sizeBase};
        font-family: ${typography.fontFamily};
        
        &:focus {
            outline: none;
            border-color: ${colors.borderFocus};
        }
        
        &::placeholder {
            color: ${colors.textPlaceholder};
        }
    `,
    
    textarea: `
        resize: vertical;
        min-height: 20px;
        max-height: 100px;
    `,
    
    disabled: `
        opacity: 0.7;
        cursor: not-allowed;
    `
}; 