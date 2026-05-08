import { Platform } from 'react-native';

const sf = Platform.select({ ios: 'System', android: undefined, default: 'System' });

export const colors = {
  bg: '#ffffff',
  bgElevated: '#fafafa',
  bgCard: '#ffffff',
  bgSheet: '#ffffff',
  bgScrim: 'rgba(0, 0, 0, 0.55)',

  surface: '#fafafa',
  surfaceAlt: '#f5f5f5',
  border: '#dbdbdb',
  borderSoft: '#efefef',
  divider: '#e5e5e5',

  text: '#000000',
  textSecondary: '#262626',
  textDim: '#8e8e8e',
  textMuted: '#c7c7c7',

  link: '#0095f6',

  igYellow: '#feda77',
  igOrange: '#f58529',
  igRed: '#dd2a7b',
  igPurple: '#8134af',
  igBlue: '#515bd4',

  accent: '#dd2a7b',
  accentSoft: 'rgba(221, 42, 123, 0.12)',

  success: '#22c55e',
  warn: '#f58529',
  danger: '#ed4956',

  pathDim: '#dbdbdb',
  pathDot: '#e5e5e5',

  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowStrong: 'rgba(0, 0, 0, 0.18)',

  tile: {
    red: '#ed4956',
    blue: '#0095f6',
    green: '#22c55e',
    yellow: '#feda77',
    purple: '#8134af',
    orange: '#f58529',
    pink: '#dd2a7b',
    cyan: '#3ec4d4',
    lime: '#a3e635',
  },

  confetti: ['#feda77', '#f58529', '#dd2a7b', '#8134af', '#515bd4', '#0095f6'],
};

export const igGradient = ['#feda77', '#f58529', '#dd2a7b', '#8134af', '#515bd4'];
export const igGradientShort = ['#f58529', '#dd2a7b', '#8134af'];
export const igGradientLight = ['#feda7799', '#f5852999', '#dd2a7b99'];

export const fonts = {
  uiRegular: { fontFamily: sf, fontWeight: '400' },
  uiMedium: { fontFamily: sf, fontWeight: '500' },
  uiSemi: { fontFamily: sf, fontWeight: '600' },
  uiBold: { fontFamily: sf, fontWeight: '700' },
  display: { fontFamily: sf, fontWeight: '800' },
  displayMedium: { fontFamily: sf, fontWeight: '600' },
};
