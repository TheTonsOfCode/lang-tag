# Tests:

## Unit:

- Consider removing readConfig, and conduct all tests inside e2e (init.test)

## E2E:

- Implement watch mode with config regeneration

# Documentation:

- Verify that tree shaking only utilizes /src/index.ts, then highlight in the README that it's a lightweight package using only that small file with no dependencies in the final build
- Review accuracy of documentation for react-i18n (it was AI-generated and refined based on subjective assessment, but never formally verified)

# Features:

- if lang-tag is only proxy for translations by defining in file, or at component levels
objects which are struct for translations containing default values for that translations
in instance in English, so it would be nice if there will be command which detects
in build lang-tags and replaces whole string values to just empty string `""` if somebody does
not use that default value, so he can run that command on dist or other eg.: Next.js build directory and clean it

- when importing - list all node_modules packages containing lang-tag.exports, then importing them first, and change depth of scanning to 2 folders and 3 organization namespaced folders

- When importing tags via `lang-tag collect -l`, e.g., from an updated package, implement a process to parse local imported tags, then imported ones, then implement a prompting mechanism similar to Drizzle's question system (yes/no) asking whether users want to replace their modified translations with ones updated in the library
- Implement a collision detection system that throws information about path, file A, file B with tag indices when the same translation path is used in multiple locations (can be helpful for incorrectly written onGenerationConfig functions)
- Consider adding an onCollision function that automatically resolves path conflicts
- Regenerating tags/configs with same indices/tabs as set with translations part, or maybe prettier/editor config configuration


Prompting system:
configuration variable: nameVariablesAtImport: true;

At .lang-tag.import-cache.json in format:
"fileName_variableName": "userInputVariableName"
Then always at update use "userInputVariableName"

System/Function to decide output file(json collectFile), so instead of /locale/en/[namespace].json we can redirect collecting all translations to something like: /locale/en.json 