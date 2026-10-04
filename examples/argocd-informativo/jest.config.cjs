module.exports = {
  preset: 'ts-jest', testEnvironment: 'jsdom', testMatch: ['**/*.test.tsx'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {'\\.css$': '<rootDir>/dev/style-mock.cjs'},
  transform: {'^.+\\.tsx?$': ['ts-jest', {tsconfig: {module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx'}}]}
};
