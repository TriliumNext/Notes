declare module 'attribute_parser';


export function lex(str: string): any[]
export function parse(tokens: any[], str?: string, allowEmptyRelations?: boolean): any[]
export function lexAndParse(str: string, allowEmptyRelations?: boolean): any[]

