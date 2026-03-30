import { fileURLToPath } from 'url';
import path from 'path';

// const fs = require('fs');
// const path = require('path');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(PROJECT_ROOT, 'src');
const ENUMS_FILE = path.join(SOURCE_DIR, 'database', 'enums.ts');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'ovlox-v2-api.postman_collection.json');
const API_PREFIX = '/api/v1';

function toTitleCase(value) {
    return String(value)
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

function toDisplayName(methodName) {
    return String(methodName)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/^./, (char) => char.toUpperCase())
        .trim();
}

function normalizeFragment(fragment) {
    if (!fragment) {
        return '';
    }

    const normalized = String(fragment).trim();
    if (!normalized || normalized === '/' || normalized === '.') {
        return '';
    }

    return normalized.replace(/^\/+|\/+$/g, '');
}

function joinRouteParts() {
    const parts = Array.from(arguments)
        .map((part) => normalizeFragment(part))
        .filter(Boolean);

    return `/${parts.join('/')}`;
}

function findControllerFiles(rootDir) {
    const files = [];

    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
                files.push(fullPath);
            }
        }
    }

    walk(rootDir);
    return files.sort((a, b) => a.localeCompare(b));
}

function resolveImportPath(currentFilePath, importPath) {
    let basePath = null;

    if (importPath.startsWith('.')) {
        basePath = path.resolve(path.dirname(currentFilePath), importPath);
    } else if (importPath.startsWith('src/')) {
        basePath = path.resolve(PROJECT_ROOT, importPath);
    }

    if (!basePath) {
        return null;
    }

    const candidates = [
        basePath,
        `${basePath}.ts`,
        `${basePath}.js`,
        path.join(basePath, 'index.ts'),
        path.join(basePath, 'index.js'),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }

    return null;
}

function parseNamedImports(sourceText, currentFilePath) {
    const imports = new Map();
    const importPattern = /import\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importPattern.exec(sourceText)) !== null) {
        const namesSegment = match[1];
        const importPath = match[2];
        const resolvedPath = resolveImportPath(currentFilePath, importPath);

        const entries = namesSegment
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => entry.replace(/^type\s+/, '').trim());

        for (const entry of entries) {
            const aliasMatch = entry.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
            if (aliasMatch) {
                imports.set(aliasMatch[2], {
                    imported: aliasMatch[1],
                    path: resolvedPath,
                    rawImportPath: importPath,
                });
            } else {
                imports.set(entry, {
                    imported: entry,
                    path: resolvedPath,
                    rawImportPath: importPath,
                });
            }
        }
    }

    return imports;
}

function extractDecoratorPath(argsText) {
    const args = String(argsText || '').trim();
    if (!args) {
        return '';
    }

    const quotedMatch = args.match(/^['"`]([^'"`]*)['"`]/);
    if (quotedMatch) {
        return quotedMatch[1];
    }

    const objectPathMatch = args.match(/\bpath\s*:\s*['"`]([^'"`]*)['"`]/);
    if (objectPathMatch) {
        return objectPathMatch[1];
    }

    return '';
}

function extractControllerPath(sourceText) {
    const controllerMatch = sourceText.match(/@Controller\s*\(([^)]*)\)/s);
    if (!controllerMatch) {
        return null;
    }

    return extractDecoratorPath(controllerMatch[1]);
}

function extractMethodSignatureFromCursor(sourceText, startIndex) {
    const region = sourceText.slice(startIndex);
    const signatureMatch = region.match(
        /^(?:\s*@[\s\S]*?\n)*\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\)\s*(?::\s*[^{]+)?\s*\{/m,
    );

    if (!signatureMatch) {
        return null;
    }

    return {
        name: signatureMatch[1],
        paramsText: signatureMatch[2] || '',
    };
}

function parseEnumValues() {
    const enums = new Map();

    if (!fs.existsSync(ENUMS_FILE)) {
        return enums;
    }

    const sourceText = fs.readFileSync(ENUMS_FILE, 'utf8');
    const enumPattern = /export const ([A-Za-z_][A-Za-z0-9_]*) = \{([\s\S]*?)\} as const;/g;

    let match;
    while ((match = enumPattern.exec(sourceText)) !== null) {
        const enumName = match[1];
        const enumBody = match[2];
        const values = [];
        const valuePattern = /:\s*'([^']+)'/g;

        let valueMatch;
        while ((valueMatch = valuePattern.exec(enumBody)) !== null) {
            values.push(valueMatch[1]);
        }

        if (values.length > 0) {
            enums.set(enumName, values);
        }
    }

    return enums;
}

function extractClassInfo(sourceText, className) {
    const classPattern = new RegExp(`(?:export\\s+)?class\\s+${className}\\b(?:\\s+extends\\s+([^\\{]+))?`);
    const classMatch = classPattern.exec(sourceText);
    if (!classMatch) {
        return null;
    }

    const openBraceIndex = sourceText.indexOf('{', classMatch.index);
    if (openBraceIndex < 0) {
        return null;
    }

    let depth = 0;
    for (let i = openBraceIndex; i < sourceText.length; i += 1) {
        const currentChar = sourceText[i];
        if (currentChar === '{') {
            depth += 1;
        } else if (currentChar === '}') {
            depth -= 1;
            if (depth === 0) {
                return {
                    body: sourceText.slice(openBraceIndex + 1, i),
                    extendsType: classMatch[1] ? classMatch[1].trim() : '',
                };
            }
        }
    }

    return null;
}

function parseExportEntries(namesSegment) {
    return String(namesSegment || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^type\s+/, '').trim())
        .map((entry) => {
            const aliasMatch = entry.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
            if (aliasMatch) {
                return {
                    local: aliasMatch[1],
                    exported: aliasMatch[2],
                };
            }

            return {
                local: entry,
                exported: entry,
            };
        });
}

function resolveClassReference(startFilePath, symbolName, visited = new Set()) {
    if (!startFilePath || !fs.existsSync(startFilePath)) {
        return null;
    }

    const visitKey = `${startFilePath}::${symbolName}`;
    if (visited.has(visitKey)) {
        return null;
    }
    visited.add(visitKey);

    const sourceText = fs.readFileSync(startFilePath, 'utf8');
    const classInfo = extractClassInfo(sourceText, symbolName);
    if (classInfo) {
        return {
            filePath: startFilePath,
            className: symbolName,
            sourceText,
            classInfo,
        };
    }

    const namedExportPattern = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = namedExportPattern.exec(sourceText)) !== null) {
        const entries = parseExportEntries(match[1]);
        const exportMatch = entries.find((entry) => entry.exported === symbolName);
        if (!exportMatch) {
            continue;
        }

        const resolvedPath = resolveImportPath(startFilePath, match[2]);
        if (!resolvedPath) {
            continue;
        }

        const resolved = resolveClassReference(resolvedPath, exportMatch.local, visited);
        if (resolved) {
            return resolved;
        }
    }

    const exportAllPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = exportAllPattern.exec(sourceText)) !== null) {
        const resolvedPath = resolveImportPath(startFilePath, match[1]);
        if (!resolvedPath) {
            continue;
        }

        const resolved = resolveClassReference(resolvedPath, symbolName, visited);
        if (resolved) {
            return resolved;
        }
    }

    return null;
}

function extractInterfaceInfo(sourceText, interfaceName) {
    const interfacePattern = new RegExp(`(?:export\\s+)?interface\\s+${interfaceName}\\b(?:\\s+extends\\s+([^\\{]+))?`);
    const interfaceMatch = interfacePattern.exec(sourceText);
    if (!interfaceMatch) {
        return null;
    }

    const openBraceIndex = sourceText.indexOf('{', interfaceMatch.index);
    if (openBraceIndex < 0) {
        return null;
    }

    let depth = 0;
    for (let i = openBraceIndex; i < sourceText.length; i += 1) {
        const currentChar = sourceText[i];
        if (currentChar === '{') {
            depth += 1;
        } else if (currentChar === '}') {
            depth -= 1;
            if (depth === 0) {
                return {
                    body: sourceText.slice(openBraceIndex + 1, i),
                    extendsType: interfaceMatch[1] ? interfaceMatch[1].trim() : '',
                };
            }
        }
    }

    return null;
}

function extractTypeAliasInfo(sourceText, typeName) {
    const aliasPattern = new RegExp(`(?:export\\s+)?type\\s+${typeName}\\b(?:\\s*<[^>]+>)?\\s*=`, 'g');
    const aliasMatch = aliasPattern.exec(sourceText);
    if (!aliasMatch) {
        return null;
    }

    let start = aliasMatch.index + aliasMatch[0].length;
    while (start < sourceText.length && /\s/.test(sourceText[start])) {
        start += 1;
    }

    let depthCurly = 0;
    let depthAngle = 0;
    let depthSquare = 0;
    let depthParen = 0;
    let activeQuote = '';

    for (let index = start; index < sourceText.length; index += 1) {
        const char = sourceText[index];
        const previousChar = sourceText[index - 1];

        if (activeQuote) {
            if (char === activeQuote && previousChar !== '\\') {
                activeQuote = '';
            }
            continue;
        }

        if (char === '"' || char === '\'' || char === '`') {
            activeQuote = char;
            continue;
        }

        if (char === '{') {
            depthCurly += 1;
        } else if (char === '}') {
            depthCurly = Math.max(0, depthCurly - 1);
        } else if (char === '<') {
            depthAngle += 1;
        } else if (char === '>') {
            depthAngle = Math.max(0, depthAngle - 1);
        } else if (char === '[') {
            depthSquare += 1;
        } else if (char === ']') {
            depthSquare = Math.max(0, depthSquare - 1);
        } else if (char === '(') {
            depthParen += 1;
        } else if (char === ')') {
            depthParen = Math.max(0, depthParen - 1);
        }

        const atTopLevel =
            depthCurly === 0 &&
            depthAngle === 0 &&
            depthSquare === 0 &&
            depthParen === 0;

        if (atTopLevel && char === ';') {
            return {
                expression: sourceText.slice(start, index).trim(),
            };
        }
    }

    return {
        expression: sourceText.slice(start).trim(),
    };
}

function resolveTypeLikeReference(startFilePath, symbolName, visited = new Set()) {
    if (!startFilePath || !fs.existsSync(startFilePath)) {
        return null;
    }

    const visitKey = `${startFilePath}::${symbolName}`;
    if (visited.has(visitKey)) {
        return null;
    }
    visited.add(visitKey);

    const sourceText = fs.readFileSync(startFilePath, 'utf8');

    const classInfo = extractClassInfo(sourceText, symbolName);
    if (classInfo) {
        return {
            kind: 'class',
            symbolName,
            filePath: startFilePath,
            sourceText,
            classInfo,
        };
    }

    const interfaceInfo = extractInterfaceInfo(sourceText, symbolName);
    if (interfaceInfo) {
        return {
            kind: 'interface',
            symbolName,
            filePath: startFilePath,
            sourceText,
            interfaceInfo,
        };
    }

    const typeAliasInfo = extractTypeAliasInfo(sourceText, symbolName);
    if (typeAliasInfo) {
        return {
            kind: 'type',
            symbolName,
            filePath: startFilePath,
            sourceText,
            typeAliasInfo,
        };
    }

    const namedExportPattern = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = namedExportPattern.exec(sourceText)) !== null) {
        const entries = parseExportEntries(match[1]);
        const exportMatch = entries.find((entry) => entry.exported === symbolName);
        if (!exportMatch) {
            continue;
        }

        const resolvedPath = resolveImportPath(startFilePath, match[2]);
        if (!resolvedPath) {
            continue;
        }

        const resolved = resolveTypeLikeReference(resolvedPath, exportMatch.local, visited);
        if (resolved) {
            return resolved;
        }
    }

    const exportAllPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = exportAllPattern.exec(sourceText)) !== null) {
        const resolvedPath = resolveImportPath(startFilePath, match[1]);
        if (!resolvedPath) {
            continue;
        }

        const resolved = resolveTypeLikeReference(resolvedPath, symbolName, visited);
        if (resolved) {
            return resolved;
        }
    }

    return null;
}

function cleanTypeExpression(typeExpression) {
    return String(typeExpression || '')
        .replace(/\s+/g, ' ')
        .replace(/\|\s*null/g, '')
        .replace(/\|\s*undefined/g, '')
        .trim();
}

function extractPrimaryTypeName(typeExpression) {
    const cleaned = cleanTypeExpression(typeExpression);
    if (!cleaned) {
        return '';
    }

    const arrayMatch = cleaned.match(/^Array<(.+)>$/);
    if (arrayMatch) {
        return extractPrimaryTypeName(arrayMatch[1]);
    }

    if (cleaned.endsWith('[]')) {
        return extractPrimaryTypeName(cleaned.slice(0, -2));
    }

    const genericMatch = cleaned.match(/^[A-Za-z_][A-Za-z0-9_]*<(.+)>$/);
    if (genericMatch) {
        return extractPrimaryTypeName(genericMatch[1]);
    }

    const unionPart = cleaned.split('|').map((part) => part.trim()).find(Boolean);
    const candidate = unionPart || cleaned;
    const nameMatch = candidate.match(/[A-Za-z_][A-Za-z0-9_]*/);
    return nameMatch ? nameMatch[0] : '';
}

function extractEnumNameFromDecorators(decoratorsText) {
    if (!decoratorsText) {
        return '';
    }

    const directMatch = decoratorsText.match(/@IsEnum\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/);
    if (directMatch) {
        return directMatch[1];
    }

    const valuesMatch = decoratorsText.match(/Object\.values\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/);
    if (valuesMatch) {
        return valuesMatch[1];
    }

    return '';
}

function getEnumSample(enumName, importsMap, context) {
    if (!enumName) {
        return undefined;
    }

    if (context.enums.has(enumName)) {
        return context.enums.get(enumName)[0];
    }

    const importInfo = importsMap.get(enumName);
    if (importInfo && context.enums.has(importInfo.imported)) {
        return context.enums.get(importInfo.imported)[0];
    }

    return undefined;
}

function getIdPlaceholder(propertyName) {
    const normalized = String(propertyName || '').toLowerCase();

    if (normalized === 'orgid' || normalized === 'organizationid') {
        return '{{orgId}}';
    }
    if (normalized === 'projectid') {
        return '{{projectId}}';
    }
    if (normalized === 'userid') {
        return '{{userId}}';
    }
    if (normalized === 'memberid') {
        return '{{memberId}}';
    }
    if (normalized === 'taskid') {
        return '{{taskId}}';
    }
    if (normalized.endsWith('id')) {
        return '{{id}}';
    }

    return undefined;
}

function toPostmanScalar(value) {
    if (value === undefined || value === null) {
        return '';
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return '';
        }

        const firstValue = value[0];
        if (typeof firstValue === 'string') {
            return firstValue;
        }

        if (typeof firstValue === 'number' || typeof firstValue === 'boolean') {
            return String(firstValue);
        }

        return JSON.stringify(firstValue);
    }

    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
        return String(value);
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function getKnownQueryDefaults(typeName) {
    if (typeName === 'QueryString') {
        return {
            keyword: 'string',
            page: '1',
            limit: '10',
            offset: '0',
            sort: 'createdAt_desc',
        };
    }

    return null;
}

function splitTopLevelSegments(input, delimiters) {
    const segments = [];
    let start = 0;
    let depthCurly = 0;
    let depthAngle = 0;
    let depthSquare = 0;
    let depthParen = 0;
    let activeQuote = '';

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index];
        const previousChar = input[index - 1];

        if (activeQuote) {
            if (char === activeQuote && previousChar !== '\\') {
                activeQuote = '';
            }
            continue;
        }

        if (char === '"' || char === '\'' || char === '`') {
            activeQuote = char;
            continue;
        }

        if (char === '{') {
            depthCurly += 1;
        } else if (char === '}') {
            depthCurly = Math.max(0, depthCurly - 1);
        } else if (char === '<') {
            depthAngle += 1;
        } else if (char === '>') {
            depthAngle = Math.max(0, depthAngle - 1);
        } else if (char === '[') {
            depthSquare += 1;
        } else if (char === ']') {
            depthSquare = Math.max(0, depthSquare - 1);
        } else if (char === '(') {
            depthParen += 1;
        } else if (char === ')') {
            depthParen = Math.max(0, depthParen - 1);
        }

        const atTopLevel =
            depthCurly === 0 &&
            depthAngle === 0 &&
            depthSquare === 0 &&
            depthParen === 0;

        if (atTopLevel && delimiters.includes(char)) {
            segments.push(input.slice(start, index).trim());
            start = index + 1;
        }
    }

    segments.push(input.slice(start).trim());
    return segments.filter(Boolean);
}

function parseStringLiteralUnion(typeExpression) {
    const parts = splitTopLevelSegments(typeExpression, ['|']);
    const values = [];

    for (const part of parts) {
        const literalMatch = part.trim().match(/^['"`]([^'"`]+)['"`]$/);
        if (literalMatch) {
            values.push(literalMatch[1]);
        }
    }

    return values;
}

function parseGenericCall(typeExpression) {
    const genericMatch = cleanTypeExpression(typeExpression).match(/^([A-Za-z_][A-Za-z0-9_]*)<([\s\S]+)>$/);
    if (!genericMatch) {
        return null;
    }

    return {
        name: genericMatch[1],
        args: splitTopLevelSegments(genericMatch[2], [',']),
    };
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveTypeReferenceFromImports(typeName, importsMap, currentFilePath, context, depth) {
    if (!typeName) {
        return null;
    }

    if (importsMap.has(typeName)) {
        const importInfo = importsMap.get(typeName);
        if (importInfo.path) {
            const importedShape = buildTypeShapeExample(importInfo.path, importInfo.imported, context, depth + 1);
            if (importedShape !== null) {
                return importedShape;
            }
        }
    }

    return buildTypeShapeExample(currentFilePath, typeName, context, depth + 1);
}

function buildTypeExpressionExample(typeExpression, importsMap, currentFilePath, context, depth) {
    const cleanedType = cleanTypeExpression(typeExpression);
    if (!cleanedType || depth > 6) {
        return null;
    }

    const inlineObject = parseInlineObjectType(cleanedType, importsMap, currentFilePath, context, depth + 1);
    if (inlineObject !== null) {
        return inlineObject;
    }

    const intersectionParts = splitTopLevelSegments(cleanedType, ['&']);
    if (intersectionParts.length > 1) {
        const merged = {};
        let hasObjectSegment = false;

        for (const segment of intersectionParts) {
            const segmentValue = buildTypeExpressionExample(segment, importsMap, currentFilePath, context, depth + 1);
            if (isPlainObject(segmentValue)) {
                Object.assign(merged, segmentValue);
                hasObjectSegment = true;
                continue;
            }

            if (segmentValue !== null && !hasObjectSegment) {
                return segmentValue;
            }
        }

        return hasObjectSegment ? merged : null;
    }

    const unionParts = splitTopLevelSegments(cleanedType, ['|']);
    if (unionParts.length > 1) {
        for (const segment of unionParts) {
            const segmentValue = buildTypeExpressionExample(segment, importsMap, currentFilePath, context, depth + 1);
            if (segmentValue !== null) {
                return segmentValue;
            }
        }
    }

    const genericCall = parseGenericCall(cleanedType);
    if (genericCall) {
        if (['Partial', 'Required', 'Readonly'].includes(genericCall.name) && genericCall.args[0]) {
            return buildTypeExpressionExample(genericCall.args[0], importsMap, currentFilePath, context, depth + 1);
        }

        if (genericCall.name === 'Pick' && genericCall.args.length >= 2) {
            const baseValue = buildTypeExpressionExample(genericCall.args[0], importsMap, currentFilePath, context, depth + 1);
            if (!isPlainObject(baseValue)) {
                return baseValue;
            }

            const selectedKeys = parseStringLiteralUnion(genericCall.args[1]);
            if (selectedKeys.length === 0) {
                return baseValue;
            }

            const picked = {};
            for (const key of selectedKeys) {
                if (Object.prototype.hasOwnProperty.call(baseValue, key)) {
                    picked[key] = baseValue[key];
                }
            }
            return picked;
        }

        if (genericCall.name === 'Omit' && genericCall.args.length >= 2) {
            const baseValue = buildTypeExpressionExample(genericCall.args[0], importsMap, currentFilePath, context, depth + 1);
            if (!isPlainObject(baseValue)) {
                return baseValue;
            }

            const omittedKeys = new Set(parseStringLiteralUnion(genericCall.args[1]));
            const omitted = {};
            for (const [key, value] of Object.entries(baseValue)) {
                if (!omittedKeys.has(key)) {
                    omitted[key] = value;
                }
            }
            return omitted;
        }
    }

    const primaryType = extractPrimaryTypeName(cleanedType);
    const knownDefaults = getKnownQueryDefaults(primaryType);
    if (knownDefaults) {
        return knownDefaults;
    }

    const referencedShape = resolveTypeReferenceFromImports(
        primaryType,
        importsMap,
        currentFilePath,
        context,
        depth + 1,
    );
    if (referencedShape !== null) {
        return referencedShape;
    }

    const primitiveValue = inferTypeExample(
        cleanedType,
        primaryType || 'value',
        '',
        importsMap,
        currentFilePath,
        context,
        depth + 1,
    );

    return primitiveValue === undefined ? null : primitiveValue;
}

function buildTypeShapeExample(startFilePath, typeName, context, depth) {
    if (!typeName || !startFilePath || !fs.existsSync(startFilePath) || depth > 6) {
        return null;
    }

    const resolved = resolveTypeLikeReference(startFilePath, typeName, new Set());
    if (!resolved) {
        return null;
    }

    const cacheKey = `${resolved.kind}::${resolved.filePath}::${resolved.symbolName}`;
    if (context.typeShapeCache.has(cacheKey)) {
        return context.typeShapeCache.get(cacheKey);
    }

    context.typeShapeCache.set(cacheKey, null);

    if (resolved.kind === 'class') {
        const classExample = buildDtoExample(resolved.filePath, resolved.symbolName, context, depth + 1);
        context.typeShapeCache.set(cacheKey, classExample);
        return classExample;
    }

    const importsMap = parseNamedImports(resolved.sourceText, resolved.filePath);

    if (resolved.kind === 'interface') {
        const ownShape = parseInlineObjectType(
            `{${resolved.interfaceInfo.body}}`,
            importsMap,
            resolved.filePath,
            context,
            depth + 1,
        ) || {};

        const merged = {};
        const extendsParts = resolved.interfaceInfo.extendsType
            ? splitTopLevelSegments(resolved.interfaceInfo.extendsType, [','])
            : [];

        for (const baseRef of extendsParts) {
            const baseType = extractPrimaryTypeName(baseRef);
            if (!baseType) {
                continue;
            }

            const baseShape = resolveTypeReferenceFromImports(
                baseType,
                importsMap,
                resolved.filePath,
                context,
                depth + 1,
            );

            if (isPlainObject(baseShape)) {
                Object.assign(merged, baseShape);
            }
        }

        Object.assign(merged, ownShape);
        context.typeShapeCache.set(cacheKey, merged);
        return merged;
    }

    const aliasExample = buildTypeExpressionExample(
        resolved.typeAliasInfo.expression,
        importsMap,
        resolved.filePath,
        context,
        depth + 1,
    );

    context.typeShapeCache.set(cacheKey, aliasExample);
    return aliasExample;
}

function parseInlineObjectType(typeExpression, importsMap, currentFilePath, context, depth) {
    const cleanedType = cleanTypeExpression(typeExpression);
    if (!cleanedType.startsWith('{') || !cleanedType.endsWith('}')) {
        return null;
    }

    const inner = cleanedType.slice(1, -1).trim();
    if (!inner) {
        return {};
    }

    const delimiters = inner.includes(';') ? [';'] : [','];
    const properties = splitTopLevelSegments(inner, delimiters);
    const result = {};

    for (const propertyEntry of properties) {
        const entry = propertyEntry.replace(/,$/, '').trim();
        if (!entry || entry.startsWith('[')) {
            continue;
        }

        const propertyMatch = entry.match(/^([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([\s\S]+)$/);
        if (!propertyMatch) {
            continue;
        }

        const propertyName = propertyMatch[1];
        const isOptional = propertyMatch[2] === '?';
        const propertyType = propertyMatch[3];
        const value = inferTypeExample(
            propertyType,
            propertyName,
            '',
            importsMap,
            currentFilePath,
            context,
            depth + 1,
        );

        if (value === undefined && isOptional) {
            continue;
        }

        result[propertyName] = value === undefined ? null : value;
    }

    return result;
}

function inferTypeExample(typeExpression, propertyName, decoratorsText, importsMap, currentFilePath, context, depth) {
    const cleanedType = cleanTypeExpression(typeExpression);
    if (!cleanedType) {
        return undefined;
    }

    const enumFromDecorator = extractEnumNameFromDecorators(decoratorsText);
    const decoratorEnumSample = getEnumSample(enumFromDecorator, importsMap, context);
    if (decoratorEnumSample !== undefined) {
        return decoratorEnumSample;
    }

    const inlineObjectExample = parseInlineObjectType(
        cleanedType,
        importsMap,
        currentFilePath,
        context,
        depth,
    );
    if (inlineObjectExample !== null) {
        return inlineObjectExample;
    }

    const arrayGenericMatch = cleanedType.match(/^Array<(.+)>$/);
    if (arrayGenericMatch) {
        const itemValue = inferTypeExample(
            arrayGenericMatch[1],
            propertyName,
            decoratorsText,
            importsMap,
            currentFilePath,
            context,
            depth + 1,
        );
        return [itemValue === undefined ? 'item' : itemValue];
    }

    if (cleanedType.endsWith('[]')) {
        const itemValue = inferTypeExample(
            cleanedType.slice(0, -2),
            propertyName,
            decoratorsText,
            importsMap,
            currentFilePath,
            context,
            depth + 1,
        );
        return [itemValue === undefined ? 'item' : itemValue];
    }

    const primaryType = extractPrimaryTypeName(cleanedType);
    const lowerType = primaryType.toLowerCase();
    const lowerProperty = String(propertyName || '').toLowerCase();

    if (/^@IsBoolean\b/m.test(decoratorsText) || lowerType === 'boolean') {
        return true;
    }

    if (/^@Is(Int|Number)\b/m.test(decoratorsText) || ['number', 'bigint'].includes(lowerType)) {
        return 1;
    }

    if (/^@IsDateString\b/m.test(decoratorsText) || lowerType === 'date') {
        return '2026-01-01T00:00:00.000Z';
    }

    if (/^@IsEmail\b/m.test(decoratorsText) || lowerProperty.includes('email')) {
        return 'user@example.com';
    }

    if (/^@IsUrl\b/m.test(decoratorsText) || /url|avatar/.test(lowerProperty)) {
        return 'https://example.com/resource';
    }

    if (/^@IsUUID\b/m.test(decoratorsText)) {
        return getIdPlaceholder(propertyName) || '{{id}}';
    }

    if (lowerProperty.includes('phone')) {
        return '+1234567890';
    }

    const idPlaceholder = getIdPlaceholder(propertyName);
    if (idPlaceholder) {
        return idPlaceholder;
    }

    const enumByType = getEnumSample(primaryType, importsMap, context);
    if (enumByType !== undefined) {
        return enumByType;
    }

    const stringLiteralMatch = cleanedType.match(/['"`]([^'"`]+)['"`]/);
    if (stringLiteralMatch) {
        return stringLiteralMatch[1];
    }

    if (['record', 'object', 'json', 'any', 'unknown'].some((token) => lowerType.startsWith(token))) {
        return {};
    }

    if (lowerType === 'string') {
        return 'string';
    }

    if (depth <= 4) {
        const referencedShape = resolveTypeReferenceFromImports(
            primaryType,
            importsMap,
            currentFilePath,
            context,
            depth + 1,
        );
        if (referencedShape !== null) {
            return referencedShape;
        }
    }

    return 'string';
}

function buildDtoExample(dtoFilePath, dtoClassName, context, depth) {
    const resolvedReference = resolveClassReference(dtoFilePath, dtoClassName, new Set());
    const targetFilePath = resolvedReference ? resolvedReference.filePath : dtoFilePath;
    const targetClassName = resolvedReference ? resolvedReference.className : dtoClassName;
    const cacheKey = `${targetFilePath}::${targetClassName}`;

    if (context.dtoCache.has(cacheKey)) {
        return context.dtoCache.get(cacheKey);
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath) || depth > 5) {
        context.dtoCache.set(cacheKey, {});
        return {};
    }

    const sourceText = resolvedReference
        ? resolvedReference.sourceText
        : fs.readFileSync(targetFilePath, 'utf8');
    const importsMap = parseNamedImports(sourceText, targetFilePath);
    const classInfo = resolvedReference
        ? resolvedReference.classInfo
        : extractClassInfo(sourceText, targetClassName);

    if (!classInfo) {
        context.dtoCache.set(cacheKey, {});
        return {};
    }

    context.dtoCache.set(cacheKey, {});

    const example = {};
    const propertyPattern = /((?:\s*@[\s\S]*?\)\s*\n|\s*@[A-Za-z_][A-Za-z0-9_.]*\s*\n)*)\s*(?:public\s+|private\s+|protected\s+|readonly\s+)*([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([^;=\n]+)\s*(?:=[^;\n]+)?;/g;

    let match;
    while ((match = propertyPattern.exec(classInfo.body)) !== null) {
        const decoratorsText = match[1] || '';
        const propertyName = match[2];
        const isOptional = match[3] === '?' || /^@IsOptional\b/m.test(decoratorsText);
        const propertyType = match[4];

        const value = inferTypeExample(
            propertyType,
            propertyName,
            decoratorsText,
            importsMap,
            targetFilePath,
            context,
            depth + 1,
        );

        if (value === undefined && isOptional) {
            continue;
        }

        example[propertyName] = value === undefined ? null : value;
    }

    if (Object.keys(example).length === 0 && classInfo.extendsType) {
        const baseTypeName = extractPrimaryTypeName(classInfo.extendsType);
        if (baseTypeName && baseTypeName !== targetClassName) {
            const baseExample = resolveTypeReferenceFromImports(
                baseTypeName,
                importsMap,
                targetFilePath,
                context,
                depth + 1,
            );

            if (isPlainObject(baseExample) && Object.keys(baseExample).length > 0) {
                Object.assign(example, baseExample);
            }
        }
    }

    context.dtoCache.set(cacheKey, example);
    return example;
}

function extractBodyExampleFromParams(paramsText, importsMap, context, currentFilePath) {
    const fullBodyMatch = paramsText.match(/@Body\s*\(\s*\)\s*(?:readonly\s+)?[A-Za-z_][A-Za-z0-9_]*\s*:\s*([^,)\n]+)/);
    if (fullBodyMatch) {
        const fullBodyType = fullBodyMatch[1].trim();
        const typeName = extractPrimaryTypeName(fullBodyType);

        const structuredBody = resolveTypeReferenceFromImports(
            typeName,
            importsMap,
            currentFilePath,
            context,
            0,
        );
        if (structuredBody !== null) {
            return structuredBody;
        }

        const primitiveSample = inferTypeExample(
            fullBodyType,
            'body',
            '',
            importsMap,
            currentFilePath,
            context,
            0,
        );

        if (primitiveSample !== undefined) {
            return primitiveSample;
        }
    }

    const bodyObject = {};
    const keyedBodyPattern = /@Body\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*(?:readonly\s+)?[A-Za-z_][A-Za-z0-9_]*\s*:\s*([^,)\n]+)/g;

    let match;
    while ((match = keyedBodyPattern.exec(paramsText)) !== null) {
        const fieldName = match[1];
        const fieldType = match[2];

        bodyObject[fieldName] = inferTypeExample(
            fieldType,
            fieldName,
            '',
            importsMap,
            currentFilePath,
            context,
            0,
        );
    }

    if (Object.keys(bodyObject).length > 0) {
        return bodyObject;
    }

    return undefined;
}

function extractQueryExampleFromParams(paramsText, importsMap, context, currentFilePath) {
    const queryObject = {};

    const fullQueryPattern = /@Query\s*\(\s*\)\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([^,)\n]+)/g;
    let match;
    while ((match = fullQueryPattern.exec(paramsText)) !== null) {
        const queryVariableName = match[1];
        const queryType = match[3].trim();
        const typeName = extractPrimaryTypeName(queryType);

        if (['any', 'unknown', 'object'].includes(typeName.toLowerCase())) {
            continue;
        }

        if (/^Record\s*</.test(queryType)) {
            continue;
        }

        const referencedShape = resolveTypeReferenceFromImports(
            typeName,
            importsMap,
            currentFilePath,
            context,
            0,
        );
        if (isPlainObject(referencedShape) && Object.keys(referencedShape).length > 0) {
            Object.assign(queryObject, referencedShape);
            continue;
        }

        const inlineObject = parseInlineObjectType(
            queryType,
            importsMap,
            currentFilePath,
            context,
            0,
        );
        if (inlineObject && Object.keys(inlineObject).length > 0) {
            Object.assign(queryObject, inlineObject);
            continue;
        }

        const knownDefaults = getKnownQueryDefaults(typeName);
        if (knownDefaults) {
            Object.assign(queryObject, knownDefaults);
            continue;
        }

        const inferredValue = inferTypeExample(
            queryType,
            queryVariableName,
            '',
            importsMap,
            currentFilePath,
            context,
            0,
        );

        if (inferredValue !== undefined) {
            queryObject[queryVariableName] = inferredValue;
        }
    }

    const keyedQueryPattern = /@Query\s*\(\s*['"`]([^'"`]+)['"`][^)]*\)\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([^,)\n]+)/g;
    while ((match = keyedQueryPattern.exec(paramsText)) !== null) {
        const queryName = match[1];
        const queryType = match[4].trim();
        const inferredValue = inferTypeExample(
            queryType,
            queryName,
            '',
            importsMap,
            currentFilePath,
            context,
            0,
        );

        queryObject[queryName] = inferredValue === undefined ? 'string' : inferredValue;
    }

    return Object.keys(queryObject).length > 0 ? queryObject : undefined;
}

function extractParamExampleFromParams(paramsText, importsMap, context, currentFilePath) {
    const paramObject = {};

    const keyedParamPattern = /@Param\s*\(\s*['"`]([^'"`]+)['"`][^)]*\)\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([^,)\n]+)/g;
    let match;
    while ((match = keyedParamPattern.exec(paramsText)) !== null) {
        const paramName = match[1];
        const paramType = match[4].trim();
        const inferredValue = inferTypeExample(
            paramType,
            paramName,
            '',
            importsMap,
            currentFilePath,
            context,
            0,
        );

        paramObject[paramName] = inferredValue === undefined
            ? getIdPlaceholder(paramName) || 'string'
            : inferredValue;
    }

    const fullParamPattern = /@Param\s*\(\s*\)\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([^,)\n]+)/g;
    while ((match = fullParamPattern.exec(paramsText)) !== null) {
        const paramVariableName = match[1];
        const paramType = match[3].trim();
        const typeName = extractPrimaryTypeName(paramType);

        if (['any', 'unknown', 'object'].includes(typeName.toLowerCase())) {
            continue;
        }

        const referencedShape = resolveTypeReferenceFromImports(
            typeName,
            importsMap,
            currentFilePath,
            context,
            0,
        );
        if (isPlainObject(referencedShape) && Object.keys(referencedShape).length > 0) {
            Object.assign(paramObject, referencedShape);
            continue;
        }

        const inlineObject = parseInlineObjectType(
            paramType,
            importsMap,
            currentFilePath,
            context,
            0,
        );
        if (inlineObject && Object.keys(inlineObject).length > 0) {
            Object.assign(paramObject, inlineObject);
            continue;
        }

        const inferredValue = inferTypeExample(
            paramType,
            paramVariableName,
            '',
            importsMap,
            currentFilePath,
            context,
            0,
        );

        if (inferredValue !== undefined) {
            paramObject[paramVariableName] = inferredValue;
        }
    }

    return Object.keys(paramObject).length > 0 ? paramObject : undefined;
}

function extractRoutes(sourceText, controllerFilePath, context) {
    const routes = [];
    const importsMap = parseNamedImports(sourceText, controllerFilePath);
    const routeDecoratorPattern = /@(Get|Post|Put|Delete|Patch|Options|Head|All)\s*\(([^)]*)\)/g;

    let match;
    while ((match = routeDecoratorPattern.exec(sourceText)) !== null) {
        const method = match[1].toUpperCase();
        const routePath = extractDecoratorPath(match[2]);
        const signature = extractMethodSignatureFromCursor(sourceText, routeDecoratorPattern.lastIndex);

        if (!signature) {
            continue;
        }

        const bodyExample = extractBodyExampleFromParams(
            signature.paramsText,
            importsMap,
            context,
            controllerFilePath,
        );
        const queryExample = extractQueryExampleFromParams(
            signature.paramsText,
            importsMap,
            context,
            controllerFilePath,
        );
        const paramExample = extractParamExampleFromParams(
            signature.paramsText,
            importsMap,
            context,
            controllerFilePath,
        );

        routes.push({
            method,
            path: routePath,
            name: toDisplayName(signature.name),
            bodyExample,
            queryExample,
            paramExample,
        });
    }

    return routes;
}

function getFolderName(controllerFilePath, controllerPath) {
    const pathSegments = controllerFilePath.split(path.sep);
    const modulesIndex = pathSegments.lastIndexOf('modules');

    if (modulesIndex >= 0 && pathSegments[modulesIndex + 1]) {
        return toTitleCase(pathSegments[modulesIndex + 1]);
    }

    const firstControllerSegment = normalizeFragment(controllerPath).split('/')[0];
    if (firstControllerSegment) {
        return toTitleCase(firstControllerSegment);
    }

    return toTitleCase(path.basename(controllerFilePath, '.controller.ts'));
}

function extractAllEndpoints(context) {
    const endpoints = [];
    const dedupe = new Set();
    const controllerFiles = findControllerFiles(SOURCE_DIR);

    for (const controllerFilePath of controllerFiles) {
        const sourceText = fs.readFileSync(controllerFilePath, 'utf8');
        const controllerPath = extractControllerPath(sourceText);

        if (controllerPath === null) {
            continue;
        }

        const routes = extractRoutes(sourceText, controllerFilePath, context);
        const folder = getFolderName(controllerFilePath, controllerPath);

        for (const route of routes) {
            const fullPath = joinRouteParts(API_PREFIX, controllerPath, route.path);
            const dedupeKey = `${route.method} ${fullPath}`;

            if (dedupe.has(dedupeKey)) {
                continue;
            }

            dedupe.add(dedupeKey);
            endpoints.push({
                folder,
                name: route.name,
                method: route.method,
                path: fullPath,
                bodyExample: route.bodyExample,
                queryExample: route.queryExample,
                paramExample: route.paramExample,
            });
        }
    }

    endpoints.sort((a, b) => {
        if (a.folder !== b.folder) {
            return a.folder.localeCompare(b.folder);
        }
        if (a.path !== b.path) {
            return a.path.localeCompare(b.path);
        }
        return a.method.localeCompare(b.method);
    });

    return {
        endpoints,
        controllerCount: controllerFiles.length,
    };
}

function convertPathParamsToPostman(pathValue) {
    return pathValue.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{{$1}}');
}

function createPostmanRequest(endpoint) {
    const postmanPath = convertPathParamsToPostman(endpoint.path);
    const pathParts = postmanPath.split('/').filter(Boolean);

    const pathParamNames = Array.from(endpoint.path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)).map((match) => match[1]);
    const pathVariables = pathParamNames.map((paramName) => {
        const explicitValue = endpoint.paramExample && endpoint.paramExample[paramName] !== undefined
            ? endpoint.paramExample[paramName]
            : getIdPlaceholder(paramName) || 'string';

        return {
            key: paramName,
            value: toPostmanScalar(explicitValue),
        };
    });

    const queryEntries = Object.entries(endpoint.queryExample || {}).map(([key, value]) => ({
        key,
        value: toPostmanScalar(value),
    }));
    const queryString = queryEntries.length > 0
        ? `?${queryEntries.map((entry) => `${entry.key}=${entry.value}`).join('&')}`
        : '';

    const request = {
        method: endpoint.method,
        header: [
            { key: 'Content-Type', value: 'application/json', type: 'text' },
            { key: 'Authorization', value: 'Bearer {{access_token}}', type: 'text' },
        ],
        url: {
            raw: `{{base_url}}${postmanPath}${queryString}`,
            host: ['{{base_url}}'],
            path: pathParts,
        },
    };

    if (queryEntries.length > 0) {
        request.url.query = queryEntries;
    }

    if (pathVariables.length > 0) {
        request.url.variable = pathVariables;
    }

    const hasBodyExample = endpoint.bodyExample !== undefined;
    const shouldDefaultBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);

    if (hasBodyExample || shouldDefaultBody) {
        request.body = {
            mode: 'raw',
            raw: JSON.stringify(hasBodyExample ? endpoint.bodyExample : {}, null, 2),
        };
    }

    return request;
}

function organizeEndpointsByFolder(endpoints) {
    const folders = new Map();

    for (const endpoint of endpoints) {
        if (!folders.has(endpoint.folder)) {
            folders.set(endpoint.folder, []);
        }

        folders.get(endpoint.folder).push({
            name: endpoint.name,
            request: createPostmanRequest(endpoint),
        });
    }

    return Array.from(folders.entries()).map(([folderName, items]) => ({
        name: folderName,
        item: items,
    }));
}

function buildCollection(endpoints) {
    return {
        info: {
            name: 'Ovlox V2 API',
            description: 'API collection auto-generated from NestJS controllers and DTO body types',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        variable: [
            { key: 'base_url', value: 'http://localhost:4000', type: 'string' },
            { key: 'access_token', value: '', type: 'string' },
            { key: 'orgId', value: '', type: 'string' },
            { key: 'projectId', value: '', type: 'string' },
            { key: 'userId', value: '', type: 'string' },
        ],
        item: organizeEndpointsByFolder(endpoints),
    };
}

function main() {
    const context = {
        enums: parseEnumValues(),
        dtoCache: new Map(),
        typeShapeCache: new Map(),
    };

    const { endpoints, controllerCount } = extractAllEndpoints(context);
    const collection = buildCollection(endpoints);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(collection, null, 2));

    console.log(`Postman collection generated at: ${OUTPUT_FILE}`);
    console.log(`Controllers scanned: ${controllerCount}`);
    console.log(`Endpoints generated: ${endpoints.length}`);
}

main();