// utils/textToQuery.ts
import { DatasetRow } from './db';
import { QueryIntent } from './nlpEngine';

export class TextToQueryConverter {
    private patterns = [
        // Sum patterns
        {
            regex: /(?:sum|total)\s+(?:of\s+)?(\w+)/i,
            type: 'aggregate' as const,
            operation: 'sum' as const,
            extractColumn: (match: RegExpMatchArray) => match[1]
        },
        // Average patterns
        {
            regex: /(?:average|mean|avg)\s+(?:of\s+)?(\w+)/i,
            type: 'aggregate' as const,
            operation: 'average' as const,
            extractColumn: (match: RegExpMatchArray) => match[1]
        },
        // Count patterns
        {
            regex: /(?:count|how many)\s+(?:rows|records)?/i,
            type: 'aggregate' as const,
            operation: 'count' as const
        },
        // Max patterns
        {
            regex: /(?:max|maximum|highest|largest)\s+(?:of\s+)?(\w+)/i,
            type: 'aggregate' as const,
            operation: 'max' as const,
            extractColumn: (match: RegExpMatchArray) => match[1]
        },
        // Min patterns
        {
            regex: /(?:min|minimum|lowest|smallest)\s+(?:of\s+)?(\w+)/i,
            type: 'aggregate' as const,
            operation: 'min' as const,
            extractColumn: (match: RegExpMatchArray) => match[1]
        },
        // Filter patterns
        {
            regex: /(?:show|find|list)\s+(?:rows|records)?\s+(?:where|with)\s+(\w+)\s+(?:is|equals?|=)\s+(['"]?)([^'"\n]+)\2/i,
            type: 'filter' as const,
            operation: 'filter' as const,
            extractColumn: (match: RegExpMatchArray) => match[1],
            extractValue: (match: RegExpMatchArray) => match[3]
        },
        // Greater than
        {
            regex: /(\w+)\s+(?:greater than|>|above|over)\s+([\d.]+)/i,
            type: 'filter' as const,
            operation: 'filter' as const,
            extractColumn: (match: RegExpMatchArray) => match[1],
            extractValue: (match: RegExpMatchArray) => parseFloat(match[2]),
            extractOperator: '>' // Changed from function to string
        },
        // Less than
        {
            regex: /(\w+)\s+(?:less than|<|below|under)\s+([\d.]+)/i,
            type: 'filter' as const,
            operation: 'filter' as const,
            extractColumn: (match: RegExpMatchArray) => match[1],
            extractValue: (match: RegExpMatchArray) => parseFloat(match[2]),
            extractOperator: '<' // Changed from function to string
        },
        // Equal to
        {
            regex: /(\w+)\s+(?:equals?|is|=)\s+(['"]?)([^'"\n]+)\2/i,
            type: 'filter' as const,
            operation: 'filter' as const,
            extractColumn: (match: RegExpMatchArray) => match[1],
            extractValue: (match: RegExpMatchArray) => match[3],
            extractOperator: '='
        },
        // Contains
        {
            regex: /(\w+)\s+(?:contains|has)\s+(['"]?)([^'"\n]+)\2/i,
            type: 'filter' as const,
            operation: 'filter' as const,
            extractColumn: (match: RegExpMatchArray) => match[1],
            extractValue: (match: RegExpMatchArray) => match[3],
            extractOperator: 'contains'
        },
        // Sort patterns
        {
            regex: /(?:sort|order)\s+(?:by\s+)?(\w+)\s+(ascending|descending)?/i,
            type: 'sort' as const,
            operation: 'sort' as const,
            extractColumn: (match: RegExpMatchArray) => match[1],
            extractOrder: (match: RegExpMatchArray) => match[2]?.toLowerCase() === 'descending' ? 'desc' : 'asc'
        },
        // Top N
        {
            regex: /(?:top|first)\s+(\d+)\s+(?:rows\s+)?(?:by\s+)?(\w+)?/i,
            type: 'sort' as const,
            operation: 'top' as const,
            extractLimit: (match: RegExpMatchArray) => parseInt(match[1]),
            extractColumn: (match: RegExpMatchArray) => match[2],
            extractOrder: 'desc' as const
        },
        // Bottom N
        {
            regex: /(?:bottom|last)\s+(\d+)\s+(?:rows\s+)?(?:by\s+)?(\w+)?/i,
            type: 'sort' as const,
            operation: 'bottom' as const,
            extractLimit: (match: RegExpMatchArray) => parseInt(match[1]),
            extractColumn: (match: RegExpMatchArray) => match[2],
            extractOrder: 'asc' as const
        },
        // Contains search
        {
            regex: /(?:find|search)\s+(?:for\s+)?['"]?([^'"\n]+)['"]?\s+(?:in\s+)?(\w+)?/i,
            type: 'search' as const,
            operation: 'find' as const,
            extractValue: (match: RegExpMatchArray) => match[1],
            extractColumn: (match: RegExpMatchArray) => match[2]
        },
        // Simple column-value search
        {
            regex: /(\w+)\s*[:=]\s*(['"]?)([^'"\n]+)\2/i,
            type: 'search' as const,
            operation: 'find' as const,
            extractColumn: (match: RegExpMatchArray) => match[1],
            extractValue: (match: RegExpMatchArray) => match[3]
        }
    ];

    public parseQuery(query: string): QueryIntent {
        const intent: QueryIntent = {
            type: 'search',
            operation: 'find'
        };

        // Try pattern matching
        for (const pattern of this.patterns) {
            const match = query.match(pattern.regex);
            if (match) {
                intent.type = pattern.type;
                intent.operation = pattern.operation;

                // Extract column
                if (pattern.extractColumn) {
                    intent.column = pattern.extractColumn(match);
                }

                // Extract value
                if (pattern.extractValue) {
                    intent.value = pattern.extractValue(match);
                }

                // Extract limit
                if (pattern.extractLimit) {
                    intent.limit = pattern.extractLimit(match);
                }

                // Extract order
                if (pattern.extractOrder) {
                    // Handle both function and string types
                    if (typeof pattern.extractOrder === 'function') {
                        intent.order = pattern.extractOrder(match);
                    } else {
                        intent.order = pattern.extractOrder;
                    }
                }

                // Create conditions if we have column, value, and operator
                if (intent.column && intent.value !== undefined && 'extractOperator' in pattern) {
                    intent.conditions = [{
                        column: intent.column,
                        operator: pattern.extractOperator as string,
                        value: intent.value
                    }];
                }

                return intent;
            }
        }

        // Fallback: if query has a number, treat it as limit
        const numberMatch = query.match(/\d+/);
        if (numberMatch) {
            intent.limit = parseInt(numberMatch[0]);
        }

        // Fallback: use the query as search value
        intent.value = query;
        return intent;
    }
}