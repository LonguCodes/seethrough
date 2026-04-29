import Joi from "joi";

export interface AppConfig {
    database: {
        host: string;
        port?: number;
        database: string;
        username?: string;
        password?: string;
    },
    redis: {
        host: string;
        port: number;
    },
    jwtSecret: string;
    logLevel: string;
}
export const ConfigSchema = Joi.object({
    DATABASE__HOST: Joi.string().required(),
    DATABASE__PORT: Joi.number().default(5432),
    DATABASE__DATABASE: Joi.string().default('template'),
    DATABASE__USERNAME: Joi.string().optional(),
    DATABASE__PASSWORD: Joi.string().optional(),
    REDIS__HOST: Joi.string().default('localhost'),
    REDIS__PORT: Joi.number().default(6379),
    JWT_SECRET: Joi.string().required(),
    LOG_LEVEL: Joi.string().default('log'),
})