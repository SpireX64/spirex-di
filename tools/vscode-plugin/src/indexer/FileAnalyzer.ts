import { parse } from "@typescript-eslint/typescript-estree";
import type { Program } from "estree";
import { collectFileModel, type DIFileModel } from "@spirex/di-ast-analyzer";

const SPIREX_IMPORT_RE = /@spirex\/di/;

export function analyzeFile(
    filePath: string,
    content: string,
): DIFileModel | null {
    if (!SPIREX_IMPORT_RE.test(content)) return null;

    try {
        const ast = parse(content, {
            loc: true,
            range: true,
            jsx: filePath.endsWith(".tsx") || filePath.endsWith(".jsx"),
        });

        return collectFileModel(ast as unknown as Program, filePath);
    } catch {
        return null;
    }
}
