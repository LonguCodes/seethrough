import Joi from "joi";

export interface AppConfig {
    database: {
        host: string;
        port?: number;
        database: string;
        username?: string;
        password?: string;
    },
    storageMode: string;
    valkey: {
        host: string;
        port: number;
    },
    jwtSecret: string;
}
export const ConfigSchema = Joi.object({
    DATABASE__HOST: Joi.string().required(),
    DATABASE__PORT: Joi.number().default(5432),
    DATABASE__DATABASE: Joi.string().default('template'),
    DATABASE__USERNAME: Joi.string().optional(),
    DATABASE__PASSWORD: Joi.string().optional(),
    STORAGE_MODE: Joi.string().default('postgres'),
    VALKEY__HOST: Joi.string().default('localhost'),
    VALKEY__PORT: Joi.number().default(6379),
    JWT_SECRET: Joi.string().required(),
})