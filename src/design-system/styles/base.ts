import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export const baseStyles = `
    body { 
        font-family: ${typography.fontFamily};
        color: ${colors.text};
        background-color: ${colors.background};
        margin: 0;
        display: flex;
        flex-direction: column;
        height: 100vh;
        min-width: 300px;
        overflow: hidden;
    }

    * {
        box-sizing: border-box;
    }

    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: transparent;
    }

    ::-webkit-scrollbar-thumb {
        background: ${colors.border};
        border-radius: ${spacing.borderRadius};
    }

    ::-webkit-scrollbar-thumb:hover {
        background: ${colors.textSecondary};
    }
`; 