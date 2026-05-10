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
    defaultAdmin: {
        username: string;
        password: string;
    }
}
export const ConfigSchema = Joi.object({
    DATABASE__HOST: Joi.string().required(),
    DATABASE__PORT: Joi.number().default(5432),
    DATABASE__DATABASE: Joi.string().default('template'),
    DATABASE__USERNAME: Joi.string().optional(),
    DATABASE__PASSWORD: Joi.string().optional(),
    REDIS__HOST: Joi.string().default('localhost'),
    REDIS__PORT: Joi.number().default(6379),
    JWT_SECRET: Joi.string().default('development-secret-key-change-me'),
    LOG_LEVEL: Joi.string().default('log'),
    DEFAULT_ADMIN__PASSWORD: Joi.string().default('admin'),
    DEFAULT_ADMIN__USERNAME: Joi.string().default('admin'),
})