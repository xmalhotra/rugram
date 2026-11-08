import type { EventQuestion } from './event-registration';

export const questionCatalog: EventQuestion[] = [
  {
    id: 'meal',
    label: 'Meal preference',
    kind: 'choice',
    options: ['Veg', 'Non-veg', 'Jain', 'Vegan'],
    required: true,
  },
  {
    id: 'dietary',
    label: 'Dietary restrictions',
    kind: 'text',
    required: false,
  },
  {
    id: 'company',
    label: 'Company or college',
    kind: 'text',
    required: false,
  },
  {
    id: 'role',
    label: 'Role',
    kind: 'choice',
    options: ['Founder', 'Engineer', 'Designer', 'Product', 'Student', 'Other'],
    required: false,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn profile',
    kind: 'text',
    required: false,
  },
  {
    id: 'tshirt',
    label: 'T-shirt size',
    kind: 'choice',
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    required: false,
  },
  {
    id: 'experience',
    label: 'Experience level',
    kind: 'choice',
    options: ['Beginner', 'Intermediate', 'Advanced'],
    required: false,
  },
  {
    id: 'source',
    label: 'How did you hear about us?',
    kind: 'choice',
    options: ['Friend', 'Instagram', 'X', 'LinkedIn', 'WhatsApp', 'Other'],
    required: false,
  },
];
