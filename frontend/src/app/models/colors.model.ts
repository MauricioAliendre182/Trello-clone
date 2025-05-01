export type Colors = "sky" | "yellow" | "green" | "red" | "gray" | "violet" | "success" | "graylight" | "danger";

// Record is a utility type in TypeScript that allows you to create an object type with specific keys and values
export type GetColors = Record<Colors, Record<string, boolean>>;

export const COLORS: GetColors = {
  success: {
    'text-white': true,
    'bg-green-500': true,
    'hover:bg-green-800': true,
    'focus:ring-green-300': true,
  },
  graylight: {
    'text-gray-700': true,
    'bg-gray-200': true,
    'hover:bg-gray-500': true,
    'focus:ring-gray-50': true,
  },
  danger: {
    'text-white': true,
    'bg-red-500': true,
    'hover:bg-red-800': true,
    'focus:ring-red-300': true,
  },
  sky: {
    'bg-sky-700': true,
    'hover:bg-sky-800': true,
    'text-white': true,
  },
  yellow: {
    'bg-yellow-700': true,
    'hover:bg-yellow-800': true,
    'text-white': true,
  },
  green: {
    'bg-green-700': true,
    'hover:bg-green-800': true,
    'text-white': true,
  },
  red: {
    'bg-red-700': true,
    'hover:bg-red-800': true,
    'text-white': true,
  },
  violet: {
    'bg-violet-700': true,
    'hover:bg-violet-800': true,
    'text-white': true,
  },
  gray: {
    'bg-gray-700': true,
    'hover:bg-gray-800': true,
    'text-white': true,
  },
}

// Define a type for the background color values
export type BackgroundColorValue = Extract<Colors, 'sky' | 'yellow' | 'green' | 'red' | 'violet' | 'gray'>

interface BackgroundColor {
  name: string;
  value: BackgroundColorValue;
  color: string;
}

export const BACKGROUND_COLORS: BackgroundColor[] = [
  { name: 'Sky', value: 'sky', color: '#0369a1' },
  { name: 'Yellow', value: 'yellow', color: '#a16207' },
  { name: 'Green', value: 'green', color: '#15803d'},
  { name: 'Red', value: 'red', color: '#b91c1c' },
  { name: 'Violet', value: 'violet', color: '#7e22ce' },
  { name: 'Gray', value: 'gray', color: '#374151' },
];
