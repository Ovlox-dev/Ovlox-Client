// Ambient declaration for global (side-effect) CSS imports, e.g. `import "./globals.css"` in
// app/layout.tsx. Some editors enable TS's `noUncheckedSideEffectImports` check and flag the import
// with TS2882 ("Cannot find module or type declarations for side-effect import") even though the
// project compiler and `next build` accept it. This keeps the editor quiet.
//
// Note: Next.js provides a more-specific `*.module.css` declaration for CSS Modules, which TypeScript
// resolves with higher precedence — so this broad declaration does NOT affect typed CSS-Module imports.
declare module "*.css";
