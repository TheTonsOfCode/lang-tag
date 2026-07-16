/**
 * Predefined algorithms for the onConfigGeneration hook.
 *
 * The CLI calls that hook during `regenerate-tags`; these helpers turn a
 * per-tag context into namespace/path (and related) configuration.
 */

export {
    pathBasedConfigGenerator,
    type PathBasedConfigGeneratorOptions,
} from './path-based-config-generator';
export {
    configKeeper,
    type ConfigKeeperOptions,
    type ConfigKeeperMode,
} from './config-keeper';
export {
    prependNamespaceToPath,
    type PrependNamespaceToPathOptions,
} from './prepend-namespace-to-path';
