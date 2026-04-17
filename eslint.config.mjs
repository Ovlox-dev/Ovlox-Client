// import js from '@eslint/js';
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from 'eslint-plugin-unused-imports';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
		"node_modules/**",
	]),
	{
		plugins: {
			'unused-imports': unusedImports,
			'react-hooks': reactHooks,
		},
		extends: [
			tseslint.configs.recommended,
			reactRefresh.configs.vite,
		],
		rules: {
			// TypeScript specific rules - Strict typing
			'@typescript-eslint/no-unused-vars': 'off', // Use unused-imports plugin instead
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'error',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/explicit-function-return-type': 'off', // Too strict for React components
			'@typescript-eslint/explicit-module-boundary-types': 'off', // Too strict for React components

			// React specific rules
			'react-hooks/exhaustive-deps': 'error',
			'react-hooks/rules-of-hooks': 'error',
			'react-refresh/only-export-components': 'warn',

			// General rules
			'no-console': 'error',
			'no-debugger': 'error',
			'no-unused-vars': 'off', // Use TypeScript version instead
			'prefer-const': 'error',
			'no-var': 'error',
			'no-unreachable': 'error',
			'no-constant-condition': 'error',
			'no-duplicate-imports': 'error',
			'no-unused-expressions': 'error',
			'no-sequences': 'error',
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-new-func': 'error',
			'no-script-url': 'error',
			'no-throw-literal': 'error',
			'no-unmodified-loop-condition': 'error',
			'no-useless-call': 'error',
			'no-useless-concat': 'error',
			'no-useless-return': 'error',
			'prefer-promise-reject-errors': 'error',
			'require-await': 'off', // Use TypeScript version

			// Code quality
			// complexity: ['warn', 15],
			// 'max-lines-per-function': ['warn', 300], // More reasonable for React components
			// 'max-params': ['warn', 5],
			// 'max-depth': ['warn', 4],
			// 'max-lines': ['warn', 800], // More reasonable for complex components
			// 'max-nested-callbacks': ['warn', 5],
			// 'max-statements': ['warn', 50],
			// 'max-len': ['warn', { code: 150, ignoreUrls: true, ignoreStrings: true }], // Slightly longer lines

			// Best practices
			eqeqeq: ['error', 'always'],
			curly: ['error', 'all'],
			'no-empty': 'error',
			'no-empty-function': 'error',
			'no-extra-bind': 'error',
			'no-extra-label': 'error',
			'no-extra-semi': 'error',
			'no-func-assign': 'error',
			'no-import-assign': 'error',
			'no-inner-declarations': 'error',
			'no-irregular-whitespace': 'error',
			'no-loss-of-precision': 'error',
			'no-misleading-character-class': 'error',
			'no-obj-calls': 'error',
			'no-prototype-builtins': 'error',
			'no-redeclare': 'error',
			'no-regex-spaces': 'error',
			'no-self-assign': 'error',
			'no-self-compare': 'error',
			'no-setter-return': 'error',
			'no-sparse-arrays': 'error',
			'no-template-curly-in-string': 'error',
			'no-unexpected-multiline': 'error',
			'no-unreachable-loop': 'error',
			'no-unsafe-finally': 'error',
			'no-unsafe-negation': 'error',
			'no-unsafe-optional-chaining': 'error',
			'use-isnan': 'error',
			'valid-typeof': 'error',
		},
	},
]);

export default eslintConfig;
