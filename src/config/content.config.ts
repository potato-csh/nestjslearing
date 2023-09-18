import { createContentConfig } from '@/modules/content/helper';

// export const content = (): ContentConfig => ({
//     searchType: 'against',
// });

export const content = createContentConfig(() => ({
    searchType: 'against',
}));
