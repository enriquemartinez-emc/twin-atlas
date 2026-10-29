// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  // The SDK in src/app/api is generated from the OpenAPI spec and never edited by hand.
  { ignores: ['src/app/api/**', '.angular/**', 'dist/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Components are single-file: template and styles live inline in the .ts.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Decorator[expression.callee.name='Component'] Property[key.name=/^(templateUrl|styleUrl|styleUrls)$/]",
          message:
            'Write components as a single file: use an inline `template` and `styles`, not templateUrl/styleUrl.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../**'],
              message:
                'No parent-relative imports. Use a path alias (@app, @features, @shared, @map, @api, @env). Relative imports are only for siblings and direct children.',
            },
            {
              group: ['@features/*/**', '!@features/*/public-api'],
              message:
                'Import a feature only through its public entry point (@features/<feature>/public-api). Inside a feature, use relative imports.',
            },
          ],
        },
      ],
    },
  },
  {
    // Helm components are copied in by the Spartan CLI and keep upstream conventions: `hlm`
    // selector prefix and non-null assertions in its utilities. Everything else still applies.
    files: ['src/app/shared/ui/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/component-selector': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
