/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ErrorLevelDTO } from './ErrorLevelDTO';
export type ValidateRowDTO = {
    rawValues: Record<string, any>;
    parsedValues: Record<string, any>;
    additionalValues: Record<string, any>;
    localizedValues: Record<string, any>;
    errors: Array<ErrorLevelDTO>;
    isValid: boolean;
    line: number;
};

