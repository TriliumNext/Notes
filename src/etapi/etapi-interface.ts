export type ValidatorFunc = (obj: unknown) => (string | undefined);

export type ValidatorMap = Record<string, ValidatorFunc[]>;