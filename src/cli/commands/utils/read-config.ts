import path, {resolve} from "pathe";
import {CONFIG_FILE_NAME} from "@/cli/constants.ts";
import {existsSync} from "fs";
import {pathToFileURL} from "url";
import {messageErrorReadingConfig} from "@/cli/message.ts";
import {LangTagOnConfigGenerationParams, LangTagConfig} from "@/cli/config.ts";

export const defaultConfig: LangTagConfig = {
    tagName: 'lang',
    includes: ['src/**/*.{js,ts,jsx,tsx}'],
    excludes: ['node_modules', 'dist', 'build'],
    outputDir: 'locales/en',
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: (relativePath: string, fileGenerationData: any)=> {
            const exportIndex = (fileGenerationData.index || 0) + 1;
            fileGenerationData.index = exportIndex;
            return {
                fileName: path.basename(relativePath),
                exportName: `translations${exportIndex}`,
            };
        }
    },
    isLibrary: false,
    language: 'en',
    translationArgPosition: 1,
    onConfigGeneration: (params: LangTagOnConfigGenerationParams) => params.config,
};

export async function readConfig(projectPath: string): Promise<LangTagConfig> {
    const configPath = resolve(projectPath, CONFIG_FILE_NAME);

    if (!existsSync(configPath)) {
        throw new Error(`No "${CONFIG_FILE_NAME}" detected`)
        // return defaultConfig;
    }

    try {
        const configModule = await import(pathToFileURL(configPath).href);
        const userConfig: Partial<LangTagConfig> = configModule.default || {};

        return {
            ...defaultConfig,
            ...userConfig,
            import: {
                ...defaultConfig.import,
                ...userConfig.import,
            }
        };
    } catch (error) {
        messageErrorReadingConfig(error);
        return defaultConfig;
    }
}