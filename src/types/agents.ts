export interface AgentResponse {
    success: boolean;
    content: string;
    error?: string;
}

export interface ComponentSpec {
    name: string;
    description: string;
    props?: Record<string, string>;
    styles?: Record<string, string>;
    dependencies?: string[];
    features?: string[];
}

export interface ServiceSpec {
    name: string;
    description: string;
    methods: Array<{
        name: string;
        params?: Record<string, string>;
        returnType: string;
        description: string;
    }>;
    dependencies?: string[];
} 