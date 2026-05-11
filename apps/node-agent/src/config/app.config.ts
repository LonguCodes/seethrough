import Joi from "joi";

export interface AppConfig {
    apiUrl: string;
    machineId: string;
    jwtSecret: string;
    reportInterval: number;
    logLevel: string;
}

export const ConfigSchema = Joi.object({
    API_URL: Joi.string().required(),
    MACHINE_ID: Joi.string().required(),
    JWT_SECRET: Joi.string().required().default('default-secret-key-for-dev'),
    REPORT_INTERVAL: Joi.number().default(10000),
    LOG_LEVEL: Joi.string().default('log'),
})