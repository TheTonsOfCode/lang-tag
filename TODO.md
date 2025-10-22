
- Create github pages with Docusaurus
  - Minimalize Readme there as it is chaotic


- Add generic type for key names, or allow satisfies
export type AppModule = 'advanced' | 'gallery';

export const MODULES_TRANSLATIONS = lang(
    {
        advanced: 'Advanced',
        gallery: 'Gallery',
    },
    { path: 'modules', keep: 'path' },
);